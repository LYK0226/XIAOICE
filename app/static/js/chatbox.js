// JavaScript for chatbox functionality
const messagesDiv = document.getElementById('messages');
const messageInput = document.getElementById('messageInput');
const sendButton = document.getElementById('sendButton');
const imageInput = document.getElementById('imageInput');
const imageRecognitionBtn = document.getElementById('imageRecognitionBtn');
const emojiBtn = document.getElementById('emojiBtn');
const emojiPicker = document.getElementById('emojiPicker');
const emojiContent = document.getElementById('emojiContent');

// Language support
let currentLanguage = 'zh-CN'; // Default to Simplified Chinese

// Avatar settings
let userAvatar = null; // Will store user avatar URL
let botAvatar = null; // Will store bot avatar URL

// Image recognition data
let currentImageData = null;

// API 模塊已分離到 api_module.js
// 確保在 HTML 中先載入 api_module.js，然後再載入 chatbox.js

// Conversation history for context (array of {role: 'user'|'bot', content: string, time?: number})
let conversationHistory = [];

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
    'zh-CN': [
        "我在这里帮助您！您想了解什么？",
        "这是一个有趣的问题。让我想想...",
        "我明白您的意思。我可以告诉您...",
        "好问题！根据您告诉我的...",
        "我可以帮您解决这个问题。让我提供一些信息...",
        "这是一个很好的观点。您考虑过...",
        "我正在处理您的请求。这是我的回复...",
        "您好！我是您的智能助手，很高兴为您服务。",
        "明白了，让我为您详细解答。",
        "这个问题很有意思，让我们一起探讨一下。"
    ],
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
    'zh-CN': {
        chatbox: '聊天盒子',
        chat: '聊天',
        newChat: '新对话',
        newImages: '新图像',
        myCopilots: '我的副驾驶',
        settings: '设置',
        about: '关于 1.3.8i',
        placeholder: '在这里输入您的问题...',
        typing: '正在输入...',
        analyzing: '正在分析图片...',
        analyzeImage: '请分析这张图片',
        welcomeMsg: '您好！我是您的智能助手。我可以通过回答您的问题来帮助您。您也可以问我任何问题。',
        newChatConfirm: '开始新的对话？当前对话将被保存。',
        settingsComingSoon: '设置面板即将推出！',
        imagesComingSoon: '图像生成功能即将推出！',
        copilotsComingSoon: '我的副驾驶功能即将推出！',
        langSwitched: '语言已切换为简体中文',
        logout: '登出'
    },
    'zh-TW': {
        chatbox: '聊天盒子',
        chat: '聊天',
        newChat: '新對話',
        newImages: '新圖像',
        myCopilots: '我的副駕駛',
        settings: '設定',
        about: '關於 1.3.8i',
        placeholder: '在這裡輸入您的問題...',
        typing: '正在輸入...',
        analyzing: '正在分析圖片...',
        analyzeImage: '請分析這張圖片',
        welcomeMsg: '您好！我是您的智能助手。我可以通過回答您的問題來幫助您。您也可以問我任何問題。',
        newChatConfirm: '開始新的對話？當前對話將被保存。',
        settingsComingSoon: '設定面板即將推出！',
        imagesComingSoon: '圖像生成功能即將推出！',
        copilotsComingSoon: '我的副駕駛功能即將推出！',
        langSwitched: '語言已切換為繁體中文',
        logout: '登出'
    },
    'en': {
        chatbox: 'Chatbox',
        chat: 'Chat',
        newChat: 'New Chat',
        newImages: 'New Images',
        myCopilots: 'My Copilots',
        settings: 'Settings',
        about: 'About 1.3.8i',
        placeholder: 'Type your question here...',
        typing: 'Typing...',
        analyzing: 'Analyzing image...',
        analyzeImage: 'Please analyze this image',
        welcomeMsg: 'Hello! I am your smart assistant. I can help you by answering your questions. You can also ask me anything.',
        newChatConfirm: 'Start a new chat? Current conversation will be saved.',
        settingsComingSoon: 'Settings panel coming soon!',
        imagesComingSoon: 'Image generation feature coming soon!',
        copilotsComingSoon: 'My Copilots feature coming soon!',
        langSwitched: 'Language switched to English',
        logout: 'Logout'
    },
    'ja': {
        chatbox: 'チャットボックス',
        chat: 'チャット',
        newChat: '新しい会話',
        newImages: '新しい画像',
        myCopilots: 'マイコパイロット',
        settings: '設定',
        about: 'バージョン 1.3.8i',
        placeholder: 'ここに質問を入力してください...',
        typing: '入力中...',
        analyzing: '画像を分析中...',
        analyzeImage: 'この画像を分析してください',
        welcomeMsg: 'こんにちは！私はあなたのスマートアシスタントです。質問にお答えすることで、お手伝いできます。',
        newChatConfirm: '新しいチャットを開始しますか？現在の会話は保存されます。',
        settingsComingSoon: '設定パネルは近日公開！',
        imagesComingSoon: '画像生成機能は近日公開！',
        copilotsComingSoon: 'マイコパイロット機能は近日公開！',
        langSwitched: '言語が日本語に切り替わりました',
        logout: 'ログアウト'
    },
    'ko': {
        chatbox: '채팅박스',
        chat: '채팅',
        newChat: '새 대화',
        newImages: '새 이미지',
        myCopilots: '내 코파일럿',
        settings: '설정',
        about: '버전 1.3.8i',
        placeholder: '여기에 질문을 입력하세요...',
        typing: '입력 중...',
        analyzing: '이미지 분석 중...',
        analyzeImage: '이 이미지를 분석해주세요',
        welcomeMsg: '안녕하세요! 저는 당신의 스마트 어시스턴트입니다. 질문에 답변하여 도움을 드릴 수 있습니다.',
        newChatConfirm: '새 채팅을 시작하시겠습니까? 현재 대화는 저장됩니다.',
        settingsComingSoon: '설정 패널 곧 출시!',
        imagesComingSoon: '이미지 생성 기능 곧 출시!',
        copilotsComingSoon: '내 코파일럿 기능 곧 출시!',
        langSwitched: '언어가 한국어로 전환되었습니다',
        logout: '로그아웃'
    },
    'es': {
        chatbox: 'Caja de chat',
        chat: 'Chat',
        newChat: 'Nueva conversación',
        newImages: 'Nuevas imágenes',
        myCopilots: 'Mis copilotos',
        settings: 'Configuración',
        about: 'Acerca de 1.3.8i',
        placeholder: 'Escribe tu pregunta aquí...',
        typing: 'Escribiendo...',
        analyzing: 'Analizando imagen...',
        analyzeImage: 'Por favor analiza esta imagen',
        welcomeMsg: '¡Hola! Soy tu asistente inteligente. Puedo ayudarte respondiendo tus preguntas.',
        newChatConfirm: '¿Iniciar un nuevo chat? La conversación actual será guardada.',
        settingsComingSoon: '¡Panel de configuración próximamente!',
        imagesComingSoon: '¡Función de generación de imágenes próximamente!',
        copilotsComingSoon: '¡Función de mis copilotos próximamente!',
        langSwitched: 'Idioma cambiado a español',
        logout: 'Cerrar sesión'
    }
};

