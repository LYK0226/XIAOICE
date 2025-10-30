// Settings functionality - separated from chatbox.js

// ===== Avatar Settings =====

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

// ===== Background Customization Settings =====

// Initialize settings functionality when DOM is loaded
window.addEventListener('DOMContentLoaded', () => {
    const settingsGroups = document.querySelectorAll('.settings-group');
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
});

// ===== Appearance Settings =====

// Theme selector
const themeBtns = document.querySelectorAll('.theme-btn');
themeBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        themeBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const theme = btn.getAttribute('data-theme');
        console.log('Theme changed to:', theme);
        // TODO: Implement actual theme switching
    });
});

// Font size slider
const fontSizeSlider = document.getElementById('fontSizeSlider');
const fontSizeValue = document.getElementById('fontSizeValue');
if (fontSizeSlider && fontSizeValue) {
    fontSizeSlider.addEventListener('input', (e) => {
        const size = e.target.value;
        fontSizeValue.textContent = size + 'px';
        // Apply font size to messages
        const messagesDiv = document.getElementById('messages');
        if (messagesDiv) {
            messagesDiv.style.fontSize = size + 'px';
        }
    });
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
            
            // Show confirmation alert with language-specific message
            const confirmMessages = {
                'zh-CN': '语言已切换为简体中文',
                'zh-TW': '語言已切換為繁體中文',
                'en': 'Language switched to English',
                'ja': '言語が日本語に切り替わりました',
                'ko': '언어가 한국어로 전환되었습니다',
                'es': 'Idioma cambiado a español'
            };
            
            const message = confirmMessages[lang] || confirmMessages['en'];
            
            // Use custom alert if available, otherwise use standard alert
            if (typeof showCustomAlert === 'function') {
                showCustomAlert('✓', message);
            } else {
                // Create a temporary notification
                const notification = document.createElement('div');
                notification.style.cssText = 'position: fixed; top: 20px; right: 20px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 15px 25px; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.3); z-index: 10000; font-size: 14px; font-weight: 500; animation: slideIn 0.3s ease-out;';
                notification.textContent = message;
                document.body.appendChild(notification);
                
                setTimeout(() => {
                    notification.style.animation = 'slideOut 0.3s ease-in';
                    setTimeout(() => {
                        document.body.removeChild(notification);
                    }, 300);
                }, 2000);
            }
        }
    });
});

// Clear all data button
const clearAllDataBtn = document.getElementById('clearAllData');
if (clearAllDataBtn) {
    clearAllDataBtn.addEventListener('click', () => {
        if (confirm('確定要清除所有數據嗎？此操作無法撤銷。\n\nAre you sure you want to clear all data? This action cannot be undone.')) {
            // Clear conversation history if available
            if (typeof conversationHistory !== 'undefined') {
                conversationHistory = [];
            }
            
            // Clear messages
            const messagesDiv = document.getElementById('messages');
            if (messagesDiv) {
                messagesDiv.innerHTML = '';
            }
            
            // Clear localStorage
            localStorage.removeItem('userAvatar');
            localStorage.removeItem('botAvatar');
            localStorage.removeItem('bgType');
            localStorage.removeItem('bgValue');
            
            // Reset avatars if available
            if (typeof userAvatar !== 'undefined') {
                userAvatar = null;
            }
            if (typeof botAvatar !== 'undefined') {
                botAvatar = null;
            }
            
            // Show confirmation
            alert('所有數據已清除。\n\nAll data has been cleared.');
            // Reload page
            location.reload();
        }
    });
}

// ===== API Key Management =====

// API Key Modal Elements
const apiKeyModal = document.getElementById('apiKeyModal');
const closeApiKeyModal = document.querySelector('.close-api-key');
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
    }, 100);
});

// Modal event listeners
closeApiKeyModal.onclick = function() {
    apiKeyModal.style.display = 'none';
    resetApiKeyForm();
};

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
    document.getElementById('apiKeyModalTitle').innerHTML = '<i class="fas fa-key"></i> 添加 API 金鑰 / Add API Key';
    apiKeyModal.style.display = 'block';
    apiKeyNameInput.focus();
});

// Save API key
saveApiKeyBtn.addEventListener('click', async () => {
    const name = apiKeyNameInput.value.trim();
    const apiKey = apiKeyValueInput.value.trim();
    
    if (!name || !apiKey) {
        alert('請填寫所有欄位 / Please fill in all fields');
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
            alert(error.error || '保存失敗 / Save failed');
        }
    } catch (error) {
        console.error('Error saving API key:', error);
        alert('保存失敗 / Save failed');
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
    
    if (apiKeys.length === 0) {
        apiKeyList.innerHTML = `
            <div style="text-align: center; color: #666; padding: 20px; background: #f8f9fa; border-radius: 8px; border: 1px solid #e0e0e0;">
                <i class="fas fa-key" style="font-size: 24px; color: #ccc; margin-bottom: 10px;"></i>
                <p style="margin: 0 0 10px 0; font-weight: 500;">尚未添加任何 API 金鑰 / No API keys added yet</p>
                <p style="margin: 0; font-size: 14px;">請添加您的 Google AI API 金鑰以使用聊天功能<br>Please add your Google AI API key to use chat features</p>
            </div>
        `;
        return;
    }
    
    apiKeys.forEach(key => {
        const isSelected = key.id === selectedId;
        const keyItem = document.createElement('div');
        keyItem.className = `api-key-item ${isSelected ? 'selected' : ''}`;
        
        keyItem.innerHTML = `
            <div class="api-key-info">
                <div class="api-key-name">${key.name}</div>
                <div class="api-key-value">${key.masked_key}</div>
                <span class="api-key-status ${key.is_active ? 'active' : 'inactive'}">
                    ${key.is_active ? '活躍 / Active' : '非活躍 / Inactive'}
                </span>
            </div>
            <div class="api-key-actions">
                <button class="api-key-btn toggle ${isSelected ? 'selected' : ''}" onclick="toggleApiKey(${key.id})">
                    <i class="fas ${isSelected ? 'fa-check-circle' : 'fa-circle'}"></i> 
                    ${isSelected ? '使用中 / In Use' : '使用 / Use'}
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
            // alert(result.message || 'API key toggled successfully');
        } else {
            const error = await response.json();
            alert(error.error || '切換失敗 / Toggle failed');
        }
    } catch (error) {
        console.error('Error toggling API key:', error);
        alert('切換失敗 / Toggle failed');
    }
}

// Delete API key
async function deleteApiKey(keyId, name) {
    if (!confirm(`確定要刪除 API 金鑰 "${name}" 嗎？\n\nAre you sure you want to delete the API key "${name}"?`)) {
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
            alert('API 金鑰已刪除 / API key deleted successfully');
        } else {
            const error = await response.json();
            alert(error.error || '刪除失敗 / Delete failed');
        }
    } catch (error) {
        console.error('Error deleting API key:', error);
        alert('刪除失敗 / Delete failed');
    }
}

// Reset API key form
function resetApiKeyForm() {
    apiKeyNameInput.value = '';
    apiKeyValueInput.value = '';
    apiKeyValueInput.placeholder = '輸入您的 Google AI API 金鑰 / Enter your Google AI API key';
}

// Make functions global for onclick handlers
window.toggleApiKey = toggleApiKey;
window.deleteApiKey = deleteApiKey;
