const apiKeyInput = document.getElementById('apiKey');
const saveKeyBtn = document.getElementById('saveKey');
const enableToggle = document.getElementById('enableToggle');
const keyStatus = document.getElementById('keyStatus');
const pageStatus = document.getElementById('pageStatus');

// Load saved settings on open
chrome.storage.local.get(['helperBotApiKey', 'helperBotEnabled'], ({ helperBotApiKey, helperBotEnabled }) => {
  if (helperBotApiKey) {
    apiKeyInput.value = helperBotApiKey;
    keyStatus.textContent = '✓ API key saved';
    keyStatus.className = 'status ok';
  }
  // Default to enabled
  enableToggle.checked = helperBotEnabled !== false;
});

// Save API key
saveKeyBtn.addEventListener('click', async () => {
  const key = apiKeyInput.value.trim();
  if (!key) {
    keyStatus.textContent = '✗ Key cannot be empty';
    keyStatus.className = 'status error';
    return;
  }
  if (!key.startsWith('sk-ant-')) {
    keyStatus.textContent = '✗ Key must start with sk-ant-';
    keyStatus.className = 'status error';
    return;
  }
  await chrome.storage.local.set({ helperBotApiKey: key });
  keyStatus.textContent = '✓ Saved! Refresh Canvas to apply.';
  keyStatus.className = 'status ok';
});

// Toggle enable/disable
enableToggle.addEventListener('change', () => {
  chrome.storage.local.set({ helperBotEnabled: enableToggle.checked });
});

// Show current page status
chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
  if (!tab || !tab.url) {
    pageStatus.textContent = '— No active tab';
    return;
  }
  const url = tab.url;
  const isCanvas = url.includes('instructure.com') || url.includes('canvas.com');
  const isQuiz = isCanvas && url.includes('/quizzes/');

  if (isQuiz) {
    pageStatus.textContent = '✅ Canvas quiz page detected';
    pageStatus.className = 'page-status active';
  } else if (isCanvas) {
    pageStatus.textContent = '⚠️ Canvas page — navigate to a quiz';
    pageStatus.className = 'page-status canvas-no-quiz';
  } else {
    pageStatus.textContent = '— Not on Canvas';
    pageStatus.className = 'page-status';
  }
});
