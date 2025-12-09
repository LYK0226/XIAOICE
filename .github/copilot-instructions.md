# XIAOICE AI Assistant - Developer Guidelines

## Architecture Overview

XIAOICE is a multi-user Flask web application providing AI-powered chat conversations with Google Gemini integration (part of Google Generative AI / Vertex AI). Key architectural patterns:

### Core Components
- **Flask App Factory**: `app/__init__.py` creates the application instance with blueprints
- **SQLAlchemy Models**: User management, conversations, messages, and file uploads in `app/models.py`
- **JWT Authentication**: Token-based auth with refresh tokens via `app/auth.py`
- **REST API**: Conversation and message management in `app/routes.py`
- **AI Integration**: Google Agent Development Kit streaming responses in `app/agent/`
- **File Storage**: Google Cloud Storage uploads via `app/gcp_bucket.py`

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
- Use `gcp_bucket.py` utilities for upload/download/delete operations

### AI Model Selection
- Users select the AI model via `UserProfile.ai_model` (e.g., `gemini-2.5-flash`, `gemini-2.5-pro`).
- The model is passed to `vertex_ai.generate_streaming_response()`.
- A default fallback model is configured in `config.py` if the user hasn't set one.

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
- Use `gcp_bucket.py` functions for GCS operations
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

### Quick start — Local setup and run (recommended)
Follow these steps to get a local development environment running quickly:

1. Create and activate a virtual environment, install dependencies, and set up `.env`:

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env  # or create your own .env with required vars
```

2. Initialize and migrate the local database (skip if using a dev db):

```bash
flask db init  # run only once per project
flask db migrate -m "init"
flask db upgrade
```

3. Start the development server:

```bash
python run.py
```

4. For faster development, set `CREATE_DB_ON_STARTUP=true` in `.env`.

### Running Tests
Use pytest to run all tests or a subset for a specific area:

```bash
pytest -q
# Or run specific test files
pytest -q test/test_api.py test/test_auth.py
```

If tests rely on environment variables, ensure the `.env` file is configured or pass variables inline.

### CI, Linting & Formatting
We recommend adding or using an existing CI pipeline to run tests and formatting/lint checks. Example local commands:

```bash
# Lint/format with flake8/black
black --check . || true
flake8 || true
```

Consider adding a `pre-commit` config to handle formatting on commit and ensure consistent style.

### Docker & Production Hints
For production deployments, run the app behind a WSGI server such as Gunicorn and an optional reverse proxy like Nginx. Example:

```bash
gunicorn -w 4 -b 0.0.0.0:8080 'app:create_app()'
```

For containerized deployments, add a `Dockerfile` and `docker-compose.yml` to orchestrate the app and a database such as PostgreSQL.

---

### Secrets & Encryption (clarified)
API keys and other secrets must be encrypted at rest. To generate a Fernet encryption key:

```bash
python3 -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
```

Store `ENCRYPTION_KEY` in `.env` or a secure secrets manager and don't commit `.env` to source control.

### Development conveniences
- Use `.env` and `python-dotenv` locally to load environment variables in development.
- Add `CREATE_DB_ON_STARTUP=true` to `.env` for a faster setup when developing.
- Run `python -m pip install -U pip setuptools wheel` before installing requirements to avoid dependency issues.

## Deployment Notes

- Use Gunicorn for production WSGI server
- Configure reverse proxy (nginx) for static files
- Set `JWT_COOKIE_SECURE=true` in production
- Monitor GCS usage and API quotas
- Backup database regularly (SQLite file or PostgreSQL dumps)</content>
<parameter name="filePath">/workspaces/XIAOICE/.github/copilot-instructions.md