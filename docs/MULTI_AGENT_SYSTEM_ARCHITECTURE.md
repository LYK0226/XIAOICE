# XIAOICE Multi-Agent System Architecture

## Overview

XIAOICE uses Google's Agent Development Kit (ADK) to implement a sophisticated multi-agent system. The architecture consists of a coordinator agent that manages conversations with users and delegates specialized tasks to sub-agents for PDF and media analysis.

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         USER INTERFACE                          │
│                    (Web Browser / Client)                       │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             │ HTTP/WebSocket
                             │
┌────────────────────────────▼────────────────────────────────────┐
│                      FLASK APPLICATION                          │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │              Socket Events / REST API                     │  │
│  │         (socket_events.py / routes.py)                    │  │
│  └──────────────────┬───────────────────────────────────────┘  │
│                     │                                           │
│                     │ Calls                                     │
│                     │                                           │
│  ┌──────────────────▼───────────────────────────────────────┐  │
│  │            ADK Chat Agent System                         │  │
│  │           (app/agent/chat_agent.py)                      │  │
│  │                                                           │  │
│  │  ┌─────────────────────────────────────────────────┐    │  │
│  │  │      ChatAgentManager                           │    │  │
│  │  │  - Manages agent instances per user             │    │  │
│  │  │  - Handles session persistence                  │    │  │
│  │  │  - API key and model management                 │    │  │
│  │  └─────────────────┬───────────────────────────────┘    │  │
│  │                    │                                      │  │
│  │                    │ Creates & Manages                    │  │
│  │                    │                                      │  │
│  │  ┌─────────────────▼───────────────────────────────┐    │  │
│  │  │         COORDINATOR AGENT                       │    │  │
│  │  │        (xiaoice_coordinator)                    │    │  │
│  │  │                                                  │    │  │
│  │  │  Role: Main conversation manager                │    │  │
│  │  │  - Interacts directly with users               │    │  │
│  │  │  - Delegates tasks to specialists               │    │  │
│  │  │  - Integrates analysis results                  │    │  │
│  │  │  - Manages chat history & context               │    │  │
│  │  │  - Handles plain text conversations             │    │  │
│  │  │                                                  │    │  │
│  │  │  Model: gemini-2.5-flash / gemini-2.5-pro      │    │  │
│  │  └──────────────┬──────────────┬───────────────────┘    │  │
│  │                 │              │                          │  │
│  │      Delegates  │              │  Delegates               │  │
│  │      PDF tasks  │              │  Media tasks             │  │
│  │                 │              │                          │  │
│  │  ┌──────────────▼─────────┐ ┌─▼──────────────────────┐  │  │
│  │  │    PDF AGENT           │ │    MEDIA AGENT         │  │  │
│  │  │   (pdf_agent)          │ │   (media_agent)        │  │  │
│  │  │                        │ │                        │  │  │
│  │  │  Specialization:       │ │  Specialization:       │  │  │
│  │  │  - Analyzes PDFs       │ │  - Analyzes images     │  │  │
│  │  │  - Extracts text       │ │  - Analyzes videos     │  │  │
│  │  │  - Summarizes docs     │ │  - Describes visuals   │  │  │
│  │  │  - Multi-language      │ │  - OCR text detection  │  │  │
│  │  │                        │ │  - Scene recognition   │  │  │
│  │  │  Returns: Natural      │ │  Returns: Natural      │  │  │
│  │  │  language analysis     │ │  language description  │  │  │
│  │  │  to coordinator        │ │  to coordinator        │  │  │
│  │  │                        │ │                        │  │  │
│  │  │  Does NOT interact     │ │  Does NOT interact     │  │  │
│  │  │  with users directly   │ │  with users directly   │  │  │
│  │  └────────────────────────┘ └────────────────────────┘  │  │
│  └───────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                             │
                             │ Reads/Writes
                             │
