// Settings functionality - separated from chatbox.js

// ===== Translation System for Settings =====

// Translation dictionary for settings page
const settingsTranslations = {
    'zh-TW': {
        'settings.title': '設定',
        'settings.avatar': '頭像',
        'settings.personalization': '個人化',
        'settings.advanced': '高級',
        'settings.avatar.title': '頭像設定',
        'settings.avatar.description': '自訂您和機器人的頭像',
        'settings.avatar.your': '您的頭像',
        'settings.avatar.bot': '機器人頭像',
        'settings.avatar.upload': '上傳頭像',
        'settings.avatar.clear': '清除',
        'settings.personalization.title': '個人化設定',
        'settings.personalization.description': '自訂您的個人化偏好設定',
        'settings.personalization.theme': '主題模式',
        'settings.personalization.theme.light': '淺色',
        'settings.personalization.theme.dark': '深色',
        'settings.personalization.theme.auto': '自動',
        'settings.personalization.language': '界面語言',
        'settings.advanced.title': 'API 金鑰管理',
        'settings.advanced.description': '管理您的 Google AI API 金鑰',
        'settings.advanced.model': 'AI 模型選擇',
        'settings.advanced.model.flash': 'Gemini 2.5 Flash (推薦)',
        'settings.advanced.model.pro': 'Gemini 2.5 Pro (高品質)',
        'settings.advanced.api_key': 'API 金鑰',
        'settings.advanced.api_key.description': '您可以添加多個 API 金鑰以分散使用量',
        'settings.advanced.api_key.add': '添加 API 金鑰',
        'alert.confirm': '確定',
        'alert.cancel': '取消',
        'api_key_modal.title': '添加 API 金鑰',
        'api_key_modal.name_label': '金鑰名稱',
        'api_key_modal.key_label': 'API 金鑰',
        'api_key_modal.hint': '您的 API 金鑰將被加密存儲',
        'api_key_modal.save': '保存',
        'api_key_modal.cancel': '取消',
        'api_key.in_use': '使用中',
        'api_key.use': '使用',
        'api_key.no_keys': '尚未添加任何 API 金鑰',
        'api_key.no_keys_desc': '請添加您的 Google AI API 金鑰以使用聊天功能'
    },
    'en': {
        'settings.title': 'Settings',
        'settings.avatar': 'Avatar',
        'settings.personalization': 'Personalization',
        'settings.advanced': 'Advanced',
        'settings.avatar.title': 'Avatar Settings',
        'settings.avatar.description': 'Customize your and bot\'s avatars',
        'settings.avatar.your': 'Your Avatar',
        'settings.avatar.bot': 'Bot Avatar',
        'settings.avatar.upload': 'Upload Avatar',
        'settings.avatar.clear': 'Clear',
        'settings.personalization.title': 'Personalization Settings',
        'settings.personalization.description': 'Customize your personalization preferences',
        'settings.personalization.theme': 'Theme Mode',
        'settings.personalization.theme.light': 'Light',
        'settings.personalization.theme.dark': 'Dark',
        'settings.personalization.theme.auto': 'Auto',
        'settings.personalization.language': 'Interface Language',
        'settings.advanced.title': 'API Key Management',
        'settings.advanced.description': 'Manage your Google AI API keys',
        'settings.advanced.model': 'AI Model Selection',
        'settings.advanced.model.flash': 'Gemini 2.5 Flash (Recommended)',
        'settings.advanced.model.pro': 'Gemini 2.5 Pro (High Quality)',
        'settings.advanced.api_key': 'API Key',
        'settings.advanced.api_key.description': 'You can add multiple API keys to distribute usage',
        'settings.advanced.api_key.add': 'Add API Key',
        'alert.confirm': 'OK',
        'alert.cancel': 'Cancel',
        'api_key_modal.title': 'Add API Key',
        'api_key_modal.name_label': 'Key Name',
        'api_key_modal.key_label': 'API Key',
        'api_key_modal.hint': 'Your API key will be encrypted and stored securely',
        'api_key_modal.save': 'Save',
        'api_key_modal.cancel': 'Cancel',
        'api_key.in_use': 'In Use',
        'api_key.use': 'Use',
        'api_key.no_keys': 'No API keys added yet',
        'api_key.no_keys_desc': 'Please add your Google AI API key to use chat features'
    },
    'ja': {
        'settings.title': '設定',
        'settings.avatar': 'アバター',
        'settings.personalization': 'パーソナライズ',
        'settings.advanced': '詳細設定',
        'settings.avatar.title': 'アバター設定',
        'settings.avatar.description': 'あなたとボットのアバターをカスタマイズ',
        'settings.avatar.your': 'あなたのアバター',
        'settings.avatar.bot': 'ボットのアバター',
        'settings.avatar.upload': 'アバターをアップロード',
        'settings.avatar.clear': 'クリア',
        'settings.personalization.title': 'パーソナライズ設定',
        'settings.personalization.description': 'パーソナライズの設定をカスタマイズ',
        'settings.personalization.theme': 'テーマモード',
        'settings.personalization.theme.light': 'ライト',
        'settings.personalization.theme.dark': 'ダーク',
        'settings.personalization.theme.auto': '自動',
        'settings.personalization.language': 'インターフェース言語',
        'settings.advanced.title': 'APIキー管理',
        'settings.advanced.description': 'Google AI APIキーを管理',
        'settings.advanced.model': 'AIモデル選択',
        'settings.advanced.model.flash': 'Gemini 2.5 Flash (推奨)',
        'settings.advanced.model.pro': 'Gemini 2.5 Pro (高品質)',
        'settings.advanced.api_key': 'APIキー',
        'settings.advanced.api_key.description': '使用量を分散するために複数のAPIキーを追加できます',
        'settings.advanced.api_key.add': 'APIキーを追加',
        'alert.confirm': 'OK',
        'alert.cancel': 'キャンセル',
        'api_key_modal.title': 'APIキーを追加',
        'api_key_modal.name_label': 'キー名',
        'api_key_modal.key_label': 'APIキー',
        'api_key_modal.hint': 'APIキーは暗号化されて安全に保存されます',
        'api_key_modal.save': '保存',
        'api_key_modal.cancel': 'キャンセル',
        'api_key.in_use': '使用中',
        'api_key.use': '使用',
        'api_key.no_keys': 'まだAPIキーが追加されていません',
        'api_key.no_keys_desc': 'チャット機能を使用するにはGoogle AI APIキーを追加してください'
    }
};

