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

/**
 * Lightweight Markdown → HTML renderer.
 * Handles: headings, bold, italic, numbered/bullet lists, code blocks, inline code, line breaks.
 * HTML entities are escaped first to prevent XSS.
 */
function renderMarkdown(text) {
    if (!text) return '';

    // 1. Escape HTML entities
    let html = text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');

    // 2. Fenced code blocks (```...```)
    html = html.replace(/```(\w*)\n([\s\S]*?)```/g, (_m, _lang, code) => {
        return `<pre><code>${code.trim()}</code></pre>`;
    });

    // 3. Inline code (`...`)
    html = html.replace(/`([^`\n]+)`/g, '<code>$1</code>');

    // 4. Headings (### / ## / #)
    html = html.replace(/^### (.+)$/gm, '<h4>$1</h4>');
    html = html.replace(/^## (.+)$/gm, '<h3>$1</h3>');
    html = html.replace(/^# (.+)$/gm, '<h2>$1</h2>');

    // 5. Bold (**text**) and Italic (*text*)
    html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');

    // 6. Lists — convert blocks of consecutive list lines
    // Numbered lists: lines starting with "1. ", "2. ", etc.
    html = html.replace(/(^|\n)((?:\d+\.\s.+(?:\n|$))+)/g, (_m, pre, block) => {
        const items = block.trim().split('\n').map(line =>
            `<li>${line.replace(/^\d+\.\s/, '')}</li>`
        ).join('');
        return `${pre}<ol>${items}</ol>`;
    });

    // Bullet lists: lines starting with "- " or "* "
    html = html.replace(/(^|\n)((?:[-*]\s.+(?:\n|$))+)/g, (_m, pre, block) => {
        const items = block.trim().split('\n').map(line =>
            `<li>${line.replace(/^[-*]\s/, '')}</li>`
        ).join('');
        return `${pre}<ul>${items}</ul>`;
    });

    // 7. Remaining newlines → <br> (but not inside <pre> or after block elements)
    html = html.replace(/\n/g, '<br>');

    // Clean up extra <br> around block elements
    html = html.replace(/<br>\s*(<(?:ol|ul|li|h[2-4]|pre|\/ol|\/ul|\/pre))/g, '$1');
    html = html.replace(/(<\/(?:ol|ul|h[2-4]|pre)>)\s*<br>/g, '$1');

    return html;
}

// Language support
let currentLanguage = 'zh-TW'; // Default to Traditional Chinese

// Let chatbox control when the page becomes visible (prevents flash where settings.js marks ready too early)
window.__i18nDeferReady = true;

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

function loadTranslationCache(lang) {
    try {
        const cached = localStorage.getItem(`i18n_cache_${lang}`);
        if (cached) {
            return JSON.parse(cached);
        }
    } catch (error) {
        console.warn('Failed to read cached translations:', error);
    }
    return null;
}

function storeTranslationCache(lang, data) {
    try {
        localStorage.setItem(`i18n_cache_${lang}`, JSON.stringify(data));
    } catch (error) {
        console.warn('Failed to cache translations:', error);
    }
}

function markI18nReady() {
    document.documentElement.setAttribute('data-i18n-ready', 'true');
    document.documentElement.removeAttribute('data-i18n-pending');
}

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
    const languages = ['zh-TW', 'zh-CN', 'en', 'ja'];
    const promises = languages.map(async (lang) => {
        if (translations[lang]) {
            return;
        }

        const cached = loadTranslationCache(lang);
        if (cached) {
            translations[lang] = cached;
            return;
        }

        try {
            const response = await fetch(`/static/i18n/${lang}.json`);
            if (!response.ok) throw new Error(`Failed to load ${lang} translations`);
            translations[lang] = await response.json();
            storeTranslationCache(lang, translations[lang]);
        } catch (error) {
            console.error(`Error loading ${lang} translations:`, error);
            // Fallback to basic English
            translations[lang] = {
                chatbox: "Chatbox",
                placeholder: "Type your question here...",
                welcomeMsg: "Hello! I am your assistant.",
                errorMsg: "An error occurred.",
                stoppedMsg: "You stopped this response"
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
    // If we don't have this language yet, load translations (and other data) first.
    if (!translations[lang]) {
        console.log('Waiting for translations to load...');
        await initializeData();
    } else if (!dataLoaded) {
        // Don't block initial paint if we can translate from cache; load the rest in background.
        initializeData().catch((e) => console.warn('Background init failed:', e));
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
    
    // Update welcome subtitle if visible
    const subtitle = document.getElementById('welcomeSubtitleText');
    if (subtitle && t.welcomeMsg) subtitle.textContent = t.welcomeMsg;

    // Update plus menu item labels
    const plusMenuBtn = document.getElementById('plusMenuBtn');
    if (plusMenuBtn && t['toolbar.more']) plusMenuBtn.title = t['toolbar.more'];
    const uploadLabel = document.querySelector('#fileUploadBtn .pmi-label');
    if (uploadLabel && t['toolbar.uploadFile']) uploadLabel.textContent = t['toolbar.uploadFile'];
    const voiceLabel = document.querySelector('#voiceInputBtn .pmi-label');
    if (voiceLabel && t['toolbar.voice']) voiceLabel.textContent = t['toolbar.voice'];
    const cameraLabel = document.querySelector('#webcamBtn .pmi-label');
    if (cameraLabel && t['toolbar.camera']) cameraLabel.textContent = t['toolbar.camera'];

    // Update model dropdown descriptions
    const flashDesc = document.querySelector('.model-dropdown-item[data-model="gemini-3-flash-preview"] .mdi-desc');
    if (flashDesc && t['model.flash.desc']) flashDesc.textContent = t['model.flash.desc'];
    const proDesc = document.querySelector('.model-dropdown-item[data-model="gemini-3.1-pro-preview"] .mdi-desc');
    if (proDesc && t['model.pro.desc']) proDesc.textContent = t['model.pro.desc'];

    // Save language preference to localStorage
    localStorage.setItem('preferredLanguage', lang);
    
    // Show notification
    console.log(t.langSwitched);

    // Refresh conversation list text to match language selection
    if (typeof renderConversationList !== 'undefined' && typeof conversationsCache !== 'undefined') {
        renderConversationList(conversationsCache);
    }

    // Page can be shown once core UI text is in the right language
    try {
        markI18nReady();
    } catch (e) {
        // no-op
    }
}

function renderWelcomeMessage() {
    const t = translations[currentLanguage] || {};
    messagesDiv.innerHTML = '';
    conversationHistory = [];
    // Update welcome subtitle text for current language
    const subtitle = document.getElementById('welcomeSubtitleText');
    if (subtitle) subtitle.textContent = t.welcomeMsg || subtitle.textContent;
    showWelcomeScreen();
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
    if (isUser) {
        paragraph.textContent = text;
    } else {
        // Render Markdown for bot messages (history, loaded conversations, etc.)
        paragraph.innerHTML = renderMarkdown(text);
    }
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
        if (isUser) {
            paragraph.textContent = text;
        } else {
            paragraph.innerHTML = renderMarkdown(text);
        }
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
    const savedLanguage = localStorage.getItem('preferredLanguage') || 'zh-TW';

    // Seed translations from localStorage cache to avoid initial language flash
    const cached = loadTranslationCache(savedLanguage);
    if (cached) {
        translations[savedLanguage] = cached;
        window.translations = window.translations || {};
        window.translations[savedLanguage] = cached;
    }

    try {
        currentLanguage = savedLanguage;
        await updateUILanguage(savedLanguage);
    } catch (error) {
        console.warn('Failed to apply initial UI language:', error);
        // Ensure the page isn't stuck invisible
        markI18nReady();
    }

    // Kick off full data initialization (emojis + all translations) without blocking initial render
    initializeData()
        .then(() => {
            if (savedLanguage && translations[savedLanguage]) {
                return updateUILanguage(savedLanguage);
            }
        })
        .catch((e) => console.warn('Failed to fully initialize data:', e));

    // Update active language option in settings (if present)
    const langOptions = document.querySelectorAll('.lang-option');
    if (langOptions && langOptions.length) {
        langOptions.forEach((option) => {
            const lang = option.getAttribute('data-lang');
            const icon = option.querySelector('i');
            if (lang === savedLanguage) {
                option.classList.add('active');
                if (icon) icon.className = 'fas fa-check-circle';
            } else {
                option.classList.remove('active');
                if (icon) icon.className = 'fas fa-circle';
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
    
    // Socket.io initialized above. Conversations will be loaded via sidebar.js.
    // Do NOT call showWelcomeScreen() here — let loadConversations() manage initial state
    // to avoid a flash when the user has existing conversations.

    // Load the user's saved model preference and reflect it in the toggle
    loadCurrentModel();
});

// ── Typewriter effect ──
// Buffers text from SSE chunks and renders it at a smooth, constant speed
// regardless of how large each chunk is (fixes "all-at-once" appearance
// when the model sends big chunks).
let _twTarget = null;
let _twFull = '';
let _twLen = 0;
let _twRunning = false;
let _twOnDone = null; // callback invoked once all chars are rendered normally
const TW_CHARS_PER_FRAME = 1; // ≈ 60 chars/sec at 60 fps — natural typewriter pace

function _twTick() {
    if (!_twRunning || !_twTarget) return;
    if (_twLen < _twFull.length) {
        _twLen = Math.min(_twLen + TW_CHARS_PER_FRAME, _twFull.length);
        _twTarget.innerHTML = renderMarkdown(_twFull.slice(0, _twLen));
        messagesDiv.scrollTop = messagesDiv.scrollHeight;
    }
    if (!_twRunning) return; // typewriterFlush() was called mid-animation
    // If done callback set and all chars rendered, finalise cleanly
    if (_twOnDone && _twLen >= _twFull.length) {
        // Final markdown render to close any open tags
        _twTarget.innerHTML = renderMarkdown(_twFull);
        messagesDiv.scrollTop = messagesDiv.scrollHeight;
        const cb = _twOnDone;
        _twOnDone = null;
        _twRunning = false;
        _twTarget = null;
        _twFull = '';
        _twLen = 0;
        cb(); // fire post-streaming cleanup
        return;
    }
    requestAnimationFrame(_twTick);
}

function typewriterStart(el) {
    _twTarget = el;
    _twFull = '';
    _twLen = 0;
    _twOnDone = null;
    _twRunning = true;
    requestAnimationFrame(_twTick);
}

function typewriterAppend(text) {
    _twFull += text;
}

/**
 * typewriterDone(cb) — call when streaming finishes *normally*.
 * Lets the rAF loop play out all buffered chars, then runs cb().
 */
function typewriterDone(cb) {
    _twOnDone = cb || (() => {});
    // If loop stopped early (e.g., all text already rendered before this call)
    // kick it back into motion so it can reach the _twOnDone check.
    if (!_twRunning && _twTarget) {
        _twRunning = true;
        requestAnimationFrame(_twTick);
    }
}

/**
 * typewriterFlush() — immediate hard stop (errors / user abort).
 * Renders all buffered text at once, no animation.
 */
function typewriterFlush() {
    _twRunning = false;
    if (_twTarget && _twFull) {
        _twTarget.innerHTML = renderMarkdown(_twFull);
        messagesDiv.scrollTop = messagesDiv.scrollHeight;
    }
    _twOnDone = null;
    _twTarget = null;
    _twFull = '';
    _twLen = 0;
}

// ── Model toggle (Fast / Pro) ──
const MODEL_FAST = 'gemini-3-flash-preview';
const MODEL_PRO  = 'gemini-3.1-pro-preview';

function _setModelToggleUI(model) {
    // Update the in-input model button label
    const label = document.getElementById('inputModelLabel');
    if (label) {
        label.textContent = model === MODEL_PRO ? 'Pro' : 'Flash';
    }
    // Update dropdown item active state
    document.querySelectorAll('.model-dropdown-item').forEach(item => {
        item.classList.toggle('active', item.dataset.model === model);
    });
    // Legacy: also update old toolbar toggle if still present
    document.getElementById('modelFastBtn')?.classList.toggle('active', model !== MODEL_PRO);
    document.getElementById('modelProBtn')?.classList.toggle('active',  model === MODEL_PRO);
}

async function loadCurrentModel() {
    try {
        const token = localStorage.getItem('access_token');
        const res = await fetch('/api/user/model', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
            const data = await res.json();
            _setModelToggleUI(data.ai_model || MODEL_FAST);
        }
    } catch (e) {
        console.warn('Could not load model preference:', e);
        _setModelToggleUI(MODEL_FAST); // default to Flash
    }
}

async function switchModel(model) {
    try {
        const token = localStorage.getItem('access_token');
        const res = await fetch('/api/user/model', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ ai_model: model }),
        });
        if (res.ok) {
            _setModelToggleUI(model);
            // Sync settings panel select if it exists
            const settingsSelect = document.getElementById('summaryModelSelect');
            if (settingsSelect) settingsSelect.value = model;
        } else {
            console.error('Failed to save model preference');
        }
    } catch (e) {
        console.error('Model switch error:', e);
    }
}

// Expose for settings.js two-way sync
window.updateChatModelToggle = _setModelToggleUI;

// ── Plus menu (file / voice / camera) ──
(function () {
    const plusMenuBtn  = document.getElementById('plusMenuBtn');
    const plusMenu     = document.getElementById('plusMenu');
    if (!plusMenuBtn || !plusMenu) return;

    function togglePlusMenu(open) {
        plusMenu.style.display  = open ? 'flex' : 'none';
        plusMenuBtn.classList.toggle('open', open);
    }

    plusMenuBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        // Close model dropdown if open
        const md = document.getElementById('modelDropdown');
        if (md) { md.style.display = 'none'; document.getElementById('inputModelBtn')?.classList.remove('open'); }
        togglePlusMenu(plusMenu.style.display === 'none' || plusMenu.style.display === '');
    });

    // Close when clicking a menu item or outside
    plusMenu.addEventListener('click', () => togglePlusMenu(false));
    document.addEventListener('click', (e) => {
        if (!plusMenu.contains(e.target) && e.target !== plusMenuBtn) {
            togglePlusMenu(false);
        }
    });
})();

// ── Model dropdown (in-input pill) ──
(function () {
    const inputModelBtn  = document.getElementById('inputModelBtn');
    const modelDropdown  = document.getElementById('modelDropdown');
    if (!inputModelBtn || !modelDropdown) return;

    function toggleModelDropdown(open) {
        modelDropdown.style.display = open ? 'flex' : 'none';
        inputModelBtn.classList.toggle('open', open);
    }

    inputModelBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        // Close plus menu if open
        const pm = document.getElementById('plusMenu');
        if (pm) { pm.style.display = 'none'; document.getElementById('plusMenuBtn')?.classList.remove('open'); }
        toggleModelDropdown(modelDropdown.style.display === 'none' || modelDropdown.style.display === '');
    });

    modelDropdown.addEventListener('click', (e) => {
        const item = e.target.closest('.model-dropdown-item');
        if (item) {
            switchModel(item.dataset.model);
            toggleModelDropdown(false);
        }
    });

    document.addEventListener('click', (e) => {
        if (!modelDropdown.contains(e.target) && e.target !== inputModelBtn) {
            toggleModelDropdown(false);
        }
    });
})();

// ── Welcome screen helpers ──
function showWelcomeScreen() {
    const chatContainer = document.getElementById('chat-container');
    if (chatContainer) chatContainer.classList.add('welcome-mode');
}

function hideWelcomeScreen() {
    const chatContainer = document.getElementById('chat-container');
    if (chatContainer) chatContainer.classList.remove('welcome-mode');
}

// ── Streaming state ──
let isStreaming = false;
let streamWasStopped = false; // true when user manually clicks stop

function showStopButton() {
    const t = translations[currentLanguage] || {};
    sendButton.innerHTML = '<i class="fas fa-stop-circle"></i>';
    sendButton.classList.add('stop-mode');
    sendButton.title = t.stopGenerating || 'Stop Generating';
}

function hideStopButton() {
    sendButton.innerHTML = '<i class="fas fa-paper-plane"></i>';
    sendButton.classList.remove('stop-mode');
    sendButton.title = 'Send message';
}

// Function to send a message
async function sendMessage() {
    await sendMessageWithFiles();
}

// Attach event listener to send button — dual mode: send or stop
sendButton.addEventListener('click', () => {
    if (isStreaming) {
        streamWasStopped = true;
        chatAPI.abortStream();
        isStreaming = false;
        hideStopButton();
    } else {
        sendMessage();
    }
});

// Allow sending messages with Enter key (Shift+Enter inserts newline)
messageInput.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        if (!isStreaming) sendMessage();
    }
});

// Auto-grow textarea as user types
messageInput.addEventListener('input', function () {
    this.style.height = 'auto';
    const newH = Math.min(this.scrollHeight, 140);
    this.style.height = newH + 'px';
    this.style.overflowY = this.scrollHeight > 140 ? 'auto' : 'hidden';
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
            
            // Add file icon
            const fileIcon = document.createElement('i');
            fileIcon.className = 'fas fa-file-pdf'; // Default to PDF for now
            if (file.type.includes('pdf')) fileIcon.className = 'fas fa-file-pdf';
            else if (file.type.includes('word')) fileIcon.className = 'fas fa-file-word';
            else if (file.type.includes('excel')) fileIcon.className = 'fas fa-file-excel';
            else fileIcon.className = 'fas fa-file-alt';
            fileIcon.style.fontSize = '20px';
            fileIcon.style.color = '#A89BC5';
            previewItem.appendChild(fileIcon);

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
        removeBtn.innerHTML = '<i class="fas fa-times"></i>';
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

// Toggle emoji picker (button removed from UI but guard remains for safety)
emojiBtn?.addEventListener('click', (e) => {
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
        messageInput.style.height = 'auto';
        messageInput.style.height = Math.min(messageInput.scrollHeight, 140) + 'px';
        messageInput.style.overflowY = messageInput.scrollHeight > 140 ? 'auto' : 'hidden';
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

    // Hide welcome screen as soon as user sends first message
    hideWelcomeScreen();

    streamWasStopped = false; // reset stopped flag for this new message

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
    messageInput.style.height = 'auto';
    messageInput.style.overflowY = 'hidden';

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

        // Mark streaming state — prevent double-send
        isStreaming = true;
        showStopButton();
        typewriterStart(botMessageContent);
        
        if (mediaFile) {
            // For images/videos, use the uploaded URL
            // Find the index to get the correct URL from uploaded_files
            const mediaIndex = attachmentsSnapshot.indexOf(mediaFile);
            const mediaUrl = userMessageResponse.message.uploaded_files[mediaIndex];
            const mediaMimeType = mediaFile.type;

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
                    typewriterAppend(chunk); // typewriter renders gradually
                },
                () => {
                    fullResponse = pendingText;
                    // Let animation play out, THEN clean up UI
                    typewriterDone(() => {
                        botMessageElement.classList.remove('typing-indicator');
                        const speakBtn = document.createElement('button');
                        speakBtn.className = 'speak-btn';
                        speakBtn.innerHTML = '<i class="fas fa-volume-up"></i>';
                        speakBtn.title = translations[currentLanguage].readMessage || '朗讀訊息';
                        speakBtn.onclick = () => speakMessage(fullResponse, speakBtn);
                        botMessageElement.querySelector('.message-content').appendChild(speakBtn);
                    });
                },
                (error) => {
                    typewriterFlush(); // stop animation immediately on error
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
                },
                conversationId
            );
        } else {
            // Use streaming for text messages
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
                    typewriterAppend(chunk); // typewriter renders gradually
                },
                () => {
                    fullResponse = pendingText;
                    // Let animation play out, THEN clean up UI
                    typewriterDone(() => {
                        botMessageElement.classList.remove('typing-indicator');
                        const speakBtn = document.createElement('button');
                        speakBtn.className = 'speak-btn';
                        speakBtn.innerHTML = '<i class="fas fa-volume-up"></i>';
                        speakBtn.title = translations[currentLanguage].readMessage || '朗讀訊息';
                        speakBtn.onclick = () => speakMessage(fullResponse, speakBtn);
                        botMessageElement.querySelector('.message-content').appendChild(speakBtn);
                    });
                },
                (error) => {
                    typewriterFlush(); // stop animation immediately on error
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
                },
                conversationId
            );
        }
        
        // Ensure fullResponse has content
        if (!fullResponse.trim()) {
            typewriterFlush(); // stop any lingering animation
            if (streamWasStopped) {
                fullResponse = t.stoppedMsg || '你已停止了這則回應';
            } else {
                fullResponse = t.errorMsg || '抱歉，發生了錯誤。請稍後再試。';
            }
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
    } finally {
        isStreaming = false;
        hideStopButton();
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
                
                let iconClass = 'fas fa-file-alt';
                if (file.name.toLowerCase().endsWith('.pdf')) iconClass = 'fas fa-file-pdf';
                else if (file.name.toLowerCase().endsWith('.doc') || file.name.toLowerCase().endsWith('.docx')) iconClass = 'fas fa-file-word';
                else if (file.name.toLowerCase().endsWith('.xls') || file.name.toLowerCase().endsWith('.xlsx')) iconClass = 'fas fa-file-excel';
                
                fileInfo.innerHTML = `<i class="${iconClass}"></i> <span>${file.name}</span>`;
                
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
            
            let iconClass = 'fas fa-file-alt';
            if (displayFileName.toLowerCase().endsWith('.pdf')) iconClass = 'fas fa-file-pdf';
            else if (displayFileName.toLowerCase().endsWith('.doc') || displayFileName.toLowerCase().endsWith('.docx')) iconClass = 'fas fa-file-word';
            else if (displayFileName.toLowerCase().endsWith('.xls') || displayFileName.toLowerCase().endsWith('.xlsx')) iconClass = 'fas fa-file-excel';
            
            fileInfo.innerHTML = `<i class="${iconClass}"></i> <span>${displayFileName}</span>`;
            
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
                
                let iconClass = 'fas fa-file-alt';
                if (displayFileName.toLowerCase().endsWith('.pdf')) iconClass = 'fas fa-file-pdf';
                else if (displayFileName.toLowerCase().endsWith('.doc') || displayFileName.toLowerCase().endsWith('.docx')) iconClass = 'fas fa-file-word';
                else if (displayFileName.toLowerCase().endsWith('.xls') || displayFileName.toLowerCase().endsWith('.xlsx')) iconClass = 'fas fa-file-excel';
                
                fileInfo.innerHTML = `<i class="${iconClass}"></i> <span>${displayFileName}</span>`;

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
        if (isUser) {
            paragraph.textContent = text;
        } else {
            paragraph.innerHTML = renderMarkdown(text);
        }
        messageContent.appendChild(paragraph);
    }
    
    container.appendChild(avatar);
    container.appendChild(messageContent);
    
    return container;
}
