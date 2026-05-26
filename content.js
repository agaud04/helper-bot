// content.js — injected into Canvas quiz pages
// Detects Classic Quiz questions, sends to background for answering.

const processedIds = new Set();

async function init() {
  const { helperBotEnabled, helperBotApiKey } = await chrome.storage.local.get([
    'helperBotEnabled',
    'helperBotApiKey',
  ]);
  if (helperBotEnabled === false) return;
  if (!helperBotApiKey) return; // Don't run without key; popup will show the message

  // Process questions already on the page
  document.querySelectorAll('.question.display_question').forEach(processQuestion);

  // Watch for questions loaded dynamically (e.g. one-at-a-time quizzes, "Load More")
  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      for (const node of mutation.addedNodes) {
        if (node.nodeType !== Node.ELEMENT_NODE) continue;
        if (node.classList && node.classList.contains('display_question')) {
          processQuestion(node);
        }
        node.querySelectorAll &&
          node.querySelectorAll('.question.display_question').forEach(processQuestion);
      }
    }
  });

  observer.observe(document.body, { childList: true, subtree: true });
}

function processQuestion(questionEl) {
  const questionId = questionEl.id;
  if (!questionId || processedIds.has(questionId)) return;
  processedIds.add(questionId);

  const questionData = extractQuestionData(questionEl);
  if (!questionData) return; // Couldn't parse — skip silently

  showOverlay(questionEl, 'loading', null);

  chrome.runtime.sendMessage({ type: 'ASK_CLAUDE', ...questionData }, (response) => {
    if (chrome.runtime.lastError) {
      showOverlay(questionEl, 'error', 'Extension disconnected. Reload the page.');
      return;
    }
    if (!response || response.answer === null) {
      // Disabled — remove overlay silently
      const overlay = questionEl.querySelector('.helperbot-overlay');
      if (overlay) overlay.remove();
      return;
    }
    showOverlay(questionEl, 'done', response.answer);
  });
}

function extractQuestionData(questionEl) {
  const cls = questionEl.className;
  let questionType = 'other';

  if (cls.includes('multiple_choice_question')) questionType = 'mc';
  else if (cls.includes('true_false_question')) questionType = 'tf';
  else if (cls.includes('multiple_answers_question')) questionType = 'multi';
  else if (cls.includes('essay_question')) questionType = 'essay';
  else if (cls.includes('short_answer_question')) questionType = 'short';
  // Matching, numerical, fill-in-blank fall through as 'other'

  // Extract question text — Canvas Classic uses .question_text
  const textEl =
    questionEl.querySelector('.question_text.user_content') ||
    questionEl.querySelector('.question_text');
  if (!textEl) return null;
  const questionText = textEl.innerText.trim();
  if (!questionText) return null;

  // Extract answer options for choice-type questions
  const options = [];
  if (questionType === 'mc' || questionType === 'tf' || questionType === 'multi') {
    questionEl.querySelectorAll('.answer').forEach((answerEl, i) => {
      const textNode =
        answerEl.querySelector('.answer_text') ||
        answerEl.querySelector('.answer_label');
      const text = textNode ? textNode.innerText.trim() : '';
      if (text) {
        options.push({ letter: String.fromCharCode(65 + i), text });
      }
    });
  }

  return { questionText, questionType, options };
}

// Inject or update the answer overlay inside the question element
function showOverlay(questionEl, state, text) {
  let overlay = questionEl.querySelector('.helperbot-overlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.className = 'helperbot-overlay';
    // Insert before the answers section so it appears between question and choices
    const answersEl = questionEl.querySelector('.answers');
    if (answersEl) {
      questionEl.insertBefore(overlay, answersEl);
    } else {
      questionEl.appendChild(overlay);
    }
  }

  // Reset classes then apply new state
  overlay.className = 'helperbot-overlay';

  if (state === 'loading') {
    overlay.classList.add('helperbot-loading');
    overlay.innerHTML =
      '<span class="helperbot-spinner"></span>' +
      '<span class="helperbot-msg">HelperBot is thinking...</span>';
  } else if (state === 'done') {
    overlay.classList.add('helperbot-answer');
    // Sanitise output to prevent XSS
    const safeText = text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
    overlay.innerHTML =
      '<span class="helperbot-badge">🤖 HelperBot</span>' +
      '<span class="helperbot-text">' + safeText + '</span>';
  } else if (state === 'error') {
    overlay.classList.add('helperbot-error');
    overlay.innerHTML =
      '<span class="helperbot-badge">❌</span>' +
      '<span class="helperbot-text">' + text + '</span>';
  }
}

init();
