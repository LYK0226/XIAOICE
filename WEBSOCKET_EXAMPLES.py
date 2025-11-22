"""
WEBSOCKET USAGE EXAMPLES
========================

This file contains practical examples for using the WebSocket implementation.
"""

# ============================================================================
# EXAMPLE 1: Basic Backend WebSocket Event Handler
# ============================================================================

"""
File: app/socket_events.py

from flask_socketio import emit
from app import socketio

@socketio.on('custom_event')
def handle_custom_event(data):
    '''Handle custom event from client'''
    print(f"Received custom event: {data}")
    
    # Process data
    result = process_data(data)
    
    # Send response back to sender only
    emit('custom_response', {'result': result})
    
    # Or broadcast to all users in a room
    room = f"conversation_{data['conversation_id']}"
    emit('custom_broadcast', {'result': result}, room=room)
"""

# ============================================================================
# EXAMPLE 2: Frontend WebSocket Connection
# ============================================================================

"""
File: app/static/js/chatbox.js

// Get access token from localStorage
const token = localStorage.getItem('access_token');

// Connect to WebSocket
socketManager.connect(token)
    .then((data) => {
        console.log('Connected:', data);
        
        // Join a conversation room
        const conversationId = 1;
        socketManager.joinRoom(conversationId);
    })
    .catch((error) => {
        console.error('Connection failed:', error);
        alert('Failed to connect to chat server');
    });
"""

# ============================================================================
# EXAMPLE 3: Sending Messages via WebSocket
# ============================================================================

"""
File: app/static/js/chatbox.js

async function sendTextMessage() {
    const message = document.getElementById('messageInput').value;
    const conversationId = activeConversationId;
    const userId = currentUserId;
    
    if (!message.trim()) return;
    
    try {
        // Send via WebSocket
        await socketManager.sendMessage(message, conversationId, userId);
        
        // Clear input
        document.getElementById('messageInput').value = '';
        
        console.log('Message sent successfully');
    } catch (error) {
        console.error('Failed to send message:', error);
    }
}

// Attach to send button
document.getElementById('sendButton').addEventListener('click', sendTextMessage);
"""

# ============================================================================
# EXAMPLE 4: Uploading Files via HTTP + WebSocket Broadcast
# ============================================================================

"""
File: app/static/js/chatbox.js

async function uploadFiles() {
    const fileInput = document.getElementById('fileInput');
    const files = fileInput.files;
    
    if (files.length === 0) {
        alert('Please select files to upload');
        return;
    }
    
    // Create form data
    const formData = new FormData();
    for (let file of files) {
        formData.append('files', file);
    }
    formData.append('conversation_id', activeConversationId);
    formData.append('message', 'Here are some files');
    
    try {
        // Upload via HTTP POST
        const token = localStorage.getItem('access_token');
        const response = await fetch('/api/upload_file', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
            },
            body: formData
        });
        
        if (!response.ok) {
            throw new Error('Upload failed');
        }
        
        const result = await response.json();
        console.log('Upload successful:', result);
        
        // Server will automatically broadcast to WebSocket room
        // Listen for the broadcast:
        // socketManager.on('file_uploaded', (data) => { ... });
        
    } catch (error) {
        console.error('Upload error:', error);
        alert('Failed to upload files');
    }
}
"""

# ============================================================================
# EXAMPLE 5: Handling Incoming Messages
# ============================================================================

