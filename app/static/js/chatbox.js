// JavaScript for chatbox functionality
const messagesDiv = document.getElementById('messages');
const messageInput = document.getElementById('messageInput');
const sendButton = document.getElementById('sendButton');
const fileInput = document.getElementById('fileInput');
const fileUploadBtn = document.getElementById('fileUploadBtn');
const emojiBtn = document.getElementById('emojiBtn');
const emojiPicker = document.getElementById('emojiPicker');
const emojiContent = document.getElementById('emojiContent');
const voiceInputBtn = document.getElementById('voiceInputBtn');
const webcamBtn = document.getElementById('webcamBtn');
const webcamModal = document.getElementById('webcamModal');
const closeWebcam = document.getElementById('closeWebcam');
const webcamVideo = document.getElementById('webcamVideo');
const webcamCanvas = document.getElementById('webcamCanvas');
const captureBtn = document.getElementById('captureBtn');
const retakeBtn = document.getElementById('retakeBtn');
const usePhotoBtn = document.getElementById('usePhotoBtn');
const filePreviewContainer = document.getElementById('filePreviewContainer');

// Language support
let currentLanguage = 'zh-TW'; // Default to Traditional Chinese

// Avatar settings
window.userAvatar = null; // Will store user avatar URL
let botAvatar = null; // Will store bot avatar URL

// File and image storage
let selectedFiles = [];
let webcamStream = null;
let capturedPhoto = null;

// Voice recognition
let recognition = null;
let isRecording = false;


// Conversation history for context (array of {role: 'user'|'bot', content: string, time?: number})
let conversationHistory = [];
let activeConversationId = null;

// Dynamic data loading
let emojiCategories = {};
let translations = {};
let dataLoaded = false; // Track if data has been loaded
let dataLoadPromise = null; // Promise that resolves when data is loaded

// Load emoji data from JSON
async function loadEmojiData() {
    try {
        const response = await fetch('/static/data/emojis.json');
        if (!response.ok) throw new Error('Failed to load emojis');
        emojiCategories = await response.json();
        console.log('Emoji data loaded successfully');
        return true;
    } catch (error) {
        console.error('Error loading emoji data:', error);
        // Fallback to minimal emoji set
        emojiCategories = {
            smileys: ["😀", "😃", "😄", "😁", "😆", "😅", "🤣", "😂"]
        };
        return false;
    }
}

// Load translation data from JSON
async function loadTranslations() {
    const languages = ['zh-TW', 'en', 'ja'];
    const promises = languages.map(async (lang) => {
        try {
            const response = await fetch(`/static/i18n/${lang}.json`);
            if (!response.ok) throw new Error(`Failed to load ${lang} translations`);
            translations[lang] = await response.json();
        } catch (error) {
            console.error(`Error loading ${lang} translations:`, error);
            // Fallback to basic English
            translations[lang] = {
                chatbox: "Chatbox",
                placeholder: "Type your question here...",
                welcomeMsg: "Hello! I am your assistant.",
                errorMsg: "An error occurred."
            };
        }
    });
    
    await Promise.all(promises);
    console.log('Translations loaded successfully');
    return true;
}

// Initialize data loading
async function initializeData() {
    if (!dataLoadPromise) {
        dataLoadPromise = Promise.all([
            loadEmojiData(),
            loadTranslations()
        ]).then(() => {
            dataLoaded = true;
            // Expose translations globally for settings.js
            window.translations = translations;
            console.log('All data initialized successfully');
            return true;
        });
    }
    return dataLoadPromise;
}

// UI Translations - Loaded from JSON files (see initializeData function)

// Function to update UI language
async function updateUILanguage(lang) {
    // Wait for data to load if not ready
    if (!dataLoaded) {
        console.log('Waiting for translations to load...');
        await initializeData();
    }
    
    // Validate language
    if (!translations[lang]) {
        console.warn(`Language ${lang} not found, using zh-TW as fallback`);
        lang = 'zh-TW';
    }
    
    const t = translations[lang];
    if (!t) {
        console.error('Translation object is undefined');
        return;
    }
    
    currentLanguage = lang;
    
    // Update UI elements safely
    const updateElement = (selector, content, isHTML = false) => {
        const element = document.querySelector(selector);
        if (element) {
            if (isHTML) {
                element.innerHTML = content;
            } else {
                element.textContent = content;
            }
        }
    };
    
    const updateElementById = (id, content, isHTML = false) => {
        const element = document.getElementById(id);
        if (element) {
            if (isHTML) {
                element.innerHTML = content;
            } else if (element.placeholder !== undefined) {
                element.placeholder = content;
            } else {
                element.textContent = content;
            }
        }
    };
    
    // Update sidebar elements
    updateElement('.sidebar-header h2', t.chatbox);
    updateElement('.sidebar-section h3', t.chat);
    updateElement('.chat-title span', t.chatbox);
    // Update input placeholder
    updateElementById('messageInput', t.placeholder);
    // Update sidebar buttons
    updateElementById('newChat', `<i class="fas fa-plus"></i> ${t.newChat}`, true);
    updateElementById('settings', `<i class="fas fa-cog"></i> ${t.settings}`, true);
    updateElementById('logout', `<i class="fas fa-sign-out-alt"></i> ${t.logout}`, true);
    
    // Update welcome message if it exists
    const botMessages = document.querySelectorAll('.bot-message-container .message-content p');
    if (botMessages.length > 0) {
        const firstBotMessage = botMessages[0];
        // Only update if it looks like a welcome message (check if it contains typical welcome text)
        if (firstBotMessage.textContent.includes('智能助手') || 
            firstBotMessage.textContent.includes('smart assistant') ||
            firstBotMessage.textContent.includes('スマートアシスタント') ||
            firstBotMessage.textContent.includes('스마트 어시스턴트') ||
            firstBotMessage.textContent.includes('asistente inteligente')) {
            firstBotMessage.textContent = t.welcomeMsg;
        }
    }
    
    // Save language preference to localStorage
    localStorage.setItem('preferredLanguage', lang);
    
    // Show notification
    console.log(t.langSwitched);

    // Refresh conversation list text to match language selection
    if (typeof renderConversationList !== 'undefined' && typeof conversationsCache !== 'undefined') {
        renderConversationList(conversationsCache);
    }
}

