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
