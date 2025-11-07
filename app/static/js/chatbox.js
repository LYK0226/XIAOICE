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
let userAvatar = null; // Will store user avatar URL
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

// Emoji categories
const emojiCategories = {
    smileys: ['😀', '😃', '😄', '😁', '😆', '😅', '🤣', '😂', '🙂', '🙃', '😉', '😊', '😇', '🥰', '😍', '🤩', '😘', '😗', '😚', '😙', '😋', '😛', '😜', '🤪', '😝', '🤑', '🤗', '🤭', '🤫', '🤔', '🤐', '🤨', '😐', '😑', '😶', '😏', '😒', '🙄', '😬', '🤥', '😌', '😔', '😪', '🤤', '😴', '😷', '🤒', '🤕', '🤢', '🤮', '🤧', '🥵', '🥶', '😵', '🤯', '🤠', '🥳', '😎', '🤓', '🧐'],
    gestures: ['👋', '🤚', '🖐️', '✋', '🖖', '👌', '🤏', '✌️', '🤞', '🤟', '🤘', '🤙', '👈', '👉', '👆', '🖕', '👇', '☝️', '👍', '👎', '✊', '👊', '🤛', '🤜', '👏', '🙌', '👐', '🤲', '🤝', '🙏', '✍️', '💅', '🤳', '💪', '🦾', '🦿', '🦵', '🦶', '👂', '🦻', '👃', '🧠', '🦷', '🦴', '👀', '👁️', '👅', '👄'],
    animals: ['🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐨', '🐯', '🦁', '🐮', '🐷', '🐽', '🐸', '🐵', '🙈', '🙉', '🙊', '🐒', '🐔', '🐧', '🐦', '🐤', '🐣', '🐥', '🦆', '🦅', '🦉', '🦇', '🐺', '🐗', '🐴', '🦄', '🐝', '🐛', '🦋', '🐌', '🐞', '🐜', '🦟', '🦗', '🕷️', '🦂', '🐢', '🐍', '🦎', '🦖', '🦕', '🐙', '🦑', '🦐', '🦞', '🦀', '🐡', '🐠', '🐟', '🐬', '🐳', '🐋', '🦈', '🐊', '🐅', '🐆', '🦓', '🦍', '🦧', '🐘', '🦛', '🦏', '🐪', '🐫', '🦒', '🦘', '🐃', '🐂', '🐄', '🐎', '🐖', '🐏', '🐑', '🦙', '🐐', '🦌', '🐕', '🐩', '🦮', '🐕‍🦺', '🐈', '🐓', '🦃', '🦚', '🦜', '🦢', '🦩', '🕊️', '🐇', '🦝', '🦨', '🦡', '🦦', '🦥', '🐁', '🐀', '🐿️', '🦔'],
    food: ['🍇', '🍈', '🍉', '🍊', '🍋', '🍌', '🍍', '🥭', '🍎', '🍏', '🍐', '🍑', '🍒', '🍓', '🥝', '🍅', '🥥', '🥑', '🍆', '🥔', '🥕', '🌽', '🌶️', '🥒', '🥬', '🥦', '🧄', '🧅', '🍄', '🥜', '🌰', '🍞', '🥐', '🥖', '🥨', '🥯', '🥞', '🧇', '🧀', '🍖', '🍗', '🥩', '🥓', '🍔', '🍟', '🍕', '🌭', '🥪', '🌮', '🌯', '🥙', '🧆', '🥚', '🍳', '🥘', '🍲', '🥣', '🥗', '🍿', '🧈', '🧂', '🥫', '🍱', '🍘', '🍙', '🍚', '🍛', '🍜', '🍝', '🍠', '🍢', '🍣', '🍤', '🍥', '🥮', '🍡', '🥟', '🥠', '🥡', '🦀', '🦞', '🦐', '🦑', '🦪', '🍦', '🍧', '🍨', '🍩', '🍪', '🎂', '🍰', '🧁', '🥧', '🍫', '🍬', '🍭', '🍮', '🍯', '🍼', '🥛', '☕', '🍵', '🍶', '🍾', '🍷', '🍸', '🍹', '🍺', '🍻', '🥂', '🥃', '🥤', '🧃', '🧉', '🧊'],
    activities: ['⚽', '🏀', '🏈', '⚾', '🥎', '🎾', '🏐', '🏉', '🥏', '🎱', '🪀', '🏓', '🏸', '🏒', '🏑', '🥍', '🏏', '🥅', '⛳', '🪁', '🏹', '🎣', '🤿', '🥊', '🥋', '🎽', '🛹', '🛷', '⛸️', '🥌', '🎿', '⛷️', '🏂', '🪂', '🏋️', '🤼', '🤸', '🤺', '⛹️', '🤾', '🏌️', '🏇', '🧘', '🏊', '🤽', '🚣', '🧗', '🚴', '🚵', '🎪', '🎭', '🎨', '🎬', '🎤', '🎧', '🎼', '🎹', '🥁', '🎷', '🎺', '🎸', '🪕', '🎻', '🎲', '♟️', '🎯', '🎳', '🎮', '🎰', '🧩'],
    travel: ['🚗', '🚕', '🚙', '🚌', '🚎', '🏎️', '🚓', '🚑', '🚒', '🚐', '🚚', '🚛', '🚜', '🦯', '🦽', '🦼', '🛴', '🚲', '🛵', '🏍️', '🛺', '🚨', '🚔', '🚍', '🚘', '🚖', '🚡', '🚠', '🚟', '🚃', '🚋', '🚞', '🚝', '🚄', '🚅', '🚈', '🚂', '🚆', '🚇', '🚊', '🚉', '✈️', '🛫', '🛬', '🛩️', '💺', '🛰️', '🚀', '🛸', '🚁', '🛶', '⛵', '🚤', '🛥️', '🛳️', '⛴️', '🚢', '⚓', '⛽', '🚧', '🚦', '🚥', '🚏', '🗺️', '🗿', '🗽', '🗼', '🏰', '🏯', '🏟️', '🎡', '🎢', '🎠', '⛲', '⛱️', '🏖️', '🏝️', '🏜️', '🌋', '⛰️', '🏔️', '🗻', '🏕️', '⛺', '🏠', '🏡', '🏘️', '🏚️', '🏗️', '🏭', '🏢', '🏬', '🏣', '🏤', '🏥', '🏦', '🏨', '🏪', '🏫', '🏩', '💒', '🏛️', '⛪', '🕌', '🕍', '🛕', '🕋'],
    objects: ['⌚', '📱', '📲', '💻', '⌨️', '🖥️', '🖨️', '🖱️', '🖲️', '🕹️', '🗜️', '💾', '💿', '📀', '📼', '📷', '📸', '📹', '🎥', '📽️', '🎞️', '📞', '☎️', '📟', '📠', '📺', '📻', '🎙️', '🎚️', '🎛️', '🧭', '⏱️', '⏲️', '⏰', '🕰️', '⌛', '⏳', '📡', '🔋', '🔌', '💡', '🔦', '🕯️', '🪔', '🧯', '🛢️', '💸', '💵', '💴', '💶', '💷', '💰', '💳', '💎', '⚖️', '🧰', '🔧', '🔨', '⚒️', '🛠️', '⛏️', '🔩', '⚙️', '🧱', '⛓️', '🧲', '🔫', '💣', '🧨', '🪓', '🔪', '🗡️', '⚔️', '🛡️', '🚬', '⚰️', '⚱️', '🏺', '🔮', '📿', '🧿', '💈', '⚗️', '🔭', '🔬', '🕳️', '🩹', '🩺', '💊', '💉', '🩸', '🧬', '🦠', '🧫', '🧪', '🌡️', '🧹', '🧺', '🧻', '🚽', '🚰', '🚿', '🛁', '🛀', '🧼', '🪒', '🧽', '🧴', '🛎️', '🔑', '🗝️', '🚪', '🪑', '🛋️', '🛏️', '🛌', '🧸', '🖼️', '🛍️', '🛒', '🎁', '🎈', '🎏', '🎀', '🎊', '🎉', '🎎', '🏮', '🎐', '🧧', '✉️', '📩', '📨', '📧', '💌', '📥', '📤', '📦', '🏷️', '📪', '📫', '📬', '📭', '📮', '📯', '📜', '📃', '📄', '📑', '🧾', '📊', '📈', '📉', '🗒️', '🗓️', '📆', '📅', '🗑️', '📇', '🗃️', '🗳️', '🗄️', '📋', '📁', '📂', '🗂️', '🗞️', '📰', '📓', '📔', '📒', '📕', '📗', '📘', '📙', '📚', '📖', '🔖', '🧷', '🔗', '📎', '🖇️', '📐', '📏', '🧮', '📌', '📍', '✂️', '🖊️', '🖋️', '✒️', '🖌️', '🖍️', '📝', '✏️', '🔍', '🔎', '🔏', '🔐', '🔒', '🔓'],
    symbols: ['❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔', '❣️', '💕', '💞', '💓', '💗', '💖', '💘', '💝', '💟', '☮️', '✝️', '☪️', '🕉️', '☸️', '✡️', '🔯', '🕎', '☯️', '☦️', '🛐', '⛎', '♈', '♉', '♊', '♋', '♌', '♍', '♎', '♏', '♐', '♑', '♒', '♓', '🆔', '⚛️', '🉑', '☢️', '☣️', '📴', '📳', '🈶', '🈚', '🈸', '🈺', '🈷️', '✴️', '🆚', '💮', '🉐', '㊙️', '㊗️', '🈴', '🈵', '🈹', '🈲', '🅰️', '🅱️', '🆎', '🆑', '🅾️', '🆘', '❌', '⭕', '🛑', '⛔', '📛', '🚫', '💯', '💢', '♨️', '🚷', '🚯', '🚳', '🚱', '🔞', '📵', '🚭', '❗', '❕', '❓', '❔', '‼️', '⁉️', '🔅', '🔆', '〽️', '⚠️', '🚸', '🔱', '⚜️', '🔰', '♻️', '✅', '🈯', '💹', '❇️', '✳️', '❎', '🌐', '💠', 'Ⓜ️', '🌀', '💤', '🏧', '🚾', '♿', '🅿️', '🈳', '🈂️', '🛂', '🛃', '🛄', '🛅', '🚹', '🚺', '🚼', '🚻', '🚮', '🎦', '📶', '🈁', '🔣', 'ℹ️', '🔤', '🔡', '🔠', '🆖', '🆗', '🆙', '🆒', '🆕', '🆓', '0️⃣', '1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟', '🔢', '#️⃣', '*️⃣', '⏏️', '▶️', '⏸️', '⏯️', '⏹️', '⏺️', '⏭️', '⏮️', '⏩', '⏪', '⏫', '⏬', '◀️', '🔼', '🔽', '➡️', '⬅️', '⬆️', '⬇️', '↗️', '↘️', '↙️', '↖️', '↕️', '↔️', '↪️', '↩️', '⤴️', '⤵️', '🔀', '🔁', '🔂', '🔄', '🔃', '🎵', '🎶', '➕', '➖', '➗', '✖️', '♾️', '💲', '💱', '™️', '©️', '®️', '〰️', '➰', '➿', '🔚', '🔙', '🔛', '🔝', '🔜', '✔️', '☑️', '🔘', '🔴', '🟠', '🟡', '🟢', '🔵', '🟣', '⚫', '⚪', '🟤', '🔺', '🔻', '🔸', '🔹', '🔶', '🔷', '🔳', '🔲', '▪️', '▫️', '◾', '◽', '◼️', '◻️', '🟥', '🟧', '🟨', '🟩', '🟦', '🟪', '⬛', '⬜', '🟫', '🔈', '🔇', '🔉', '🔊', '🔔', '🔕', '📣', '📢', '👁️‍🗨️', '💬', '💭', '🗯️', '♠️', '♣️', '♥️', '♦️', '🃏', '🎴', '🀄', '🕐', '🕑', '🕒', '🕓', '🕔', '🕕', '🕖', '🕗', '🕘', '🕙', '🕚', '🕛', '🕜', '🕝', '🕞', '🕟', '🕠', '🕡', '🕢', '🕣', '🕤', '🕥', '🕦', '🕧', '⭐', '🌟', '✨', '⚡', '☄️', '💥', '🔥', '🌈', '☀️', '🌤️', '⛅', '🌥️', '☁️', '🌦️', '🌧️', '⛈️', '🌩️', '🌨️', '❄️', '☃️', '⛄', '🌬️', '💨', '💧', '💦', '☔']
};