// Function to update settings page language
function updateSettingsLanguage(lang) {
    const translations = settingsTranslations[lang] || settingsTranslations['en'];
    
    // Update all elements with data-i18n attributes
    document.querySelectorAll('[data-i18n]').forEach(element => {
        const key = element.getAttribute('data-i18n');
        if (translations[key]) {
            element.textContent = translations[key];
        }
    });
    
    // Update select options
    document.querySelectorAll('option[data-i18n]').forEach(option => {
        const key = option.getAttribute('data-i18n');
        if (translations[key]) {
            option.textContent = translations[key];
        }
    });
    
    // Update placeholders
    const placeholders = {
        'zh-TW': {
            'apiKeyName': '例如：我的 Google API',
            'apiKeyValue': '輸入您的 Google AI API 金鑰'
        },
        'en': {
            'apiKeyName': 'e.g., My Google API',
            'apiKeyValue': 'Enter your Google AI API key'
        },
        'ja': {
            'apiKeyName': '例: 私の Google API',
            'apiKeyValue': 'Google AI APIキーを入力してください'
        }
    };
    
    if (placeholders[lang]) {
        const apiKeyNameInput = document.getElementById('apiKeyName');
        const apiKeyValueInput = document.getElementById('apiKeyValue');
        if (apiKeyNameInput) apiKeyNameInput.placeholder = placeholders[lang].apiKeyName;
        if (apiKeyValueInput) apiKeyValueInput.placeholder = placeholders[lang].apiKeyValue;
    }
}

// ===== Custom Modal Functions =====

