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

// DeepSeek API Configuration
const DEEPSEEK_API_KEY = 'sk-2ea678b1c93e4590a9271cb603a87682'; // 替换为您的 DeepSeek API 密鑰
const DEEPSEEK_API_URL = 'https://api.deepseek.com/v1/chat';

// Gemini API Configuration
const GEMINI_API_KEY = 'AIzaSyCGx0IqsuoqbgO4MnAIwsaEZtAgO649_6Q'; // 新的 Gemini API 密鑰
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';
const GEMINI_VISION_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';

// Current API selection (change to 'deepseek' or 'gemini')
const CURRENT_API = 'gemini'; // 'gemini' or 'deepseek' - 現在使用 Gemini

// Conversation history for context
let conversationHistory = [];
let cacheVersion = Date.now(); // Force cache update

// Call Gemini API for text chat
async function callGeminiAPI(userMessage) {
    try {
        // Gemini 在中國無法使用，改用本地模擬或其他方案
        // 回退到智能模擬回應
        return callSmartMockAPI(userMessage);
    } catch (error) {
        console.error('Gemini API Error:', error);
        return callSmartMockAPI(userMessage);
    }
}

// 智能模擬 AI 回應 (基於用戶輸入生成相關回應)
async function callSmartMockAPI(userMessage) {
    // 模擬 API 延遲
    await new Promise(resolve => setTimeout(resolve, 1200));
    
    // 關鍵詞匹配和智能回應
    const keywords = {
        '你好|hello|hi|hey': '你好！很高興見到你。有什麼我可以幫助你的嗎？',
        '天氣|weather|下雨|下雪': '我無法即時獲取天氣信息，但你可以查看天氣預報應用。',
        '時間|time|現在|什麼時候': `現在是 ${new Date().toLocaleString()}`,
        '幾點|時刻|幾點鐘': `現在是 ${new Date().toLocaleTimeString()}`,
        '日期|date|今天|明天|昨天': `今天是 ${new Date().toLocaleDateString()}`,
        '計算|算|數學|math': '我可以幫你計算。請告訴我具體的計算問題。',
        '笑話|joke|funny|有趣': '為什麼電話會害羞？因為它總是被掛斷！😄',
        '感謝|謝謝|thank you|thanks': '不客氣！很高興為你服務。',
        '再見|bye|goodbye|拜拜': '再見！希望我對你有幫助。下次見！',
    };
    
    // 匹配用戶輸入中的關鍵詞
    for (const [pattern, response] of Object.entries(keywords)) {
        if (new RegExp(pattern, 'i').test(userMessage)) {
            return response;
        }
    }
    
    // 預設智能回應 (根據不同語言)
    const defaultResponses = {
        'zh-CN': [
            `我理解你的意思：「${userMessage.substring(0, 20)}...」讓我為你詳細解答。`,
            `這是一個很有趣的問題。關於「${userMessage.substring(0, 15)}」，我認為...`,
            `根據你的提問「${userMessage.substring(0, 20)}...」，我的看法是...`,
            `感謝你的提問。讓我為你分析一下「${userMessage.substring(0, 20)}...」的情況。`,
        ],
        'zh-TW': [
            `我理解你的意思：「${userMessage.substring(0, 20)}...」讓我為你詳細解答。`,
            `這是一個很有趣的問題。關於「${userMessage.substring(0, 15)}」，我認為...`,
            `根據你的提問「${userMessage.substring(0, 20)}...」，我的看法是...`,
            `感謝你的提問。讓我為你分析一下「${userMessage.substring(0, 20)}...」的情況。`,
        ],
        'en': [
            `I understand your question: "${userMessage.substring(0, 20)}..." Let me explain this to you.`,
            `That's an interesting question. About "${userMessage.substring(0, 20)}...", I think...`,
            `Based on your question "${userMessage.substring(0, 20)}...", my perspective is...`,
            `Thank you for asking. Let me analyze the situation regarding "${userMessage.substring(0, 20)}..."`,
        ]
    };
    
    const responses = defaultResponses[currentLanguage] || defaultResponses['en'];
    return responses[Math.floor(Math.random() * responses.length)];
}

