# FRONTEND JS — /workspaces/XIAOICE/app/static/js

## OVERVIEW
Flat vanilla JS modules (no bundler). Multi-page support: chat, settings, assessments, auth, pose detection. i18n via `../i18n/*.json`.

## WHERE TO LOOK
| Task | Module | Notes |
|------|--------|-------|
| Chat UI + message rendering | chatbox.js | Optimistic UI for files/images; emoji picker; voice; webcam |
| Multimodal chat streaming | api_module.js | ChatAPI class; SSE streaming + REST endpoints; JWT headers |
| WebSocket events | socket_module.js | SocketManager class; JWT auth on connect; room/message handlers |
| User preferences + API keys | settings.js | Theme, language, model selection; profile + password update |
| Real-time pose detection | pose_detection.js | MediaPipe 3D pose; multi-person; detection loop |
| Video upload + preview | video_management.js | Dedicated /video page; drag-drop; /api/upload-video |
| Child assessment config | assessment_config.js | Assessment categories + metadata (age ranges, icons) |
| Assessment questions DB | assessment_questions.js | 10 questions per assessment; videos from /static/videos_quesyions |
| Assessment workflow | child_assessment.js | Start/navigate/submit; no chatbot integration |
| Auth forms | login_signup.js | JWT token storage; form validation |
| Password reset | forget_password.js | Reset flow |
| Sidebar conversation mgmt | sidebar.js | Conversation list; pin/delete |
| Video analysis results | video_analysis_results.js | Results display from GCS analysis |

## CONVENTIONS
- **No bundler**: All modules loaded via `<script src="/static/js/...">` in templates.
- **Class-based**: `ChatAPI`, `SocketManager`, static classes for modules.
- **JWT auth**: Tokens stored in `localStorage.getItem('access_token')`.
- **i18n**: Load from `../i18n/{zh-TW,en,ja}.json` at runtime; `window.translations` global.
- **Optimistic UI** (chatbox.js): Render user messages + file previews immediately; preserve images/files before server response to prevent flicker.
- **SSE streaming**: `api_module.js` uses `fetch('/chat/stream')` with `text/event-stream`; parses `data:` lines.
- **SocketIO**: `socket_module.js` initializes with `io({ auth: { token } })`; JWT required on connect.
- **MediaPipe pose**: Imported via CDN; init in `pose_detection.js`; modules in `../pose_detection/*.js`.
- **Video refs**: Assessment videos live in `/static/videos_quesyions/video/`; served by Flask static route.

## ANTI-PATTERNS
- **DO NOT** remove optimistic UI images/files in `chatbox.js` before server confirms success (causes flicker).
- **DO NOT** bundle or transpile; templates expect flat file paths.
- **DO NOT** hardcode API keys; use settings.js + backend encryption.
- **DO NOT** use global `GOOGLE_API_KEY`; per-user keys managed by backend.

## NOTES
- Large modules: chatbox.js, settings.js, pose_detection.js (complex UI flows).
- child_assessment.js is standalone text-based workflow (no AI chat).
- Static assets (CSS, i18n) are flat siblings; no build step.
- For backend integration see `app/routes.py`, `app/socket_events.py`, `app/agent/chat_agent.py`.
