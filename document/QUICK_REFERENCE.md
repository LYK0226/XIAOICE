# Multi-Agent System Quick Reference

## What Changed?

### Before (Single Agent)
- One agent handled all requests
- Mixed responsibilities (text + media)
- Less optimized for specific tasks

### After (Multi-Agent)
- **Coordinator Agent**: Routes requests intelligently
- **Text Agent**: Specialized for conversations and Q&A
- **Media Agent**: Specialized for image/video analysis
- Better performance through specialization

## How It Works

### Request Processing

1. **User sends a message** (with or without media)
2. **Coordinator analyzes** the request type
3. **Routes to specialist**: Text Agent OR Media Agent
4. **Specialist responds** directly to the user

### Routing Rules

| Request Type | Routed To | Example |
|-------------|-----------|---------|
| Plain text question | Text Agent | "What is AI?" |
| General conversation | Text Agent | "Hello, how are you?" |
| Text with image | Media Agent | "What's in this image?" + photo.jpg |
| Text with video | Media Agent | "Analyze this video" + video.mp4 |

## Code Changes

### Main File Modified
- `app/agent/chat_agent.py` - Complete multi-agent implementation

### Key Changes

#### 1. New Agent Instructions
```python
COORDINATOR_AGENT_INSTRUCTION  # Routes to specialists
TEXT_AGENT_INSTRUCTION         # Handles text conversations
MEDIA_AGENT_INSTRUCTION        # Analyzes images/videos
```

#### 2. Updated `_create_agent()` Method
Now creates 3 agents:
- Text Agent (specialist)
- Media Agent (specialist)
- Coordinator Agent (with sub_agents)

#### 3. Enhanced Context Building
The `build_message_content()` function now adds hints to help the coordinator make routing decisions.

## Testing

### Run the Test Suite
```bash
# Make sure GOOGLE_API_KEY is set
export GOOGLE_API_KEY="your-api-key-here"

# Run the multi-agent test
python test/test_multi_agent.py
```

### Manual Testing

#### Test Text Agent
```python
from app.agent.chat_agent import generate_streaming_response

response = generate_streaming_response(
    message="What is the capital of France?",
    user_id="test_user",
    conversation_id=1
)

for chunk in response:
    print(chunk, end="", flush=True)
```

#### Test Media Agent (with image)
```python
response = generate_streaming_response(
    message="What do you see in this image?",
    image_path="gs://bucket/path/to/image.jpg",
    image_mime_type="image/jpeg",
    user_id="test_user",
    conversation_id=1
)

for chunk in response:
    print(chunk, end="", flush=True)
```

## API Usage (No Changes Required)

The existing API endpoints continue to work exactly as before:

```javascript
// From frontend (chatbox.js)
fetch('/api/chat', {
    method: 'POST',
    body: formData  // Can include text and/or image
})
```

The multi-agent routing happens automatically behind the scenes!

## Performance Expectations

### Text Requests (Text Agent)
- Response time: 1-3 seconds
- Optimized for speed
- Good for conversations

### Media Requests (Media Agent)
- Response time: 3-10 seconds
- Depends on file size
- Detailed visual analysis

### Routing Overhead (Coordinator)
- Minimal: < 100ms
- Transparent to user
- Efficient delegation

## Adding New Agents (Future)

To add a new specialized agent:

1. **Define instruction**:
   ```python
   NEW_AGENT_INSTRUCTION = """Your specialized instructions..."""
   ```

2. **Create in `_create_agent()`**:
   ```python
   new_agent = Agent(
       name="new_agent",
       model=model_name,
       description="What this agent does",
       instruction=NEW_AGENT_INSTRUCTION,
       generate_content_config=generation_config,
   )
   ```

3. **Add to coordinator**:
   ```python
   coordinator_agent = Agent(
       name="xiaoice_coordinator",
       # ...
       sub_agents=[text_agent, media_agent, new_agent],
   )
   ```

4. **Update coordinator instruction**:
   ```python
   COORDINATOR_AGENT_INSTRUCTION = """
   Your sub-agents are:
   - text_agent: ...
   - media_agent: ...
   - new_agent: Your new agent description
   
   Route requests to new_agent when...
   """
   ```

## Supported Media Types

### Images
- JPEG, PNG, WebP, HEIC, HEIF

### Videos
- MP4, MPEG, MOV, AVI, FLV, MPG, WebM, WMV, 3GPP

### Size Limit
- Maximum: 500MB per file

## Environment Variables

Required in `.env`:
```bash
GOOGLE_API_KEY="your-key"           # Required for all agents
GEMINI_MODEL="gemini-2.5-flash"     # Default model
GCS_BUCKET_NAME="your-bucket"       # For file storage
GCS_CREDENTIALS_PATH="/path/to/creds.json"
```

## Troubleshooting

### Issue: Coordinator not routing correctly
- Check that `build_message_content()` includes media type hints
- Verify coordinator instruction is clear about routing rules

### Issue: Media agent not receiving images
- Confirm file upload to GCS succeeded
- Check MIME type is in `SUPPORTED_MIME_TYPES`
- Verify file size < 500MB

### Issue: Text agent responses are slow
- Check model selection (flash vs pro)
- Verify API quota not exceeded
- Review conversation history size

## Benefits Summary

✅ **Specialized Performance**: Each agent optimized for its task  
✅ **Intelligent Routing**: Automatic selection of best agent  
✅ **Scalable Design**: Easy to add new specialized agents  
✅ **Transparent to Users**: No frontend changes needed  
✅ **Better Results**: Specialized instructions for better responses  
✅ **Context Preservation**: Sessions maintain history across agents  

## Documentation Files

- `MULTI_AGENT_ARCHITECTURE.md` - Detailed architecture explanation
- `ARCHITECTURE_DIAGRAM.md` - Visual diagrams and flow charts
- `QUICK_REFERENCE.md` - This file
- `test/test_multi_agent.py` - Test suite

## Next Steps

1. ✅ Multi-agent system implemented
2. ✅ Documentation created
3. ✅ Test suite available
4. 🔄 Run tests to verify functionality
5. 🔄 Deploy to production
6. 🔄 Monitor performance
7. 🔄 Consider adding more specialized agents

---

**Questions?** Review the detailed documentation in `MULTI_AGENT_ARCHITECTURE.md`
