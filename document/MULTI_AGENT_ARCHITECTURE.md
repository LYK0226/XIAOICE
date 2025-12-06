# XIAOICE Multi-Agent Architecture

## Overview

The XIAOICE chatbot has been upgraded from a single-agent system to a sophisticated multi-agent architecture using Google's Agent Development Kit (ADK). This new design provides intelligent task distribution and specialized processing for different types of user requests.

## Architecture Components

### 1. Coordinator Agent (`xiaoice_coordinator`)

**Role:** Task Router and Orchestrator

The coordinator agent is the entry point for all user interactions. It analyzes incoming requests and intelligently routes them to the appropriate specialized agent.

**Key Responsibilities:**
- Analyze user messages to determine content type (text-only vs. media)
- Route plain text questions to the text agent
- Route image/video requests to the media agent
- Maintain conversational context across agent transitions

**Routing Logic:**
- If message contains images or videos → delegate to `media_agent`
- If message is plain text only → delegate to `text_agent`

### 2. Text Agent (`text_agent`)

**Role:** Plain Text Conversation Specialist

Handles all text-based interactions including general questions, conversations, and knowledge queries.

**Capabilities:**
- General knowledge Q&A
- Conversational dialogue
- Multi-language support (English, Chinese, etc.)
- Context-aware responses based on conversation history

**Optimized For:**
- Quick text responses
- Natural conversation flow
- Factual question answering
- General assistance

### 3. Media Agent (`media_agent`)

**Role:** Visual Content Analysis Specialist

Dedicated to analyzing and understanding visual content (images and videos).

**Capabilities:**
- Detailed image description
- Video content analysis
- Object and scene recognition
- Visual question answering
- Multi-language visual descriptions

**Optimized For:**
- Accurate visual analysis
- Detailed descriptions
- Context extraction from visual media
- Answering questions about visual content

## Data Flow

```
User Request
    ↓
Coordinator Agent (Analyzes Request)
    ↓
    ├─→ Text Agent (if plain text) → Response to User
    │
    └─→ Media Agent (if image/video) → Response to User
```

## Key Advantages

### 1. **Specialized Performance**
Each agent is optimized for specific tasks, providing better results than a one-size-fits-all approach.

### 2. **Intelligent Routing**
The coordinator automatically selects the best agent for each request without user intervention.

### 3. **Scalability**
New specialized agents can be added easily (e.g., code analysis agent, document processing agent).

### 4. **Clear Separation of Concerns**
Each agent has a well-defined purpose, making the system easier to maintain and improve.

### 5. **Context Preservation**
Session management ensures conversation context is maintained across agent transitions.

## Technical Implementation

### Agent Configuration

All agents share common configuration:
```python
generate_content_config = types.GenerateContentConfig(
    temperature=1.0,
    top_p=0.95,
    max_output_tokens=8192,
    safety_settings=[...]  # Content safety filters
)
```

### Session Management

- Sessions are tied to database conversation IDs for persistence
- Each user conversation maintains context across multiple agent calls
- Session format: `conv_{user_id}_{conversation_id}`

### Content Processing

The system handles different content types:

**Text Content:**
```python
text_part = types.Part.from_text(text=message)
```

**Media Content:**
```python
media_part = types.Part.from_bytes(data=file_data, mime_type=mime_type)
```

Both parts can be combined in a single request, allowing the coordinator to make informed routing decisions.

## Usage Examples

### Example 1: Text-Only Question

**User Input:**
```
"What is the capital of France?"
```

**Flow:**
1. Coordinator receives request
2. Analyzes: No media attached, plain text question
3. Routes to Text Agent
4. Text Agent responds: "The capital of France is Paris."

### Example 2: Image Analysis

**User Input:**
```
Message: "What do you see in this image?"
Attachment: photo.jpg (image/jpeg)
```

**Flow:**
1. Coordinator receives request with image
2. Analyzes: Image attached, visual analysis needed
3. Routes to Media Agent
4. Media Agent responds with detailed image description