// Custom alert function using modal instead of browser alert
function showCustomAlert(message) {
    const modal = document.getElementById('customAlertModal');
    const messageElement = document.getElementById('customAlertMessage');
    const closeBtn = document.getElementById('customAlertCloseBtn');
    
    if (modal && messageElement && closeBtn) {
        messageElement.textContent = message;
        modal.style.display = 'block';
        
        // Update language for the modal
        const currentLang = typeof currentLanguage !== 'undefined' ? currentLanguage : 'zh-TW';
        const supportedLangs = ['zh-TW', 'en', 'ja'];
        const langToUse = supportedLangs.includes(currentLang) ? currentLang : 'en';
        updateSettingsLanguage(langToUse);
        
        // Close modal when close button is clicked
        const closeHandler = () => {
            modal.style.display = 'none';
            closeBtn.removeEventListener('click', closeHandler);
        };
        closeBtn.addEventListener('click', closeHandler);
        
        // Close modal when clicking outside
        const outsideClickHandler = (event) => {
            if (event.target === modal) {
                modal.style.display = 'none';
                window.removeEventListener('click', outsideClickHandler);
            }
        };
        window.addEventListener('click', outsideClickHandler);
    } else {
        // Fallback to browser alert
        alert(message);
    }
}

// Custom confirm function using modal instead of browser confirm
function showCustomConfirm(message, callback) {
    const modal = document.getElementById('customConfirmModal');
    const messageElement = document.getElementById('customConfirmMessage');
    const okBtn = document.getElementById('customConfirmOkBtn');
    const cancelBtn = document.getElementById('customConfirmCancelBtn');
    
    if (modal && messageElement && okBtn && cancelBtn) {
        messageElement.textContent = message;
        modal.style.display = 'block';
        
        // Update language for the modal
        const currentLang = typeof currentLanguage !== 'undefined' ? currentLanguage : 'zh-TW';
        const supportedLangs = ['zh-TW', 'en', 'ja'];
        const langToUse = supportedLangs.includes(currentLang) ? currentLang : 'en';
        updateSettingsLanguage(langToUse);
        
        // Handle OK button
        const okHandler = () => {
            modal.style.display = 'none';
            okBtn.removeEventListener('click', okHandler);
            cancelBtn.removeEventListener('click', cancelHandler);
            window.removeEventListener('click', outsideClickHandler);
            if (typeof callback === 'function') {
                callback(true);
            }
        };
        okBtn.addEventListener('click', okHandler);
        
        // Handle Cancel button
        const cancelHandler = () => {
            modal.style.display = 'none';
            okBtn.removeEventListener('click', okHandler);
            cancelBtn.removeEventListener('click', cancelHandler);
            window.removeEventListener('click', outsideClickHandler);
            if (typeof callback === 'function') {
                callback(false);
            }
        };
        cancelBtn.addEventListener('click', cancelHandler);
        
        // Close modal when clicking outside (treat as cancel)
        const outsideClickHandler = (event) => {
            if (event.target === modal) {
                modal.style.display = 'none';
                okBtn.removeEventListener('click', okHandler);
                cancelBtn.removeEventListener('click', cancelHandler);
                window.removeEventListener('click', outsideClickHandler);
                if (typeof callback === 'function') {
                    callback(false);
                }
            }
        };
        window.addEventListener('click', outsideClickHandler);
    } else {
        // Fallback to browser confirm
        const result = confirm(message);
        if (typeof callback === 'function') {
            callback(result);
        }
    }
}

// Make functions global
window.showCustomAlert = showCustomAlert;
window.showCustomConfirm = showCustomConfirm;

// ===== Avatar Settings =====

// Avatar Modal Functionality
const avatarModal = document.getElementById('avatarModal');
const userAvatarInput = document.getElementById('userAvatarInput');
const botAvatarInput = document.getElementById('botAvatarInput');
const userAvatarPreview = document.getElementById('userAvatarPreview');
const botAvatarPreview = document.getElementById('botAvatarPreview');

// Open modal when settings is clicked
document.getElementById('settings').addEventListener('click', () => {
    avatarModal.style.display = 'block';
    
    // Update settings language to current interface language
    const currentLang = typeof currentLanguage !== 'undefined' ? currentLanguage : 'zh-TW';
    // If current language is not supported, default to English
    const supportedLangs = ['zh-TW', 'en', 'ja'];
    const langToUse = supportedLangs.includes(currentLang) ? currentLang : 'en';
    updateSettingsLanguage(langToUse);
    
    // Update theme buttons to reflect current theme after modal is shown
    setTimeout(() => {
        const currentTheme = localStorage.getItem('themeMode') || 'light';
        const themeBtns = document.querySelectorAll('.theme-btn');
        themeBtns.forEach(btn => {
            if (btn.getAttribute('data-theme') === currentTheme) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });
    }, 100);
});

