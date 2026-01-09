# XIAOICE AI Assistant - Developer Guidelines

## Architecture Overview

XIAOICE is a multi-user Flask web application with Google Gemini AI integration, WebSocket streaming, and real-time pose detection.

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
- Users select model via `UserProfile.ai_model` (e.g., `gemini-2.5-flash`, `gemini-2.5-pro`)
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
GEMINI_MODEL="gemini-2.5-flash"
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