┌────────────────────────────▼────────────────────────────────────┐
│                    PERSISTENT STORAGE                           │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  SQLAlchemy Database (app/models.py)                     │  │
│  │  - Users, UserProfiles, UserApiKeys                      │  │
│  │  - Conversations, Messages                               │  │
│  │  - FileUploads (references to GCS)                       │  │
│  └──────────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Google Cloud Storage (app/gcp_bucket.py)                │  │
│  │  - PDF files                                             │  │
│  │  - Image files                                           │  │
│  │  - Video files                                           │  │
│  └──────────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  ADK Session Storage (InMemorySessionService)            │  │
│  │  - Conversation context per session                      │  │
│  │  - Agent state and history                               │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

## Agent Communication Flow

### Flow 1: Text-Only Conversation

```
User Message (text only)
    │
    ▼
Coordinator Agent
    │
    ├─> Processes directly with Gemini
    │
    ▼
Streams response back to user
```

### Flow 2: PDF Upload and Analysis

```
User uploads PDF + message
    │
    ▼
Coordinator Agent
    │
    ├─> Detects PDF file type
    │
    ├─> Delegates to PDF Agent
    │       │
    │       ├─> Analyzes PDF content
    │       ├─> Extracts key information
    │       └─> Returns natural language analysis
    │
    ├─> Receives analysis results
    │
    ├─> Integrates into conversational response
    │
    ▼
Streams friendly response to user
```

### Flow 3: Image/Video Upload and Analysis

```
User uploads image/video + message
    │
    ▼
Coordinator Agent
    │
    ├─> Detects media file type
    │
    ├─> Delegates to Media Agent
    │       │
    │       ├─> Analyzes visual content
    │       ├─> Identifies objects, scenes, text
    │       └─> Returns natural language description
    │
    ├─> Receives analysis results
    │
    ├─> Integrates into conversational response
    │
    ▼
Streams friendly response to user
```

## Key Components

### 1. ChatAgentManager
**File**: `app/agent/chat_agent.py`

**Responsibilities**:
- Creates and manages ADK Agent instances per user
- Handles per-user API keys and model preferences
- Manages persistent sessions tied to conversation IDs
- Caches agents and runners for performance
- Provides session lifecycle management

**Key Methods**:
- `_create_agent()`: Creates multi-agent hierarchy
- `get_or_create_agent()`: User-specific agent retrieval
- `get_or_create_runner()`: ADK Runner management
- `ensure_session_exists()`: Session initialization
- `clear_conversation_session()`: Session cleanup

### 2. Coordinator Agent (xiaoice_coordinator)

**Model**: `gemini-2.5-flash` or `gemini-2.5-pro` (user-configurable)

**Capabilities**:
- **Direct User Interaction**: Primary interface for all conversations
- **Task Routing**: Intelligently delegates to specialist agents
- **Result Integration**: Combines specialist analysis with conversational context
- **Context Management**: Maintains conversation history across sessions
- **Multi-language Support**: Handles Chinese and English naturally

**Instruction Philosophy**:
- Friendly and conversational tone
- Acts as the "face" of XIAOICE
- Presents specialist results in natural, engaging language
- Adds personal commentary and insights

### 3. PDF Agent (pdf_agent)

**Model**: Same as coordinator (shared model)

**Capabilities**:
- PDF document parsing and analysis
- Multi-language text extraction (Chinese, English, etc.)
- Content summarization
- Key information identification
- Document structure understanding

**Output Style**:
- Natural language descriptions (no structured headers)
- Conversational analysis format
- Returns results to coordinator only
- Does not interact with users directly

**Supported MIME Types**:
- `application/pdf`

### 4. Media Agent (media_agent)

**Model**: Same as coordinator (shared model)

**Capabilities**:
- Image analysis and description
- Video content analysis
- Object and scene recognition
- OCR text detection
- Color, composition, and context analysis
- Temporal sequence understanding (for videos)

**Output Style**:
- Natural language descriptions (no "Visual Overview" headers)
- Flowing, conversational analysis
- Returns results to coordinator only
- Does not interact with users directly

**Supported MIME Types**:
- **Images**: `image/jpeg`, `image/png`, `image/webp`, `image/heic`, `image/heif`
- **Videos**: `video/mp4`, `video/mpeg`, `video/mov`, `video/avi`, `video/x-flv`, `video/mpg`, `video/webm`, `video/wmv`, `video/3gpp`

## Session Management