// Close modal
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

// Initialize settings functionality when DOM is loaded
window.addEventListener('DOMContentLoaded', () => {
    const settingsGroups = document.querySelectorAll('.settings-group');
    const settingsContents = document.querySelectorAll('.settings-content');

    // Initialize theme
    initializeTheme();

    // Switch between settings groups (new sidebar navigation)
    settingsGroups.forEach(group => {
        group.addEventListener('click', () => {
            const targetGroup = group.getAttribute('data-group');
            
            // Update active group
            settingsGroups.forEach(g => g.classList.remove('active'));
            group.classList.add('active');
            
            // Update active content
            settingsContents.forEach(content => {
                content.classList.remove('active');
                if (content.id === targetGroup + 'Tab') {
                    content.classList.add('active');
                }
            });
        });
    });
});

// ===== Personalization Settings =====

// Theme selector
document.addEventListener('click', (e) => {
    if (e.target.closest('.theme-btn')) {
        const clickedBtn = e.target.closest('.theme-btn');
        const allThemeBtns = document.querySelectorAll('.theme-btn');
        
        // Remove active class from all buttons
        allThemeBtns.forEach(btn => btn.classList.remove('active'));
        
        // Add active class to clicked button
        clickedBtn.classList.add('active');
        
        const theme = clickedBtn.getAttribute('data-theme');
        applyTheme(theme);
        localStorage.setItem('themeMode', theme);
    }
});

// Function to apply theme
function applyTheme(theme) {
    const body = document.body;
    
    if (theme === 'dark') {
        body.classList.add('dark-theme');
        body.classList.remove('light-theme');
    } else if (theme === 'light') {
        body.classList.add('light-theme');
        body.classList.remove('dark-theme');
    } else if (theme === 'auto') {
        // Check system preference
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        if (prefersDark) {
            body.classList.add('dark-theme');
            body.classList.remove('light-theme');
        } else {
            body.classList.add('light-theme');
            body.classList.remove('dark-theme');
        }
    }
}

// Function to initialize theme on page load
function initializeTheme() {
    const savedTheme = localStorage.getItem('themeMode') || 'light';
    
    // Set active button
    const themeBtns = document.querySelectorAll('.theme-btn');
    themeBtns.forEach(btn => {
        if (btn.getAttribute('data-theme') === savedTheme) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });
    
    applyTheme(savedTheme);
    
    // Listen for system theme changes when in auto mode
    if (savedTheme === 'auto') {
        window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
            if (localStorage.getItem('themeMode') === 'auto') {
                applyTheme('auto');
            }
        });
    }
}

// Language options in settings
const langOptions = document.querySelectorAll('.lang-option');
langOptions.forEach(option => {
    option.addEventListener('click', () => {
        langOptions.forEach(o => {
            o.classList.remove('active');
            o.querySelector('i').className = 'fas fa-circle';
        });
        option.classList.add('active');
        option.querySelector('i').className = 'fas fa-check-circle';
        const lang = option.getAttribute('data-lang');
        console.log('Language changed to:', lang);
        
        // Update current language and UI
        if (typeof currentLanguage !== 'undefined') {
            currentLanguage = lang;
        }
        if (typeof updateUILanguage === 'function') {
            updateUILanguage(lang);
        }
        
        // Update settings page language
        updateSettingsLanguage(lang);
        
        // Reload API keys to update button text
        if (typeof loadApiKeys === 'function') {
            loadApiKeys();
        }
        
        // Show language change banner
        const bannerMessages = {
            'zh-TW': '語言已切換為繁體中文',
            'en': 'Language switched to English',
            'ja': '言語が日本語に切り替わりました'
        };
        
        const bannerMessage = bannerMessages[lang] || bannerMessages['en'];
        
        // Remove any existing language change banners
        const existingBanners = document.querySelectorAll('.language-change-banner');
        existingBanners.forEach(banner => {
            if (banner.parentNode) {
                banner.parentNode.removeChild(banner);
            }
        });
        
        // Create and show banner notification
        const banner = document.createElement('div');
        banner.className = 'language-change-banner';
        banner.textContent = bannerMessage;
        document.body.appendChild(banner);
        
        // Remove banner after 3 seconds
        setTimeout(() => {
            banner.style.animation = 'slideUp 0.3s ease-in';
            setTimeout(() => {
                if (banner.parentNode) {
                    document.body.removeChild(banner);
                }
            }, 300);
        }, 3000);
    });
});

