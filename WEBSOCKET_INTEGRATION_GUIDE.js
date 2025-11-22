/**
 * CHATBOX.JS WEBSOCKET INTEGRATION GUIDE
 * ======================================
 * 
 * This file provides code examples for integrating WebSocket functionality
 * into your existing chatbox.js file.
 * 
 * IMPORTANT: Add these code blocks to your existing chatbox.js file
 */

// ============================================================================
// STEP 1: Add at the top of chatbox.js (after variable declarations)
// ============================================================================

// WebSocket integration variables
let currentUserId = null;
let typingTimeout = null;

// ============================================================================
// STEP 2: Initialize WebSocket connection when page loads
// ============================================================================

// Add this function to initialize WebSocket
async function initializeWebSocket() {
    try {
        const token = localStorage.getItem('access_token');
        if (!token) {
            console.error('No access token found');
            return;
        }

        // Get user ID from token or API
        const userInfo = await getUserInfo(); // You may need to create this function
        currentUserId = userInfo.id;

        // Connect to WebSocket with JWT token
        await socketManager.connect(token);
        console.log('✅ WebSocket initialized successfully');

        // Setup event handlers
        setupWebSocketEventHandlers();

    } catch (error) {
        console.error('❌ Failed to initialize WebSocket:', error);
        // Optionally show error to user
        alert('Failed to connect to real-time chat. Please refresh the page.');
    }
}

// ============================================================================
// STEP 3: Setup WebSocket event handlers
// ============================================================================

function setupWebSocketEventHandlers() {
    // Handle incoming messages
    socketManager.on('new_message', (data) => {
        if (data.conversation_id === activeConversationId) {
            // Display user message (from other devices or users)
            const messageElement = createMessage(data.content, data.role === 'user');
            messagesDiv.appendChild(messageElement);
            scrollToBottom();
        }
    });

    // Handle AI thinking indicator
    socketManager.on('ai_thinking', (data) => {
        if (data.conversation_id === activeConversationId) {
            showTypingIndicator();
        }
    });

    // Handle AI response chunks (streaming)
    let currentAIMessage = null;
    let aiMessageContent = '';

    socketManager.on('ai_response_chunk', (data) => {
        if (data.conversation_id === activeConversationId) {
            if (!currentAIMessage) {
                // Create new AI message element
                currentAIMessage = createMessage('', false);
                messagesDiv.appendChild(currentAIMessage);
                aiMessageContent = '';
            }

            // Append chunk to content
            aiMessageContent += data.chunk;
            const paragraph = currentAIMessage.querySelector('.message-content p');
            if (paragraph) {
                paragraph.textContent = aiMessageContent;
            }
            scrollToBottom();
        }
    });

    // Handle AI response complete
    socketManager.on('ai_response_complete', (data) => {
        if (data.conversation_id === activeConversationId) {
            hideTypingIndicator();
            currentAIMessage = null;
            aiMessageContent = '';
            scrollToBottom();

            // Update conversation history
            conversationHistory.push({
                role: 'assistant',
                content: data.content,
                time: Date.now()
            });
        }
    });

    // Handle AI response error
    socketManager.on('ai_response_error', (data) => {
        if (data.conversation_id === activeConversationId) {
            hideTypingIndicator();
            currentAIMessage = null;
            aiMessageContent = '';

            // Show error message
            const errorMessage = createMessage(data.error || 'An error occurred', false);
            errorMessage.classList.add('error-message');
            messagesDiv.appendChild(errorMessage);
            scrollToBottom();
        }
    });

    // Handle file uploads broadcast
    socketManager.on('file_uploaded', (data) => {
        if (data.conversation_id === activeConversationId) {
            // Display file message
            const fileMessage = createFileMessage(data.files, data.content, true);
            messagesDiv.appendChild(fileMessage);
            scrollToBottom();
        }
    });

    // Handle typing indicators from other users
    socketManager.on('user_typing', (data) => {
        if (data.conversation_id === activeConversationId && data.is_typing) {
            showTypingIndicator(`${data.username} is typing...`);
        } else {
            hideTypingIndicator();
        }
    });

    // Handle reconnection
    socketManager.on('reconnect', () => {
        console.log('🔄 Reconnected to WebSocket');
        // Rejoin current conversation room
        if (activeConversationId) {
            socketManager.joinRoom(activeConversationId);
        }
    });
}

