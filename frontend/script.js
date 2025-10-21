// ========== XIAOICE Simplified Version ==========
// Simplified yet fully functional chatbox application

// ===== DOM Elements =====
const messagesDiv = document.getElementById('messages');
const messageInput = document.getElementById('messageInput');
const sendButton = document.getElementById('sendButton');
const imageInput = document.getElementById('imageInput');
const imageRecognitionBtn = document.getElementById('imageRecognitionBtn');
const emojiBtn = document.getElementById('emojiBtn');
const emojiPicker = document.getElementById('emojiPicker');
const emojiContent = document.getElementById('emojiContent');
const avatarModal = document.getElementById('avatarModal');
const closeModal = document.querySelector('.close');

// ===== State Variables =====
let currentLanguage = localStorage.getItem('preferredLanguage') || 'zh-CN';
let userAvatar = localStorage.getItem('userAvatar') || null;
let botAvatar = localStorage.getItem('botAvatar') || null;
let currentImageData = null;

// ===== API Configuration =====
const GEMINI_API_KEY = 'AIzaSyCXm-xczkkNVQnXoTho4SrMMHVaeYjorko';
const GEMINI_VISION_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';

// ===== Translations =====
const translations = {
    'zh-CN': {
        chatbox: '聊天盒子', chat: '聊天', greeting: '您好，GPT-4o', newChat: '新对话', 
        newImages: '新图像', myCopilots: '我的副驾驶', settings: '设置', about: '关于 1.3.8i',
        placeholder: '在这里输入您的问题...', typing: '正在输入...', analyzing: '正在分析图片...',
        analyzeImage: '请分析这张图片', welcomeMsg: '您好！我是您的智能助手。有任何问题我都乐意解答。',
        langSwitched: '语言已切换为简体中文'
    },
    'zh-TW': {
        chatbox: '聊天盒子', chat: '聊天', greeting: '您好，GPT-4o', newChat: '新對話',
        newImages: '新圖像', myCopilots: '我的副駕駛', settings: '設定', about: '關於 1.3.8i',
        placeholder: '在這裡輸入您的問題...', typing: '正在輸入...', analyzing: '正在分析圖片...',
        analyzeImage: '請分析這張圖片', welcomeMsg: '您好！我是您的智能助手。有任何問題我都樂意解答。',
        langSwitched: '語言已切換為繁體中文'
    },
    'en': {
        chatbox: 'Chatbox', chat: 'Chat', greeting: 'Hi, GPT-4o', newChat: 'New Chat',
        newImages: 'New Images', myCopilots: 'My Copilots', settings: 'Settings', about: 'About 1.3.8i',
        placeholder: 'Type your question here...', typing: 'Typing...', analyzing: 'Analyzing image...',
        analyzeImage: 'Please analyze this image', welcomeMsg: 'Hello! I am your smart assistant. I\'m happy to help with any questions.',
        langSwitched: 'Language switched to English'
    }
};