// Function to update UI language
function updateUILanguage(lang) {
    // Validate language
    if (!translations[lang]) {
        console.warn(`Language ${lang} not found, using zh-CN as fallback`);
        lang = 'zh-CN';
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
    updateElement('.version', t.about);
    
    // Update input placeholder
    updateElementById('messageInput', t.placeholder);
    
    // Update sidebar buttons
    updateElementById('newChat', `<i class="fas fa-plus"></i> ${t.newChat}`, true);
    updateElementById('newImages', `<i class="fas fa-image"></i> ${t.newImages}`, true);
    updateElementById('myCopilots', `<i class="fas fa-robot"></i> ${t.myCopilots}`, true);
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
        'zh-CN': [
            {
                number: 1,
                question: "下列哪个选项正确描述了光合作用的过程？",
                options: ["A. 植物吸收二氧化碳释放氧气", "B. 植物吸收氧气释放二氧化碳", "C. 植物不需要光照", "D. 以上都不对"]
            },
            {
                number: 2,
                question: "计算: 25 × 4 + 16 ÷ 2 = ?",
                options: null
            },
            {
                number: 3,
                question: "请解释\"水循环\"的基本过程。",
                options: null
            }
        ],
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
        'zh-CN': {
            1: "正确答案是 A。光合作用是植物利用光能，将二氧化碳和水转化为葡萄糖和氧气的过程。这个过程主要发生在叶绿体中，是植物生存和地球生态系统的基础。",
            2: "让我们一步步计算：\n1. 首先计算乘法：25 × 4 = 100\n2. 然后计算除法：16 ÷ 2 = 8\n3. 最后相加：100 + 8 = 108\n\n答案是 108。",
            3: "水循环的基本过程包括：\n1. 蒸发：太阳加热地表水，使其变成水蒸气\n2. 凝结：水蒸气上升冷却，形成云\n3. 降水：云中的水滴聚集变重，以雨、雪等形式降落\n4. 径流：降水流入河流、湖泊或渗入地下\n5. 重复循环"
        },
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
        'zh-CN': [
            "这是一张很有趣的图片！我看到了一些色彩丰富的元素。图片中似乎包含了多个物体或场景。",
            "根据我的分析，这张图片展示了一个清晰的场景。我可以识别出其中的主要元素和构图。",
            "图片质量很好！我能够看到图片中的细节。这看起来像是一张精心拍摄的照片。"
        ],
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
        'zh-CN': `我检测到这是一张试卷或测试题！我发现了 ${questions.length} 道题目。让我逐个为您解答。`,
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
                    'zh-CN': '正在思考答案...',
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
                        'zh-CN': `💡 **答案 ${q.number}:**\n\n`,
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
                                'zh-CN': '✅ 所有题目已解答完毕！如果您还有其他问题，请随时告诉我。',
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
translations['zh-CN'].question = '问题';
translations['zh-TW'].question = '問題';
translations['en'].question = 'Question';
translations['ja'].question = '質問';
translations['ko'].question = '질문';
translations['es'].question = 'Pregunta';

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
    const message = messageInput.value.trim();
    if (!message) return;

    // Add user message
    const userMessage = createMessage(message, true);
    messagesDiv.appendChild(userMessage);
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
    messageInput.value = '';

    // Save user turn to history
    conversationHistory.push({ role: 'user', content: message, time: Date.now() });
    
    // Show typing indicator
    const typingIndicator = createTypingIndicator();
    messagesDiv.appendChild(typingIndicator);
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
    
    try {
        // 使用 API 模塊發送訊息，並傳送會話歷史作為上下文
        const aiResponse = await chatAPI.sendTextMessage(message, currentLanguage, conversationHistory);
        
        // Remove typing indicator
        messagesDiv.removeChild(typingIndicator);
        
        // Add bot response
        const botMessage = createMessage(aiResponse, false);
        messagesDiv.appendChild(botMessage);
        messagesDiv.scrollTop = messagesDiv.scrollHeight;
        
        // Save assistant turn to history
        conversationHistory.push({ role: 'bot', content: aiResponse, time: Date.now() });
    } catch (error) {
        console.error('Error:', error);
        messagesDiv.removeChild(typingIndicator);
        
        const t = translations[currentLanguage];
        const errorMsg = t.errorMsg || '抱歉，发生了错误。';
        const botMessage = createMessage(errorMsg, false);
        messagesDiv.appendChild(botMessage);
        messagesDiv.scrollTop = messagesDiv.scrollHeight;
    }
}

// Attach event listener to send button
sendButton.addEventListener('click', sendMessage);

// Allow sending messages with Enter key
messageInput.addEventListener('keypress', (event) => {
    if (event.key === 'Enter') {
        sendMessage();
    }
});

// Sidebar button functionality
document.getElementById('newChat').addEventListener('click', () => {
    const t = translations[currentLanguage];
    
    if (confirm(t.newChatConfirm)) {
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
});

document.getElementById('settings').addEventListener('click', () => {
    avatarModal.style.display = 'block';
});

document.getElementById('newImages').addEventListener('click', () => {
    const t = translations[currentLanguage];
    alert(t.imagesComingSoon);
});

document.getElementById('myCopilots').addEventListener('click', () => {
    const t = translations[currentLanguage];
    alert(t.copilotsComingSoon);
});

// Add click functionality to chat list items
const chatListItems = document.querySelectorAll('.chat-list li');
chatListItems.forEach(item => {
    item.addEventListener('click', () => {
        const characterName = item.textContent.trim();
        const welcomeMessage = currentLanguage === 'zh' 
            ? `您好！我是您的${characterName}。今天我能为您做些什么？`
            : `Hello! I'm your ${characterName}. How can I assist you today?`;
        messagesDiv.innerHTML = '';
        const botMessage = createMessage(welcomeMessage, false);
        messagesDiv.appendChild(botMessage);
    });
});

// Settings functionality moved to settings.js
// This includes: Avatar Modal, Background Customization, Theme Settings, Font Settings, Language Options, etc.