// ============================================================================
// STEP 4: Modify the send message function to use WebSocket
// ============================================================================

// REPLACE your existing sendMessage function with this:
async function sendMessage() {
    const message = messageInput.value.trim();
    
    // Don't send empty messages unless there are files
    if (!message && selectedFiles.length === 0) return;

    try {
        // If there are files, upload them via HTTP POST
        if (selectedFiles.length > 0) {
            await uploadFilesWithMessage(message);
            // Clear files
            selectedFiles = [];
            filePreviewContainer.innerHTML = '';
            filePreviewContainer.style.display = 'none';
        } else {
            // Send text message via WebSocket
            // Display user message immediately (optimistic UI)
            const userMessage = createMessage(message, true);
            messagesDiv.appendChild(userMessage);
            scrollToBottom();

            // Add to conversation history
            conversationHistory.push({
                role: 'user',
                content: message,
                time: Date.now()
            });

            // Send via WebSocket
            await socketManager.sendMessage(message, activeConversationId, currentUserId);

            // Clear input
            messageInput.value = '';
        }

        // Stop typing indicator
        if (typingTimeout) {
            clearTimeout(typingTimeout);
        }
        socketManager.sendTypingIndicator(activeConversationId, currentUserId, false);

    } catch (error) {
        console.error('Error sending message:', error);
        alert('Failed to send message. Please try again.');
    }
}

// ============================================================================
// STEP 5: Add file upload function (uses HTTP POST)
// ============================================================================

async function uploadFilesWithMessage(message) {
    if (!activeConversationId) {
        alert('Please select a conversation first');
        return;
    }

    try {
        const formData = new FormData();
        
        // Add files
        selectedFiles.forEach(file => {
            formData.append('files', file);
        });
        
        // Add message and conversation ID
        formData.append('message', message || '');
        formData.append('conversation_id', activeConversationId);

        // Get access token
        const token = localStorage.getItem('access_token');

        // Upload via HTTP POST
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
        console.log('✅ Files uploaded successfully:', result);

        // Note: The server will broadcast the file upload to all connected clients
        // via WebSocket, so we don't need to manually add it to the UI here

        // Clear input
        messageInput.value = '';

    } catch (error) {
        console.error('❌ Error uploading files:', error);
        alert('Failed to upload files. Please try again.');
    }
}

// ============================================================================
// STEP 6: Add typing indicator functionality
// ============================================================================

// Call this when user types in the message input
function handleTyping() {
    if (!activeConversationId || !currentUserId) return;

    // Send typing indicator
    socketManager.sendTypingIndicator(activeConversationId, currentUserId, true);

    // Clear previous timeout
    if (typingTimeout) {
        clearTimeout(typingTimeout);
    }

    // Stop typing after 2 seconds of inactivity
    typingTimeout = setTimeout(() => {
        socketManager.sendTypingIndicator(activeConversationId, currentUserId, false);
    }, 2000);
}

// Add this to your message input event listener
// messageInput.addEventListener('input', handleTyping);

// ============================================================================
// STEP 7: Modify conversation switching to join/leave rooms
// ============================================================================

// MODIFY your existing loadConversation or selectConversation function:
async function loadConversation(conversationId) {
    // Leave previous room
    if (activeConversationId && socketManager.connected()) {
        socketManager.leaveRoom(activeConversationId);
    }

    // Update active conversation
    activeConversationId = conversationId;

    // Join new room
    if (socketManager.connected()) {
        socketManager.joinRoom(conversationId);
    }

    // Load conversation messages from database (HTTP GET)
    // ... your existing code to fetch and display messages ...

    // Clear conversation history for context
    conversationHistory = [];
}

