# app/ — Flask Application Package

## OVERVIEW
Flask app package: factory, routes, models, SocketIO events, GCS helpers, and AI orchestration.

## STRUCTURE
```
app/
├── __init__.py          # create_app factory, SocketIO/JWT init, blueprints, static video route
├── routes.py            # HTTP endpoints (chat, uploads, assessments, video)
├── socket_events.py     # WebSocket handlers (chat streaming, auth)
├── auth.py              # Auth endpoints + validation helpers
├── models.py            # SQLAlchemy models
├── gcp_bucket.py        # GCS upload/download/delete helpers
├── config.py            # Config class from env vars
├── agent/               # ADK multi-agent orchestration
├── pose_detection/      # Frontend JS modules (pose detection)
├── static/              # JS, CSS, i18n, data
├── templates/           # Jinja HTML pages
└── videos_quesyions/    # Served via custom /static/videos_quesyions route
```

## WHERE TO LOOK
| Task | File | Notes |
|------|------|-------|
| App factory + SocketIO | `__init__.py` | create_app(), socketio.init_app, blueprint registration |
| HTTP routes | `routes.py` | Chat streaming, uploads, assessments, video endpoints |
| WebSocket events | `socket_events.py` | Socket.IO handlers + JWT auth on connect |
| Auth endpoints | `auth.py` | Signup/login/logout + profile helpers |
| Models | `models.py` | User, Conversation, Message, FileUpload, assessments, videos |
| GCS helpers | `gcp_bucket.py` | upload/download/delete abstractions |
| Config | `config.py` | SECRET_KEY, JWT, DB URI, GCS, pose settings |
| AI orchestration | `agent/chat_agent.py` | ADK coordinator + specialists |

## CONVENTIONS
- App factory pattern: `create_app()` initializes db, migrate, jwt, socketio, registers blueprints.
- JWT on HTTP routes via `@jwt_required()`; WebSocket auth uses `auth` payload on connect.
- Encrypted API keys via `UserApiKey.set_encrypted_key()` / `get_decrypted_key()` (`ENCRYPTION_KEY`).
- Session IDs: `conv_{user_id}_{conversation_id}` for ADK agent persistence.
- Streaming: SSE `/chat/stream` and Socket.IO both call ADK streaming generator.
- GCS helpers read `GCS_CREDENTIALS_PATH` or `GOOGLE_APPLICATION_CREDENTIALS`.

## ANTI-PATTERNS
- Do NOT commit `.env` or `.credentials/*` (service accounts).
- Do NOT set global `GOOGLE_API_KEY` across threads; use per-user keys.
- Do NOT rename `videos_quesyions/` without updating custom route in `__init__.py`.
- Preserve prefix-stripping logic in streaming responses (routes + socket_events).

## NOTES
- `videos_quesyions/` served via `@app.route('/static/videos_quesyions/<path:filename>')` in `__init__.py`.
- Model encryption requires `ENCRYPTION_KEY`; keys decrypted only when needed for AI calls.
- File uploads limited to 500MB; metadata stored in `FileUpload`.