// Call DeepSeek API for text chat
async function callDeepSeekAPI(userMessage) {
    try {
        const response = await fetch(DEEPSEEK_API_URL, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${DEEPSEEK_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: 'deepseek-chat',
                messages: [{
                    role: 'user',
                    content: userMessage
                }],
                temperature: 0.9,
                max_tokens: 2048
            })
        });

        if (!response.ok) {
            throw new Error(`API Error: ${response.status}`);
        }

        const data = await response.json();
        
        if (data.choices && data.choices.length > 0) {
            return data.choices[0].message.content;
        } else {
            throw new Error('No response from DeepSeek');
        }
    } catch (error) {
        console.error('DeepSeek API Error:', error);
        const t = translations[currentLanguage];
        const errorMessages = {
            'zh-CN': '抱歉，AI 服务暂时无法使用。请检查您的 API 密钥或稍后再试。',
            'zh-TW': '抱歉，AI 服務暫時無法使用。請檢查您的 API 金鑰或稍後再試。',
            'en': 'Sorry, AI service is temporarily unavailable. Please check your API key or try again later.'
        };
        return errorMessages[currentLanguage] || errorMessages['zh-CN'];
    }
}

// Call Gemini Vision API for image analysis
async function callGeminiVisionAPI(imageData, promptText) {
    try {
        // Remove data URL prefix if present
        const base64Image = imageData.includes('base64,') 
            ? imageData.split('base64,')[1] 
            : imageData;

        const response = await fetch(`${GEMINI_VISION_API_URL}?key=${GEMINI_API_KEY}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                contents: [{
                    parts: [
                        {
                            text: promptText
                        },
                        {
                            inline_data: {
                                mime_type: 'image/jpeg',
                                data: base64Image
                            }
                        }
                    ]
                }],
                generationConfig: {
                    temperature: 0.4,
                    topK: 32,
                    topP: 1,
                    maxOutputTokens: 4096,
                }
            })
        });

        if (!response.ok) {
            throw new Error(`API Error: ${response.status}`);
        }

        const data = await response.json();
        
        if (data.candidates && data.candidates.length > 0) {
            return data.candidates[0].content.parts[0].text;
        } else {
            throw new Error('No response from Gemini Vision');
        }
    } catch (error) {
        console.error('Gemini Vision API Error:', error);
        const t = translations[currentLanguage];
        const errorMessages = {
            'zh-CN': '抱歉，图像识别服务暂时无法使用。请检查您的 API 密钥或稍后再试。',
            'zh-TW': '抱歉，圖像識別服務暫時無法使用。請檢查您的 API 金鑰或稍後再試。',
            'en': 'Sorry, image recognition service is temporarily unavailable. Please check your API key or try again later.'
        };
        return errorMessages[currentLanguage] || errorMessages['zh-CN'];
    }
}

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
        greeting: '您好，GPT-4o',
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
        langSwitched: '语言已切换为简体中文'
    },
    'zh-TW': {
        chatbox: '聊天盒子',
        chat: '聊天',
        greeting: '您好，GPT-4o',
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
        langSwitched: '語言已切換為繁體中文'
    },
    'en': {
        chatbox: 'Chatbox',
        chat: 'Chat',
        greeting: 'Hi, GPT-4o',
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
        langSwitched: 'Language switched to English'
    }
};

// Function to update UI language
function updateUILanguage(lang) {
    const t = translations[lang];
    
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
    
    container.appendChild(avatar);
    container.appendChild(messageContent);
    
    return container;
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
                
                const thinkingIndicator = document.createElement('div');
                thinkingIndicator.className = 'bot-message-container typing-indicator';
                thinkingIndicator.innerHTML = `
                    <div class="avatar bot-avatar">
                        <i class="fas fa-robot"></i>
                    </div>
                    <div class="message-content">
                        <p>${thinkingTexts[currentLanguage]}</p>
                    </div>
                `;
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

// Function to send a message
async function sendMessage() {
    const message = messageInput.value.trim();
    if (message) {
        // Add user message
        const userMessage = createMessage(message, true);
        messagesDiv.appendChild(userMessage);
        messageInput.value = '';
        messagesDiv.scrollTop = messagesDiv.scrollHeight;
        
        // Show typing indicator
        const typingIndicator = document.createElement('div');
        typingIndicator.className = 'bot-message-container typing-indicator';
        const typingText = translations[currentLanguage].typing;
        typingIndicator.innerHTML = `
            <div class="avatar bot-avatar">
                <i class="fas fa-robot"></i>
            </div>
            <div class="message-content">
                <p>${typingText}</p>
            </div>
        `;
        messagesDiv.appendChild(typingIndicator);
        messagesDiv.scrollTop = messagesDiv.scrollHeight;
        
        try {
            // Call appropriate API based on CURRENT_API setting
            let aiResponse;
            if (CURRENT_API === 'deepseek') {
                aiResponse = await callDeepSeekAPI(message);
            } else {
                aiResponse = await callGeminiAPI(message);
            }
            
            // Remove typing indicator
            messagesDiv.removeChild(typingIndicator);
            
            // Add bot response
            const botMessage = createMessage(aiResponse, false);
            messagesDiv.appendChild(botMessage);
            messagesDiv.scrollTop = messagesDiv.scrollHeight;
            
            // Save to conversation history
            conversationHistory.push({
                user: message,
                bot: aiResponse
            });
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

// Avatar Modal Functionality
const avatarModal = document.getElementById('avatarModal');
const closeModal = document.querySelector('.close');
const userAvatarInput = document.getElementById('userAvatarInput');
const botAvatarInput = document.getElementById('botAvatarInput');
const userAvatarPreview = document.getElementById('userAvatarPreview');
const botAvatarPreview = document.getElementById('botAvatarPreview');

// Open modal when settings is clicked
document.getElementById('settings').addEventListener('click', () => {
    avatarModal.style.display = 'block';
});

// Close modal
closeModal.onclick = function() {
    avatarModal.style.display = 'none';
};

window.onclick = function(event) {
    if (event.target == avatarModal) {
        avatarModal.style.display = 'none';
    }
};

// Handle user avatar upload
userAvatarInput.addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(event) {
            userAvatar = event.target.result;
            userAvatarPreview.style.backgroundImage = `url(${userAvatar})`;
            userAvatarPreview.style.backgroundSize = 'cover';
            userAvatarPreview.style.backgroundPosition = 'center';
            userAvatarPreview.innerHTML = '';
            
            // Save to localStorage
            localStorage.setItem('userAvatar', userAvatar);
        };
        reader.readAsDataURL(file);
    }
});

// Handle bot avatar upload
botAvatarInput.addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(event) {
            botAvatar = event.target.result;
            botAvatarPreview.style.backgroundImage = `url(${botAvatar})`;
            botAvatarPreview.style.backgroundSize = 'cover';
            botAvatarPreview.style.backgroundPosition = 'center';
            botAvatarPreview.innerHTML = '';
            
            // Save to localStorage
            localStorage.setItem('botAvatar', botAvatar);
            
            // Update initial bot message avatar
            updateInitialBotAvatar();
        };
        reader.readAsDataURL(file);
    }
});

// Clear user avatar
document.getElementById('clearUserAvatar').addEventListener('click', () => {
    userAvatar = null;
    userAvatarPreview.style.backgroundImage = 'none';
    userAvatarPreview.innerHTML = '<i class="fas fa-user"></i>';
    localStorage.removeItem('userAvatar');
});

// Clear bot avatar
document.getElementById('clearBotAvatar').addEventListener('click', () => {
    botAvatar = null;
    botAvatarPreview.style.backgroundImage = 'none';
    botAvatarPreview.innerHTML = '<i class="fas fa-robot"></i>';
    localStorage.removeItem('botAvatar');
    updateInitialBotAvatar();
});

// Update initial bot message avatar
function updateInitialBotAvatar() {
    const initialBotAvatar = document.querySelector('.bot-message-container .avatar');
    if (initialBotAvatar) {
        if (botAvatar) {
            initialBotAvatar.style.backgroundImage = `url(${botAvatar})`;
            initialBotAvatar.style.backgroundSize = 'cover';
            initialBotAvatar.style.backgroundPosition = 'center';
            initialBotAvatar.innerHTML = '';
        } else {
            initialBotAvatar.style.backgroundImage = 'none';
            initialBotAvatar.innerHTML = '<i class="fas fa-robot"></i>';
        }
    }
}

// Load saved avatars from localStorage on page load
window.addEventListener('load', () => {
    const savedUserAvatar = localStorage.getItem('userAvatar');
    const savedBotAvatar = localStorage.getItem('botAvatar');
    
    if (savedUserAvatar) {
        userAvatar = savedUserAvatar;
        userAvatarPreview.style.backgroundImage = `url(${userAvatar})`;
        userAvatarPreview.style.backgroundSize = 'cover';
        userAvatarPreview.style.backgroundPosition = 'center';
        userAvatarPreview.innerHTML = '';
    }
    
    if (savedBotAvatar) {
        botAvatar = savedBotAvatar;
        botAvatarPreview.style.backgroundImage = `url(${botAvatar})`;
        botAvatarPreview.style.backgroundSize = 'cover';
        botAvatarPreview.style.backgroundPosition = 'center';
        botAvatarPreview.innerHTML = '';
        updateInitialBotAvatar();
    }
});

// Image Recognition Functionality
imageRecognitionBtn.addEventListener('click', () => {
    imageInput.click();
});

imageInput.addEventListener('change', async function(e) {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = async function(event) {
            currentImageData = event.target.result;
            const t = translations[currentLanguage];
            
            // Create user message with image
            const imageMessage = createImageMessage(currentImageData, t.analyzeImage, true);
            messagesDiv.appendChild(imageMessage);
            messagesDiv.scrollTop = messagesDiv.scrollHeight;
            
            // Show typing indicator
            const typingIndicator = document.createElement('div');
            typingIndicator.className = 'bot-message-container typing-indicator';
            typingIndicator.innerHTML = `
                <div class="avatar bot-avatar">
                    <i class="fas fa-robot"></i>
                </div>
                <div class="message-content">
                    <p>${t.analyzing}</p>
                </div>
            `;
            messagesDiv.appendChild(typingIndicator);
            messagesDiv.scrollTop = messagesDiv.scrollHeight;
            
            try {
                // Create prompt based on current language
                let prompt = '';
                if (currentLanguage === 'zh-CN') {
                    prompt = '请详细分析这张图片的内容。如果这是一张试卷或包含问题，请识别并列出所有问题。';
                } else if (currentLanguage === 'zh-TW') {
                    prompt = '請詳細分析這張圖片的內容。如果這是一張試卷或包含問題，請識別並列出所有問題。';
                } else {
                    prompt = 'Please analyze this image in detail. If this is a test paper or contains questions, please identify and list all questions.';
                }
                
                // Call Gemini Vision API
                const analysis = await callGeminiVisionAPI(currentImageData, prompt);
                
                // Remove typing indicator
                messagesDiv.removeChild(typingIndicator);
                
                // Display analysis result
                const botMessage = createMessage(analysis, false);
                messagesDiv.appendChild(botMessage);
                messagesDiv.scrollTop = messagesDiv.scrollHeight;
                
                currentImageData = null;
            } catch (error) {
                console.error('Image analysis error:', error);
                messagesDiv.removeChild(typingIndicator);
                
                const errorMsg = t.errorMsg || '抱歉，图像分析失败。';
                const botMessage = createMessage(errorMsg, false);
                messagesDiv.appendChild(botMessage);
                messagesDiv.scrollTop = messagesDiv.scrollHeight;
            }
        };
        reader.readAsDataURL(file);
    }
    
    // Reset the input so the same file can be selected again
    imageInput.value = '';
});

// Language Switcher Functionality
const langButtons = document.querySelectorAll('.lang-btn');

langButtons.forEach(button => {
    button.addEventListener('click', () => {
        const selectedLang = button.getAttribute('data-lang');
        
        // Update active state
        langButtons.forEach(btn => btn.classList.remove('active'));
        button.classList.add('active');
        
        // Update current language
        currentLanguage = selectedLang;
        
        // Update UI
        updateUILanguage(selectedLang);
        
        // Save to localStorage
        localStorage.setItem('preferredLanguage', selectedLang);
        
        // Show confirmation
        const t = translations[selectedLang];
        alert(t.langSwitched);
    });
});

// Emoji picker functionality
let currentEmojiCategory = 'smileys';

// Populate emoji content
function populateEmojis(category) {
    const emojis = emojiCategories[category];
    emojiContent.innerHTML = '';
    
    emojis.forEach(emoji => {
        const emojiItem = document.createElement('span');
        emojiItem.className = 'emoji-item';
        emojiItem.textContent = emoji;
        emojiItem.addEventListener('click', () => {
            // Insert emoji at cursor position
            const start = messageInput.selectionStart;
            const end = messageInput.selectionEnd;
            const text = messageInput.value;
            messageInput.value = text.substring(0, start) + emoji + text.substring(end);
            messageInput.selectionStart = messageInput.selectionEnd = start + emoji.length;
            messageInput.focus();
        });
        emojiContent.appendChild(emojiItem);
    });
}

// Toggle emoji picker
emojiBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    const isVisible = emojiPicker.style.display === 'block';
    emojiPicker.style.display = isVisible ? 'none' : 'block';
    
    if (!isVisible) {
        populateEmojis(currentEmojiCategory);
    }
});

// Handle emoji category tabs
const emojiTabs = document.querySelectorAll('.emoji-tab');
emojiTabs.forEach(tab => {
    tab.addEventListener('click', () => {
        const category = tab.getAttribute('data-category');
        
        // Update active state
        emojiTabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        
        // Update current category and populate
        currentEmojiCategory = category;
        populateEmojis(category);
    });
});

// Close emoji picker when clicking outside
document.addEventListener('click', (e) => {
    if (!emojiPicker.contains(e.target) && e.target !== emojiBtn) {
        emojiPicker.style.display = 'none';
    }
});

// Load saved language preference and background on page load
window.addEventListener('DOMContentLoaded', () => {
    // Background Customization Functionality
    const settingsTabs = document.querySelectorAll('.settings-tab');
    const settingsContents = document.querySelectorAll('.settings-content');
    const bgTypeBtns = document.querySelectorAll('.bg-type-btn');
    const bgOptions = document.querySelectorAll('.bg-option');
    const gradientItems = document.querySelectorAll('.gradient-item');
    const colorItems = document.querySelectorAll('.color-item');
    const bgImageInput = document.getElementById('bgImageInput');
    const bgImagePreview = document.getElementById('bgImagePreview');
    const applyCustomGradient = document.getElementById('applyCustomGradient');
    const applyCustomColor = document.getElementById('applyCustomColor');
    const clearBgImage = document.getElementById('clearBgImage');
    const resetBackground = document.getElementById('resetBackground');

    // Switch between settings tabs
    settingsTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const targetTab = tab.getAttribute('data-tab');
            
            // Update active tab
            settingsTabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            
            // Update active content
            settingsContents.forEach(content => {
                content.classList.remove('active');
                if (content.id === targetTab + 'Tab') {
                    content.classList.add('active');
                }
            });
        });
    });

    // Switch between background types
    bgTypeBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const bgType = btn.getAttribute('data-type');
            
            // Update active button
            bgTypeBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            // Show corresponding options
            bgOptions.forEach(option => {
                option.classList.remove('active');
                if (option.id === bgType + 'Options') {
                    option.classList.add('active');
                }
            });
        });
    });

    // Apply gradient presets
    gradientItems.forEach(item => {
        item.addEventListener('click', () => {
            const gradient = item.getAttribute('data-gradient');
            
            // Update active state
            gradientItems.forEach(i => i.classList.remove('active'));
            item.classList.add('active');
            
            // Apply gradient
            document.body.style.background = gradient;
            
            // Save to localStorage
            localStorage.setItem('bgType', 'gradient');
            localStorage.setItem('bgValue', gradient);
        });
    });

    // Apply custom gradient
    applyCustomGradient.addEventListener('click', () => {
        const color1 = document.getElementById('gradientColor1').value;
        const color2 = document.getElementById('gradientColor2').value;
        const gradient = `linear-gradient(135deg, ${color1} 0%, ${color2} 100%)`;
        
        document.body.style.background = gradient;
        
        // Save to localStorage
        localStorage.setItem('bgType', 'gradient');
        localStorage.setItem('bgValue', gradient);
        
        // Show confirmation
        alert('自定义渐变已应用！/ Custom gradient applied!');
    });

    // Apply solid color presets
    colorItems.forEach(item => {
        item.addEventListener('click', () => {
            const color = item.getAttribute('data-color');
            
            // Update active state
            colorItems.forEach(i => i.classList.remove('active'));
            item.classList.add('active');
            
            // Apply color
            document.body.style.background = color;
            
            // Save to localStorage
            localStorage.setItem('bgType', 'solid');
            localStorage.setItem('bgValue', color);
        });
    });

    // Apply custom solid color
    applyCustomColor.addEventListener('click', () => {
        const color = document.getElementById('customSolidColor').value;
        
        document.body.style.background = color;
        
        // Save to localStorage
        localStorage.setItem('bgType', 'solid');
        localStorage.setItem('bgValue', color);
        
        alert('自定义颜色已应用！/ Custom color applied!');
    });

    // Upload background image
    bgImageInput.addEventListener('change', function(e) {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = function(event) {
                const imageData = event.target.result;
                
                // Update preview
                bgImagePreview.style.backgroundImage = `url(${imageData})`;
                bgImagePreview.classList.add('has-image');
                bgImagePreview.innerHTML = '';
                
                // Apply to body
                document.body.style.background = `url(${imageData}) center/cover no-repeat`;
                
                // Save to localStorage
                localStorage.setItem('bgType', 'image');
                localStorage.setItem('bgValue', imageData);
            };
            reader.readAsDataURL(file);
        }
    });

    // Click preview to upload
    bgImagePreview.addEventListener('click', () => {
        bgImageInput.click();
    });

    // Clear background image
    clearBgImage.addEventListener('click', () => {
        bgImagePreview.style.backgroundImage = '';
        bgImagePreview.classList.remove('has-image');
        bgImagePreview.innerHTML = '<i class="fas fa-image"></i><p>点击上传图片 / Click to Upload</p>';
        
        // Reset to default gradient
        const defaultGradient = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
        document.body.style.background = defaultGradient;
        
        // Save to localStorage
        localStorage.setItem('bgType', 'gradient');
        localStorage.setItem('bgValue', defaultGradient);
    });

    // Reset to default background
    resetBackground.addEventListener('click', () => {
        const defaultGradient = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
        document.body.style.background = defaultGradient;
        
        // Clear localStorage
        localStorage.removeItem('bgType');
        localStorage.removeItem('bgValue');
        
        // Reset all active states
        gradientItems.forEach((item, index) => {
            item.classList.remove('active');
            if (index === 0) item.classList.add('active');
        });
        colorItems.forEach(item => item.classList.remove('active'));
        
        // Reset preview
        bgImagePreview.style.backgroundImage = '';
        bgImagePreview.classList.remove('has-image');
        bgImagePreview.innerHTML = '<i class="fas fa-image"></i><p>点击上传图片 / Click to Upload</p>';
        
        alert('已恢复默认背景！/ Default background restored!');
    });

    // Load saved language preference
    const savedLanguage = localStorage.getItem('preferredLanguage');
    if (savedLanguage) {
        currentLanguage = savedLanguage;
        
        // Update active button
        langButtons.forEach(btn => {
            btn.classList.remove('active');
            if (btn.getAttribute('data-lang') === savedLanguage) {
                btn.classList.add('active');
            }
        });
        
        // Update UI
        updateUILanguage(savedLanguage);
    }
    
    // Load saved background
    const savedBgType = localStorage.getItem('bgType');
    const savedBgValue = localStorage.getItem('bgValue');
    
    if (savedBgType && savedBgValue) {
        if (savedBgType === 'image') {
            document.body.style.background = `url(${savedBgValue}) center/cover no-repeat`;
            bgImagePreview.style.backgroundImage = `url(${savedBgValue})`;
            bgImagePreview.classList.add('has-image');
            bgImagePreview.innerHTML = '';
        } else {
            document.body.style.background = savedBgValue;
        }
    }
    
    // 滚动进度指示器
    const backgroundTab = document.getElementById('backgroundTab');
    const scrollProgress = document.getElementById('scrollProgress');
    
    if (backgroundTab && scrollProgress) {
        backgroundTab.addEventListener('scroll', () => {
            const scrollTop = backgroundTab.scrollTop;
            const scrollHeight = backgroundTab.scrollHeight - backgroundTab.clientHeight;
            const scrollPercentage = (scrollTop / scrollHeight) * 100;
            scrollProgress.style.width = scrollPercentage + '%';
        });
    }

    // Initialize login check and user info
    checkLoginStatus();
    setupUserMenu();
});

/**
 * Check if user is logged in, redirect to login page if not
 */
function checkLoginStatus() {
    const isLoggedIn = localStorage.getItem('xiaoice_loggedIn');
    const userJSON = localStorage.getItem('xiaoice_user');
    const token = localStorage.getItem('xiaoice_access_token');
    
    if (!isLoggedIn || !userJSON) {
        // Redirect to login page
        window.location.href = 'login.html';
        return;
    }
    
    try {
        const user = JSON.parse(userJSON);
        updateUserGreeting(user);
    } catch (e) {
        console.error('Error parsing user data:', e);
        window.location.href = 'login.html';
    }
}

/**
 * Update user greeting with email
 */
function updateUserGreeting(userObj) {
    const userGreeting = document.getElementById('userGreeting');
    const displayUserEmail = document.getElementById('displayUserEmail');
    
    let email = userObj.email;
    let username = userObj.username || email.split('@')[0];
    
    if (userGreeting) {
        userGreeting.textContent = `您好，${username}`;
    }
    
    if (displayUserEmail) {
        displayUserEmail.textContent = email;
    }
}

/**
 * Setup user dropdown menu
 */
function setupUserMenu() {
    const userMenuBtn = document.getElementById('userMenuBtn');
    const userDropdown = document.getElementById('userDropdown');
    
    if (userMenuBtn && userDropdown) {
        userMenuBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            userDropdown.classList.toggle('show');
        });
        
        // Close dropdown when clicking outside
        document.addEventListener('click', () => {
            userDropdown.classList.remove('show');
        });
    }
}

/**
 * Logout function
 */
function logout() {
    // Clear login info
    localStorage.removeItem('xiaoice_loggedIn');
    localStorage.removeItem('xiaoice_user');
    
    // Keep these for "Remember me" functionality
    // localStorage.removeItem('xiaoice_email');
    // localStorage.removeItem('xiaoice_remember');
    
    // Redirect to login page
    window.location.href = 'login.html';
}

/**
 * Open settings modal
 */
function openSettings() {
    const modal = document.getElementById('avatarModal');
    if (modal) {
        modal.style.display = 'block';
    }
}