function renderWelcomeMessage() {
    const t = translations[currentLanguage];
    messagesDiv.innerHTML = `
        <div class="bot-message-container">
            <div class="avatar bot-avatar">
                <i class="fas fa-robot"></i>
            </div>
            <div class="message-content">
                <p>${t.welcomeMsg}</p>
            </div>
        </div>
    `;
}

// Function to create a message element
function createMessage(text, isUser = false) {
    const container = document.createElement('div');
    container.className = isUser ? 'user-message-container' : 'bot-message-container';
    
    const avatar = document.createElement('div');
    avatar.className = isUser ? 'avatar user-avatar' : 'avatar bot-avatar';
    
    // Use custom avatar if available, otherwise use default icon
    if (isUser && window.userAvatar) {
        avatar.style.backgroundImage = `url(${window.userAvatar})`;
        avatar.style.backgroundSize = 'cover';
        avatar.style.backgroundPosition = 'center';
    } else if (!isUser && botAvatar) {
        avatar.style.backgroundImage = `url(${botAvatar})`;
        avatar.style.backgroundSize = 'cover';
        avatar.style.backgroundPosition = 'center';
    } else {
        avatar.innerHTML = isUser ? '<i class="fas fa-user"></i>' : '<i class="fas fa-robot"></i>';
    }
    
    const messageContent = document.createElement('div');
    messageContent.className = 'message-content';
    
    const paragraph = document.createElement('p');
    paragraph.textContent = text;
    messageContent.appendChild(paragraph);

    if (!isUser && text.trim()) {
        const speakBtn = document.createElement('button');
        speakBtn.className = 'speak-btn';
        speakBtn.innerHTML = '<i class="fas fa-volume-up"></i>';
        speakBtn.title = translations[currentLanguage].readMessage || '朗讀訊息';
        speakBtn.onclick = () => speakMessage(text, speakBtn);
        messageContent.appendChild(speakBtn);
    }
    
    container.appendChild(avatar);
    container.appendChild(messageContent);
    
    return container;
}

// Text-to-Speech Functionality
function speakMessage(text, buttonElement = null) {
    // If speech is currently playing, stop it
    if (speechSynthesis.speaking) {
        speechSynthesis.cancel();
        if (buttonElement) {
            updateSpeakButtonState(buttonElement, false);
        }
        return;
    }

    // Start new speech
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = currentLanguage;

    // Update button state when speech starts
    utterance.onstart = () => {
        if (buttonElement) {
            updateSpeakButtonState(buttonElement, true);
        }
    };

    // Update button state when speech ends
    utterance.onend = () => {
        if (buttonElement) {
            updateSpeakButtonState(buttonElement, false);
        }
    };

    // Handle speech errors
    utterance.onerror = () => {
        if (buttonElement) {
            updateSpeakButtonState(buttonElement, false);
        }
    };

    speechSynthesis.speak(utterance);
}

// Function to update speak button visual state
function updateSpeakButtonState(buttonElement, isSpeaking) {
    const iconElement = buttonElement.querySelector('i');
    if (!iconElement) return;

    if (isSpeaking) {
        iconElement.className = 'fas fa-stop';
        buttonElement.title = translations[currentLanguage].stopReading || '停止朗讀';
    } else {
        iconElement.className = 'fas fa-volume-up';
        buttonElement.title = translations[currentLanguage].readMessage || '朗讀訊息';
    }
}

// Function to create a message with image
function createImageMessage(imageData, text, isUser = true) {
    const container = document.createElement('div');
    container.className = isUser ? 'user-message-container' : 'bot-message-container';
    
    const avatar = document.createElement('div');
    avatar.className = isUser ? 'avatar user-avatar' : 'avatar bot-avatar';
    
    // Use custom avatar if available
    if (isUser && window.userAvatar) {
        avatar.style.backgroundImage = `url(${window.userAvatar})`;
        avatar.style.backgroundSize = 'cover';
        avatar.style.backgroundPosition = 'center';
    } else if (!isUser && botAvatar) {
        avatar.style.backgroundImage = `url(${botAvatar})`;
        avatar.style.backgroundSize = 'cover';
        avatar.style.backgroundPosition = 'center';
    } else {
        avatar.innerHTML = isUser ? '<i class="fas fa-user"></i>' : '<i class="fas fa-robot"></i>';
    }
    
    const messageContent = document.createElement('div');
    messageContent.className = 'message-content';
    
    // Add image
    const img = document.createElement('img');
    img.src = imageData; // Set the source of the image
    img.className = 'message-image';
    
    // Add click to view full image
    img.addEventListener('click', () => {
        const modal = document.createElement('div');
        modal.className = 'image-modal';
        
        const fullImg = document.createElement('img');
        fullImg.src = imageData;
        
        modal.appendChild(fullImg);
        document.body.appendChild(modal);
        
        modal.addEventListener('click', () => {
            document.body.removeChild(modal);
        });
    });
    
    messageContent.appendChild(img);
    
    // Add text if provided
    if (text) {
        const paragraph = document.createElement('p');
        paragraph.textContent = text;
        messageContent.appendChild(paragraph);
    }
    
    container.appendChild(avatar);
    container.appendChild(messageContent);
    
    return container;
}

