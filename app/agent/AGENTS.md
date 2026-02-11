# app/agent/ — ADK Multi-Agent System

## OVERVIEW
Google ADK multi-agent orchestration for XIAOICE chat. Three-agent architecture:
- **Coordinator** (xiaoice_coordinator): routes tasks, receives analysis, streams to users.
- **PDF agent**: analyzes PDF docs, returns structured findings to coordinator.
- **Media agent**: analyzes images/videos, returns structured findings to coordinator.

All agents use same Gemini model (per-user choice). Streaming responses via generator.

## FILE STRUCTURE

```
app/agent/
├── __init__.py              # Backward compatibility wrapper
├── chat_agent.py            # Core agent logic, session management
├── prompts.py               # All agent system instructions (COORDINATOR, PDF, MEDIA)
├── knowledge_base.py        # RAG developmental milestone data and retrieval functions
└── video_analysis_agent.py  # Video analysis agents (uses knowledge_base.py)
```

## WHERE TO LOOK
| Task | File | Key Element |
|------|------|-------------|
| Agent creation | chat_agent.py | `_create_agent()`, `ChatAgentManager` |
| Multi-agent wiring | chat_agent.py | `sub_agents=[pdf_agent, media_agent]` |
| Streaming interface | chat_agent.py | `generate_streaming_response()`, `generate_streaming_response_async()` |
| System instructions | **prompts.py** | `COORDINATOR_AGENT_INSTRUCTION`, `PDF_AGENT_INSTRUCTION`, `MEDIA_AGENT_INSTRUCTION` |
| RAG knowledge data | **knowledge_base.py** | `DEVELOPMENTAL_STANDARDS`, `get_age_standards_tool()` |
| Session management | chat_agent.py | `get_session_id()`, `InMemorySessionService` |
| File validation | chat_agent.py | `_validate_file()`, `SUPPORTED_MIME_TYPES`, `MAX_FILE_SIZE` |
| Backward compat shim | __init__.py | `init_gemini()`, re-exported functions |

## HOW TO MODIFY

### Updating Agent Instructions
Edit `app/agent/prompts.py`:
```python
# Modify COORDINATOR_AGENT_INSTRUCTION, PDF_AGENT_INSTRUCTION, or MEDIA_AGENT_INSTRUCTION
```

### Updating RAG Knowledge Base
Edit `app/agent/knowledge_base.py`:
```python
# Add or modify milestones in DEVELOPMENTAL_STANDARDS dictionary
# Update retrieval functions if needed
```

### Creating New Agents
1. Add instruction to `prompts.py`
2. Import in `chat_agent.py`
3. Create agent in `_create_agent()` method

## CONVENTIONS
- **Session IDs**: `conv_{user_id}_{conversation_id}` for persistent sessions, `temp_{user_id}` for quick queries.
- **Per-user API keys**: cached in `ChatAgentManager._api_keys`; each runner tied to user_id + model_name.
- **Agent/runner caching**: keyed by `{user_id}_{model_name}` to avoid recreating across requests.
- **ADK Runner app_name**: `"agents"` (must match agent package structure).
- **Streaming**: uses queue + thread to bridge async ADK runner to sync Flask routes.
- **Language matching**: coordinator enforces response language matches user input (Chinese/English/Japanese).

## ANTI-PATTERNS
- **Do NOT set global `GOOGLE_API_KEY`** across threads; use per-user cache in manager.
- **Do NOT call `generate_streaming_response()` without user_id/conversation_id** if session context needed.
- **Do NOT rename agents** without updating instructions that reference them (coordinator delegates by name).
- **Avoid decrypting API keys globally**; pass them per-request to `get_or_create_runner()`.

## NOTES
- File uploads: supports PDF, images (JPEG/PNG/WebP/HEIC), videos (MP4/MOV/AVI/WEBM/3GPP); 500MB limit enforced in `_validate_file()`.
- Coordinator delegates via sub_agents; specialists do NOT interact with users directly.
- History context built in `build_message_content()`; ADK sessions maintain multi-turn context.
- `__init__.py` provides legacy `init_gemini()` for backward compat; actual logic lives in `chat_agent.py`.
- Session cleanup: `clear_conversation_session()` removes session data when conversation deleted from DB.
- Async/sync duality: `generate_streaming_response()` wraps async version with threading.Queue for sync Flask routes.
