# Draft: Split large sections of routes.py

## Requirements (confirmed)
- User reports `app/routes.py` is too large and wants large chunks moved into separate file(s).
- User wants functional split while keeping a single `main` blueprint.
- Priority split areas: Files/Uploads (E) and Video management (I).
- Move some GCP bucket-related logic into `app/gcp_bucket.py`.
- Move only pure GCS operations (upload/download/delete/signed URLs/storage keys) into `gcp_bucket.py`; keep request parsing/DB logic in routes.

## Technical Decisions
- Split by feature/domain into multiple modules but keep one `main` blueprint.
- Test strategy: tests-after (implement refactor, then add/adjust tests).
- Use flat route module files (e.g., `app/routes_files.py`, `app/routes_videos.py`).

## Research Findings
- `app/routes.py` is ~1,944 lines with ~58 routes across multiple functional sections; uses `Blueprint('main')`.
- `app/auth.py` already uses its own blueprint (`auth_bp`) and is registered in `app/__init__.py` alongside routes.
- Test infrastructure exists: pytest 9.0.1 with tests under `test/` (no pytest.ini). Some tests are integration-like.
- Section headers and logical groupings in `app/routes.py` map cleanly to feature splits: API keys, conversations/messages, pose assessment, quiz, child assessment, video management, uploads.
- Largest/complex handlers include `upload_video`, `chat_stream`, `create_message`, and `analyze_video`.
- Repo modularization pattern favors domain modules at `app/` root (no services/ directory), and uses lazy imports to avoid circular dependencies.
- Flask blueprint best practices: import blueprints inside `create_app`, avoid circular imports, namespace url_for by blueprint, and watch static/template precedence.
- Import analysis shows many duplicate inline imports in routes.py; `get_jwt_identity` appears repeatedly. Recommended to keep section-specific imports within each split module and use lazy imports for `socketio` and heavy utilities to avoid circular imports.

## Open Questions
- Which specific sections/functional areas should be extracted?
- Preferred organization: multiple blueprints or helper modules?
- Any specific order for splitting (e.g., start with videos/chat)?
- Which specific GCP-related logic should be moved into `gcp_bucket.py` (exact functions/blocks)?
- Naming/location for new route modules (e.g., `app/routes_files.py` vs `app/routes/files.py`).

## Scope Boundaries
- INCLUDE: refactor routes.py by extracting large code sections into separate module(s).
- EXCLUDE: feature changes unless required for refactor.