// ===== API Key Management =====

// API Key Modal Elements
const apiKeyModal = document.getElementById('apiKeyModal');
const addApiKeyBtn = document.getElementById('addApiKeyBtn');
const saveApiKeyBtn = document.getElementById('saveApiKeyBtn');
const cancelApiKeyBtn = document.getElementById('cancelApiKeyBtn');
const apiKeyNameInput = document.getElementById('apiKeyName');
const apiKeyValueInput = document.getElementById('apiKeyValue');
const apiKeyList = document.getElementById('apiKeyList');

// Load API keys when settings modal opens
document.getElementById('settings').addEventListener('click', () => {
    // Load API keys when opening settings
    setTimeout(() => {
        loadApiKeys();
        loadUserModel();
    }, 100);
});

// Modal event listeners
cancelApiKeyBtn.addEventListener('click', () => {
    apiKeyModal.style.display = 'none';
    resetApiKeyForm();
});

window.onclick = function(event) {
    if (event.target == apiKeyModal) {
        apiKeyModal.style.display = 'none';
        resetApiKeyForm();
    }
};

// Add API key button
addApiKeyBtn.addEventListener('click', () => {
    const currentLang = typeof currentLanguage !== 'undefined' ? currentLanguage : 'zh-TW';
    // If current language is not supported, default to English
    const supportedLangs = ['zh-TW', 'en', 'ja'];
    const langToUse = supportedLangs.includes(currentLang) ? currentLang : 'en';
    updateSettingsLanguage(langToUse); // Update language for the modal
    apiKeyModal.style.display = 'block';
    apiKeyNameInput.focus();
});

// Save API key
saveApiKeyBtn.addEventListener('click', async () => {
    const name = apiKeyNameInput.value.trim();
    const apiKey = apiKeyValueInput.value.trim();
    
    if (!name || !apiKey) {
        // Get current language for error message
        const currentLang = typeof currentLanguage !== 'undefined' ? currentLanguage : 'zh-TW';
        const supportedLangs = ['zh-TW', 'en', 'ja'];
        const langToUse = supportedLangs.includes(currentLang) ? currentLang : 'en';
        const translations = settingsTranslations[langToUse] || settingsTranslations['en'];
        
        const errorMessages = {
            'zh-TW': '請填寫所有欄位',
            'en': 'Please fill in all fields',
            'ja': 'すべてのフィールドを入力してください'
        };
        showCustomAlert(errorMessages[langToUse] || errorMessages['en']);
        return;
    }
    
    try {
        // Create new key
        const response = await fetch('/api/keys', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('access_token')}`
            },
            body: JSON.stringify({ name, api_key: apiKey })
        });
        
        if (response.ok) {
            const result = await response.json();
            apiKeyModal.style.display = 'none';
            resetApiKeyForm();
            loadApiKeys();
            // No alert needed since it auto-selects
        } else {
            const error = await response.json();
            const errorMessages = {
                'zh-TW': '保存失敗',
                'en': 'Save failed',
                'ja': '保存に失敗しました'
            };
            const currentLang = typeof currentLanguage !== 'undefined' ? currentLanguage : 'zh-TW';
            const supportedLangs = ['zh-TW', 'en', 'ja'];
            const langToUse = supportedLangs.includes(currentLang) ? currentLang : 'en';
            showCustomAlert(error.error || errorMessages[langToUse] || errorMessages['en']);
        }
    } catch (error) {
        console.error('Error saving API key:', error);
        const errorMessages = {
            'zh-TW': '保存失敗',
            'en': 'Save failed',
            'ja': '保存に失敗しました'
        };
        const currentLang = typeof currentLanguage !== 'undefined' ? currentLanguage : 'zh-TW';
        const supportedLangs = ['zh-TW', 'en', 'ja'];
        const langToUse = supportedLangs.includes(currentLang) ? currentLang : 'en';
        showCustomAlert(errorMessages[langToUse] || errorMessages['en']);
    }
});

// Load API keys
async function loadApiKeys() {
    try {
        const response = await fetch('/api/keys', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('access_token')}`
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            renderApiKeys(data.api_keys || [], data.selected_api_key_id);
        } else {
            console.error('Failed to load API keys');
        }
    } catch (error) {
        console.error('Error loading API keys:', error);
    }
}