"""
File: app/static/js/chatbox.js

// Setup event handlers
function setupWebSocketHandlers() {
    // Handle new user messages
    socketManager.on('new_message', (data) => {
        console.log('New message received:', data);
        
        // Display message in chat
        const messageElement = createMessage(data.content, data.role === 'user');
        messagesDiv.appendChild(messageElement);
        scrollToBottom();
    });
    
    // Handle AI thinking indicator
    socketManager.on('ai_thinking', (data) => {
        showTypingIndicator('AI is thinking...');
    });
    
    // Handle AI response chunks (streaming)
    let currentAIMessage = null;
    let aiContent = '';
    
    socketManager.on('ai_response_chunk', (data) => {
        if (!currentAIMessage) {
            currentAIMessage = createMessage('', false);
            messagesDiv.appendChild(currentAIMessage);
            aiContent = '';
        }
        
        // Append chunk
        aiContent += data.chunk;
        const p = currentAIMessage.querySelector('p');
        p.textContent = aiContent;
        scrollToBottom();
    });
    
    // Handle AI response complete
    socketManager.on('ai_response_complete', (data) => {
        hideTypingIndicator();
        currentAIMessage = null;
        aiContent = '';
        console.log('AI response complete');
    });
    
    // Handle errors
    socketManager.on('ai_response_error', (data) => {
        hideTypingIndicator();
        alert('AI Error: ' + data.error);
    });
    
    // Handle file uploads
    socketManager.on('file_uploaded', (data) => {
        console.log('File uploaded:', data.files);
        
        // Display file message
        const fileMsg = createFileMessage(data.files, data.content);
        messagesDiv.appendChild(fileMsg);
        scrollToBottom();
    });
}

// Call during initialization
setupWebSocketHandlers();
"""

# ============================================================================
# EXAMPLE 6: Room Management (Join/Leave)
# ============================================================================

"""
File: app/static/js/chatbox.js

// When user selects a different conversation
function switchConversation(newConversationId) {
    // Leave current room
    if (activeConversationId) {
        socketManager.leaveRoom(activeConversationId);
    }
    
    // Update active conversation
    activeConversationId = newConversationId;
    
    // Join new room
    socketManager.joinRoom(newConversationId);
    
    // Load conversation history
    loadConversationHistory(newConversationId);
}

// Listen for room join confirmation
socketManager.on('joined_room', (data) => {
    console.log('Successfully joined room:', data.conversation_id);
});

socketManager.on('left_room', (data) => {
    console.log('Left room:', data.conversation_id);
});
"""

# ============================================================================
# EXAMPLE 7: Typing Indicators
# ============================================================================

"""
File: app/static/js/chatbox.js

let typingTimeout = null;

// Send typing indicator when user types
document.getElementById('messageInput').addEventListener('input', () => {
    // Send typing = true
    socketManager.sendTypingIndicator(activeConversationId, currentUserId, true);
    
    // Clear previous timeout
    if (typingTimeout) {
        clearTimeout(typingTimeout);
    }
    
    // Send typing = false after 2 seconds of no input
    typingTimeout = setTimeout(() => {
        socketManager.sendTypingIndicator(activeConversationId, currentUserId, false);
    }, 2000);
});

// Listen for other users typing
socketManager.on('user_typing', (data) => {
    if (data.is_typing) {
        showTypingIndicator(`${data.username} is typing...`);
    } else {
        hideTypingIndicator();
    }
});
"""

# ============================================================================
# EXAMPLE 8: Error Handling and Reconnection
# ============================================================================

"""
File: app/static/js/chatbox.js

// Handle connection errors
socketManager.on('connect_error', (error) => {
    console.error('Connection error:', error);
    showNotification('Connection lost. Retrying...', 'error');
});

// Handle disconnection
socketManager.on('disconnect', (reason) => {
    console.log('Disconnected:', reason);
    showNotification('Disconnected from server', 'warning');
});

// Handle reconnection
socketManager.on('reconnect', (attemptNumber) => {
    console.log('Reconnected after', attemptNumber, 'attempts');
    showNotification('Reconnected to server', 'success');
    
    // Rejoin current room if any
    if (activeConversationId) {
        socketManager.joinRoom(activeConversationId);
    }
});

// Handle reconnection attempts
socketManager.on('reconnect_attempt', (attemptNumber) => {
    console.log('Reconnection attempt:', attemptNumber);
    showNotification(`Reconnecting (attempt ${attemptNumber})...`, 'info');
});
"""

# ============================================================================
# EXAMPLE 9: Testing WebSocket in Browser Console
# ============================================================================

