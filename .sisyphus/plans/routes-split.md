# Split routes.py into feature modules (Files + Videos)

## TL;DR

> **Quick Summary**: Refactor `app/routes.py` by extracting **Files/Uploads** and **Video Management** routes into separate flat modules while keeping a single `main` blueprint, and move **pure GCS operations** into `app/gcp_bucket.py`. Preserve all endpoints and behavior; tests run after refactor.
>
> **Deliverables**:
> - `app/routes_files.py` with Files/Uploads routes
> - `app/routes_videos.py` with Video routes
> - Updated `app/routes.py` to register extracted routes with the existing `main` blueprint
> - Updated `app/gcp_bucket.py` containing only pure GCS operations (no request/DB logic moved)
>
> **Estimated Effort**: Medium
> **Parallel Execution**: NO (sequential; dependencies on routes extraction order)
> **Critical Path**: Define route lists → Extract Files/Uploads → Verify → Extract Video → Verify

---

## Context

### Original Request
"現在routes.py的File代碼量太多了, 將裏面一啲佔用較多代碼的功能分辨成為一個獨立檔案"

### Interview Summary
**Key Discussions**:
- Keep a **single main blueprint**; split by **feature**.
- Priority: **Files/Uploads (E)** first, then **Video (I)**.
- Use **flat modules**: `app/routes_files.py`, `app/routes_videos.py`.
- Move **pure GCS operations** to `app/gcp_bucket.py` only (no request parsing or DB logic).
- Tests: **tests-after** (pytest exists).

**Research Findings**:
- `app/routes.py` ~1,945 lines, with clear section headers for Files/Uploads and Video Management.
- Existing blueprint pattern: `bp = Blueprint('main', __name__)` in `routes.py` and registered in `app/__init__.py`.
- Circular import risk via `socketio` in some routes; use lazy imports inside functions when needed.
- Repo uses domain modules at `app/` root (no services/ directory).

### Metis Review
**Identified Gaps** (addressed below):
- Exact endpoint lists for Files/Uploads vs Video were not explicit.
- Handling of overlapping endpoints (e.g., `get_uploads`) not decided.
- Blueprint registration pattern for new modules needs explicit design.

---

## Work Objectives

### Core Objective
Modularize `app/routes.py` by extracting **Files/Uploads** and **Video Management** routes into separate flat modules while preserving behavior, using the same `main` blueprint, and relocating **pure GCS helper operations** into `app/gcp_bucket.py`.

### Concrete Deliverables
- `app/routes_files.py` containing Files/Uploads routes
- `app/routes_videos.py` containing Video Management routes
- `app/routes.py` updated to register those routes to the existing `bp`
- `app/gcp_bucket.py` updated to contain/centralize pure GCS functions (upload/download/delete/signed URLs/storage keys)

### Definition of Done
- [ ] `routes_files.py` and `routes_videos.py` exist and import correctly
- [ ] All moved endpoints respond with identical URLs/methods/behavior
- [ ] `app/routes.py` remains the single place defining `bp = Blueprint('main', ...)`
- [ ] `pytest` passes

### Must Have
- No route URLs, HTTP methods, or decorators changed
- Only Files/Uploads + Video routes are moved
- Pure GCS operations centralized in `gcp_bucket.py` only

### Must NOT Have (Guardrails)
- No new blueprints created
- No refactors of unrelated sections (chat, assessments, etc.)
- No behavior changes, response format changes, or error handling refactors
- No moving request parsing or DB record creation into `gcp_bucket.py`

---

## Verification Strategy (MANDATORY)

### Test Decision
- **Infrastructure exists**: YES (pytest)
- **User wants tests**: Tests-after
- **Framework**: pytest

### Manual Verification (Required even with tests)

**Backend API Smoke Checks** (after each extraction):
- Run `python -c "from app import create_app; create_app()"` → should succeed (no import errors)
- Run `pytest` → all tests pass

**Targeted endpoint checks** (manual curl or Postman):
- Files/Uploads: `GET /api/files`, `POST /api/upload_file`, `GET /api/uploads`, `DELETE /api/uploads/<id>`
- Videos: `GET /api/videos`, `POST /api/upload-video`, `POST /api/video/<id>/analyze`, `DELETE /api/video/<id>`

---

## Execution Strategy

### Parallel Execution Waves

Sequential (to minimize breakage):

Wave 1:
- Extract Files/Uploads routes to `routes_files.py`

Wave 2:
- Extract Video routes to `routes_videos.py`

Wave 3:
- Normalize GCS helper placement and verify imports

Critical Path: Files extraction → Video extraction → Full verification

---

## TODOs

> Implementation + Tests = ONE Task. Each task includes verification.

- [ ] 1. Define exact endpoint lists and ownership (Files vs Videos)

  **What to do**:
  - Enumerate Files/Uploads routes from `app/routes.py` (line ranges per section headers)
  - Enumerate Video routes from `app/routes.py`
  - Decide where overlapping endpoints belong (`/api/uploads`, `/api/uploads/<id>`, `/api/videos/<id>` delete duplicates)

  **Must NOT do**:
  - Do not rename routes or change methods

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Mostly analysis and explicit listing
  - **Skills**: none
  - **Skills Evaluated but Omitted**: `git-master` (no git operations required)

  **Parallelization**:
  - **Can Run In Parallel**: NO (blocks subsequent tasks)

  **References**:
  - `app/routes.py:729-869` — Files/Uploads section (current routes)
  - `app/routes.py:1375-1945` — Video Management section
  - `app/routes.py:1816-1907` — Uploads endpoints overlap (videos/files)

  **Acceptance Criteria**:
  - [ ] Endpoint list documented and assigned to Files vs Videos
  - [ ] Overlap decision recorded (where `/api/uploads` and duplicate video delete live)