// Render API keys
function renderApiKeys(apiKeys, selectedId) {
    apiKeyList.innerHTML = '';
    
    // Get current language
    const currentLang = typeof currentLanguage !== 'undefined' ? currentLanguage : 'zh-TW';
    const supportedLangs = ['zh-TW', 'en', 'ja'];
    const langToUse = supportedLangs.includes(currentLang) ? currentLang : 'en';
    const translations = settingsTranslations[langToUse] || settingsTranslations['en'];
    
    if (apiKeys.length === 0) {
        apiKeyList.innerHTML = `
            <div style="text-align: center; color: #666; padding: 20px; background: #f8f9fa; border-radius: 8px; border: 1px solid #e0e0e0;">
                <i class="fas fa-key" style="font-size: 24px; color: #ccc; margin-bottom: 10px;"></i>
                <p style="margin: 0 0 10px 0; font-weight: 500;">${translations['api_key.no_keys']}</p>
                <p style="margin: 0; font-size: 14px;">${translations['api_key.no_keys_desc']}</p>
            </div>
        `;
        return;
    }
    
    apiKeys.forEach(key => {
        const isSelected = key.id === selectedId;
        const keyItem = document.createElement('div');
        keyItem.className = `api-key-item ${isSelected ? 'selected' : ''}`;
        
        const buttonText = isSelected ? translations['api_key.in_use'] : translations['api_key.use'];
        
        keyItem.innerHTML = `
            <div class="api-key-info">
                <div class="api-key-name">${key.name}</div>
                <div class="api-key-value">${key.masked_key}</div>
            </div>
            <div class="api-key-actions">
                <button class="api-key-btn toggle ${isSelected ? 'selected' : ''}" onclick="toggleApiKey(${key.id})">
                    <i class="fas ${isSelected ? 'fa-check-circle' : 'fa-circle'}"></i> 
                    ${buttonText}
                </button>
                <button class="api-key-btn delete" onclick="deleteApiKey(${key.id}, '${key.name.replace(/'/g, "\\'")}')">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        `;
        
        apiKeyList.appendChild(keyItem);
    });
}

