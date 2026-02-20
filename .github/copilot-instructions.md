# XIAOICE — Copilot Quick Reference (for AI coding agents)

1. In any process, task, or dialogue, user feedback must be requested using the askQuestions tool after each stage is completed.

2. Adjust behavior based on the received user feedback.

3. A process is considered complete only when the user explicitly indicates "end" or "no further interaction needed."

4. All steps must be repeated unless an end instruction is received.

5. Before completing a task, the askQuestions tool must be used to prompt the user for feedback.

Brief: concise, repo-specific guidance so an AI agent can be productive quickly.
## Project Guidelines

### Code style
- Python: follow PEP8; add type hints where helpful. See examples in `app/routes.py`, `app/models.py`, `app/agent/chat_agent.py`.
- JavaScript: vanilla ES modules, `PascalCase` for classes, `camelCase` for functions — see `app/pose_detection/*` and `app/static/js/chatbox.js`.
- Tests: use `pytest/` and mock external services (GCS). Example tests live in `test/`.
- Docstrings: keep public docstrings short (one line) and include parameter/return types when non-obvious.

### Architecture (what to edit)
- App factory: `app/__init__.py` (blueprints + SocketIO).
- ADK multi-agent coordinator & specialists: `app/agent/chat_agent.py` (streaming handled via SSE `/chat/stream` and Socket.IO in `app/socket_events.py`).
- Data models & storage: `app/models.py`, `app/gcp_bucket.py`.

### Build & test
- Setup: `python -m venv .venv && source .venv/bin/activate && pip install -r requirements.txt`
- Run dev server: `python run.py`
- Tests: `pytest` (run single test with `pytest path::Class::test -v`)
- DB migrations: `flask db migrate -m "msg" && flask db upgrade`

### Project conventions & constraints
- Per-user encrypted API keys (Fernet). Use `ENCRYPTION_KEY` env var; do not decrypt globally.
- Session IDs: `conv_{user_id}_{conversation_id}`.
- Upload limit: 500MB (enforced in `app/agent/chat_agent.py`).
- Do NOT commit secrets or set global Google API keys.
- Preserve streaming prefix-stripping logic in `app/routes.py` and `app/socket_events.py`.

### Integration & security
- GCS: `app/gcp_bucket.py` — set `GCS_BUCKET_NAME` and `GCS_CREDENTIALS_PATH`.
- Authentication: JWT flows in `app/auth.py`; validate and sanitize user input and uploads.

(See 'Where to look' below for quick file references.)
Core architecture (where to look)
- Flask app factory: `app/__init__.py` (create_app, SocketIO config).
- Multi-agent AI: `app/agent/chat_agent.py` (coordinator + pdf/media specialists).
- HTTP endpoints: `app/routes.py` (SSE `/chat/stream`, upload endpoints, model selection).
- WebSocket handling: `app/socket_events.py` (JWT auth via `auth` field on connect).
- Storage helpers: `app/gcp_bucket.py` (upload/download/delete + env var handling).
- DB models and conventions: `app/models.py` (User, UserProfile, UserApiKey, Conversation, Message, FileUpload).

### Core Components
- **Flask App Factory**: `app/__init__.py` initializes with blueprints, JWT, SocketIO, and database
- **SQLAlchemy Models**: User management, conversations, messages, and GCS file uploads in `app/models.py`
- **JWT Authentication**: Token-based auth with refresh tokens in `app/auth.py`
- **REST API**: Conversation/message management in `app/routes.py`
- **AI Integration**: Google ADK multi-agent system in `app/agent/chat_agent.py`
- **File Storage**: Google Cloud Storage uploads via `app/gcp_bucket.py`

### Data Flow
1. User authenticates via JWT → tokens stored in headers/cookies
2. User creates/selects conversation → stored in `conversations` table
3. Message sent → stored in `messages` table, files uploaded to GCS
4. AI response streamed via WebSocket → stored as assistant message

### Key Models
- `User`: Basic auth with password hashing
- `UserProfile`: Preferences (language, theme, selected API key/model)
- `UserApiKey`: Encrypted Google AI API keys per user
- `Conversation`: Chat threads with pinning support
- `Message`: Individual messages with metadata and file attachments
- `FileUpload`: GCS file references with MIME types

## Critical Developer Workflows

### Database Setup
```bash
flask db init      # First time only
flask db migrate -m "description"
flask db upgrade
```

### API Key Encryption
```bash
python3 -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
```
Store `ENCRYPTION_KEY` in `.env`. Keys encrypted in `user_api_keys.encrypted_key`.

### Testing & Validation
```bash
python test_api.py          # API connectivity test
pytest                      # Run test suite
python view_database.py     # Inspect database contents
```

