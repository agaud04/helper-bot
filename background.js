// background.js — MV3 service worker
// Receives ASK_CLAUDE messages from content script, calls OpenAI API, returns answer.

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === 'ASK_CLAUDE') {
    handleAskClaude(message).then(sendResponse).catch((err) => {
      sendResponse({ answer: `Error: ${err.message}` });
    });
    return true; // Keep message channel open for async response
  }
});

async function handleAskClaude({ questionText, questionType, options }) {
  const { helperBotApiKey, helperBotEnabled } = await chrome.storage.local.get([
    'helperBotApiKey',
    'helperBotEnabled',
  ]);

  if (helperBotEnabled === false) {
    return { answer: null }; // Silently skip when disabled
  }
  if (!helperBotApiKey) {
    return { answer: '⚙️ No API key — click the Helper Bot icon to add your OpenAI key.' };
  }

  const prompt = buildPrompt(questionText, questionType, options);

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${helperBotApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      max_tokens: 512,
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  if (!response.ok) {
    const errBody = await response.json().catch(() => ({}));
    const msg = errBody?.error?.message || `HTTP ${response.status}`;
    return { answer: `❌ API error: ${msg}` };
  }

  const data = await response.json();
  const answer = data.choices?.[0]?.message?.content || '(no response)';
  return { answer };
}

function buildPrompt(questionText, questionType, options) {
  if (questionType === 'mc' || questionType === 'tf') {
    const optionList = options.map((o) => `${o.letter}) ${o.text}`).join('\n');
    return `Answer this multiple choice question. Reply with ONLY the letter followed by a dash and a brief reason (max 15 words). Example format: "B) — Paris is the capital of France."

Question: ${questionText}

Options:
${optionList}

Answer:`;
  }

  if (questionType === 'multi') {
    const optionList = options.map((o) => `${o.letter}) ${o.text}`).join('\n');
    return `Answer this multiple-select question (select ALL that apply). Reply with the correct letters comma-separated, then a brief reason.

Question: ${questionText}

Options:
${optionList}

Answer:`;
  }

  // essay / short_answer / other
  return `Answer this quiz question concisely and accurately (2-3 sentences max).

Question: ${questionText}

Answer:`;
}
