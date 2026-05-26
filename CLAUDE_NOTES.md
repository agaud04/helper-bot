# Helper Bot — Chrome Extension

## What It Does
Chrome MV3 extension that automatically answers Canvas Classic Quiz questions using Claude Haiku.
Injects an answer overlay next to each question the moment it appears — no clicking required.

## Stack
- Vanilla JS + HTML + CSS, no build step
- Chrome Extension APIs (MV3)
- Anthropic Messages API (`claude-haiku-4-5-20251001`, direct `fetch` from background.js)
- `chrome.storage.local` for API key + enable toggle
- `chrome.runtime.sendMessage` for content → background communication

## File Structure
```
helper-bot/
├── manifest.json      — MV3 config, content_scripts match *.instructure.com/courses/*/quizzes/*
├── background.js      — Service worker: receives ASK_CLAUDE, calls Anthropic, returns answer
├── content.js         — Injected on quiz pages: MutationObserver, extracts questions, injects overlays
├── overlay.css        — Styles for .helperbot-overlay (loading/answer/error states + spinner)
└── popup/
    ├── popup.html     — Settings UI
    ├── popup.js       — Load/save API key, enable toggle, page status check
    └── popup.css      — Popup styles
```

## How to Load in Chrome (Dev Mode)
1. `chrome://extensions` → enable Developer mode
2. Click "Load unpacked" → select this folder
3. Click the Helper Bot puzzle-piece icon → paste your Anthropic API key (starts with `sk-ant-`)
4. Navigate to a Canvas quiz take page (`/courses/.../quizzes/.../take`)
5. Overlays appear automatically next to each question

## How to Reload After Code Changes
1. `chrome://extensions` → click the reload icon on Helper Bot card
2. **Refresh the Canvas tab** (content script is invalidated on extension reload)

## Question Types Handled
| Canvas type | behaviour |
|---|---|
| `multiple_choice_question` | Picks best letter + brief reason |
| `true_false_question` | Picks A (True) or B (False) + reason |
| `multiple_answers_question` | Lists all correct letters + reason |
| `essay_question` | 2-3 sentence answer |
| `short_answer_question` | Concise answer |
| `matching_question`, `numerical_question`, etc. | General 2-3 sentence answer |

## Known Limitations
- Works on Canvas **Classic Quizzes** only (`/quizzes/*/take` URL)
- Canvas New Quizzes (Quizzes.Next, iframe at `assessments.instructure.com`) not supported in v1
- Requires page refresh after changing API key or toggling the enable switch

## Upgrading the Model
In `background.js` line `model: 'claude-haiku-4-5-20251001'` — swap for:
- `claude-sonnet-4-6` for better accuracy on complex questions (slower + costs more)

## GitHub
https://github.com/agaud04/helper-bot

## Next Session
- To add New Quizzes support: add `https://assessments.instructure.com/*` to `host_permissions`
  and write a second content script targeting that iframe domain with `[data-testid]` selectors
- To add rate limiting for large quizzes: add a queue in `background.js` (max 3 concurrent requests)