// Function to create a typing/analyzing indicator
function createTypingIndicator(text) {
    const indicator = document.createElement('div');
    indicator.className = 'bot-message-container typing-indicator';
    const indicatorText = text || translations[currentLanguage].typing;
    
    const botAvatarEl = document.createElement('div');
    botAvatarEl.className = 'avatar bot-avatar';
    if (botAvatar) {
        botAvatarEl.style.backgroundImage = `url(${botAvatar})`;
        botAvatarEl.style.backgroundSize = 'cover';
        botAvatarEl.style.backgroundPosition = 'center';
    } else {
        botAvatarEl.innerHTML = '<i class="fas fa-robot"></i>';
    }

    indicator.appendChild(botAvatarEl);

    const messageContent = document.createElement('div');
    messageContent.className = 'message-content';
    const p = document.createElement('p');
    p.textContent = indicatorText;
    messageContent.appendChild(p);
    indicator.appendChild(messageContent);
    
    return indicator;
}

// Load saved language preference and initialize data on page load
window.addEventListener('DOMContentLoaded', async () => {
    // Load JSON data first
    await initializeData();
    
    const savedLanguage = localStorage.getItem('preferredLanguage');
    if (savedLanguage && translations[savedLanguage]) {
        currentLanguage = savedLanguage;
        updateUILanguage(savedLanguage);
        
        // Update active language option in settings
        const langOptions = document.querySelectorAll('.lang-option');
        langOptions.forEach(option => {
            const lang = option.getAttribute('data-lang');
            if (lang === savedLanguage) {
                option.classList.add('active');
                option.querySelector('i').className = 'fas fa-check-circle';
            } else {
                option.classList.remove('active');
                option.querySelector('i').className = 'fas fa-circle';
            }
        });
    }
    
    // Initialize socket.io connection if available
    if (typeof io !== 'undefined') {
        const token = localStorage.getItem('access_token');
        if (token) {
            const socket = io({
                auth: { token: token }
            });
            
            // Listen for new_message events for optimistic UI updates
            socket.on('new_message', (data) => {
                console.log('Received new_message event:', data);
                
                // Check if this message has a temp_id
                if (data.temp_id) {
                    // Look for existing message with this temp_id
                    const existingElement = document.querySelector(`[data-temp-id="${data.temp_id}"]`);
                    
                    if (existingElement) {
                        // Case A: This is our own optimistically rendered message
                        // DO NOT replace the images to prevent flickering
                        // Just update the message status or remove temp_id marker
                        console.log('Optimistic UI: Message already displayed with temp_id:', data.temp_id);
                        existingElement.removeAttribute('data-temp-id'); // Mark as confirmed
                        existingElement.setAttribute('data-message-id', data.message.id);
                        
                        // Optionally, update message metadata without touching images
                        // You can add a "sent" indicator or timestamp here if needed
                        return; // Skip re-rendering
                    }
                }
                
                // Case B: This is a new message from another user/session
                // Render it normally using server URLs
                if (data.message && data.conversation_id === activeConversationId) {
                    const messageElement = createMessageWithUploadedFiles(
                        data.message.content,
                        data.message.uploaded_files,
                        data.message.sender === 'user'
                    );
                    messageElement.setAttribute('data-message-id', data.message.id);
                    messagesDiv.appendChild(messageElement);
                    messagesDiv.scrollTop = messagesDiv.scrollHeight;
                }
            });
            
            // Store socket globally for other parts of the app if needed
            window.chatSocket = socket;
        }
    }
});

// Function to send a message
async function sendMessage() {
    // Use the new function that handles files
    await sendMessageWithFiles();
}

// Attach event listener to send button
sendButton.addEventListener('click', sendMessage);

// Allow sending messages with Enter key
messageInput.addEventListener('keypress', (event) => {
    if (event.key === 'Enter') {
        sendMessage();
    }
});

// Settings button functionality
const settingsBtn = document.getElementById('settings');
if (settingsBtn) {
    settingsBtn.addEventListener('click', () => {
        avatarModal.style.display = 'block';
    });
}

// ============================================
// FILE UPLOAD FUNCTIONALITY (Combined with Image)
// ============================================

fileUploadBtn.addEventListener('click', () => {
    fileInput.click();
});

fileInput.addEventListener('change', (e) => {
    const files = Array.from(e.target.files);
    const MAX_FILE_SIZE = 500 * 1024 * 1024; // 500 MB

    files.forEach(file => {
        // Check for allowed file types (Image, Video, PDF)
        const fileName = file.name.toLowerCase();
        const isImage = file.type.startsWith('image/');
        const isVideo = file.type.startsWith('video/');
        const isPDF = file.type === 'application/pdf' || fileName.endsWith('.pdf');
        
        if (!isImage && !isVideo && !isPDF) {
            showCustomAlert(`File "${file.name}" is not supported. Please upload PDF documents, Images, or Videos.`);
            return;
        }

        if (file.size > MAX_FILE_SIZE) {
            showCustomAlert(`File "${file.name}" is too large. Maximum size is 500MB.`);
            return;
        }
        if (!selectedFiles.find(f => f.name === file.name && f.size === file.size)) {
            selectedFiles.push(file);
        }
    });
    updateFilePreview();
    fileInput.value = ''; // Reset input
});

