# Project Structure

## Directory Organization

```
XIAOICE/
├── app/                          # Main Flask application
│   ├── agent/                    # Multi-agent AI system (Google ADK)
│   │   ├── chat_agent.py        # Agent manager, coordinator, text & media agents
│   │   └── __init__.py
│   ├── pose_detection/          # Pose detection modules
│   │   ├── __init__.py
│   │   └── *.js                 # Frontend pose detection modules
│   ├── static/                  # Static assets
│   │   ├── css/                 # Page-specific stylesheets
│   │   ├── js/                  # Frontend JavaScript modules
│   │   ├── data/                # Static data files
│   │   ├── i18n/                # Internationalization files
│   │   └── upload/              # User uploaded files (temporary)
│   ├── templates/               # Jinja2 HTML templates
│   ├── __init__.py              # Flask app factory, extensions init
│   ├── auth.py                  # Authentication routes and logic
│   ├── config.py                # Configuration from environment
│   ├── gcp_bucket.py            # Google Cloud Storage integration
│   ├── models.py                # SQLAlchemy database models
│   ├── routes.py                # Main application routes
│   └── socket_events.py         # WebSocket event handlers
├── .devcontainer/               # Docker development environment
├── document/                    # Project documentation
├── instance/                    # Instance-specific data (SQLite DB)
├── migrations/                  # Database migration files (Alembic)
├── test/                        # Test suite
├── .env                         # Environment variables (DO NOT COMMIT)
├── .env.example                 # Environment template
├── requirements.txt             # Python dependencies
└── run.py                       # Application entry point
```

## Key Modules

### Backend Core

- **`app/__init__.py`**: Flask app factory, initializes extensions (db, migrate, jwt, socketio)
- **`app/config.py`**: Configuration class loading from environment variables
- **`app/models.py`**: Database models (User, Conversation, Message, UserProfile, UserApiKey)
- **`app/routes.py`**: HTTP routes for pages and API endpoints
- **`app/auth.py`**: Authentication blueprint (login, signup, password reset)
- **`app/socket_events.py`**: WebSocket handlers for chat and pose detection

### AI System

- **`app/agent/chat_agent.py`**: Multi-agent system with:
  - `ChatAgentManager`: Manages agent instances per user
  - `xiaoice_coordinator`: Routes requests to specialized agents
  - `text_agent`: Handles plain text conversations
  - `media_agent`: Analyzes images and videos
  - Session management tied to conversation IDs

### Frontend Architecture

- **Modular JavaScript**: Each page has dedicated JS modules
  - `chatbox.js`: Main chat interface logic
  - `sidebar.js`: Conversation management
  - `settings.js`: User preferences
  - `socket_module.js`: WebSocket connection management
  - `api_module.js`: HTTP API interactions
  - `pose_detection.js`: Pose detection UI
  - `pose_renderer.js`: Canvas rendering for pose visualization

- **Page-specific CSS**: Separate stylesheets for each major feature
  - `chatbox.css`, `sidebar.css`, `settings.css`, `login_signup.css`, etc.

## Architectural Patterns

### Multi-Agent System

The AI system uses a coordinator pattern:
1. User request → Coordinator agent
2. Coordinator analyzes content type
3. Routes to Text agent (plain text) or Media agent (images/videos)
4. Specialized agent processes and responds

### Session Management

- Sessions tied to database conversation IDs: `conv_{user_id}_{conversation_id}`
- Persistent context across messages within a conversation
- Per-user agent instances with custom API keys and model preferences

### WebSocket Communication

- Real-time bidirectional communication for chat and pose detection
- Event-based architecture: `send_message`, `ai_response_chunk`, `pose_frame`, etc.
- Room-based messaging: `conversation_{conversation_id}`

### Database Models

- **User**: Authentication and profile
- **Conversation**: Chat sessions with titles
- **Message**: Individual messages (user/assistant)
- **UserProfile**: Preferences (theme, language, AI model)
- **UserApiKey**: Encrypted API keys per user

## File Naming Conventions

- **Python**: Snake case (`chat_agent.py`, `socket_events.py`)
- **JavaScript**: Camel case for functions, snake case for files (`api_module.js`)
- **CSS**: Kebab case for classes, snake case for files (`chatbox.css`)
- **Templates**: Snake case (`login_signup.html`)

## Import Patterns

### Flask App Context

```python
from app import create_app, socketio
from app.models import db, User, Conversation
```

### Agent System

```python
from app.agent import chat_agent
response = chat_agent.generate_streaming_response(...)
```

### Configuration

```python
from flask import current_app
config_value = current_app.config['SETTING_NAME']
```

## Testing Structure

- **Unit tests**: `test/test_*.py` for individual components
- **Property-based tests**: Using Hypothesis for pose detection and action recognition
- **API tests**: `test/test_api.py` for endpoint validation
- **Multi-agent tests**: `test/test_multi_agent.py` for agent system

## Security Considerations

- **Never commit**: `.env`, `ENCRYPTION_KEY`, API keys
- **Encrypted storage**: User API keys encrypted with Fernet
- **JWT tokens**: Secure authentication with configurable expiry
- **File validation**: MIME type and size checks for uploads
- **CORS**: Configured for WebSocket connections

## Development Workflow

1. Modify code in `app/` directory
2. Database changes: `flask db migrate` → `flask db upgrade`
3. Test changes: `pytest` or specific test files
4. Run dev server: `python run.py`
5. Access at `http://localhost:5000`

## Extension Points

To add new features:

- **New agent**: Add to `app/agent/chat_agent.py` sub_agents list
- **New route**: Add to `app/routes.py` or create new blueprint
- **New WebSocket event**: Add handler in `app/socket_events.py`
- **New model**: Add to `app/models.py` and run migration
- **New frontend module**: Create in `app/static/js/` and import in template