// ===== AI Responses by Language =====
const aiResponses = {
    'zh-CN': {
        '你好|hello|hi|hey': ['你好！很高興見到你。今天有什麼我可以幫助你的嗎？', '您好！歡迎回來。請問有什麼我可以幫你的？'],
        '天氣|weather': ['我無法實時獲取天氣信息，但你可以打開天氣應用查看。', '要了解准確的天氣信息，我建議查看天氣預報網站。'],
        '時間|time|現在|幾點': [`現在是 ${new Date().toLocaleString('zh-CN')}。`, `根據系統時間，現在是 ${new Date().toLocaleTimeString('zh-CN')}。`],
        '日期|today': [`今天是 ${new Date().toLocaleDateString('zh-CN')}。`, `日期是 ${new Date().toLocaleDateString('zh-CN')}。`],
        '笑話|joke|funny': ['為什麼電話會害羞？因為它總是被掛斷！😄', '為什麼程序員喜歡黑色？因為他們害怕光亮模式！😄'],
        '感謝|謝謝|thanks': ['不客氣！很高興為你服務。', '樂意效勞！希望我的回答對你有幫助。'],
        '再見|bye|goodbye': ['再見！下次見！', '拜拜！祝你有美好的一天！']
    },
    'zh-TW': {
        '你好|hello|hi|hey': ['你好！很高興見到你。今天有什麼我可以幫助你的嗎？', '您好！歡迎回來。請問有什麼我可以幫你的？'],
        '天氣|weather': ['我無法實時獲取天氣資訊，但你可以打開天氣應用查看。', '要了解準確的天氣資訊，我建議查看天氣預報網站。'],
        '時間|time|現在|幾點': [`現在是 ${new Date().toLocaleString('zh-TW')}。`, `根據系統時間，現在是 ${new Date().toLocaleTimeString('zh-TW')}。`],
        '日期|today': [`今天是 ${new Date().toLocaleDateString('zh-TW')}。`, `日期是 ${new Date().toLocaleDateString('zh-TW')}。`],
        '笑話|joke|funny': ['為什麼電話會害羞？因為它總是被掛斷！😄', '為什麼程序員喜歡黑色？因為他們害怕光亮模式！😄'],
        '感謝|謝謝|thanks': ['不客氣！很高興為你服務。', '樂意效勞！希望我的回答對你有幫助。'],
        '再見|bye|goodbye': ['再見！下次見！', '拜拜！祝你有美好的一天！']
    },
    'en': {
        'hello|hi|hey': ['Hello! Nice to meet you. How can I help today?', 'Hi there! Welcome back. What can I do for you?'],
        'weather': ['I don\'t have real-time weather data, but you can check a weather app.', 'For accurate weather info, I recommend checking a weather forecast website.'],
        'time|now': [`Current time is ${new Date().toLocaleString('en-US')}.`, `It's ${new Date().toLocaleTimeString('en-US')}.`],
        'date|today': [`Today is ${new Date().toLocaleDateString('en-US')}.`, `The date is ${new Date().toLocaleDateString('en-US')}.`],
        'joke|funny': ['Why did the phone go to school? To get smarter! 😄', 'Why do programmers prefer dark mode? Because they\'re afraid of the light! 😄'],
        'thanks|thank you': ['You\'re welcome! Happy to help.', 'My pleasure! Let me know if you need anything else.'],
        'bye|goodbye': ['Goodbye! See you next time!', 'Bye! Have a wonderful day!']
    }
};

// ===== Emoji Data =====
const emojiCategories = {
    smileys: ['😀', '😃', '😄', '😁', '😆', '😅', '😊', '😉', '😍', '🤩', '😘', '😗', '😚', '😙', '😋', '😛', '😜', '🤪', '😝', '🤑', '🤗', '🤭', '🤫', '🤔', '😐', '😑', '😏', '😒', '😬', '😌', '😔', '😪', '🤤', '😴', '😷', '🤒', '🤕', '🤢', '🤮', '🤧', '🥵', '🥶', '😵', '🤯', '🤠', '🥳', '😎', '🤓', '🧐'],
    gestures: ['👋', '🤚', '🖐️', '✋', '👌', '🤏', '✌️', '🤞', '🤟', '🤘', '👈', '👉', '👆', '👇', '☝️', '👍', '👎', '✊', '👊', '🤛', '👏', '🙌', '👐', '🤲', '🤝', '🙏', '💪'],
    food: ['🍎', '🍊', '🍋', '🍌', '🍉', '🍇', '🍓', '🍒', '🍑', '🥝', '🍅', '🍆', '🥒', '🥬', '🥦', '🥕', '🌽', '🍞', '🥐', '🥖', '🥨', '🥞', '🧇', '🧀', '🍖', '🍗', '🥩', '🍔', '🍟', '🍕', '🌭', '🥪', '🌮', '🌯', '🥙', '🥚', '🍳', '🍲', '🥣', '🥗', '🍿', '🧈', '🧂', '🥫'],
    travel: ['🚗', '🚕', '🚙', '🚌', '🚎', '🚓', '🚑', '🚒', '🚐', '🚚', '🚛', '🚲', '🛴', '🚲', '🛵', '🏍️', '🚨', '🚔', '🚍', '🚘', '🚖', '🚡', '🚠', '🚟', '🚃', '🚋', '🚞', '🚝', '🚄', '🚅', '✈️', '🛫', '🛬', '🛩️', '💺', '🚀'],
    objects: ['⌚', '📱', '📲', '💻', '⌨️', '🖥️', '🖨️', '💾', '💿', '📷', '📹', '🎥', '📞', '📟', '📠', '📺', '📻', '🎙️', '🎚️', '🎛️', '🧭', '⏱️', '⏲️', '⏰', '🕰️', '⌛', '⏳', '📡', '🔋', '💡', '🔦', '🕯️', '🧯', '🛢️']
};