function updateFilePreview() {
    if (selectedFiles.length === 0) {
        filePreviewContainer.style.display = 'none';
        return;
    }
    
    filePreviewContainer.style.display = 'flex';
    filePreviewContainer.innerHTML = '';
    
    selectedFiles.forEach((file, index) => {
        let previewItem;
        
        if (file.type.startsWith('image/')) {
            // Image preview with square container
            previewItem = document.createElement('div');
            previewItem.className = 'file-preview-item';
            
            const img = document.createElement('img');
            const reader = new FileReader();
            reader.onload = (e) => {
                img.src = e.target.result;
                // Add click handler to open preview modal
                img.addEventListener('click', () => {
                    openDocumentPreviewModal(img.src, file.name);
                });
            };
            reader.readAsDataURL(file);
            previewItem.appendChild(img);
        } else if (file.type.startsWith('video/')) {
            // Video preview with square container
            previewItem = document.createElement('div');
            previewItem.className = 'file-preview-item';
            
            const video = document.createElement('video');
            video.style.width = '100%';
            video.style.height = '100%';
            video.style.objectFit = 'cover';
            video.style.borderRadius = '8px';
            video.muted = true; // Mute by default
            
            const videoUrl = URL.createObjectURL(file);
            video.src = videoUrl;
            
            // Add click handler to open preview modal
            video.addEventListener('click', () => {
                openDocumentPreviewModal(videoUrl, file.name);
            });
            
            previewItem.appendChild(video);
        } else {
            // File name only - simplified without square container
            previewItem = document.createElement('div');
            previewItem.className = 'file-preview-simple';
            
            const fileName = document.createElement('div');
            fileName.className = 'file-name-simple';
            fileName.textContent = file.name;
            fileName.title = file.name;
            
            // Create blob URL and add click handler for preview
            const fileUrl = URL.createObjectURL(file);
            fileName.addEventListener('click', () => {
                openDocumentPreviewModal(fileUrl, file.name);
            });
            fileName.style.cursor = 'pointer'; // Show it's clickable
            
            previewItem.appendChild(fileName);
        }
        
        // Remove button
        const removeBtn = document.createElement('button');
        removeBtn.className = 'remove-file';
        removeBtn.innerHTML = '&times;';
        removeBtn.onclick = () => {
            selectedFiles.splice(index, 1);
            updateFilePreview();
            
            // Close preview panel if it's open
            const previewPanel = document.getElementById('preview-panel');
            if (previewPanel && previewPanel.style.display === 'flex') {
                closeDocumentPreview();
            }
        };
        
        previewItem.appendChild(removeBtn);
        filePreviewContainer.appendChild(previewItem);
    });
}

// ============================================
// EMOJI PICKER FUNCTIONALITY
// ============================================

// Toggle emoji picker
emojiBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    const isVisible = emojiPicker.style.display === 'block';
    emojiPicker.style.display = isVisible ? 'none' : 'block';
    
    // Populate emojis if first time opening
    if (!isVisible && emojiContent.children.length === 0) {
        populateEmojis('smileys');
    }
});

// Close emoji picker when clicking outside
document.addEventListener('click', (e) => {
    if (!emojiPicker.contains(e.target) && e.target !== emojiBtn) {
        emojiPicker.style.display = 'none';
    }
});

// Handle emoji category tabs
const emojiTabs = document.querySelectorAll('.emoji-tab');
emojiTabs.forEach(tab => {
    tab.addEventListener('click', () => {
        // Update active tab
        emojiTabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        
        // Populate emojis for selected category
        const category = tab.getAttribute('data-category');
        populateEmojis(category);
    });
});

// Function to populate emojis based on category
function populateEmojis(category) {
    emojiContent.innerHTML = '';
    const emojis = emojiCategories[category] || [];
    
    emojis.forEach(emoji => {
        const emojiSpan = document.createElement('span');
        emojiSpan.className = 'emoji-item';
        emojiSpan.textContent = emoji;
        emojiSpan.addEventListener('click', () => {
            // Insert emoji at cursor position
            const start = messageInput.selectionStart;
            const end = messageInput.selectionEnd;
            const text = messageInput.value;
            messageInput.value = text.substring(0, start) + emoji + text.substring(end);
            
            // Set cursor position after emoji
            messageInput.selectionStart = messageInput.selectionEnd = start + emoji.length;
            messageInput.focus();
            
            // Don't close picker, allow multiple emoji selections
        });
        emojiContent.appendChild(emojiSpan);
    });
}

// ============================================
// VOICE INPUT FUNCTIONALITY
// ============================================

// Initialize Web Speech API
if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    
    // Set language based on current language
    const langMap = {
        'zh-TW': 'zh-TW',
        'en': 'en-US',
        'ja': 'ja-JP',
    };
    
    recognition.lang = langMap[currentLanguage] || 'zh-TW';
    
    recognition.onstart = () => {
        isRecording = true;
        voiceInputBtn.classList.add('recording');
        const t = translations[currentLanguage];
        messageInput.placeholder = t.voiceRecording || '正在录音...';
    };
    
    recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        messageInput.value = transcript;
        messageInput.focus();
    };
    
    recognition.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        isRecording = false;
        voiceInputBtn.classList.remove('recording');
        const t = translations[currentLanguage];
        messageInput.placeholder = t.placeholder;
        
        if (event.error === 'not-allowed') {
            showCustomAlert(t.micPermissionDenied || '麦克风权限被拒绝');
        }
    };
    
    recognition.onend = () => {
        isRecording = false;
        voiceInputBtn.classList.remove('recording');
        const t = translations[currentLanguage];
        messageInput.placeholder = t.placeholder;
    };
}

voiceInputBtn.addEventListener('click', () => {
    if (!recognition) {
        const t = translations[currentLanguage];
        showCustomAlert(t.voiceNotSupported || '您的浏览器不支持语音识别');
        return;
    }
    
    if (isRecording) {
        recognition.stop();
    } else {
        // Update language before starting
        const langMap = {
            'zh-TW': 'zh-TW',
            'en': 'en-US',
            'ja': 'ja-JP',
        };
        recognition.lang = langMap[currentLanguage] || 'zh-TW';
        recognition.start();
    }
});

// ============================================
// WEBCAM FUNCTIONALITY
// ============================================

webcamBtn.addEventListener('click', async () => {
    webcamModal.style.display = 'flex';
    captureBtn.style.display = 'block';
    retakeBtn.style.display = 'none';
    usePhotoBtn.style.display = 'none';
    webcamVideo.style.display = 'block';
    webcamCanvas.style.display = 'none';
    
    try {
        webcamStream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: 'user' },
            audio: false
        });
        webcamVideo.srcObject = webcamStream;
    } catch (error) {
        console.error('Webcam error:', error);
        const t = translations[currentLanguage];
        showCustomAlert(t.webcamPermissionDenied || '无法访问摄像头');
        closeWebcamModal();
    }
});

