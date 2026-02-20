# PROJECT KNOWLEDGE BASE

**Generated:** 2026-01-26T17:19:14Z
**Commit:** e9c865f
**Branch:** Ryan

## OVERVIEW
Flask + SocketIO web app with ADK multi-agent backend, multimodal chat, and browser-based pose detection.

## STRUCTURE
```
XIAOICE/
├── app/                 # Flask app, AI agents, static assets
├── docs/                # Feature and deployment guides
├── migrations/          # Alembic/Flask-Migrate setup
├── test/                # Pytest + utility scripts
├── .devcontainer/       # Dev DB + pgAdmin
└── run.py               # Dev entry point (socketio.run)
```

## WHERE TO LOOK
| Task | Location | Notes |
|------|----------|-------|
| App factory + SocketIO | app/__init__.py | create_app(), socketio init, static video route |
| HTTP endpoints | app/routes.py | SSE streaming, uploads, assessments |
| WebSocket events | app/socket_events.py | JWT auth on connect, streaming events |
| AI orchestration | app/agent/chat_agent.py | ADK coordinator + specialists |
| Models | app/models.py | User, Conversation, Message, FileUpload, assessments |
| GCS helpers | app/gcp_bucket.py | upload/download/delete abstractions |
| Pose detection JS | app/pose_detection/ | MediaPipe + analyzers |
| Frontend JS | app/static/js/ | Chat UI, settings, assessments |
| Frontend CSS | app/static/css/ | Page-specific styles |
| Templates | app/templates/ | Jinja pages; settings included |
| Static videos | app/videos_quesyions/ | Served via /static/videos_quesyions |

## CODE MAP
LSP unavailable in this repo (basedpyright not installed).

## CONVENTIONS
- Flask app factory pattern: create_app() in app/__init__.py.
- Blueprints registered in create_app(); JWT + SocketIO initialized there.
- Static assets are flat, feature-named files (no bundler).
- Pose detection JS lives in app/pose_detection and is imported by static/pose_detection.js.
- Session IDs: conv_{user_id}_{conversation_id} (AI sessions).

