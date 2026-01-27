# app/templates — Jinja2 Templates

## OVERVIEW
Jinja2 HTML templates consumed by Flask routes. Eight main pages: authentication, chat, settings, assessments, pose detection, video management, and admin dashboard. Settings included via `{% include 'setting.html' %}` pattern in index.html and chatbox.html.

## WHERE TO LOOK

| Template | Purpose | Includes | Route |
|----------|---------|----------|-------|
| **index.html** | Assessment start screen; evaluation modal | setting.html | / |
| **chatbox.html** | Main chat interface; sidebar + message area | setting.html | /chatbox |
| **setting.html** | Settings modal (profile, personalization, API keys) | — | (included) |
| **pose_detection.html** | Pose detection UI; video + canvas + controls | — | /pose_detection |
| **video_access.html** | Video upload & analysis; transcription progress | — | /video |
| **admin_dashboard.html** | Admin panel; user management modal | — | /admin |
| **login_signup.html** | Auth forms (sign in + sign up toggle) | — | /login |
| **forget_password.html** | Password reset form | — | /forgot_password |

## CONVENTIONS
- **Settings include pattern**: chatbox.html and index.html include setting.html via `{% include 'setting.html' %}`.
- **Auth check**: Templates use inline script checking `localStorage.getItem('access_token')` (redirect to /login if missing).
- **Static asset URLs**: Use `url_for('static', filename='...')` for CSS/JS; pose detection JS uses `url_for('main.serve_pose_detection_js', filename='...')`.
- **Jinja placeholders**: url_for, user data, i18n keys (e.g., `data-i18n="settings.profile"`).
- **Modal pattern**: Multiple pages use `.modal` overlays (settings, video upload, admin user creation, evaluation).

## ANTI-PATTERNS
- Do **not** duplicate setting.html; it is meant to be included. If adding new pages needing settings, include the file—do not copy-paste modal HTML.
- Do **not** hardcode static paths; always use `url_for`.
- Do **not** add inline styles for layout; defer to linked CSS files (chatbox.css, settings.css, pose_detection.css, etc.).
- Do **not** skip auth checks on protected pages; enforce token presence in localStorage.

## NOTES
- **Multilingual**: setting.html uses `data-i18n` attributes for i18n (zh-TW, en, ja); JS module settings.js handles translation.
- **Pose detection**: Loads MediaPipe Holistic CDN + custom JS modules (pose_detector_3d.js, movement_analyzers.js, action_detector.js, pose_renderer.js, etc.).
- **Assessment flow**: index.html shows start screen → evaluation modal → assessment screen (controlled by ChildAssessmentModule JS).
- **Video analysis**: video_access.html uses dedicated CSS (video_management.css) and JS (video_management.js, video_analysis_results.js).
- **Admin dashboard**: admin_dashboard.html is a styled prototype (verify backend integration before extending).
- **Login/signup toggle**: login_signup.html uses animated `.toggle-container` panel; forget_password.html extends same design with single-panel layout.