closeWebcam.addEventListener('click', closeWebcamModal);

webcamModal.addEventListener('click', (e) => {
    if (e.target === webcamModal) {
        closeWebcamModal();
    }
});

function closeWebcamModal() {
    webcamModal.style.display = 'none';
    if (webcamStream) {
        webcamStream.getTracks().forEach(track => track.stop());
        webcamStream = null;
    }
    webcamVideo.srcObject = null;
    capturedPhoto = null;
}

captureBtn.addEventListener('click', () => {
    const canvas = webcamCanvas;
    const video = webcamVideo;
    
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0);
    
    // Stop webcam stream
    if (webcamStream) {
        webcamStream.getTracks().forEach(track => track.stop());
        webcamStream = null;
    }
    
    // Show captured image
    webcamVideo.style.display = 'none';
    webcamCanvas.style.display = 'block';
    captureBtn.style.display = 'none';
    retakeBtn.style.display = 'block';
    usePhotoBtn.style.display = 'block';
    
    // Store the captured photo as blob
    canvas.toBlob((blob) => {
        capturedPhoto = new File([blob], `webcam_${Date.now()}.jpg`, { type: 'image/jpeg' });
    }, 'image/jpeg', 0.9);
});

retakeBtn.addEventListener('click', async () => {
    capturedPhoto = null;
    webcamVideo.style.display = 'block';
    webcamCanvas.style.display = 'none';
    captureBtn.style.display = 'block';
    retakeBtn.style.display = 'none';
    usePhotoBtn.style.display = 'none';
    
    try {
        webcamStream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: 'user' },
            audio: false
        });
        webcamVideo.srcObject = webcamStream;
    } catch (error) {
        console.error('Webcam error:', error);
        const t = translations[currentLanguage];
        showCustomAlert(t.webcamPermissionDenied || '无法访问摄像头');
        closeWebcamModal();
    }
});

usePhotoBtn.addEventListener('click', () => {
    if (capturedPhoto) {
        selectedFiles.push(capturedPhoto);
        updateFilePreview();
        closeWebcamModal();
    }
});

// ============================================
// UPDATE SEND MESSAGE TO HANDLE FILES
// ============================================

