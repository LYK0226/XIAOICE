# XIAOICE Multi-Agent System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              USER INTERFACE                                  │
│                         (Web App / API Endpoint)                            │
└─────────────────────────────────┬───────────────────────────────────────────┘
                                  │
                                  │ User Request
                                  │ (message + optional image/video)
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         COORDINATOR AGENT                                    │
│                      (xiaoice_coordinator)                                   │
│                                                                              │
│  ┌────────────────────────────────────────────────────────────────────┐    │
│  │ Analyze Request:                                                    │    │
│  │  • Check for image/video attachments                               │    │
│  │  • Evaluate message content type                                   │    │
│  │  • Determine appropriate specialist agent                          │    │
│  └────────────────────────────────────────────────────────────────────┘    │
│                                                                              │
│                        ┌─────────────┴──────────────┐                       │
└────────────────────────┼────────────────────────────┼───────────────────────┘
                         │                            │
                         │                            │
          Contains       │                            │  Contains
          Images/Videos? │                            │  Text Only?
                         │                            │
                         ▼                            ▼
        ┌────────────────────────────┐  ┌────────────────────────────┐
        │      MEDIA AGENT           │  │       TEXT AGENT           │
        │    (media_agent)           │  │     (text_agent)           │
        │                            │  │                            │
        │  ┌──────────────────────┐ │  │  ┌──────────────────────┐ │
        │  │ Capabilities:        │ │  │  │ Capabilities:        │ │
        │  │  • Image analysis    │ │  │  │  • Q&A               │ │
        │  │  • Video analysis    │ │  │  │  • Conversation      │ │
        │  │  • Visual Q&A        │ │  │  │  • Knowledge tasks   │ │
        │  │  • Scene description │ │  │  │  • Multi-language    │ │
        │  │  • Object detection  │ │  │  │  • Text generation   │ │
        │  └──────────────────────┘ │  │  └──────────────────────┘ │
        │                            │  │                            │
        │  Model: gemini-2.5-flash  │  │  Model: gemini-2.5-flash  │
        └────────────┬───────────────┘  └────────────┬───────────────┘
                     │                               │
                     │ Streaming Response            │ Streaming Response
                     │                               │
                     └───────────────┬───────────────┘
                                     │
                                     ▼
                    ┌────────────────────────────────┐
                    │     SESSION MANAGEMENT         │
                    │  (InMemorySessionService)      │
                    │                                │
                    │  • Persistent sessions         │
                    │  • Conversation history        │
                    │  • Context preservation        │
                    │  • Per-user isolation          │
                    └────────────┬───────────────────┘
                                 │
                                 ▼
                    ┌────────────────────────────────┐
                    │      RESPONSE STREAM           │
                    │   (Back to User Interface)     │
                    └────────────────────────────────┘


┌─────────────────────────────────────────────────────────────────────────────┐
│                         SUPPORTING SERVICES                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌──────────────────────┐  ┌──────────────────────┐  ┌─────────────────┐  │
│  │  Google Cloud        │  │  Database            │  │  API Key        │  │
│  │  Storage (GCS)       │  │  (SQLite/PostgreSQL) │  │  Management     │  │
│  │                      │  │                      │  │                 │  │
│  │  • File uploads      │  │  • Conversations     │  │  • Per-user     │  │
│  │  • Image storage     │  │  • Messages          │  │  • Encryption   │  │
│  │  • Video storage     │  │  • User profiles     │  │  • Validation   │  │
│  └──────────────────────┘  └──────────────────────┘  └─────────────────┘  │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘


ROUTING DECISION FLOW:
═════════════════════

  User Message + Attachments
           │
           ▼
  ┌─────────────────┐
  │  Coordinator    │──── Has Image/Video? ────YES───▶ Media Agent
  │  Analyzes       │                                  (Visual Analysis)
  │  Content Type   │                                         │
  └─────────────────┘                                         │
           │                                                  │
           NO (Text Only)                                     │
           │                                                  │
           ▼                                                  │
      Text Agent                                              │
  (Conversation/Q&A)                                          │
           │                                                  │
           └──────────────────┬───────────────────────────────┘
                              │
                              ▼
                    Specialized Response
                    (Directly to User)


KEY FEATURES:
════════════

✓ Intelligent Routing      - Coordinator automatically selects the best agent
✓ Specialized Processing   - Each agent optimized for specific tasks
✓ Context Preservation     - Sessions maintain conversation history
✓ Multi-language Support   - English, Chinese, and more
✓ Streaming Responses      - Real-time token-by-token output
✓ Scalable Design          - Easy to add new specialized agents
✓ Per-user Isolation       - API keys and sessions isolated by user
```

## Request Flow Examples

### Example 1: Text Question
```
User: "What is machine learning?"
  ↓
Coordinator: Analyzes → No media, text question
  ↓
Routes to: Text Agent
  ↓
Text Agent: Generates comprehensive explanation
  ↓
User receives: Detailed text response about machine learning
```

### Example 2: Image Analysis
```
User: "What's in this image?" + photo.jpg
  ↓
Coordinator: Analyzes → Image attachment detected
  ↓
Routes to: Media Agent
  ↓
Media Agent: Analyzes image, identifies objects, scenes
  ↓
User receives: "I see a sunset over a beach with palm trees..."
```

### Example 3: Video Analysis
```
User: "Summarize this video" + video.mp4
  ↓
Coordinator: Analyzes → Video attachment detected
  ↓
Routes to: Media Agent
  ↓
Media Agent: Analyzes video frames and content
  ↓
User receives: "The video shows a cooking demonstration..."
```

## Session Management

```
User A, Conversation 1  ─────▶  Session: conv_userA_1
User A, Conversation 2  ─────▶  Session: conv_userA_2
User B, Conversation 1  ─────▶  Session: conv_userB_1

Each session maintains:
  • Conversation history
  • Agent state
  • User preferences
  • Model selection
```

## Agent Configuration

All agents share common configuration but have specialized instructions:

```python
# Shared Configuration
- Model: gemini-2.5-flash (or user-selected)
- Temperature: 1.0
- Max Output Tokens: 8192
- Safety Settings: Medium and above blocking

# Specialized Instructions
- Coordinator: Routes based on content type
- Text Agent: Conversational, general knowledge
- Media Agent: Visual analysis, detailed descriptions
```