// ===== Utility Functions =====
function createMessage(text, isUser = false) {
    const container = document.createElement('div');
    container.className = isUser ? 'user-message-container' : 'bot-message-container';
    
    const avatar = document.createElement('div');
    avatar.className = `avatar ${isUser ? 'user-avatar' : 'bot-avatar'}`;
    
    if (isUser && userAvatar) {
        avatar.style.backgroundImage = `url(${userAvatar})`;
        avatar.style.backgroundSize = 'cover';
    } else if (!isUser && botAvatar) {
        avatar.style.backgroundImage = `url(${botAvatar})`;
        avatar.style.backgroundSize = 'cover';
    } else {
        avatar.innerHTML = isUser ? '<i class="fas fa-user"></i>' : '<i class="fas fa-robot"></i>';
    }
    
    const content = document.createElement('div');
    content.className = 'message-content';
    const p = document.createElement('p');
    p.textContent = text;
    content.appendChild(p);
    
    container.appendChild(avatar);
    container.appendChild(content);
    return container;
}

function createImageMessage(imageData, text, isUser = true) {
    const container = document.createElement('div');
    container.className = isUser ? 'user-message-container' : 'bot-message-container';
    
    const avatar = document.createElement('div');
    avatar.className = `avatar ${isUser ? 'user-avatar' : 'bot-avatar'}`;
    
    if (isUser && userAvatar) {
        avatar.style.backgroundImage = `url(${userAvatar})`;
        avatar.style.backgroundSize = 'cover';
    } else if (!isUser && botAvatar) {
        avatar.style.backgroundImage = `url(${botAvatar})`;
        avatar.style.backgroundSize = 'cover';
    } else {
        avatar.innerHTML = isUser ? '<i class="fas fa-user"></i>' : '<i class="fas fa-robot"></i>';
    }
    
    const content = document.createElement('div');
    content.className = 'message-content';
    
    const img = document.createElement('img');
    img.src = imageData;
    img.className = 'message-image';
    img.style.cssText = 'max-width: 100%; border-radius: 8px; margin-bottom: 10px; cursor: pointer;';
    img.addEventListener('click', () => {
        const modal = document.createElement('div');
        modal.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.9); z-index: 2000; display: flex; align-items: center; justify-content: center; cursor: pointer;';
        const fullImg = document.createElement('img');
        fullImg.src = imageData;
        fullImg.style.cssText = 'max-width: 90%; max-height: 90%; border-radius: 8px;';
        modal.appendChild(fullImg);
        document.body.appendChild(modal);
        modal.addEventListener('click', () => document.body.removeChild(modal));
    });
    content.appendChild(img);
    
    if (text) {
        const p = document.createElement('p');
        p.textContent = text;
        content.appendChild(p);
    }
    
    container.appendChild(avatar);
    container.appendChild(content);
    return container;
}