// Bot responses in Simplified Chinese, Traditional Chinese, and English
const botResponses = {
    'zh-TW': [
        "我在這裡幫助您！您想了解什麼？",
        "這是一個有趣的問題。讓我想想...",
        "我明白您的意思。我可以告訴您...",
        "好問題！根據您告訴我的...",
        "我可以幫您解決這個問題。讓我提供一些資訊...",
        "這是一個很好的觀點。您考慮過...",
        "我正在處理您的請求。這是我的回覆...",
        "您好！我是您的智能助手，很高興為您服務。",
        "明白了，讓我為您詳細解答。",
        "這個問題很有意思，讓我們一起探討一下。"
    ],
    'en': [
        "I'm here to help! What would you like to know?",
        "That's an interesting question. Let me think about that...",
        "I understand what you're asking. Here's what I can tell you...",
        "Great question! Based on what you've told me...",
        "I can help you with that. Let me provide some information...",
        "That's a good point. Have you considered...",
        "I'm processing your request. Here's my response..."
    ]
};

// UI Translations
const translations = {
    'zh-TW': {
        chatbox: '聊天盒子',
        chat: '聊天',
        newChat: '新對話',
        settings: '設定',
        placeholder: '在這裡輸入您的問題...',
        typing: '正在輸入...',
        analyzing: '正在分析圖片...',
        analyzeImage: '請分析這張圖片',
        welcomeMsg: '您好！我是您的智能助手。我可以通過回答您的問題來幫助您。您也可以問我任何問題。',
        settingsComingSoon: '設定面板即將推出！',
        langSwitched: '語言已切換為繁體中文',
        logout: '登出',
        voiceRecording: '正在錄音...',
        voiceNotSupported: '您的瀏覽器不支持語音識別',
        micPermissionDenied: '麥克風權限被拒絕，請在瀏覽器設定中允許訪問麥克風',
        webcamPermissionDenied: '無法訪問攝像頭，請在瀏覽器設定中允許訪問攝像頭',
        errorMsg: '抱歉，發生了錯誤。請稍後再試。',
        renameAction: '重新命名',
        deleteAction: '刪除',
        pinAction: '置頂',
        unpinAction: '取消置頂',
        openAction: '打開',
        renamePrompt: '輸入新的對話標題',
        renameError: '重新命名失敗，請稍後再試。',
        deleteConfirm: '確定要刪除此對話嗎？刪除後無法恢復。',
        deleteError: '刪除對話失敗，請稍後再試。',
        pinError: '更新置頂狀態失敗，請稍後再試。'
    },
    'en': {
        chatbox: 'Chatbox',
        chat: 'Chat',
        newChat: 'New Chat',
        settings: 'Settings',
        placeholder: 'Type your question here...',
        typing: 'Typing...',
        analyzing: 'Analyzing image...',
        analyzeImage: 'Please analyze this image',
        welcomeMsg: 'Hello! I am your smart assistant. I can help you by answering your questions. You can also ask me anything.',
        settingsComingSoon: 'Settings panel coming soon!',
        langSwitched: 'Language switched to English',
        logout: 'Logout',
        voiceRecording: 'Recording...',
        voiceNotSupported: 'Your browser does not support speech recognition',
        micPermissionDenied: 'Microphone permission denied. Please allow microphone access in browser settings.',
        webcamPermissionDenied: 'Cannot access webcam. Please allow camera access in browser settings.',
        errorMsg: 'Sorry, an error occurred. Please try again later.',
        renameAction: 'Rename',
        deleteAction: 'Delete',
        pinAction: 'Pin',
        unpinAction: 'Unpin',
        openAction: 'Open',
        renamePrompt: 'Enter a new conversation title',
        renameError: 'Unable to rename the conversation. Please try again.',
        deleteConfirm: 'Delete this conversation? This action cannot be undone.',
        deleteError: 'Unable to delete the conversation. Please try again.',
        pinError: 'Unable to update pin status. Please try again.'
    },
    'ja': {
        chatbox: 'チャットボックス',
        chat: 'チャット',
        newChat: '新しい会話',
        settings: '設定',
        placeholder: 'ここに質問を入力してください...',
        typing: '入力中...',
        analyzing: '画像を分析中...',
        analyzeImage: 'この画像を分析してください',
        welcomeMsg: 'こんにちは！私はあなたのスマートアシスタントです。質問にお答えすることで、お手伝いできます。',
        settingsComingSoon: '設定パネルは近日公開！',
        langSwitched: '言語が日本語に切り替わりました',
        logout: 'ログアウト',
        voiceRecording: '録音中...',
        voiceNotSupported: 'お使いのブラウザは音声認識をサポートしていません',
        micPermissionDenied: 'マイクの許可が拒否されました。ブラウザの設定でマイクへのアクセスを許可してください。',
        webcamPermissionDenied: 'カメラにアクセスできません。ブラウザの設定でカメラへのアクセスを許可してください。',
        errorMsg: '申し訳ありませんが、エラーが発生しました。後でもう一度お試しください。',
        renameAction: '名前を変更',
        deleteAction: '削除',
        pinAction: 'ピン留め',
        unpinAction: 'ピン留めを解除',
        openAction: '開く',
        renamePrompt: '新しい会話名を入力してください',
        renameError: '会話名を変更できませんでした。後でもう一度お試しください。',
        deleteConfirm: 'この会話を削除しますか？削除すると元に戻せません。',
        deleteError: '会話を削除できませんでした。後でもう一度お試しください。',
        pinError: 'ピン留め状態を更新できませんでした。後でもう一度お試しください。'
    }
};