### Session Persistence
- **Session ID Format**: `conv_{user_id}_{conversation_id}`
- **Tied to Database**: Each conversation in the database has a corresponding ADK session
- **State Storage**: `InMemorySessionService` (can be replaced with persistent storage)
- **Context Retention**: Conversation history maintained across user sessions

### Session Lifecycle
1. **Creation**: Session created when conversation starts
2. **Usage**: Attached to every agent run for context
3. **Persistence**: Maintained throughout conversation lifetime
4. **Cleanup**: Deleted when conversation is removed from database

## File Handling

### Upload Flow
```
User uploads file
    │
    ▼
File sent to Flask endpoint
    │
    ▼
Uploaded to Google Cloud Storage (GCS)
    │
    ▼
GCS URL stored in database (FileUpload model)
    │
    ▼
File downloaded from GCS for agent processing
    │
    ▼
Converted to bytes and attached to ADK Content
    │
    ▼
Passed to appropriate specialist agent
```

### File Validation
- **Size Limit**: 500MB maximum
- **Type Validation**: Only supported MIME types allowed
- **Error Handling**: User-friendly error messages for invalid files

## API Key Management

### Per-User API Keys
- Encrypted at rest using Fernet encryption
- Stored in `user_api_keys` table
- Users can have multiple keys (selects one as active)
- Decrypted only when needed for agent operations

### Model Selection
- Users choose model via `UserProfile.ai_model`
- Options: `gemini-2.5-flash`, `gemini-2.5-pro`, etc.
- Applied to all agents (coordinator and specialists)
- Fallback to environment variable if not set

## Streaming Response

### Async Streaming
- `generate_streaming_response_async()`: Native async implementation
- Event-based streaming from ADK Runner
- Real-time token streaming to WebSocket

### Sync Streaming
- `generate_streaming_response()`: Synchronous wrapper
- Uses thread-based async-to-sync bridge
- Queue-based chunk passing
- Compatible with Flask routes

## Error Handling

### Common Error Scenarios
1. **Invalid API Key**: User-friendly message to check settings
2. **Regional Restrictions**: Suggests VPN or alternative service
3. **Quota Exceeded**: Advises waiting or checking limits
4. **File Errors**: Specific validation error messages
5. **Analysis Failures**: Graceful fallback responses

## Design Principles

### 1. Natural Conversation
- Agents respond conversationally, not with structured formats
- Coordinator presents specialist results in friendly language
- No visible "routing" or "delegation" to users

### 2. Separation of Concerns
- Coordinator: User interaction and conversation management
- Specialists: Focused analysis without user awareness
- Clean delegation pattern with result integration

### 3. User Privacy
- Per-user agent instances
- Isolated API keys and preferences
- No cross-user data leakage

### 4. Scalability
- Agent and runner caching
- Session-based context management
- Efficient file handling via GCS

### 5. Extensibility
- Easy to add new specialist agents
- Pluggable session storage backends
- Configurable models per user

## Technology Stack

- **Agent Framework**: Google Agent Development Kit (ADK)
- **LLM Models**: Gemini 2.5 Flash / Pro
- **Backend**: Flask with SocketIO
- **Database**: SQLAlchemy (SQLite/PostgreSQL)
- **File Storage**: Google Cloud Storage
- **Authentication**: JWT tokens
- **Encryption**: Fernet (for API keys)

## Future Enhancements

### Potential Additions
1. **More Specialist Agents**:
   - Code analysis agent
   - Web search agent
   - Data analysis agent

2. **Advanced Features**:
   - Multi-step reasoning workflows
   - Agent-to-agent collaboration
   - Memory service for long-term context

3. **Performance**:
   - Distributed session storage
   - Agent result caching
   - Parallel specialist invocation

4. **Observability**:
   - Agent performance metrics
   - Decision logging
   - User interaction analytics

## References

- [Google ADK Documentation](https://github.com/google/adk-python)
- [ADK Multi-Agent Systems](https://github.com/google/adk-docs/blob/main/docs/agents/multi-agents.md)
- [Gemini Models Documentation](https://ai.google.dev/gemini-api/docs)
- [XIAOICE Project README](../README.md)
- [API Key Flow Diagram](./API_KEY_FLOW_DIAGRAM.md)