- [ ] 2. Create `routes_files.py` and register routes with existing `bp`

  **What to do**:
  - Create `app/routes_files.py` with a function like `register_files_routes(bp)`
  - Move Files/Uploads routes (per Task 1) into this module
  - Ensure only `bp` from `routes.py` is used (no new blueprint)
  - Keep lazy imports to avoid circular dependencies (e.g., socketio if needed)

  **Must NOT do**:
  - Do not alter route URLs, methods, or decorators
  - Do not move DB/request parsing to gcp_bucket

  **Recommended Agent Profile**:
  - **Category**: `unspecified-low`
    - Reason: Multi-file refactor with careful move-only changes
  - **Skills**: none

  **Parallelization**:
  - **Can Run In Parallel**: NO (depends on Task 1)
  - **Blocked By**: Task 1

  **References**:
  - `app/routes.py:729-869` — Files/Uploads routes and helpers
  - `app/routes.py:1816-1907` — `/api/uploads` and delete upload endpoints
  - `app/gcp_bucket.py` — current GCS helpers

  **Acceptance Criteria**:
  - [ ] `app/routes_files.py` contains all Files/Uploads routes
  - [ ] `app/routes.py` calls `register_files_routes(bp)`
  - [ ] `python -c "from app import create_app; create_app()"` succeeds
  - [ ] `pytest` passes

- [ ] 3. Create `routes_videos.py` and register routes with existing `bp`

  **What to do**:
  - Create `app/routes_videos.py` with `register_video_routes(bp)`
  - Move Video routes (per Task 1) into this module
  - Preserve background thread logic and app context usage as-is

  **Must NOT do**:
  - Do not change upload/analyze/transcribe behavior
  - Do not change endpoint paths or HTTP methods

  **Recommended Agent Profile**:
  - **Category**: `unspecified-low`
    - Reason: Route extraction with background threading concerns
  - **Skills**: none

  **Parallelization**:
  - **Can Run In Parallel**: NO (depends on Task 2)
  - **Blocked By**: Task 2

  **References**:
  - `app/routes.py:1375-1945` — Video Management routes
  - `app/video_processor.py` — referenced by video analysis routes
  - `app/agent/chat_agent.py` — used for streaming responses in video tasks

  **Acceptance Criteria**:
  - [ ] `app/routes_videos.py` contains all Video routes
  - [ ] `app/routes.py` calls `register_video_routes(bp)`
  - [ ] `python -c "from app import create_app; create_app()"` succeeds
  - [ ] `pytest` passes

- [ ] 4. Consolidate pure GCS operations in `gcp_bucket.py`

  **What to do**:
  - Ensure all pure GCS operations (upload/download/delete/signed URLs/storage keys, content-type helpers) live in `app/gcp_bucket.py`
  - Route modules should call these helpers; do NOT move request/DB logic
  - If any pure GCS helpers currently live in routes, move them to `gcp_bucket.py`

  **Must NOT do**:
  - Do not move DB record creation, request parsing, or business logic

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Limited scope helper relocation
  - **Skills**: none

  **Parallelization**:
  - **Can Run In Parallel**: NO (depends on Task 3)
  - **Blocked By**: Task 3

  **References**:
  - `app/gcp_bucket.py` — existing helper functions
  - `app/routes.py` — references to GCS helpers in Files/Video routes

  **Acceptance Criteria**:
  - [ ] All GCS operations are centralized in `gcp_bucket.py`
  - [ ] No request parsing or DB logic moved into `gcp_bucket.py`
  - [ ] `pytest` passes

- [ ] 5. Final verification & documentation

  **What to do**:
  - Run `pytest`
  - Run a minimal smoke check with `create_app()` import
  - Confirm moved endpoints respond in dev environment

  **Must NOT do**:
  - Do not modify unrelated modules

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: none

  **Parallelization**:
  - **Can Run In Parallel**: NO (final gate)

  **Acceptance Criteria**:
  - [ ] `pytest` passes
  - [ ] `python -c "from app import create_app; create_app()"` passes

---

## Commit Strategy

| After Task | Message | Files | Verification |
|------------|---------|-------|--------------|
| Task 2 | `refactor(routes): extract files routes module` | app/routes_files.py, app/routes.py | pytest | 
| Task 3 | `refactor(routes): extract videos routes module` | app/routes_videos.py, app/routes.py | pytest |
| Task 4 | `refactor(gcs): centralize storage helpers` | app/gcp_bucket.py, app/routes_*.py | pytest |

---

## Success Criteria

### Verification Commands
```bash
python -c "from app import create_app; create_app()"
pytest
```

### Final Checklist
- [ ] Files/Uploads routes live in `routes_files.py`
- [ ] Video routes live in `routes_videos.py`
- [ ] Single `main` blueprint preserved
- [ ] Pure GCS operations centralized in `gcp_bucket.py`
- [ ] Tests pass