// Function to update UI language
function updateUILanguage(lang) {
    // Validate language
    if (!translations[lang]) {
        console.warn(`Language ${lang} not found, using zh-TW as fallback`);
        lang = 'zh-TW';
    }
    
    const t = translations[lang];
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
    if (isUser && userAvatar) {
        avatar.style.backgroundImage = `url(${userAvatar})`;
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

    if (!isUser) {
        const speakBtn = document.createElement('button');
        speakBtn.className = 'speak-btn';
        speakBtn.innerHTML = '<i class="fas fa-volume-up"></i>';
        speakBtn.title = '朗讀訊息';
        speakBtn.onclick = () => speakMessage(text);
        messageContent.appendChild(speakBtn);
    }
    
    container.appendChild(avatar);
    container.appendChild(messageContent);
    
    return container;
}

// Text-to-Speech Functionality
function speakMessage(text) {
    // Cancel any ongoing speech before starting new one
    speechSynthesis.cancel();
    
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = currentLanguage;
    speechSynthesis.speak(utterance);
}

// Function to create a message with image
function createImageMessage(imageData, text, isUser = true) {
    const container = document.createElement('div');
    container.className = isUser ? 'user-message-container' : 'bot-message-container';
    
    const avatar = document.createElement('div');
    avatar.className = isUser ? 'avatar user-avatar' : 'avatar bot-avatar';
    
    // Use custom avatar if available
    if (isUser && userAvatar) {
        avatar.style.backgroundImage = `url(${userAvatar})`;
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
    img.src = imageData;
    img.className = 'message-image';
    img.style.maxWidth = '100%';
    img.style.borderRadius = '8px';
    img.style.marginBottom = '10px';
    
    // Add click to view full image
    img.addEventListener('click', () => {
        const modal = document.createElement('div');
        modal.className = 'image-modal';
        modal.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.9); z-index: 2000; display: flex; align-items: center; justify-content: center; cursor: pointer;';
        
        const fullImg = document.createElement('img');
        fullImg.src = imageData;
        fullImg.style.cssText = 'max-width: 90%; max-height: 90%; border-radius: 8px;';
        
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

// Simulated test paper detection and question extraction
function detectTestPaper(imageData) {
    // In a real application, this would use OCR (like Tesseract.js) and AI to detect questions
    // For now, we'll simulate detecting a test paper with questions
    
    // Randomly determine if it's a test paper (for demo purposes, let's say 70% chance)
    const isTestPaper = Math.random() > 0.3;
    
    if (!isTestPaper) {
        return null; // Not a test paper, use regular image analysis
    }
    
    // Simulate extracted questions based on language
    const sampleQuestions = {
        'zh-TW': [
            {
                number: 1,
                question: "下列哪個選項正確描述了光合作用的過程？",
                options: ["A. 植物吸收二氧化碳釋放氧氣", "B. 植物吸收氧氣釋放二氧化碳", "C. 植物不需要光照", "D. 以上都不對"]
            },
            {
                number: 2,
                question: "計算: 25 × 4 + 16 ÷ 2 = ?",
                options: null
            },
            {
                number: 3,
                question: "請解釋「水循環」的基本過程。",
                options: null
            }
        ],
        'en': [
            {
                number: 1,
                question: "Which of the following correctly describes the process of photosynthesis?",
                options: ["A. Plants absorb CO2 and release O2", "B. Plants absorb O2 and release CO2", "C. Plants don't need light", "D. None of the above"]
            },
            {
                number: 2,
                question: "Calculate: 25 × 4 + 16 ÷ 2 = ?",
                options: null
            },
            {
                number: 3,
                question: "Explain the basic process of the water cycle.",
                options: null
            }
        ]
    };
    
    return sampleQuestions[currentLanguage] || sampleQuestions['en'];
}

// Generate answers for questions
function generateAnswer(question, questionNumber) {
    const answers = {
        'zh-TW': {
            1: "正確答案是 A。光合作用是植物利用光能，將二氧化碳和水轉化為葡萄糖和氧氣的過程。這個過程主要發生在葉綠體中，是植物生存和地球生態系統的基礎。",
            2: "讓我們一步步計算：\n1. 首先計算乘法：25 × 4 = 100\n2. 然後計算除法：16 ÷ 2 = 8\n3. 最後相加：100 + 8 = 108\n\n答案是 108。",
            3: "水循環的基本過程包括：\n1. 蒸發：太陽加熱地表水，使其變成水蒸氣\n2. 凝結：水蒸氣上升冷卻，形成雲\n3. 降水：雲中的水滴聚集變重，以雨、雪等形式降落\n4. 徑流：降水流入河流、湖泊或滲入地下\n5. 重複循環"
        },
        'en': {
            1: "The correct answer is A. Photosynthesis is the process by which plants use light energy to convert carbon dioxide and water into glucose and oxygen. This process mainly occurs in chloroplasts and is fundamental to plant survival and Earth's ecosystem.",
            2: "Let's calculate step by step:\n1. First, multiply: 25 × 4 = 100\n2. Then, divide: 16 ÷ 2 = 8\n3. Finally, add: 100 + 8 = 108\n\nThe answer is 108.",
            3: "The basic process of the water cycle includes:\n1. Evaporation: Sun heats surface water, turning it into vapor\n2. Condensation: Water vapor rises and cools, forming clouds\n3. Precipitation: Water droplets in clouds gather and fall as rain, snow, etc.\n4. Runoff: Precipitation flows into rivers, lakes, or seeps underground\n5. The cycle repeats"
        }
    };
    
    return answers[currentLanguage][questionNumber];
}

// Simulated image recognition function
function analyzeImage(imageData) {
    // In a real application, this would call an AI API like Google Vision, Azure Computer Vision, or OpenAI Vision
    // For now, we'll simulate the response
    
    const responses = {
        'zh-TW': [
            "這是一張很有趣的圖片！我看到了一些色彩豐富的元素。圖片中似乎包含了多個物體或場景。",
            "根據我的分析，這張圖片展示了一個清晰的場景。我可以識別出其中的主要元素和構圖。",
            "圖片質量很好！我能夠看到圖片中的細節。這看起來像是一張精心拍攝的照片。"
        ],
        'en': [
            "This is an interesting image! I can see some colorful elements. The image seems to contain multiple objects or scenes.",
            "Based on my analysis, this image shows a clear scene. I can identify the main elements and composition.",
            "Great image quality! I can see the details in the picture. This looks like a carefully captured photo."
        ]
    };
    
    const languageResponses = responses[currentLanguage];
    return languageResponses[Math.floor(Math.random() * languageResponses.length)];
}

// Process test paper questions one by one
function processTestPaperQuestions(questions, imageData) {
    const t = translations[currentLanguage];
    
    // First, show detection message
    const detectionMessages = {
        'zh-TW': `我檢測到這是一張試卷或測試題！我發現了 ${questions.length} 道題目。讓我逐個為您解答。`,
        'en': `I detected this is a test paper! I found ${questions.length} questions. Let me answer them one by one.`
    };
    
    const detectionMsg = createMessage(detectionMessages[currentLanguage], false);
    messagesDiv.appendChild(detectionMsg);
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
    
    // Process each question with a delay
    questions.forEach((q, index) => {
        setTimeout(() => {
            // Show the question
            let questionText = `\n📝 **${t.question || '问题'} ${q.number}:**\n${q.question}`;
            
            if (q.options) {
                questionText += '\n\n' + q.options.join('\n');
            }
            
            const questionMsg = createMessage(questionText, false);
            messagesDiv.appendChild(questionMsg);
            messagesDiv.scrollTop = messagesDiv.scrollHeight;
            
            // Show thinking indicator
            setTimeout(() => {
                const thinkingTexts = {
                    'zh-TW': '正在思考答案...',
                    'en': 'Thinking about the answer...'
                };
                
                const thinkingIndicator = createTypingIndicator();
                messagesDiv.appendChild(thinkingIndicator);
                messagesDiv.scrollTop = messagesDiv.scrollHeight;
                
                // Show answer after delay
                setTimeout(() => {
                    messagesDiv.removeChild(thinkingIndicator);
                    
                    const answer = generateAnswer(q, q.number);
                    const answerHeaders = {
                        'zh-TW': `💡 **答案 ${q.number}:**\n\n`,
                        'en': `💡 **Answer ${q.number}:**\n\n`
                    };
                    
                    const fullAnswer = answerHeaders[currentLanguage] + answer;
                    const answerMsg = createMessage(fullAnswer, false);
                    messagesDiv.appendChild(answerMsg);
                    messagesDiv.scrollTop = messagesDiv.scrollHeight;
                    
                    // If this is the last question, show completion message
                    if (index === questions.length - 1) {
                        setTimeout(() => {
                            const completionMessages = {
                                'zh-TW': '✅ 所有題目已解答完畢！如果您還有其他問題，請隨時告訴我。',
                                'en': '✅ All questions have been answered! If you have any other questions, feel free to ask.'
                            };
                            
                            const completionMsg = createMessage(completionMessages[currentLanguage], false);
                            messagesDiv.appendChild(completionMsg);
                            messagesDiv.scrollTop = messagesDiv.scrollHeight;
                        }, 1000);
                    }
                }, 2000);
            }, 500);
        }, (index * 6000) + 1000); // Stagger each question by 6 seconds
    });
}

// Add translation for "question"
translations['zh-TW'].question = '問題';
translations['en'].question = 'Question';
translations['ja'].question = '質問';

// Conversation management translations
translations['zh-TW'].noConversations = '暫無對話';
translations['zh-TW'].untitledConversation = '未命名對話';
translations['zh-TW'].conversationLoadError = '載入對話失敗，請稍後再試。';
translations['zh-TW'].conversationCreateError = '建立對話失敗，請稍後再試。';
translations['zh-TW'].messageSaveError = '儲存訊息失敗。';
translations['zh-TW'].attachmentPlaceholder = '[附件]';

translations['en'].noConversations = 'No conversations yet';
translations['en'].untitledConversation = 'Untitled conversation';
translations['en'].conversationLoadError = 'Unable to load the conversation. Please try again.';
translations['en'].conversationCreateError = 'Unable to start a new conversation right now.';
translations['en'].messageSaveError = 'Unable to save the message.';
translations['en'].attachmentPlaceholder = '[attachment]';

translations['ja'].noConversations = '会話はまだありません';
translations['ja'].untitledConversation = '名称未設定の会話';
translations['ja'].conversationLoadError = '会話を読み込めませんでした。後でもう一度お試しください。';
translations['ja'].conversationCreateError = '新しい会話を開始できませんでした。';
translations['ja'].messageSaveError = 'メッセージを保存できませんでした。';
translations['ja'].attachmentPlaceholder = '[添付]';

// Load saved language preference on page load
window.addEventListener('DOMContentLoaded', () => {
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
    files.forEach(file => {
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
        const previewItem = document.createElement('div');
        previewItem.className = 'file-preview-item';
        
        if (file.type.startsWith('image/')) {
            // Image preview
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
        } else {
            // File icon
            const fileIcon = document.createElement('div');
            fileIcon.className = 'file-icon';
            const iconMap = {
                'pdf': 'fa-file-pdf',
                'doc': 'fa-file-word',
                'docx': 'fa-file-word',
                'txt': 'fa-file-alt'
            };
            const ext = file.name.split('.').pop().toLowerCase();
            const iconClass = iconMap[ext] || 'fa-file';
            fileIcon.innerHTML = `<i class="fas ${iconClass}"></i>`;
            
            const fileName = document.createElement('div');
            fileName.className = 'file-name';
            fileName.textContent = file.name;
            fileName.title = file.name;
            
            previewItem.appendChild(fileIcon);
            previewItem.appendChild(fileName);
        }
        
        // Remove button
        const removeBtn = document.createElement('button');
        removeBtn.className = 'remove-file';
        removeBtn.innerHTML = '&times;';
        removeBtn.onclick = () => {
            selectedFiles.splice(index, 1);
            updateFilePreview();
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
            alert(t.micPermissionDenied || '麦克风权限被拒绝');
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
        alert(t.voiceNotSupported || '您的浏览器不支持语音识别');
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
        alert(t.webcamPermissionDenied || '无法访问摄像头');
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
        alert(t.webcamPermissionDenied || '无法访问摄像头');
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
    
    // Clear the file preview immediately after sending
    selectedFiles = [];
    updateFilePreview();

    const placeholderText = messageText || (hasFiles ? t.attachmentPlaceholder : '');

    const userMessageElement = createMessageWithFiles(messageText, attachmentsSnapshot, true);

    messagesDiv.appendChild(userMessageElement);
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
    messageInput.value = '';

    conversationHistory.push({
        role: 'user',
        content: placeholderText || t.attachmentPlaceholder,
        time: Date.now()
    });

    const typingIndicator = createTypingIndicator();
    messagesDiv.appendChild(typingIndicator);
    messagesDiv.scrollTop = messagesDiv.scrollHeight;

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

        try {
            const userMessageResponse = await chatAPI.addMessage(
                conversationId,
                placeholderText || t.attachmentPlaceholder,
                'user',
                attachmentsMetadata ? { attachments: attachmentsMetadata } : null,
                attachmentsSnapshot
            );

            if (userMessageResponse.conversation) {
                upsertConversation(userMessageResponse.conversation);
            }

            // Update the user message element to use server URLs for uploaded files
            if (userMessageResponse.message && userMessageResponse.message.uploaded_files) {
                updateMessageWithServerFiles(userMessageElement, userMessageResponse.message.uploaded_files);
            }

        } catch (messageError) {
            console.error('Failed to persist user message', messageError);
            alert(t.messageSaveError);
        }

        const imageFile = attachmentsSnapshot.find((file) => file.type.startsWith('image/'));
        let aiResponse;

        if (imageFile) {
            aiResponse = await chatAPI.sendImageMessage(
                messageText || t.analyzeImage,
                imageFile,
                currentLanguage,
                conversationHistory
            );
        } else {
            aiResponse = await chatAPI.sendTextMessage(
                messageText || placeholderText,
                currentLanguage,
                conversationHistory
            );
        }

        if (typingIndicator.parentNode) {
            typingIndicator.parentNode.removeChild(typingIndicator);
        }

        const botMessageElement = createMessage(aiResponse, false);
        messagesDiv.appendChild(botMessageElement);
        messagesDiv.scrollTop = messagesDiv.scrollHeight;

        conversationHistory.push({ role: 'bot', content: aiResponse, time: Date.now() });

        try {
            const assistantMessageResponse = await chatAPI.addMessage(conversationId, aiResponse, 'assistant');
            if (assistantMessageResponse.conversation) {
                upsertConversation(assistantMessageResponse.conversation);
            }
        } catch (assistantError) {
            console.error('Failed to persist assistant message', assistantError);
        }
    } catch (error) {
        console.error('Error:', error);
        if (typingIndicator.parentNode) {
            typingIndicator.parentNode.removeChild(typingIndicator);
        }

        const errorMsg = t.errorMsg || '抱歉，发生了错误。';
        const botMessage = createMessage(errorMsg, false);
        messagesDiv.appendChild(botMessage);
        messagesDiv.scrollTop = messagesDiv.scrollHeight;
    }
}

function createMessageWithFiles(text, files, isUser = true) {
    const container = document.createElement('div');
    container.className = isUser ? 'user-message-container' : 'bot-message-container';
    
    const avatar = document.createElement('div');
    avatar.className = isUser ? 'avatar user-avatar' : 'avatar bot-avatar';
    
    if (isUser && userAvatar) {
        avatar.style.backgroundImage = `url(${userAvatar})`;
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
            } else {
                // Show file name for non-image files
                const fileInfo = document.createElement('div');
                fileInfo.style.cssText = 'padding: 8px; background: rgba(0,0,0,0.1); border-radius: 6px; margin-bottom: 8px;';
                fileInfo.innerHTML = `<i class="fas fa-file"></i> ${file.name}`;
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
    
    // Remove existing file displays
    const existingFileInfos = messageContent.querySelectorAll('div[style*="background"]');
    existingFileInfos.forEach(info => {
        if (info.innerHTML.includes('fas fa-file')) {
            info.remove();
        }
    });
    
    // Add server-based file displays
    uploadedFiles.forEach(filePath => {
        const fullPath = `/static/${filePath}`;
        const rawFileName = filePath.split('/').pop();
        const displayFileName = cleanFileName(rawFileName);
        
        // Check if it's an image
        const isImage = /\.(jpg|jpeg|png|gif|bmp|webp)$/i.test(displayFileName);
        
        if (isImage) {
            // For images, we could update the src, but since we already have the image displayed from local file,
            // and the server URL should work the same, we might not need to change it.
            // But to ensure consistency, let's update it
            const existingImg = messageContent.querySelector('img.message-image');
            if (existingImg) {
                existingImg.src = fullPath;
                // Update the modal click handler to use server URL
                existingImg.onclick = () => {
                    openDocumentPreviewModal(fullPath, displayFileName);
                };
            }
        } else {
            // For non-image files, replace the plain text with a clickable link
            const fileInfo = document.createElement('div');
            fileInfo.style.cssText = 'padding: 8px; background: rgba(0,0,0,0.1); border-radius: 6px; margin-bottom: 8px; cursor: pointer;';
            fileInfo.innerHTML = `<i class="fas fa-file"></i> ${displayFileName}`;
            
            fileInfo.addEventListener('click', () => {
                openDocumentPreviewModal(fullPath, displayFileName);
            });
            
            // Insert before the text paragraph to keep text at the bottom
            const textParagraph = messageContent.querySelector('p');
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

    if (isImage) {
        const img = document.createElement('img');
        img.src = filePath;
        img.style.cssText = `
            width: 100%;
            height: 100%;
            object-fit: contain;
            display: block;
            border-radius: 8px;
        `;
        previewContent.appendChild(img);
    } else if (isPDF) {
        const iframe = document.createElement('iframe');
        iframe.src = filePath;
        iframe.style.cssText = `
            width: 100%;
            height: 100%;
            border: none;
            border-radius: 8px;
        `;
        previewContent.appendChild(iframe);
    } else {
        // For other document types, try to display in iframe or show download link
        const iframe = document.createElement('iframe');
        iframe.src = filePath;
        iframe.style.cssText = `
            width: 100%;
            height: 100%;
            border: none;
            border-radius: 8px;
        `;
        previewContent.appendChild(iframe);
    }

    // Show preview panel
    mainContent.classList.add('preview-active');
    previewPanel.style.display = 'flex';

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
    
    if (isUser && userAvatar) {
        avatar.style.backgroundImage = `url(${userAvatar})`;
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
            // Assuming filePath is like "upload/filename.jpg"
            const fullPath = `/static/${filePath}`;
            const rawFileName = filePath.split('/').pop();
            const displayFileName = cleanFileName(rawFileName);
            
            // Check if it's an image
            const isImage = /\.(jpg|jpeg|png|gif|bmp|webp)$/i.test(displayFileName);
            
            if (isImage) {
                const img = document.createElement('img');
                img.className = 'message-image';
                img.src = fullPath;
                img.style.maxWidth = '100%';
                img.style.borderRadius = '8px';
                img.style.marginBottom = '10px';
                
                img.addEventListener('click', () => {
                    openDocumentPreviewModal(fullPath, displayFileName);
                });
                
                messageContent.appendChild(img);
            } else {
                // Show file name for non-image files with preview modal
                const fileInfo = document.createElement('div');
                fileInfo.style.cssText = 'padding: 8px; background: rgba(0,0,0,0.1); border-radius: 6px; margin-bottom: 8px; cursor: pointer;';
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