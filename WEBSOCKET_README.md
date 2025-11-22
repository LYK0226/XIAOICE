# WebSocket Integration for XIAOICE Chat

This document provides a comprehensive guide for the WebSocket implementation in the XIAOICE chat application.

## 📋 Overview

The chat functionality has been upgraded from HTTP Polling to WebSocket (using Flask-SocketIO) for real-time communication.

### Architecture

- **Text Messages**: Transmitted via WebSocket (Socket.IO) for real-time delivery
- **File Uploads**: Use HTTP POST to upload to Google Cloud Storage
- **File Broadcast**: After successful upload, server broadcasts file URL via WebSocket to all room participants
- **Authentication**: JWT token-based authentication for WebSocket connections
- **Room System**: Users join conversation-specific rooms for targeted message delivery

## 🚀 Getting Started

### 1. Install Dependencies

```bash
pip install -r requirements.txt
```

New packages added:
- `flask-socketio==5.4.1` - Flask WebSocket extension
- `python-socketio==5.11.4` - Python Socket.IO implementation
- `eventlet==0.37.0` - Async networking library

### 2. Run the Application

```bash
python run.py
```

The server will start on `http://0.0.0.0:5000` with WebSocket support.

## 🏗️ Backend Architecture

### Core Files

#### `app/__init__.py`
Initializes Flask application and SocketIO instance:
```python
from flask_socketio import SocketIO

socketio = SocketIO(cors_allowed_origins="*", async_mode='eventlet')

def create_app():
    # ... Flask initialization ...
    socketio.init_app(app)
    return app
```

#### `app/socket_events.py`
WebSocket event handlers:

**Authentication (`@socketio.on('connect')`)**
- Validates JWT token from client
- Extracts user ID and verifies user exists
- Rejects connection if authentication fails

**Room Management**
- `join_room`: User joins conversation room
- `leave_room`: User leaves conversation room

**Messaging**
- `send_message`: Receives text message, saves to DB, generates AI response
- Streams AI response in chunks back to client
- Broadcasts messages to all users in the room

**Typing Indicators**
- `typing`: Broadcasts typing status to other users in the room

#### `app/routes.py`
HTTP endpoints:

**`POST /api/upload_file`**
- Receives file upload via HTTP POST
- Uploads files to Google Cloud Storage
- Saves metadata to database
- **Emits WebSocket event** to broadcast file URL to room participants

### WebSocket Events

#### Client → Server Events

| Event | Data | Description |
|-------|------|-------------|
| `connect` | `{token: jwt_token}` | Authenticate and establish connection |
| `join_room` | `{conversation_id: int}` | Join a conversation room |
| `leave_room` | `{conversation_id: int}` | Leave a conversation room |
| `send_message` | `{message: str, conversation_id: int, user_id: int}` | Send text message |
| `typing` | `{conversation_id: int, user_id: int, is_typing: bool}` | Send typing indicator |

#### Server → Client Events

| Event | Data | Description |
|-------|------|-------------|
| `connected` | `{status, message, user_id}` | Connection successful |
| `joined_room` | `{conversation_id, room, message}` | Joined room successfully |
| `left_room` | `{conversation_id, message}` | Left room |
| `new_message` | `{message_id, role, content, timestamp, conversation_id}` | New message from user |
| `ai_thinking` | `{conversation_id}` | AI is processing request |
| `ai_response_chunk` | `{chunk, conversation_id}` | AI response chunk (streaming) |
| `ai_response_complete` | `{message_id, role, content, timestamp, conversation_id}` | AI response finished |
| `ai_response_error` | `{error, conversation_id}` | AI response error |
| `file_uploaded` | `{message_id, role, content, files[], timestamp, conversation_id}` | File uploaded and broadcast |
| `user_typing` | `{user_id, username, is_typing, conversation_id}` | User typing status |
| `error` | `{message}` | Error occurred |

## 🎨 Frontend Architecture

### Core Files

#### `app/static/js/socket_module.js`
WebSocket manager class (`SocketManager`):

**Methods:**
- `connect(token)`: Initialize WebSocket with JWT auth
- `joinRoom(conversationId)`: Join conversation room
- `leaveRoom(conversationId)`: Leave conversation room
- `sendMessage(message, conversationId, userId)`: Send text message
- `sendTypingIndicator(conversationId, userId, isTyping)`: Send typing status
- `on(event, handler)`: Register event handler
- `off(event, handler)`: Unregister event handler
- `disconnect()`: Close connection

**Usage:**
```javascript
// Connect
await socketManager.connect(jwtToken);

// Join room
socketManager.joinRoom(conversationId);

// Send message
socketManager.sendMessage('Hello', conversationId, userId);

// Listen for events
socketManager.on('new_message', (data) => {
    console.log('New message:', data);
});
```

#### `app/templates/index.html`
Includes necessary scripts:
```html
<!-- Socket.IO Client -->
<script src="https://cdn.socket.io/4.7.5/socket.io.min.js"></script>
<!-- WebSocket Manager -->
<script src="../static/js/socket_module.js"></script>
```

### Integration with Chatbox.js

See `WEBSOCKET_INTEGRATION_GUIDE.js` for detailed integration steps.

**Key Integration Points:**

1. **Initialize WebSocket on page load**
```javascript
await socketManager.connect(accessToken);
setupWebSocketEventHandlers();
```

2. **Join room when conversation is selected**
```javascript
socketManager.leaveRoom(previousConversationId);
socketManager.joinRoom(newConversationId);
```

3. **Send messages via WebSocket**
```javascript
await socketManager.sendMessage(message, conversationId, userId);
```

