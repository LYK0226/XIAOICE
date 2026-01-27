# CSS DIRECTORY KNOWLEDGE BASE

**Generated:** 2026-01-26
**Location:** /workspaces/XIAOICE/app/static/css

## OVERVIEW
Page-specific stylesheets for XIAOICE Flask app. No global CSS — each page loads its dedicated file. Lavender/purple gradient theme with dark mode support. video_management.css is substantially larger (1158 lines) with scoped --vm-* CSS variables.

## WHERE TO LOOK
| Page/Feature | CSS File | Purpose |
|--------------|----------|---------|
| Main chat interface | chatbox.css | Chat container, message bubbles, input area, file previews |
| Conversation list | sidebar.css | Sidebar navigation, conversation items, pinned items |
| Settings modal | settings.css | Tabbed modal layout, form controls, API key management |
| Pose detection UI | pose_detection.css | Webcam canvas overlay, decorative stars/clouds, pose controls |
| Login/signup forms | login_signup.css | Auth container, form panels, toggle animation |
| Password reset | forget_password.css | Inherits login_signup structure, single-panel layout |
| Video management | video_management.css | Modal/dedicated page, hero section, video grid, --vm-* variables |
| Landing page | index.css | Decorative elements (stars, clouds, owl), landing layout |

## CONVENTIONS
- **File naming:** `<page_name>.css` (exact match to template/feature).
- **Theme support:** `.dark-theme` body class for dark mode overrides.
- **Color scheme:** Lavender gradients (#D4C5E8, #C8B8DB, #B8A8D8) + purple accents (#9B8AB8, #512da8).
- **Scoped variables:** video_management.css uses `--vm-*` namespace; other files use inline values.
- **Animations:** Keyframes for fade-in, slide-up, twinkle, drift, float (decorative elements).
- **Font stack:** `-apple-system, BlinkMacSystemFont, "Segoe UI", "Microsoft JhengHei", "微軟正黑體", sans-serif`.
- **Montserrat** imported for login/signup/forget_password only.

## ANTI-PATTERNS
- Do NOT create a global.css — keep styles page-specific.
- Do NOT hardcode theme colors without dark-theme overrides.
- Do NOT rename video_management.css without updating its route and template references.
- Avoid mixing --vm-* variables in non-video files (namespace collision risk).

## NOTES
- **video_management.css** (1158 lines): Dual-purpose (modal + dedicated page). Uses `.vm-video-page` body class for standalone layout, `--vm-*` variables for theming. Large file due to responsive grid, hero section, animation states.
- **pose_detection.css:** Includes decorative stars/clouds animations (shared pattern with index.css).
- **settings.css:** Uses flexbox sidebar tabs + content area; modal-specific layout logic.
- **Dark mode:** All files implement `.dark-theme` overrides for backgrounds, borders, shadows.
- **No bundler/preprocessor:** Plain CSS, loaded per-page via `<link>` in templates.