// ============================================================================
// STEP 8: Add helper functions for UI
// ============================================================================

function showTypingIndicator(text = 'AI is thinking...') {
    // Remove existing indicator if any
    hideTypingIndicator();

    const indicator = document.createElement('div');
    indicator.className = 'typing-indicator';
    indicator.id = 'typing-indicator';
    indicator.innerHTML = `
        <div class="bot-message-container">
            <div class="avatar bot-avatar">
                <i class="fas fa-robot"></i>
            </div>
            <div class="message-content">
                <p class="typing-dots">
                    <span></span><span></span><span></span>
                </p>
            </div>
        </div>
    `;
    messagesDiv.appendChild(indicator);
    scrollToBottom();
}

function hideTypingIndicator() {
    const indicator = document.getElementById('typing-indicator');
    if (indicator) {
        indicator.remove();
    }
}

function createFileMessage(fileUrls, caption, isUser) {
    const container = document.createElement('div');
    container.className = isUser ? 'user-message-container' : 'bot-message-container';
    
    const avatar = document.createElement('div');
    avatar.className = isUser ? 'avatar user-avatar' : 'avatar bot-avatar';
    avatar.innerHTML = isUser ? '<i class="fas fa-user"></i>' : '<i class="fas fa-robot"></i>';
    
    const messageContent = document.createElement('div');
    messageContent.className = 'message-content';
    
    // Add file previews
    fileUrls.forEach(url => {
        const filePreview = document.createElement('div');
        filePreview.className = 'file-preview-item';
        
        if (url.match(/\.(jpg|jpeg|png|gif|webp)$/i)) {
            // Image preview
            const img = document.createElement('img');
            img.src = url;
            img.style.maxWidth = '200px';
            img.style.borderRadius = '8px';
            filePreview.appendChild(img);
        } else {
            // File link
            const link = document.createElement('a');
            link.href = url;
            link.target = '_blank';
            link.textContent = url.split('/').pop();
            filePreview.appendChild(link);
        }
        
        messageContent.appendChild(filePreview);
    });
    
    // Add caption if provided
    if (caption) {
        const paragraph = document.createElement('p');
        paragraph.textContent = caption;
        messageContent.appendChild(paragraph);
    }
    
    container.appendChild(avatar);
    container.appendChild(messageContent);
    
    return container;
}

// ============================================================================
// STEP 9: Initialize on page load
// ============================================================================

// Add this to your existing initialization code (usually at the bottom)
document.addEventListener('DOMContentLoaded', async () => {
    // ... your existing initialization code ...
    
    // Initialize WebSocket
    await initializeWebSocket();
    
    // Add input event listener for typing indicator
    messageInput.addEventListener('input', handleTyping);
});

// ============================================================================
// STEP 10: Cleanup on page unload
// ============================================================================

window.addEventListener('beforeunload', () => {
    if (socketManager) {
        socketManager.disconnect();
    }
});

// ============================================================================
// ADDITIONAL: CSS for typing indicator (add to chatbox.css)
// ============================================================================

/*
.typing-indicator {
    margin: 10px 0;
}

.typing-dots {
    display: flex;
    gap: 4px;
    padding: 10px;
}

.typing-dots span {
    width: 8px;
    height: 8px;
    background-color: #888;
    border-radius: 50%;
    animation: typing 1.4s infinite;
}

.typing-dots span:nth-child(2) {
    animation-delay: 0.2s;
}

.typing-dots span:nth-child(3) {
    animation-delay: 0.4s;
}

@keyframes typing {
    0%, 60%, 100% {
        transform: translateY(0);
        opacity: 0.6;
    }
    30% {
        transform: translateY(-10px);
        opacity: 1;
    }
}
*/