function getAIResponse(userMessage) {
    const lowerMsg = userMessage.toLowerCase();
    const responses = aiResponses[currentLanguage] || aiResponses['en'];
    
    for (const [pattern, answers] of Object.entries(responses)) {
        if (new RegExp(pattern, 'i').test(lowerMsg)) {
            return answers[Math.floor(Math.random() * answers.length)];
        }
    }
    
    const genericMsgs = {
        'zh-CN': `感謝你的提問「${userMessage.substring(0, 20)}...」，這是一個很好的問題。`,
        'zh-TW': `感謝你的提問「${userMessage.substring(0, 20)}...」，這是一個很好的問題。`,
        'en': `Thank you for your question: "${userMessage.substring(0, 20)}...". That's a great question.`
    };
    return genericMsgs[currentLanguage] || genericMsgs['en'];
}

async function callGeminiVision(imageData, prompt) {
    let base64 = imageData;
    let mimeType = 'image/jpeg';
    
    if (imageData.includes('base64,')) {
        const parts = imageData.split(';');
        const match = parts[0].match(/data:(.*?)/);
        if (match) mimeType = match[1];
        base64 = imageData.split('base64,')[1];
    }
    
    const body = {
        contents: [{
            parts: [
                { text: prompt },
                { inline_data: { mime_type: mimeType, data: base64 } }
            ]
        }],
        generationConfig: { temperature: 0.4, topK: 32, topP: 1, maxOutputTokens: 4096 }
    };
    
    const response = await fetch(`${GEMINI_VISION_API_URL}?key=${GEMINI_API_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
    });
    
    if (!response.ok) throw new Error(`Vision API Error: ${response.status}`);
    const data = await response.json();
    return data.candidates[0].content.parts[0].text;
}

function updateUI() {
    const t = translations[currentLanguage];
    document.querySelector('.sidebar-header h2').textContent = t.chatbox;
    document.querySelector('.sidebar-section h3').textContent = t.chat;
    document.querySelector('.chat-title span').textContent = t.chatbox;
    document.querySelector('.chat-info span').textContent = t.greeting;
    document.getElementById('messageInput').placeholder = t.placeholder;
    document.getElementById('newChat').innerHTML = `<i class="fas fa-plus"></i> ${t.newChat}`;
    document.getElementById('newImages').innerHTML = `<i class="fas fa-image"></i> ${t.newImages}`;
    document.getElementById('myCopilots').innerHTML = `<i class="fas fa-robot"></i> ${t.myCopilots}`;
    document.getElementById('settings').innerHTML = `<i class="fas fa-cog"></i> ${t.settings}`;
    document.querySelector('.version').textContent = t.about;
}

// ===== Event Listeners =====
async function sendMessage() {
    const msg = messageInput.value.trim();
    if (!msg) return;
    
    messagesDiv.appendChild(createMessage(msg, true));
    messageInput.value = '';
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
    
    const t = translations[currentLanguage];
    const typing = document.createElement('div');
    typing.className = 'bot-message-container typing-indicator';
    typing.innerHTML = `<div class="avatar bot-avatar"><i class="fas fa-robot"></i></div><div class="message-content"><p>${t.typing}</p></div>`;
    messagesDiv.appendChild(typing);
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
    
    await new Promise(r => setTimeout(r, 1200));
    messagesDiv.removeChild(typing);
    
    const response = getAIResponse(msg);
    messagesDiv.appendChild(createMessage(response, false));
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
}

sendButton.addEventListener('click', sendMessage);
messageInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') sendMessage();
});

// Image Recognition
imageRecognitionBtn.addEventListener('click', () => imageInput.click());

imageInput.addEventListener('change', async function(e) {
    const file = e.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = async function(event) {
        currentImageData = event.target.result;
        const t = translations[currentLanguage];
        
        messagesDiv.appendChild(createImageMessage(currentImageData, t.analyzeImage, true));
        messagesDiv.scrollTop = messagesDiv.scrollHeight;
        
        const typing = document.createElement('div');
        typing.className = 'bot-message-container typing-indicator';
        typing.innerHTML = `<div class="avatar bot-avatar"><i class="fas fa-robot"></i></div><div class="message-content"><p>${t.analyzing}</p></div>`;
        messagesDiv.appendChild(typing);
        messagesDiv.scrollTop = messagesDiv.scrollHeight;
        
        try {
            const prompt = currentLanguage === 'zh-CN' ? '請詳細分析這張圖片的內容。' : currentLanguage === 'zh-TW' ? '請詳細分析這張圖片的內容。' : 'Please analyze this image in detail.';
            const analysis = await callGeminiVision(currentImageData, prompt);
            messagesDiv.removeChild(typing);
            messagesDiv.appendChild(createMessage(analysis, false));
            messagesDiv.scrollTop = messagesDiv.scrollHeight;
        } catch (error) {
            messagesDiv.removeChild(typing);
            messagesDiv.appendChild(createMessage('Image analysis failed. Please try again.', false));
            messagesDiv.scrollTop = messagesDiv.scrollHeight;
        }
    };
    reader.readAsDataURL(file);
    imageInput.value = '';
});

// Language Switcher
document.querySelectorAll('.lang-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.lang-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentLanguage = btn.getAttribute('data-lang');
        localStorage.setItem('preferredLanguage', currentLanguage);
        updateUI();
        alert(translations[currentLanguage].langSwitched);
    });
});

// Sidebar Buttons
document.getElementById('newChat').addEventListener('click', () => {
    messagesDiv.innerHTML = `<div class="bot-message-container"><div class="avatar bot-avatar"><i class="fas fa-robot"></i></div><div class="message-content"><p>${translations[currentLanguage].welcomeMsg}</p></div></div>`;
});

document.getElementById('settings').addEventListener('click', () => {
    avatarModal.style.display = 'block';
});

// Modal Close
closeModal.onclick = () => { avatarModal.style.display = 'none'; };
window.onclick = (e) => { if (e.target === avatarModal) avatarModal.style.display = 'none'; };

// Avatar Upload
['userAvatarInput', 'botAvatarInput'].forEach(inputId => {
    const isUser = inputId === 'userAvatarInput';
    document.getElementById(inputId)?.addEventListener('change', function(e) {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                const data = event.target.result;
                if (isUser) {
                    userAvatar = data;
                    localStorage.setItem('userAvatar', data);
                    const preview = document.getElementById('userAvatarPreview');
                    if (preview) {
                        preview.style.backgroundImage = `url(${data})`;
                        preview.style.backgroundSize = 'cover';
                        preview.innerHTML = '';
                    }
                } else {
                    botAvatar = data;
                    localStorage.setItem('botAvatar', data);
                    const preview = document.getElementById('botAvatarPreview');
                    if (preview) {
                        preview.style.backgroundImage = `url(${data})`;
                        preview.style.backgroundSize = 'cover';
                        preview.innerHTML = '';
                    }
                }
            };
            reader.readAsDataURL(file);
        }
    });
});

// Clear Avatars
document.getElementById('clearUserAvatar')?.addEventListener('click', () => {
    userAvatar = null;
    localStorage.removeItem('userAvatar');
    const preview = document.getElementById('userAvatarPreview');
    if (preview) {
        preview.style.backgroundImage = 'none';
        preview.innerHTML = '<i class="fas fa-user"></i>';
    }
});

document.getElementById('clearBotAvatar')?.addEventListener('click', () => {
    botAvatar = null;
    localStorage.removeItem('botAvatar');
    const preview = document.getElementById('botAvatarPreview');
    if (preview) {
        preview.style.backgroundImage = 'none';
        preview.innerHTML = '<i class="fas fa-robot"></i>';
    }
});

// Emoji Picker
let emojiCategory = 'smileys';

function populateEmojis() {
    emojiContent.innerHTML = '';
    emojiCategories[emojiCategory].forEach(emoji => {
        const span = document.createElement('span');
        span.className = 'emoji-item';
        span.textContent = emoji;
        span.addEventListener('click', () => {
            const pos = messageInput.selectionStart;
            const text = messageInput.value;
            messageInput.value = text.slice(0, pos) + emoji + text.slice(pos);
            messageInput.focus();
            messageInput.setSelectionRange(pos + emoji.length, pos + emoji.length);
        });
        emojiContent.appendChild(span);
    });
}

emojiBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    emojiPicker.style.display = emojiPicker.style.display === 'block' ? 'none' : 'block';
    if (emojiPicker.style.display === 'block') populateEmojis();
});

document.querySelectorAll('.emoji-tab').forEach(tab => {
    tab.addEventListener('click', () => {
        emojiCategory = tab.getAttribute('data-category');
        populateEmojis();
    });
});

document.addEventListener('click', (e) => {
    if (!emojiPicker.contains(e.target) && e.target !== emojiBtn) {
        emojiPicker.style.display = 'none';
    }
});

// Load Avatars and Update UI on Page Load
window.addEventListener('DOMContentLoaded', () => {
    const preview1 = document.getElementById('userAvatarPreview');
    const preview2 = document.getElementById('botAvatarPreview');
    
    if (userAvatar && preview1) {
        preview1.style.backgroundImage = `url(${userAvatar})`;
        preview1.style.backgroundSize = 'cover';
        preview1.innerHTML = '';
    }
    
    if (botAvatar && preview2) {
        preview2.style.backgroundImage = `url(${botAvatar})`;
        preview2.style.backgroundSize = 'cover';
        preview2.innerHTML = '';
    }
    
    // Update active language button
    document.querySelectorAll('.lang-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.getAttribute('data-lang') === currentLanguage) {
            btn.classList.add('active');
        }
    });
    
    updateUI();
    checkLoginStatus();
    setupUserMenu();
});

// Login Check
function checkLoginStatus() {
    if (!localStorage.getItem('xiaoice_loggedIn')) {
        window.location.href = 'login.html';
    }
    const user = JSON.parse(localStorage.getItem('xiaoice_user') || '{}');
    if (user.email) {
        const greeting = document.getElementById('userGreeting');
        const display = document.getElementById('displayUserEmail');
        if (greeting) greeting.textContent = `您好，${user.username || user.email.split('@')[0]}`;
        if (display) display.textContent = user.email;
    }
}

// User Menu
function setupUserMenu() {
    const menuBtn = document.getElementById('userMenuBtn');
    const dropdown = document.getElementById('userDropdown');
    
    if (menuBtn && dropdown) {
        // 点击按钮打开/关闭菜单
        menuBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            e.preventDefault();
            dropdown.classList.toggle('show');
            console.log('菜单切换:', dropdown.classList.contains('show'));
        });
        
        // 点击菜单项时关闭菜单
        const menuItems = dropdown.querySelectorAll('.dropdown-item');
        menuItems.forEach(item => {
            item.addEventListener('click', () => {
                dropdown.classList.remove('show');
            });
        });
        
        // 点击页面其他地方关闭菜单
        document.addEventListener('click', (e) => {
            if (!menuBtn.contains(e.target) && !dropdown.contains(e.target)) {
                dropdown.classList.remove('show');
            }
        });
    } else {
        console.warn('用户菜单元素未找到');
    }
}

function logout() {
    // 清除所有登录信息
    localStorage.removeItem('xiaoice_loggedIn');
    localStorage.removeItem('xiaoice_user');
    localStorage.removeItem('xiaoice_access_token');
    localStorage.removeItem('xiaoice_email');
    localStorage.removeItem('xiaoice_remember');
    
    // 重定向到登录页面
    window.location.href = 'login.html';
}

function openSettings() {
    if (avatarModal) avatarModal.style.display = 'block';
}