4. **Upload files via HTTP, receive broadcast via WebSocket**
```javascript
// Upload via HTTP POST
await fetch('/api/upload_file', {
    method: 'POST',
    body: formData
});
// Server broadcasts file_uploaded event to room
```

5. **Handle incoming messages**
```javascript
socketManager.on('new_message', (data) => {
    displayMessage(data.content, data.role === 'user');
});

socketManager.on('ai_response_chunk', (data) => {
    appendToAIMessage(data.chunk);
});
```

## 🔒 Security

### JWT Authentication
- Client sends JWT token in `auth` parameter during connection
- Server validates token in `@socketio.on('connect')` handler
- Invalid tokens result in `ConnectionRefusedError`

### Room Authorization
- Server verifies user owns conversation before joining room
- Messages only broadcast to users in the same room

### File Upload Security
- File uploads use JWT-protected HTTP endpoint
- Files uploaded to authenticated GCS bucket
- File metadata stored in database with user association

## 🧪 Testing

### Test WebSocket Connection

1. **Open browser console**
2. **Connect to WebSocket:**
```javascript
const token = localStorage.getItem('access_token');
await socketManager.connect(token);
```

3. **Join a room:**
```javascript
socketManager.joinRoom(1); // conversation_id = 1
```

4. **Send a message:**
```javascript
socketManager.sendMessage('Test message', 1, YOUR_USER_ID);
```

5. **Check for events:**
```javascript
socketManager.on('new_message', (data) => console.log('Message:', data));
socketManager.on('ai_response_chunk', (data) => console.log('AI:', data.chunk));
```

### Test File Upload

```javascript
const formData = new FormData();
formData.append('files', fileInput.files[0]);
formData.append('conversation_id', 1);
formData.append('message', 'Check out this file');

const response = await fetch('/api/upload_file', {
    method: 'POST',
    headers: {
        'Authorization': `Bearer ${localStorage.getItem('access_token')}`
    },
    body: formData
});
```

## 📊 Database Schema

### Messages Table
```sql
CREATE TABLE message (
    id INTEGER PRIMARY KEY,
    conversation_id INTEGER NOT NULL,
    role VARCHAR(20) NOT NULL,  -- 'user' or 'assistant'
    content TEXT,
    timestamp DATETIME,
    FOREIGN KEY (conversation_id) REFERENCES conversation(id)
);
```

### File Uploads Table
```sql
CREATE TABLE file_upload (
    id INTEGER PRIMARY KEY,
    user_id INTEGER NOT NULL,
    conversation_id INTEGER,
    message_id INTEGER,
    filename VARCHAR(255),
    file_path TEXT,  -- GCS URL
    file_type VARCHAR(50),
    content_type VARCHAR(100),
    uploaded_at DATETIME,
    FOREIGN KEY (user_id) REFERENCES user(id),
    FOREIGN KEY (conversation_id) REFERENCES conversation(id),
    FOREIGN KEY (message_id) REFERENCES message(id)
);
```

## 🔧 Configuration

### Environment Variables

```bash
# Flask
SECRET_KEY="your_secret_key"

# Database
DATABASE_URL="sqlite:///app.db"

# Google Cloud Storage
GCS_BUCKET_NAME="your-bucket-name"
GCS_CREDENTIALS_PATH="/path/to/credentials.json"

# Encryption
ENCRYPTION_KEY="your_32_byte_encryption_key"
```

### SocketIO Configuration

In `app/__init__.py`:
```python
socketio = SocketIO(
    cors_allowed_origins="*",  # Configure for production
    async_mode='eventlet',
    logger=True,
    engineio_logger=True
)
```

## 🚦 Deployment

### Production Settings

1. **Update CORS settings:**
```python
socketio = SocketIO(
    cors_allowed_origins=["https://yourdomain.com"],
    async_mode='eventlet'
)
```

2. **Use production WSGI server:**
```bash
gunicorn --worker-class eventlet -w 1 --bind 0.0.0.0:8080 'app:create_app()'
```

3. **Configure reverse proxy (nginx):**
```nginx
location /socket.io {
    proxy_pass http://localhost:8080/socket.io;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_set_header Host $host;
}
```

## 📈 Performance Considerations

- **Eventlet**: Single worker with async I/O for WebSocket connections
- **Room-based broadcasting**: Messages only sent to users in same conversation
- **Streaming responses**: AI responses sent in chunks for better UX
- **Connection pooling**: Automatic reconnection with exponential backoff
- **Message persistence**: All messages saved to database for history

## 🐛 Troubleshooting

### WebSocket Connection Fails
- Check JWT token is valid
- Verify Socket.IO client version matches server version
- Check CORS settings in production

### Messages Not Received
- Verify user has joined the room
- Check conversation_id matches
- Ensure WebSocket connection is active

### File Upload Fails
- Check file size limits (default 16MB)
- Verify GCS credentials are valid
- Ensure bucket permissions are correct

## 📚 Additional Resources

- [Flask-SocketIO Documentation](https://flask-socketio.readthedocs.io/)
- [Socket.IO Client Documentation](https://socket.io/docs/v4/client-api/)
- [Google Cloud Storage Python Client](https://cloud.google.com/python/docs/reference/storage/latest)

## 🤝 Contributing

When adding new WebSocket events:

1. Add event handler in `app/socket_events.py`
2. Update frontend in `app/static/js/socket_module.js`
3. Document event in this README
4. Add tests for the new functionality

---

**Version**: 1.0.0  
**Last Updated**: November 2025  
**Author**: XIAOICE Development Team