### Example 3: Video Analysis

**User Input:**
```
Message: "Summarize what happens in this video"
Attachment: video.mp4 (video/mp4)
```

**Flow:**
1. Coordinator receives request with video
2. Analyzes: Video attached, visual analysis needed
3. Routes to Media Agent
4. Media Agent provides comprehensive video summary

## Supported Media Formats

### Images
- JPEG (image/jpeg)
- PNG (image/png)
- WebP (image/webp)
- HEIC (image/heic)
- HEIF (image/heif)

### Videos
- MP4 (video/mp4)
- MPEG (video/mpeg)
- MOV (video/mov)
- AVI (video/avi)
- FLV (video/x-flv)
- MPG (video/mpg)
- WebM (video/webm)
- WMV (video/wmv)
- 3GPP (video/3gpp)

**File Size Limit:** 500MB per file

## Configuration

### Environment Variables

Required configuration in `.env`:
```bash
# Google AI API Key
GOOGLE_API_KEY="your_api_key_here"

# Default Model (used for all agents)
GEMINI_MODEL="gemini-2.5-flash"

# Google Cloud Storage (for file uploads)
GCS_BUCKET_NAME="your-bucket-name"
GCS_CREDENTIALS_PATH="/path/to/credentials.json"
```

### Model Selection

All agents in the system use the same underlying model (configurable per user):
- Default: `gemini-2.5-flash` (fast, efficient)
- Alternative: `gemini-2.5-pro` (more capable, slower)

Users can select their preferred model through the settings interface.

## Future Enhancements

The multi-agent architecture makes it easy to add new specialized agents:

### Potential Additional Agents

1. **Code Agent**
   - Specialized in programming questions
   - Code review and debugging
   - Multi-language code generation

2. **Document Agent**
   - PDF and document analysis
   - Long-form content summarization
   - Document Q&A

3. **Research Agent**
   - Web search integration
   - Fact-checking
   - Citation management

4. **Creative Agent**
   - Story writing
   - Content generation
   - Creative brainstorming

### Adding a New Agent

To add a new specialized agent:

1. Define the agent instruction in `chat_agent.py`
2. Create the agent in `_create_agent()` method
3. Add to coordinator's `sub_agents` list
4. Update coordinator instruction with routing logic
5. Test the new agent integration

## Performance Considerations

### Response Time
- **Text Agent**: Fast responses (typically < 2 seconds)
- **Media Agent**: Slower due to file processing (3-10 seconds depending on file size)
- **Coordinator**: Minimal overhead (< 100ms for routing)

### Resource Usage
- Each agent shares the same model backend
- Session state is lightweight (stored in memory)
- File uploads are cached in GCS, not in memory

### Scalability
- Agents can be scaled independently if needed
- Session service can be replaced with distributed storage for horizontal scaling
- GCS provides reliable file storage with automatic scaling

## Monitoring and Debugging

### Logging

The system provides detailed logging:
```python
logger.info(f"Using session: {session_id} for user: {user_id}")
logger.info(f"Processing file: path={image_path}, mime_type={image_mime_type}")
```

### Error Handling

Comprehensive error messages for:
- API key issues
- Region restrictions
- File validation errors
- Quota limits
- Network issues

### Testing

Test different agent behaviors:
```python
# Test text agent
response = generate_streaming_response(
    message="Hello, how are you?",
    user_id="test_user",
    conversation_id=1
)

# Test media agent
response = generate_streaming_response(
    message="What's in this image?",
    image_path="gs://bucket/image.jpg",
    image_mime_type="image/jpeg",
    user_id="test_user",
    conversation_id=1
)
```

## Conclusion

The multi-agent architecture provides XIAOICE with:
- ✅ Intelligent task distribution
- ✅ Specialized processing for different content types
- ✅ Better performance through optimization
- ✅ Easier maintenance and feature additions
- ✅ Scalable design for future growth

This upgrade transforms XIAOICE from a single-purpose chatbot into a versatile AI assistant capable of handling diverse user needs with specialized expertise.