// Update the sendMessage function to handle files
async function sendMessageWithFiles() {
    const t = translations[currentLanguage];
    const messageText = messageInput.value.trim();
    const hasFiles = selectedFiles.length > 0;

    if (!messageText && !hasFiles) {
        return;
    }

    const attachmentsSnapshot = [...selectedFiles];
    
    // Generate unique temp_id for optimistic UI
    const tempId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Clear the file preview immediately after sending
    selectedFiles = [];
    updateFilePreview();

    const userMessageElement = createMessageWithFiles(messageText, attachmentsSnapshot, true, tempId);

    messagesDiv.appendChild(userMessageElement);
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
    messageInput.value = '';

    conversationHistory.push({
        role: 'user',
        content: messageText,
        time: Date.now()
    });

    let conversationId = activeConversationId;

    try {
        if (!conversationId) {
            const createResponse = await chatAPI.createConversation();
            conversationId = createResponse.conversation_id;
            activeConversationId = conversationId;
            if (createResponse.conversation) {
                upsertConversation(createResponse.conversation);
            } else {
                await loadConversations();
            }
        }

        const attachmentsMetadata = attachmentsSnapshot.length
            ? attachmentsSnapshot.map((file) => ({
                name: file.name,
                type: file.type,
                size: file.size
            }))
            : null;

        const userMessageResponse = await chatAPI.addMessage(
            conversationId,
            messageText,
            'user',
            attachmentsMetadata ? { attachments: attachmentsMetadata } : null,
            attachmentsSnapshot,
            tempId
        );

        if (userMessageResponse.conversation) {
            upsertConversation(userMessageResponse.conversation);
        }

        // DO NOT update with server files to prevent flickering (Optimistic UI)
        // The local blob URLs will remain visible to the user
        // if (userMessageResponse.message && userMessageResponse.message.uploaded_files) {
        //     updateMessageWithServerFiles(userMessageElement, userMessageResponse.message.uploaded_files);
        // }

        const mediaFile = attachmentsSnapshot.find((file) => file.type.startsWith('image/') || file.type.startsWith('video/'));
        
        // Create bot message element with typing indicator
        const botMessageElement = createMessage('', false);
        botMessageElement.classList.add('typing-indicator');
        const botMessageContent = botMessageElement.querySelector('.message-content p');
        botMessageContent.textContent = t.typing || 'Typing...';
        messagesDiv.appendChild(botMessageElement);
        messagesDiv.scrollTop = messagesDiv.scrollHeight;
        
        let fullResponse = '';
        
        if (mediaFile) {
            // For images/videos, use the uploaded URL
            // Find the index to get the correct URL from uploaded_files
            const mediaIndex = attachmentsSnapshot.indexOf(mediaFile);
            const mediaUrl = userMessageResponse.message.uploaded_files[mediaIndex];
            const mediaMimeType = mediaFile.type;

            let currentTypingIndex = 0;
            let pendingText = '';
            
            await chatAPI.streamChatMessage(
                messageText || (mediaFile.type.startsWith('video/') ? (t.analyzeVideo || 'Please analyze this video') : t.analyzeImage),
                null,
                mediaUrl,
                mediaMimeType,
                currentLanguage,
                conversationHistory,
                (chunk) => {
                    pendingText += chunk;
                    
                    const typePendingText = () => {
                        if (currentTypingIndex < pendingText.length) {
                            botMessageContent.textContent = pendingText.slice(0, currentTypingIndex + 1);
                            currentTypingIndex++;
                            messagesDiv.scrollTop = messagesDiv.scrollHeight;
                            setTimeout(typePendingText, 30);
                        }
                    };
                    
                    if (currentTypingIndex < pendingText.length) {
                        typePendingText();
                    }
                },
                () => {
                    fullResponse = pendingText;
                    botMessageElement.classList.remove('typing-indicator');
                    const speakBtn = document.createElement('button');
                    speakBtn.className = 'speak-btn';
                    speakBtn.innerHTML = '<i class="fas fa-volume-up"></i>';
                    speakBtn.title = translations[currentLanguage].readMessage || '朗讀訊息';
                    speakBtn.onclick = () => speakMessage(fullResponse, speakBtn);
                    botMessageElement.querySelector('.message-content').appendChild(speakBtn);
                },
                (error) => {
                    console.error('Streaming error:', error);
                    botMessageElement.classList.remove('typing-indicator');
                    botMessageContent.textContent = t.errorMsg || '抱歉，發生了錯誤。請稍後再試。';
                    fullResponse = botMessageContent.textContent;
                    const speakBtn = document.createElement('button');
                    speakBtn.className = 'speak-btn';
                    speakBtn.innerHTML = '<i class="fas fa-volume-up"></i>';
                    speakBtn.title = translations[currentLanguage].readMessage || '朗讀訊息';
                    speakBtn.onclick = () => speakMessage(fullResponse, speakBtn);
                    botMessageElement.querySelector('.message-content').appendChild(speakBtn);
                }
            );
        } else {
            // Use streaming for text messages
            let currentTypingIndex = 0;
            let pendingText = '';
            
            await chatAPI.streamChatMessage(
                messageText,
                null,
                null,
                null,
                currentLanguage,
                conversationHistory,
                (chunk) => {
                    pendingText += chunk;
                    
                    const typePendingText = () => {
                        if (currentTypingIndex < pendingText.length) {
                            botMessageContent.textContent = pendingText.slice(0, currentTypingIndex + 1);
                            currentTypingIndex++;
                            messagesDiv.scrollTop = messagesDiv.scrollHeight;
                            setTimeout(typePendingText, 30);
                        }
                    };
                    
                    if (currentTypingIndex < pendingText.length) {
                        typePendingText();
                    }
                },
                () => {
                    fullResponse = pendingText;
                    botMessageElement.classList.remove('typing-indicator');
                    const speakBtn = document.createElement('button');
                    speakBtn.className = 'speak-btn';
                    speakBtn.innerHTML = '<i class="fas fa-volume-up"></i>';
                    speakBtn.title = translations[currentLanguage].readMessage || '朗讀訊息';
                    speakBtn.onclick = () => speakMessage(fullResponse, speakBtn);
                    botMessageElement.querySelector('.message-content').appendChild(speakBtn);
                },
                (error) => {
                    console.error('Streaming error:', error);
                    botMessageElement.classList.remove('typing-indicator');
                    botMessageContent.textContent = t.errorMsg || '抱歉，發生了錯誤。請稍後再試。';
                    fullResponse = botMessageContent.textContent;
                    const speakBtn = document.createElement('button');
                    speakBtn.className = 'speak-btn';
                    speakBtn.innerHTML = '<i class="fas fa-volume-up"></i>';
                    speakBtn.title = translations[currentLanguage].readMessage || '朗讀訊息';
                    speakBtn.onclick = () => speakMessage(fullResponse, speakBtn);
                    botMessageElement.querySelector('.message-content').appendChild(speakBtn);
                }
            );
        }
        
        // Ensure fullResponse has content
        if (!fullResponse.trim()) {
            fullResponse = t.errorMsg || '抱歉，發生了錯誤。請稍後再試。';
            botMessageContent.textContent = fullResponse;
        }
        
        conversationHistory.push({ role: 'bot', content: fullResponse, time: Date.now() });
        
        try {
            const assistantMessageResponse = await chatAPI.addMessage(conversationId, fullResponse, 'assistant');
            if (assistantMessageResponse.conversation) {
                upsertConversation(assistantMessageResponse.conversation);
            }
        } catch (assistantError) {
            console.error('Failed to persist assistant message', assistantError);
        }
    } catch (error) {
        console.error('Error:', error);
        const errorMsg = t.errorMsg || '抱歉，发生了错误。';
        const botMessage = createMessage(errorMsg, false);
        messagesDiv.appendChild(botMessage);
        messagesDiv.scrollTop = messagesDiv.scrollHeight;
    }
}