## ANTI-PATTERNS (THIS PROJECT)
- Do NOT commit secrets: .env, .credentials/* (GCP service account). These exist locally but should stay untracked.
- Do NOT replace optimistic UI images/files in chatbox.js (prevents flicker).
- Avoid renaming videos_quesyions without updating its custom route and references.

## UNIQUE STYLES
- Multi-agent ADK orchestration with coordinator + text/media/pdf agents.
- Dual streaming paths: SSE (/chat/stream) + Socket.IO events.
- Pose detection pipeline implemented in vanilla JS modules.

## COMMANDS
```bash
python run.py
flask db migrate -m "msg" && flask db upgrade
pytest
cd .devcontainer && docker-compose up -d
```

## NOTES
- migrations/versions is currently empty; schema lives in models.py.
- .venv and __pycache__ should remain ignored.

# XIAOICE Agent Guidelines

**Last Updated:** 2026-02-18

## Quick Commands

```bash
# Development server
python run.py

# Database migrations
flask db migrate -m "description" && flask db upgrade

# Run all tests
pytest

# Run single test file
pytest test/test_rag.py -v

# Run single test
pytest test/test_rag.py::TestRagEndpoints::test_list_documents_requires_admin -v

# Database inspection
python view_database.py users
python view_database.py search "keyword"
python view_database.py stats

# Docker development environment
cd .devcontainer && docker-compose up -d
```

## Code Style Guidelines

### General Principles
- **Concise responses**: Answer directly with minimal preamble (1-3 sentences).
- **Avoid explanations unless asked**: Don't add unnecessary context.
- **Single responsibility**: Each function/method should do one thing well.

### Python Conventions

#### Imports
```python
# Standard library first, then third-party, then local
import os
import json
from datetime import datetime

from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required, get_jwt_identity
from sqlalchemy import func

from . import gcp_bucket
from .models import User, Conversation, Message
```

#### Naming
- **Classes**: `PascalCase` (e.g., `UserProfile`, `ChatAgent`)
- **Functions/variables**: `snake_case` (e.g., `get_user`, `file_path`)
- **Constants**: `UPPER_SNAKE_CASE` (e.g., `MAX_FILE_SIZE`)
- **Private methods**: Prefix with underscore (e.g., `_internal_method`)

#### Type Hints (Recommended)
```python
def process_message(user_id: int, content: str) -> dict:
    """Process a chat message and return result."""
    result: dict = {'status': 'success'}
    return result
```

#### Error Handling
```python
# Preferred: Specific exception handling
try:
    user = User.query.get(user_id)
    if not user:
        return jsonify({'error': 'User not found'}), 404
except Exception as e:
    current_app.logger.error(f"Error getting user: {e}")
    return jsonify({'error': 'Internal server error'}), 500
```

#### Database Models
```python
class User(db.Model):
    __tablename__ = 'users'
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    
    # Use descriptive column names
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationships with backref
    children = db.relationship('Child', backref='user', lazy=True, 
                               cascade='all, delete-orphan')
```

#### Routes/Endpoints
```python
bp = Blueprint('main', __name__)

@bp.route('/endpoint', methods=['POST'])
@jwt_required()
def handle_endpoint():
    """Description of what this endpoint does."""
    user_id = get_jwt_identity()
    data = request.get_json()
    
    # Validate input early
    if not data or 'field' not in data:
        return jsonify({'error': 'Missing required field'}), 400
    
    # Business logic
    result = process_data(data)
    
    return jsonify(result), 200
```

### JavaScript Conventions

#### File Structure (Vanilla JS - No Bundler)
```javascript
// app/static/js/chatbox.js
// app/pose_detection/pose_detector_3d.js

class PoseDetector3D {
    constructor(videoElement, canvasElement) {
        this.video = videoElement;
        this.canvas = canvasElement;
    }
    
    async initialize() {
        // MediaPipe setup
    }
}
```

#### Naming
- **Classes**: `PascalCase`
- **Functions/variables**: `camelCase`
- **Constants**: `UPPER_SNAKE_CASE`
- **Private methods**: Prefix with underscore

### Anti-Patterns to Avoid

1. **Do NOT commit secrets**: Never commit `.env`, `.credentials/*`, or `*service-account*.json`
2. **Do NOT set global Google API keys**: Use per-user encrypted keys via `UserApiKey`
3. **Do NOT rename `videos_quesyions/`**: This has a custom route in `__init__.py`
4. **Do NOT replace optimistic UI images in `chatbox.js`**: Prevents flicker
5. **Do NOT use global state for user API keys**: Use `ChatAgentManager` caching

### Session IDs
- Format: `conv_{user_id}_{conversation_id}`
- Used for persistent ADK agent sessions

### Streaming Responses
- Two paths: SSE (`/chat/stream`) and Socket.IO events
- Preserve prefix-stripping logic (remove 'Assistant:', 'AI:', etc.)

### Database Operations
- Use Flask-SQLAlchemy patterns from `app/models.py`
- Always include foreign keys and indexes on frequently queried columns
- Use `cascade='all, delete-orphan'` for parent-child relationships

### File Uploads
- Use `gcp_bucket.py` utilities for GCS operations
- 500MB limit enforced in `chat_agent.py`
- Supported MIME types defined in config

### User Feedback Requirement
Per copilot-instructions.md: Always request user feedback using the `question` tool after completing tasks. A process is complete only when user explicitly indicates "end" or "no further interaction needed".

### Documentation
- Use docstrings for all public functions
- Keep docstrings concise - one line for simple functions
- Include parameter types and return types in docstrings

### Testing
- Place tests in `test/` directory
- Mock GCS functions - don't depend on real GCS in tests
- Use `pytest -v` for verbose output
- Run specific tests: `pytest test/path::TestClass::test_method -v`

### Configuration
- All config via environment variables (`.env`)
- Use `config.py` for application settings
- Encryption requires `ENCRYPTION_KEY` in env

### Key Files Reference
| Task | Location |
|------|----------|
| App factory | `app/__init__.py` |
| Routes | `app/routes.py` |
| WebSocket | `app/socket_events.py` |
| Models | `app/models.py` |
| Auth | `app/auth.py` |
| GCS | `app/gcp_bucket.py` |
| AI Agent | `app/agent/chat_agent.py` |