### Application Startup
```bash
python run.py               # Development server
gunicorn -w 4 -b 0.0.0.0:8080 'app:create_app()'  # Production
```

## Project-Specific Patterns

### API Key Management
- API keys encrypted using Fernet with `ENCRYPTION_KEY` env var
- Each user can have multiple keys, selects one via `UserProfile.selected_api_key_id`
- Keys decrypted only when needed for AI calls

### File Uploads
- Files uploaded to Google Cloud Storage buckets
- URLs stored in `file_uploads` table with MIME types
- Associated with conversations/messages for context
- Use `gcp_bucket.py` utilities for upload/download/delete

### AI Model Selection
- Users select model via `UserProfile.ai_model` (e.g., `gemini-3-flash`, `gemini-3-pro`)
- Passed to `vertex_ai.generate_streaming_response()` in `chat_agent.py`
- Fallback to `config.GEMINI_MODEL` if not set

### Conversation Management
- Conversations pinned via `is_pinned` boolean
- Auto-generated titles from first user message (60 chars max)
- Cascade deletes: deleting conversation removes messages and files

### Authentication Flow
- JWT tokens in both headers and secure cookies
- Refresh tokens for session management
- Password: min 6 chars; Username: 3+ chars, alphanumeric + underscores

## Configuration Requirements

### Environment Variables (.env)
```bash
SECRET_KEY="your_secret_key"
ENCRYPTION_KEY="your_32_byte_encryption_key"
DATABASE_URL="sqlite:///app.db"
GCS_BUCKET_NAME="your-bucket-name"
GCS_CREDENTIALS_PATH="/path/to/credentials.json"
GEMINI_MODEL="gemini-3-flash"
CREATE_DB_ON_STARTUP=true  # Development convenience
```

### Database Initialization
- Set `CREATE_DB_ON_STARTUP=true` for dev auto-creation
- Use Alembic migrations for schema changes
- SQLite default, supports PostgreSQL/MySQL via `DATABASE_URL`

## Common Development Tasks

### Adding New Routes
- Add to `app/routes.py` with `@jwt_required()` decorator
- Use `get_jwt_identity()` for user ID
- Return JSON responses with appropriate HTTP codes

### Modifying Database Models
1. Update model in `app/models.py`
2. `flask db migrate -m "description"`
3. `flask db upgrade`
4. Update related routes if needed

### Adding AI Features
- Use `app/agent/chat_agent.py` for ADK integration
- Coordinator agent routes to text/media agents
- Support streaming responses for real-time UX
- Include conversation history for context

### Actionable facts & quick rules
- API keys: `UserApiKey.set_encrypted_key()` / `get_decrypted_key()` rely on `ENCRYPTION_KEY` in env; avoid decrypting globally.
- Language: coordinator enforces language matching (see COORDINATOR_AGENT_INSTRUCTION).
- Session IDs: `conv_{user_id}_{conversation_id}` — use this when you need persistent agent sessions.
- Streaming: `/chat/stream` (SSE) uses `agent.generate_streaming_response(...)`; socket handlers use the same generator.
- File uploads: supported MIME types & 500MB limit enforced in `app/agent/chat_agent.py`; use `gcp_bucket.upload_image_to_gcs` for uploads.
- GCS: set `GCS_CREDENTIALS_PATH` or `GOOGLE_APPLICATION_CREDENTIALS` and `GCS_BUCKET_NAME`.

### Useful commands / quick examples
- Dev setup: `python -m venv .venv && source .venv/bin/activate && pip install -r requirements.txt`
- Run server (dev): `python run.py` (socketio.run)
- Migrations: `flask db migrate -m "msg" && flask db upgrade` or set `CREATE_DB_ON_STARTUP=true` for quick dev
- Tests: `pytest`; run `test/test_multi_agent.py` for streaming example (it shows how to call `generate_streaming_response`).

### Patterns & constraints to follow
- Do not set a global `GOOGLE_API_KEY` across threads; use per-user keys cached by ChatAgentManager.
- When changing streaming output, preserve prefix-stripping logic in `routes` and `socket_events` (e.g., remove 'Assistant:', 'AI:').
- When deleting conversations, delete associated GCS files first (`routes.delete_conversation`).

### Where to add tests
- Add unit tests in `test/`; mock GCS functions for file tests and test streaming by calling `generate_streaming_response` directly.


### File Operations
- Use `app/gcp_bucket.py` functions for GCS
- Store metadata in `FileUpload` model
- Associate files with conversations/messages
- Handle cleanup on deletion

## Security Considerations

- API keys encrypted at rest using Fernet
- JWT tokens with configurable expiration
- File uploads validated for type/size (500MB limit)
- User input sanitized before AI processing
- GCS credentials secured via environment variables</content>
<parameter name="filePath">/workspaces/XIAOICE/.github/copilot-instructions.md