function createMessageWithFiles(text, files, isUser = true, tempId = null) {
    const container = document.createElement('div');
    container.className = isUser ? 'user-message-container' : 'bot-message-container';
    
    // Add temp_id as data attribute for optimistic UI tracking
    if (tempId) {
        container.setAttribute('data-temp-id', tempId);
    }
    
    const avatar = document.createElement('div');
    avatar.className = isUser ? 'avatar user-avatar' : 'avatar bot-avatar';
    
    if (isUser && window.userAvatar) {
        avatar.style.backgroundImage = `url(${window.userAvatar})`;
        avatar.style.backgroundSize = 'cover';
        avatar.style.backgroundPosition = 'center';
    } else if (!isUser && botAvatar) {
        avatar.style.backgroundImage = `url(${botAvatar})`;
        avatar.style.backgroundSize = 'cover';
        avatar.style.backgroundPosition = 'center';
    } else {
        avatar.innerHTML = isUser ? '<i class="fas fa-user"></i>' : '<i class="fas fa-robot"></i>';
    }
    
    const messageContent = document.createElement('div');
    messageContent.className = 'message-content';
    
    // Add files/images
    if (files && files.length > 0) {
        files.forEach(file => {
            if (file.type.startsWith('image/')) {
                const img = document.createElement('img');
                img.className = 'message-image';
                // Append the image to DOM FIRST to preserve order
                messageContent.appendChild(img);
                
                const reader = new FileReader();
                reader.onload = (e) => {
                    img.src = e.target.result;
                };
                reader.readAsDataURL(file);
                
                img.addEventListener('click', () => {
                    // For local files, open the preview panel with data URL
                    openDocumentPreviewModal(img.src, file.name);
                });
            } else if (file.type.startsWith('video/')) {
                const videoContainer = document.createElement('div');
                videoContainer.className = 'video-preview-container';
                
                const video = document.createElement('video');
                video.className = 'message-video-thumb';
                const videoUrl = URL.createObjectURL(file);
                video.src = videoUrl;
                video.muted = true;
                video.preload = 'metadata';
                
                // Try to show a frame
                video.addEventListener('loadeddata', () => {
                    video.currentTime = 0.1;
                });

                const playIcon = document.createElement('div');
                playIcon.className = 'play-overlay';
                playIcon.innerHTML = '<i class="fas fa-play-circle"></i>';

                videoContainer.appendChild(video);
                videoContainer.appendChild(playIcon);
                
                videoContainer.addEventListener('click', () => {
                    openDocumentPreviewModal(videoUrl, file.name);
                });
                
                messageContent.appendChild(videoContainer);
            } else {
                // Show file name for non-image files (PDFs, etc.)
                const fileInfo = document.createElement('div');
                fileInfo.className = 'message-file-info';
                fileInfo.innerHTML = `<i class="fas fa-file"></i> ${file.name}`;
                
                // Create blob URL for preview
                const fileUrl = URL.createObjectURL(file);
                
                // Add click handler to open preview modal
                fileInfo.addEventListener('click', () => {
                    openDocumentPreviewModal(fileUrl, file.name);
                });
                
                messageContent.appendChild(fileInfo);
            }
        });
    }
    
    // Add text if provided
    if (text) {
        const paragraph = document.createElement('p');
        paragraph.textContent = text;
        messageContent.appendChild(paragraph);
    }
    
    container.appendChild(avatar);
    container.appendChild(messageContent);
    
    return container;
}

function updateMessageWithServerFiles(messageElement, uploadedFiles) {
    if (!uploadedFiles || !uploadedFiles.length) return;
    
    const messageContent = messageElement.querySelector('.message-content');
    if (!messageContent) return;
    
    // Helper function to clean filename by removing timestamp
    function cleanFileName(fileName) {
        // Remove timestamp pattern: _ followed by digits before the extension
        return fileName.replace(/_(\d+)(\.\w+)$/, '$2');
    }
    
    // Remove existing file displays (local preview elements)
    const existingFileInfos = messageContent.querySelectorAll('div[style*="background"]');
    existingFileInfos.forEach(info => {
        if (info.innerHTML.includes('fas fa-file') || info.innerHTML.includes('fas fa-video')) {
            info.remove();
        }
    });
    
    // Remove existing images to replace with server URLs
    const existingImages = messageContent.querySelectorAll('img.message-image');
    existingImages.forEach(img => img.remove());
    
    // Remove existing video elements (local previews)
    const existingVideos = messageContent.querySelectorAll('video.message-video-thumb');
    existingVideos.forEach(video => video.remove());
    const existingVideoContainers = messageContent.querySelectorAll('.video-preview-container');
    existingVideoContainers.forEach(container => container.remove());
    
    // Get the text paragraph to insert media before it
    const textParagraph = messageContent.querySelector('p');
    
    // Add server-based file displays
    uploadedFiles.forEach(filePath => {
        let fullPath;
        if (filePath.startsWith('https://storage.googleapis.com/')) {
            const token = localStorage.getItem('access_token');
            fullPath = `/serve_file?url=${encodeURIComponent(filePath)}&token=${encodeURIComponent(token)}`;
        } else {
            fullPath = `/static/${filePath}`;
        }
        const rawFileName = filePath.split('/').pop();
        const displayFileName = cleanFileName(rawFileName);
        
        // Check if it's an image
        const isImage = /\.(jpg|jpeg|png|gif|bmp|webp)$/i.test(displayFileName);
        const isVideo = /\.(mp4|webm|ogg|mov)$/i.test(displayFileName);
        
        if (isImage) {
            const img = document.createElement('img');
            img.className = 'message-image';
            img.src = fullPath;
            img.addEventListener('click', () => {
                openDocumentPreviewModal(fullPath, displayFileName);
            });
            
            // Insert before the text paragraph to keep text at the bottom
            if (textParagraph) {
                messageContent.insertBefore(img, textParagraph);
            } else {
                messageContent.appendChild(img);
            }
        } else if (isVideo) {
            const videoContainer = document.createElement('div');
            videoContainer.className = 'video-preview-container';
            
            const video = document.createElement('video');
            video.className = 'message-video-thumb';
            video.src = fullPath;
            video.muted = true;
            video.preload = 'metadata';
            
            // Try to show a frame
            video.addEventListener('loadeddata', () => {
                video.currentTime = 0.1;
            });

            const playIcon = document.createElement('div');
            playIcon.className = 'play-overlay';
            playIcon.innerHTML = '<i class="fas fa-play-circle"></i>';

            videoContainer.appendChild(video);
            videoContainer.appendChild(playIcon);
            
            videoContainer.addEventListener('click', () => {
                openDocumentPreviewModal(fullPath, displayFileName);
            });
            
            // Insert before the text paragraph to keep text at the bottom
            if (textParagraph) {
                messageContent.insertBefore(videoContainer, textParagraph);
            } else {
                messageContent.appendChild(videoContainer);
            }
        } else {
            // For non-image/video files, show clickable file info
            const fileInfo = document.createElement('div');
            fileInfo.className = 'message-file-info';
            fileInfo.innerHTML = `<i class="fas fa-file"></i> ${displayFileName}`;
            
            fileInfo.addEventListener('click', () => {
                openDocumentPreviewModal(fullPath, displayFileName);
            });
            
            // Insert before the text paragraph to keep text at the bottom
            if (textParagraph) {
                messageContent.insertBefore(fileInfo, textParagraph);
            } else {
                messageContent.appendChild(fileInfo);
            }
        }
    });
}

