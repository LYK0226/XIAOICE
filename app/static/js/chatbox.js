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
    ],
    'ja':[
        "お手伝いさせていただきます！ どのようなことをお聞きになりたいですか？",
        "興味深いご質問ですね。ちょっと考えさせてください…",
        "おっしゃる意味は理解できました。ご説明いたします…",
        "いい質問ですね！ お話いただいた内容に基づいて…",
        "この問題の解決をお手伝いできます。いくつか情報を提供させてください…",
        "それは良い指摘ですね。ご検討いただけましたか…",
        "ご要望を処理中です。こちらが返信です…",
        "こんにちは！ スマートアシスタントです。喜んでお手伝いさせていただきます。",
        "承知しました。詳しく説明させていただきます。",
        "興味深いご質問ですね。一緒に話し合いましょう。"

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
        fileTypeNotAllowed: '僅允許 PDF 文件上傳，圖像和影片不受限制。',
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
        ,fileTypeNotAllowed: 'Only PDF documents are allowed for document uploads. Images and videos are allowed.'
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
        ,fileTypeNotAllowed: 'ドキュメントアップロードはPDFのみ許可されています。画像と動画は制限されません。'
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









translations['zh-TW'].readMessage = '朗讀訊息';
translations['zh-TW'].stopReading = '停止朗讀';

translations['en'].readMessage = 'Read message';
translations['en'].stopReading = 'Stop reading';

translations['ja'].readMessage = 'メッセージを読み上げる';
translations['ja'].stopReading = '読み上げを停止';

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
        // Allow images and videos; if not image/video, require PDF
        const isImage = file.type && file.type.startsWith('image/');
        const isVideo = file.type && file.type.startsWith('video/');
        const isPDF = /\.pdf$/i.test(file.name) || file.type === 'application/pdf';
        if (!isImage && !isVideo && !isPDF) {
            const t = translations[currentLanguage];
            alert(t.fileTypeNotAllowed || 'Only PDF documents are allowed for document uploads. Images and videos are allowed.');
            return; // Skip adding this file
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
        } else {
            // File name only - simplified without square container
            previewItem = document.createElement('div');
            previewItem.className = 'file-preview-simple';
            
            const fileName = document.createElement('div');
            fileName.className = 'file-name-simple';
            fileName.textContent = file.name;
            fileName.title = file.name;
            
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

        const imageFile = attachmentsSnapshot.find((file) => file.type && file.type.startsWith('image/'));
        
        // Create bot message element with typing indicator
        const botMessageElement = createMessage('', false);
        botMessageElement.classList.add('typing-indicator');
        const botMessageContent = botMessageElement.querySelector('.message-content p');
        botMessageContent.textContent = t.typing || 'Typing...';
        messagesDiv.appendChild(botMessageElement);
        messagesDiv.scrollTop = messagesDiv.scrollHeight;

        let fullResponse = '';

        // Build mapping of uploaded URLs to attachmentsSnapshot by index
        const uploadedUrls = userMessageResponse.message.uploaded_files || [];
        const imageUrls = [];
        const imageMimeTypes = [];
        uploadedUrls.forEach((url, idx) => {
            const file = attachmentsSnapshot[idx];
            if (!file) return;
            const isImage = file.type && file.type.startsWith('image/');
            if (isImage) {
                imageUrls.push(url);
                imageMimeTypes.push(file.type || 'image/jpeg');
            }
        });

        let currentTypingIndex = 0;
        let pendingText = '';

        // Call streaming API depending on whether image URLs are present
        if (imageUrls.length > 0) {
            await chatAPI.streamChatMessage(
                messageText || t.analyzeImage,
                null,
                imageUrls,
                imageMimeTypes,
                currentLanguage,
                conversationHistory,
                // onChunk
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
                // onComplete
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
                // onError
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
            await chatAPI.streamChatMessage(
                messageText || placeholderText,
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

function createMessageWithFiles(text, files, isUser = true) {
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
    const imageEls = Array.from(messageContent.querySelectorAll('img.message-image'));
    let imageIndex = 0;
    uploadedFiles.forEach((filePath) => {
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
        
        if (isImage) {
            // Use the corresponding image element by index to avoid overwriting images when mixed file types are present
            const existingImg = imageEls[imageIndex] || messageContent.querySelector('img.message-image');
            imageIndex += 1;
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