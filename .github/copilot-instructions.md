# XIAOICE AI Assistant - Developer Guidelines

## Architecture Overview

XIAOICE is a multi-user Flask web application providing AI-powered chat conversations with Google Gemini integration. Key architectural patterns:

### Core Components
- **Flask App Factory**: `app/__init__.py` creates the application instance with blueprints
- **SQLAlchemy Models**: User management, conversations, messages, and file uploads in `app/models.py`
- **JWT Authentication**: Token-based auth with refresh tokens via `app/auth.py`
- **REST API**: Conversation and message management in `app/routes.py`
- **AI Integration**: Google Gemini streaming responses in `app/vertex_ai.py`
- **File Storage**: Google Cloud Storage uploads via `app/gcs_upload.py`

### Data Flow
1. User authenticates → JWT tokens issued
2. User creates/selects conversation → stored in `conversations` table
3. Message sent → stored in `messages` table, files uploaded to GCS
4. AI response generated → streamed back and stored as assistant message

### Key Models
- `User`: Basic user info with password hashing
- `UserProfile`: User preferences (language, theme, selected API key/model)
- `UserApiKey`: Encrypted Google AI API keys per user
- `Conversation`: Chat threads with pinning support
- `Message`: Individual messages with metadata and file attachments
- `FileUpload`: GCS file references with MIME types

## Critical Developer Workflows

### Database Setup
```bash
# Initialize migrations (first time only)
flask db init

# Create migration after model changes
flask db migrate -m "description"

# Apply migrations
flask db upgrade
```

### API Key Encryption
```bash
# Generate encryption key for .env
python3 -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
```

### Testing & Validation
```bash
# Test Google AI API connectivity
python test_api.py

# View database contents
python view_database.py users
python view_database.py profiles
python view_database.py search "username"
```

### Application Startup
```bash
# Development
python run.py

# Production
gunicorn -w 4 -b 0.0.0.0:8080 'app:create_app()'
```

## Project-Specific Patterns

### API Key Management
- API keys encrypted using Fernet with `ENCRYPTION_KEY` environment variable
- Each user can have multiple API keys, selects one via `UserProfile.selected_api_key_id`
- Keys stored encrypted in `user_api_keys` table, decrypted only when needed

### File Uploads
- Files uploaded to Google Cloud Storage buckets
- URLs stored in `file_uploads` table with MIME types and file extensions
- Associated with conversations and messages for context
- Use `gcs_upload.py` utilities for upload/download/delete operations

### AI Model Selection
- Users select AI model via `UserProfile.ai_model` (gemini-2.5-flash, gemini-2.5-pro)
- Model passed to `vertex_ai.generate_streaming_response()`
- Default fallback in config if not set

### Conversation Management
- Conversations pinned via `is_pinned` boolean for quick access
- Auto-generated titles from first user message (60 char limit)
- Cascade deletes: deleting conversation removes messages and associated files

### Authentication Flow
- JWT tokens stored in both headers and secure cookies
- Refresh tokens for session management
- Password validation: minimum 6 characters
- Username validation: 3+ chars, alphanumeric + underscores

## Configuration Requirements

### Environment Variables (.env)
```bash
# Flask
SECRET_KEY="your_secret_key"
FLASK_APP="run.py"
FLASK_ENV="development"

# Database
DATABASE_URL="sqlite:///app.db"  # or PostgreSQL/MySQL URL

# Google AI
GEMINI_MODEL="gemini-2.5-flash"

# Google Cloud Storage
GCS_BUCKET_NAME="your-bucket-name"
GCS_CREDENTIALS_PATH="/path/to/credentials.json"

# Encryption (generate with Python script)
ENCRYPTION_KEY="your_32_byte_encryption_key_here"
```

### Database Initialization
- Set `CREATE_DB_ON_STARTUP=true` for development auto-creation
- Use Alembic migrations for production schema changes
- SQLite default, supports PostgreSQL/MySQL via `DATABASE_URL`

## Common Development Tasks

### Adding New Routes
- Add to `app/routes.py` with `@jwt_required()` decorator
- Use `get_jwt_identity()` for user ID
- Return JSON responses with appropriate HTTP status codes

### Modifying Database Models
1. Update model in `app/models.py`
2. Create migration: `flask db migrate -m "description"`
3. Apply: `flask db upgrade`
4. Update related routes if needed

### Adding AI Features
- Use `vertex_ai.py` for Gemini integration
- Support streaming responses for real-time UX
- Handle both text and image inputs
- Include conversation history for context

### File Operations
- Use `gcs_upload.py` functions for GCS operations
- Store file metadata in `FileUpload` model
- Associate files with conversations/messages
- Handle cleanup on deletion

## Security Considerations

- API keys encrypted at rest using Fernet
- JWT tokens with configurable expiration
- File uploads validated for type and size (16MB limit)
- User input sanitized before AI processing
- GCS credentials secured via environment variables

## Testing Patterns

- API connectivity tests in `test_api.py`
- Authentication tests in `test_auth.py`
- Database inspection via `view_database.py`
- Manual testing through web interface

## Deployment Notes

- Use Gunicorn for production WSGI server
- Configure reverse proxy (nginx) for static files
- Set `JWT_COOKIE_SECURE=true` in production
- Monitor GCS usage and API quotas
- Backup database regularly (SQLite file or PostgreSQL dumps)</content>
<parameter name="filePath">/workspaces/XIAOICE/.github/copilot-instructions.md