function openDocumentPreviewModal(filePath, fileName) {
    const mainContent = document.getElementById('main-content');
    const previewPanel = document.getElementById('preview-panel');
    const previewTitle = document.getElementById('preview-title');
    const previewContent = document.getElementById('preview-content');
    const closePreviewBtn = document.getElementById('closePreview');

    // Set preview title
    previewTitle.textContent = fileName;

    // Clear previous content
    previewContent.innerHTML = '';

    // Determine file type and create appropriate preview
    const isImage = /\.(jpg|jpeg|png|gif|bmp|webp)$/i.test(fileName);
    const isPDF = /\.pdf$/i.test(fileName);
    const isVideo = /\.(mp4|webm|ogg|mov)$/i.test(fileName);

    if (isImage) {
        const img = document.createElement('img');
        img.src = filePath;
        previewContent.appendChild(img);
    } else if (isVideo) {
        const video = document.createElement('video');
        video.src = filePath;
        video.controls = true;
        previewContent.appendChild(video);
    } else if (isPDF) {
        const iframe = document.createElement('iframe');
        iframe.src = filePath;
        previewContent.appendChild(iframe);
    } else {
        // For other document types, try to display in iframe or show download link
        const iframe = document.createElement('iframe');
        iframe.src = filePath;
        previewContent.appendChild(iframe);
    }

    // Show preview panel
    mainContent.classList.add('preview-active');
    previewPanel.style.display = 'flex';
    // Trigger animation
    setTimeout(() => {
        previewPanel.style.opacity = '1';
        previewPanel.style.transform = 'translateX(0)';
    }, 10);

    // Add close event listener
    closePreviewBtn.onclick = () => {
        closeDocumentPreview();
    };
}

function closeDocumentPreview() {
    const mainContent = document.getElementById('main-content');
    const previewPanel = document.getElementById('preview-panel');
    mainContent.classList.remove('preview-active');
    previewPanel.style.display = 'none';
}

function createMessageWithUploadedFiles(text, uploadedFiles, isUser = true) {
    const container = document.createElement('div');
    container.className = isUser ? 'user-message-container' : 'bot-message-container';
    
    const avatar = document.createElement('div');
    avatar.className = isUser ? 'avatar user-avatar' : 'avatar bot-avatar';
    
    if (isUser && window.userAvatar) {
        avatar.style.backgroundImage = `url(${window.userAvatar})`;
        avatar.style.backgroundSize = 'cover';
        avatar.style.backgroundPosition = 'center';
    } else if (!isUser && botAvatar) {
        avatar.style.backgroundImage = `url(${botAvatar})`;
        avatar.style.backgroundSize = 'cover';
        avatar.style.backgroundPosition = 'center';
    } else {
        avatar.innerHTML = isUser ? '<i class="fas fa-user"></i>' : '<i class="fas fa-robot"></i>';
    }
    
    const messageContent = document.createElement('div');
    messageContent.className = 'message-content';
    
    // Helper function to clean filename by removing timestamp
    function cleanFileName(fileName) {
        // Remove timestamp pattern: _ followed by digits before the extension
        return fileName.replace(/_(\d+)(\.\w+)$/, '$2');
    }

    // Add uploaded files
    if (uploadedFiles && uploadedFiles.length > 0) {
        uploadedFiles.forEach(filePath => {
            let fullPath;
            if (filePath.startsWith('https://storage.googleapis.com/')) {
                const token = localStorage.getItem('access_token');
                fullPath = `/serve_file?url=${encodeURIComponent(filePath)}&token=${encodeURIComponent(token)}`;
            } else {
                fullPath = `/static/${filePath}`;
            }
            const rawFileName = filePath.split('/').pop();
            const displayFileName = cleanFileName(rawFileName);

            // Check if it's an image
            const isImage = /\.(jpg|jpeg|png|gif|bmp|webp)$/i.test(displayFileName);
            const isVideo = /\.(mp4|webm|ogg|mov)$/i.test(displayFileName);

            if (isImage) {
                const img = document.createElement('img');
                img.className = 'message-image';
                img.src = fullPath;

                img.addEventListener('click', () => {
                    openDocumentPreviewModal(fullPath, displayFileName);
                });

                messageContent.appendChild(img);
            } else if (isVideo) {
                const videoContainer = document.createElement('div');
                videoContainer.className = 'video-preview-container';
                
                const video = document.createElement('video');
                video.className = 'message-video-thumb';
                video.src = fullPath;
                video.muted = true;
                video.preload = 'metadata';
                
                // Try to show a frame
                video.addEventListener('loadeddata', () => {
                    video.currentTime = 0.1;
                });

                const playIcon = document.createElement('div');
                playIcon.className = 'play-overlay';
                playIcon.innerHTML = '<i class="fas fa-play-circle"></i>';

                videoContainer.appendChild(video);
                videoContainer.appendChild(playIcon);
                
                videoContainer.addEventListener('click', () => {
                    openDocumentPreviewModal(fullPath, displayFileName);
                });

                messageContent.appendChild(videoContainer);
            } else {
                // Show file name for non-image files with preview modal
                const fileInfo = document.createElement('div');
                fileInfo.className = 'message-file-info';
                fileInfo.innerHTML = `<i class="fas fa-file"></i> ${displayFileName}`;

                fileInfo.addEventListener('click', () => {
                    openDocumentPreviewModal(fullPath, displayFileName);
                });

                messageContent.appendChild(fileInfo);
            }
        });
    }

    // Add text if provided
    if (text) {
        const paragraph = document.createElement('p');
        paragraph.textContent = text;
        messageContent.appendChild(paragraph);
    }
    
    container.appendChild(avatar);
    container.appendChild(messageContent);
    
    return container;
}