"""
// Open browser developer console and run:

// 1. Connect to WebSocket
const token = localStorage.getItem('access_token');
await socketManager.connect(token);

// 2. Join a room
socketManager.joinRoom(1);

// 3. Send a test message
socketManager.sendMessage('Hello World', 1, YOUR_USER_ID);

// 4. Listen for responses
socketManager.on('new_message', (data) => console.log('MSG:', data));
socketManager.on('ai_response_chunk', (data) => console.log('AI:', data.chunk));

// 5. Test file upload
const formData = new FormData();
const fileInput = document.getElementById('fileInput');
formData.append('files', fileInput.files[0]);
formData.append('conversation_id', 1);

const response = await fetch('/api/upload_file', {
    method: 'POST',
    headers: {
        'Authorization': `Bearer ${token}`
    },
    body: formData
});

console.log(await response.json());
"""

# ============================================================================
# EXAMPLE 10: Backend Broadcasting to Specific Rooms
# ============================================================================

"""
File: app/socket_events.py or app/routes.py

from app import socketio

def broadcast_notification(conversation_id, notification_type, message):
    '''
    Broadcast a notification to all users in a conversation room
    
    Args:
        conversation_id: The conversation ID
        notification_type: Type of notification (info, warning, error)
        message: Notification message
    '''
    room = f"conversation_{conversation_id}"
    
    socketio.emit('notification', {
        'type': notification_type,
        'message': message,
        'conversation_id': conversation_id,
        'timestamp': datetime.utcnow().isoformat()
    }, room=room)

# Usage example:
# After file upload completes:
broadcast_notification(
    conversation_id=1,
    notification_type='success',
    message='File uploaded successfully'
)
"""

# ============================================================================
# EXAMPLE 11: Complete Integration in chatbox.js
# ============================================================================

"""
File: app/static/js/chatbox.js

// Global variables
let activeConversationId = null;
let currentUserId = null;

// Initialize on page load
document.addEventListener('DOMContentLoaded', async () => {
    try {
        // Get token and user info
        const token = localStorage.getItem('access_token');
        const userInfo = await fetchUserInfo();
        currentUserId = userInfo.id;
        
        // Connect to WebSocket
        await socketManager.connect(token);
        console.log('✅ WebSocket connected');
        
        // Setup event handlers
        setupWebSocketHandlers();
        
        // Load conversations
        await loadConversations();
        
    } catch (error) {
        console.error('Initialization error:', error);
        alert('Failed to initialize chat. Please refresh the page.');
    }
});

// Setup WebSocket event handlers
function setupWebSocketHandlers() {
    socketManager.on('new_message', handleNewMessage);
    socketManager.on('ai_thinking', handleAIThinking);
    socketManager.on('ai_response_chunk', handleAIChunk);
    socketManager.on('ai_response_complete', handleAIComplete);
    socketManager.on('ai_response_error', handleAIError);
    socketManager.on('file_uploaded', handleFileUploaded);
    socketManager.on('user_typing', handleUserTyping);
    socketManager.on('reconnect', handleReconnect);
}

// Send message (text only)
async function sendMessage() {
    const message = messageInput.value.trim();
    if (!message) return;
    
    try {
        // Display user message
        const userMsg = createMessage(message, true);
        messagesDiv.appendChild(userMsg);
        
        // Send via WebSocket
        await socketManager.sendMessage(message, activeConversationId, currentUserId);
        
        // Clear input
        messageInput.value = '';
        
    } catch (error) {
        console.error('Send error:', error);
        alert('Failed to send message');
    }
}

// Upload files
async function uploadFiles(files, caption) {
    const formData = new FormData();
    
    files.forEach(file => formData.append('files', file));
    formData.append('conversation_id', activeConversationId);
    formData.append('message', caption || '');
    
    const token = localStorage.getItem('access_token');
    
    const response = await fetch('/api/upload_file', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
    });
    
    if (!response.ok) throw new Error('Upload failed');
    
    return await response.json();
}

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
    socketManager.disconnect();
});
"""

print("✅ WebSocket implementation complete!")
print("📚 See WEBSOCKET_README.md for full documentation")
print("📝 See WEBSOCKET_INTEGRATION_GUIDE.js for chatbox.js integration")