// Toggle API key selection
async function toggleApiKey(keyId) {
    try {
        const response = await fetch(`/api/keys/${keyId}/toggle`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('access_token')}`
            }
        });
        
        if (response.ok) {
            const result = await response.json();
            loadApiKeys();
            // Optional: show brief feedback
            // showCustomAlert(result.message || 'API key toggled successfully');
        } else {
            const error = await response.json();
            const errorMessages = {
                'zh-TW': '切換失敗',
                'en': 'Toggle failed',
                'ja': '切り替えに失敗しました'
            };
            const currentLang = typeof currentLanguage !== 'undefined' ? currentLanguage : 'zh-TW';
            const supportedLangs = ['zh-TW', 'en', 'ja'];
            const langToUse = supportedLangs.includes(currentLang) ? currentLang : 'en';
            showCustomAlert(error.error || errorMessages[langToUse] || errorMessages['en']);
        }
    } catch (error) {
        console.error('Error toggling API key:', error);
        const errorMessages = {
            'zh-TW': '切換失敗',
            'en': 'Toggle failed',
            'ja': '切り替えに失敗しました'
        };
        const currentLang = typeof currentLanguage !== 'undefined' ? currentLanguage : 'zh-TW';
        const supportedLangs = ['zh-TW', 'en', 'ja'];
        const langToUse = supportedLangs.includes(currentLang) ? currentLang : 'en';
        showCustomAlert(errorMessages[langToUse] || errorMessages['en']);
    }
}

// Delete API key
async function deleteApiKey(keyId, name) {
    const confirmMessages = {
        'zh-TW': `確定要刪除 API 金鑰 "${name}" 嗎？`,
        'en': `Are you sure you want to delete the API key "${name}"?`,
        'ja': `APIキー "${name}" を削除してもよろしいですか？`
    };
    const currentLang = typeof currentLanguage !== 'undefined' ? currentLanguage : 'zh-TW';
    const supportedLangs = ['zh-TW', 'en', 'ja'];
    const langToUse = supportedLangs.includes(currentLang) ? currentLang : 'en';
    
    showCustomConfirm(confirmMessages[langToUse] || confirmMessages['en'], async (confirmed) => {
        if (!confirmed) {
            return;
        }
        
        try {
            const response = await fetch(`/api/keys/${keyId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('access_token')}`
                }
            });
            
            if (response.ok) {
                loadApiKeys();
                const successMessages = {
                    'zh-TW': 'API 金鑰已刪除',
                    'en': 'API key deleted',
                    'ja': 'APIキーが削除されました'
                };
                showCustomAlert(successMessages[langToUse] || successMessages['en']);
            } else {
                const error = await response.json();
                const errorMessages = {
                    'zh-TW': '刪除失敗',
                    'en': 'Delete failed',
                    'ja': '削除に失敗しました'
                };
                showCustomAlert(error.error || errorMessages[langToUse] || errorMessages['en']);
            }
        } catch (error) {
            console.error('Error deleting API key:', error);
            const errorMessages = {
                'zh-TW': '刪除失敗',
                'en': 'Delete failed',
                'ja': '削除に失敗しました'
            };
            showCustomAlert(errorMessages[langToUse] || errorMessages['en']);
        }
    });
}

// Reset API key form
function resetApiKeyForm() {
    apiKeyNameInput.value = '';
    apiKeyValueInput.value = '';
    apiKeyValueInput.placeholder = '輸入您的 Google AI API 金鑰';
}

// Make functions global for onclick handlers
window.toggleApiKey = toggleApiKey;
window.deleteApiKey = deleteApiKey;

// ===== AI Model Management =====

// Load user's selected AI model
async function loadUserModel() {
    try {
        const response = await fetch('/api/user/model', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('access_token')}`
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            const modelSelect = document.getElementById('aiModelSelect');
            if (modelSelect && data.ai_model) {
                modelSelect.value = data.ai_model;
            }
        } else {
            console.error('Failed to load user model');
        }
    } catch (error) {
        console.error('Error loading user model:', error);
    }
}

// Save user's selected AI model
document.getElementById('aiModelSelect').addEventListener('change', async (event) => {
    const selectedModel = event.target.value;
    
    try {
        const response = await fetch('/api/user/model', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('access_token')}`
            },
            body: JSON.stringify({ ai_model: selectedModel })
        });
        
        if (response.ok) {
            // Show brief success feedback
            const selectElement = event.target;
            const originalBackground = selectElement.style.backgroundColor;
            selectElement.style.backgroundColor = '#d4edda';
            selectElement.style.borderColor = '#c3e6cb';
            
            setTimeout(() => {
                selectElement.style.backgroundColor = originalBackground;
                selectElement.style.borderColor = '';
            }, 1000);
            
            console.log('AI model updated successfully');
        } else {
            const error = await response.json();
            const errorMessages = {
                'zh-TW': '保存失敗',
                'en': 'Save failed',
                'ja': '保存に失敗しました'
            };
            const currentLang = typeof currentLanguage !== 'undefined' ? currentLanguage : 'zh-TW';
            const supportedLangs = ['zh-TW', 'en', 'ja'];
            const langToUse = supportedLangs.includes(currentLang) ? currentLang : 'en';
            showCustomAlert(error.error || errorMessages[langToUse] || errorMessages['en']);
        }
    } catch (error) {
        console.error('Error saving AI model:', error);
        const errorMessages = {
            'zh-TW': '保存失敗',
            'en': 'Save failed',
            'ja': '保存に失敗しました'
        };
        const currentLang = typeof currentLanguage !== 'undefined' ? currentLanguage : 'zh-TW';
        const supportedLangs = ['zh-TW', 'en', 'ja'];
        const langToUse = supportedLangs.includes(currentLang) ? currentLang : 'en';
        showCustomAlert(errorMessages[langToUse] || errorMessages['en']);
    }
});
