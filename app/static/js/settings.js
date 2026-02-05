// Settings functionality - separated from chatbox.js

// ===== Translation System for Settings =====

// Function to update settings page language
function updateSettingsLanguage(lang) {
    // Use translations from the global translations object loaded in chatbox.js
    const t = window.translations && window.translations[lang] ? window.translations[lang] : null;
    
    if (!t) {
        console.warn(`Translations for ${lang} not loaded yet`);
        return;
    }
    
    // Update all elements with data-i18n attributes
    document.querySelectorAll('[data-i18n]').forEach(element => {
        const key = element.getAttribute('data-i18n');
        if (t[key]) {
            element.textContent = t[key];
        }
    });
    
    // Update select options
    document.querySelectorAll('option[data-i18n]').forEach(option => {
        const key = option.getAttribute('data-i18n');
        if (t[key]) {
            option.textContent = t[key];
        }
    });
    
    // Update placeholders
    const apiKeyNameInput = document.getElementById('apiKeyName');
    const apiKeyValueInput = document.getElementById('apiKeyValue');
    const editUsernameInput = document.getElementById('editUsernameInput');
    const editEmailInput = document.getElementById('editEmailInput');
    const oldPasswordInput = document.getElementById('oldPasswordInput');
    const newPasswordInput = document.getElementById('newPasswordInput');
    const confirmPasswordInput = document.getElementById('confirmPasswordInput');
    
    if (apiKeyNameInput && t['placeholder.apiKeyName']) apiKeyNameInput.placeholder = t['placeholder.apiKeyName'];
    if (apiKeyValueInput && t['placeholder.apiKeyValue']) apiKeyValueInput.placeholder = t['placeholder.apiKeyValue'];
    if (editUsernameInput && t['placeholder.editUsername']) editUsernameInput.placeholder = t['placeholder.editUsername'];
    if (editEmailInput && t['placeholder.editEmail']) editEmailInput.placeholder = t['placeholder.editEmail'];
    if (oldPasswordInput && t['placeholder.oldPassword']) oldPasswordInput.placeholder = t['placeholder.oldPassword'];
    if (newPasswordInput && t['placeholder.newPassword']) newPasswordInput.placeholder = t['placeholder.newPassword'];
    if (confirmPasswordInput && t['placeholder.confirmPassword']) confirmPasswordInput.placeholder = t['placeholder.confirmPassword'];
    
    // Delete Account Password Input
    const deleteAccountPasswordInput = document.getElementById('deleteAccountPasswordInput');
    if (deleteAccountPasswordInput && t['placeholder.confirmDeletionPassword']) deleteAccountPasswordInput.placeholder = t['placeholder.confirmDeletionPassword'];
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

// Custom prompt function using modal instead of browser prompt
function showCustomPrompt(message, defaultValue, callback, options = {}) {
    const modal = document.getElementById('customPromptModal');
    const messageElement = document.getElementById('customPromptMessage');
    const inputElement = document.getElementById('customPromptInput');
    const toggleBtn = document.getElementById('customPromptToggle');
    const okBtn = document.getElementById('customPromptOkBtn');
    const cancelBtn = document.getElementById('customPromptCancelBtn');

    if (modal && messageElement && inputElement && okBtn && cancelBtn) {
        const inputType = options.inputType || 'text';
        const showToggle = inputType === 'password';
        let toggleHandler = null;

        const setPromptVisibility = (visible) => {
            inputElement.type = visible ? 'text' : 'password';
            if (toggleBtn) {
                const icon = toggleBtn.querySelector('i');
                if (icon) {
                    icon.classList.toggle('fa-eye', !visible);
                    icon.classList.toggle('fa-eye-slash', visible);
                }
                toggleBtn.setAttribute('aria-pressed', String(visible));
            }
        };

        messageElement.textContent = message;
        inputElement.value = defaultValue || '';
        if (inputType === 'password') {
            setPromptVisibility(false);
        } else {
            inputElement.type = 'text';
        }

        if (toggleBtn) {
            toggleBtn.style.display = showToggle ? 'inline-flex' : 'none';
            if (showToggle) {
                toggleHandler = () => {
                    const isVisible = inputElement.type === 'text';
                    setPromptVisibility(!isVisible);
                };
                toggleBtn.addEventListener('click', toggleHandler);
            }
        }
        modal.style.display = 'block';
        inputElement.focus();
        
        // Update language for the modal
        const currentLang = typeof currentLanguage !== 'undefined' ? currentLanguage : 'zh-TW';
        const supportedLangs = ['zh-TW', 'en', 'ja'];
        const langToUse = supportedLangs.includes(currentLang) ? currentLang : 'en';
        updateSettingsLanguage(langToUse);
        
        const cleanup = () => {
            modal.style.display = 'none';
            okBtn.removeEventListener('click', okHandler);
            cancelBtn.removeEventListener('click', cancelHandler);
            window.removeEventListener('click', outsideClickHandler);
            inputElement.removeEventListener('keypress', enterHandler);
            if (toggleBtn && toggleHandler) {
                toggleBtn.removeEventListener('click', toggleHandler);
            }
        };

        const okHandler = () => {
            const value = inputElement.value;
            cleanup();
            if (typeof callback === 'function') callback(value);
        };

        const cancelHandler = () => {
            cleanup();
            if (typeof callback === 'function') callback(null);
        };

        const outsideClickHandler = (e) => {
            if (e.target === modal) {
                cancelHandler();
            }
        };
        
        const enterHandler = (e) => {
            if (e.key === 'Enter') {
                okHandler();
            }
        };

        okBtn.addEventListener('click', okHandler);
        cancelBtn.addEventListener('click', cancelHandler);
        window.addEventListener('click', outsideClickHandler);
        inputElement.addEventListener('keypress', enterHandler);
    } else {
        const result = prompt(message, defaultValue);
        if (typeof callback === 'function') callback(result);
    }
}

window.showCustomPrompt = showCustomPrompt;

// ===== Avatar Settings =====

// Avatar Modal Functionality
const avatarModal = document.getElementById('avatarModal');
const userAvatarInput = document.getElementById('userAvatarInput');
const userAvatarPreview = document.getElementById('userAvatarPreview');

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

// Close modal with cross button
document.querySelector('.close-avatar').addEventListener('click', () => {
    avatarModal.style.display = 'none';
});

// Handle user avatar upload
userAvatarInput.addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (file) {
        // Preview the image
        const reader = new FileReader();
        reader.onload = function(event) {
            userAvatarPreview.style.backgroundImage = `url(${event.target.result})`;
            userAvatarPreview.style.backgroundSize = 'cover';
            userAvatarPreview.style.backgroundPosition = 'center';
            userAvatarPreview.innerHTML = '';
        };
        reader.readAsDataURL(file);
        
        // Save to server
        saveAvatarToServer(file);
    }
});

// Clear user avatar
document.getElementById('clearUserAvatar').addEventListener('click', () => {
    userAvatar = null;
    userAvatarPreview.style.backgroundImage = 'none';
    userAvatarPreview.innerHTML = '<i class="fas fa-user"></i>';
    localStorage.removeItem('userAvatar');
    
    // Clear from server
    saveAvatarToServer(null);
});

// Load saved avatars from localStorage on page load
window.addEventListener('load', () => {
    // Load user profile information
    loadUserProfile();
    
    // Load user profile settings
    loadUserProfileSettings();
    
    // Check if user needs to add children profiles (once per session)
    checkChildrenReminder();
});

// Check if user has children profiles and show reminder if needed
async function checkChildrenReminder() {
    // Only check if user is logged in
    const token = localStorage.getItem('access_token');
    if (!token) {
        return;
    }
    
    try {
        const response = await fetch('/api/children', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            const childrenCount = typeof data.count === 'number'
                ? data.count
                : (Array.isArray(data.children) ? data.children.length : 0);

            if (childrenCount === 0) {
                // Show reminder after a short delay to let the page settle
                setTimeout(() => {
                    showChildrenReminder();
                }, 1500);
            }
        }
    } catch (error) {
        console.error('Error checking children profiles:', error);
    }
}

// Show children reminder modal
function showChildrenReminder() {
    const currentLang = typeof currentLanguage !== 'undefined' ? currentLanguage : 'zh-TW';
    const t = window.translations && window.translations[currentLang] ? window.translations[currentLang] : {};
    
    const message = t['settings.children.reminder'] || 
        '建議您先添加小朋友的基本資料，這樣在使用評估功能時會有更好的體驗。\n\n是否現在前往設定頁面添加？';
    
    showCustomConfirm(message, (confirmed) => {
        if (confirmed) {
            const settingsBtn = document.getElementById('settings');
            if (settingsBtn) {
                settingsBtn.click();
                // Wait for modal to open then switch tab
                setTimeout(() => {
                    const childrenGroup = document.querySelector('.settings-group[data-group="children"]');
                    if (childrenGroup) {
                        childrenGroup.click();
                    }
                }, 200);
            }
        }
    });
}

// Load user profile information
async function loadUserProfile() {
    try {
        const response = await fetch('/auth/me', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('access_token')}`
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            const user = data.user;
            
            // Populate form fields
            document.getElementById('profileUsername').value = user.username || '';
            document.getElementById('profileEmail').value = user.email || '';
            
            // Load user avatar if available
            if (user.avatar) {
                const token = localStorage.getItem('access_token');
                // If it's a GCS (or absolute) URL, use the serve_file endpoint to proxy with token
                if (user.avatar.startsWith('https://storage.googleapis.com/') || user.avatar.startsWith('gs://')) {
                    userAvatar = `/serve_file?url=${encodeURIComponent(user.avatar)}&token=${encodeURIComponent(token)}`;
                } else if (user.avatar.startsWith('/')) {
                    userAvatar = user.avatar;
                } else {
                    userAvatar = `/static/${user.avatar}`;
                }

                userAvatarPreview.style.backgroundImage = `url(${userAvatar})`;
                userAvatarPreview.style.backgroundSize = 'cover';
                userAvatarPreview.style.backgroundPosition = 'center';
                userAvatarPreview.innerHTML = '';
                // Update global userAvatar for chatbox.js
                if (window.userAvatar !== undefined) {
                    window.userAvatar = userAvatar;
                }
            }
        } else {
            console.error('Failed to load user profile');
        }
    } catch (error) {
        console.error('Error loading user profile:', error);
    }
}

// ===== Profile Field Edit Functionality =====

// Edit buttons functionality - now opens modals instead of inline editing
document.getElementById('editUsernameBtn').addEventListener('click', () => {
    openEditUsernameModal();
});

document.getElementById('editEmailBtn').addEventListener('click', () => {
    openEditEmailModal();
});

document.getElementById('editPasswordBtn').addEventListener('click', () => {
    openChangePasswordModal();
});

// Modal functionality for username
function openEditUsernameModal() {
    const modal = document.getElementById('editUsernameModal');
    const input = document.getElementById('editUsernameInput');
    
    // Pre-fill with current value
    input.value = document.getElementById('profileUsername').value;
    
    modal.style.display = 'block';
    
    // Update language for the modal
    const currentLang = typeof currentLanguage !== 'undefined' ? currentLanguage : 'zh-TW';
    const supportedLangs = ['zh-TW', 'en', 'ja'];
    const langToUse = supportedLangs.includes(currentLang) ? currentLang : 'en';
    updateSettingsLanguage(langToUse);
    
    input.focus();
}

// Modal functionality for email
function openEditEmailModal() {
    const modal = document.getElementById('editEmailModal');
    const input = document.getElementById('editEmailInput');
    
    // Pre-fill with current value
    input.value = document.getElementById('profileEmail').value;
    
    modal.style.display = 'block';
    
    // Update language for the modal
    const currentLang = typeof currentLanguage !== 'undefined' ? currentLanguage : 'zh-TW';
    const supportedLangs = ['zh-TW', 'en', 'ja'];
    const langToUse = supportedLangs.includes(currentLang) ? currentLang : 'en';
    updateSettingsLanguage(langToUse);
    
    input.focus();
}

function setPasswordToggleState(inputId, toggleId, visible) {
    const input = document.getElementById(inputId);
    const toggle = document.getElementById(toggleId);

    if (!input || !toggle) {
        return;
    }

    input.type = visible ? 'text' : 'password';

    const icon = toggle.querySelector('i');
    if (icon) {
        icon.className = visible ? 'fas fa-eye-slash' : 'fas fa-eye';
    }

    toggle.setAttribute('aria-pressed', String(visible));
    toggle.style.display = 'inline-flex';
}

function setupPasswordToggle(inputId, toggleId) {
    const toggle = document.getElementById(toggleId);
    if (!toggle) {
        return;
    }

    toggle.addEventListener('click', () => {
        const input = document.getElementById(inputId);
        if (!input) {
            return;
        }

        const shouldShow = input.type === 'password';
        setPasswordToggleState(inputId, toggleId, shouldShow);
    });

    setPasswordToggleState(inputId, toggleId, false);
}

function resetChangePasswordVisibility() {
    setPasswordToggleState('oldPasswordInput', 'oldPasswordToggle', false);
    setPasswordToggleState('newPasswordInput', 'newPasswordToggle', false);
    setPasswordToggleState('confirmPasswordInput', 'confirmPasswordToggle', false);
}

// Modal functionality for password change
function openChangePasswordModal() {
    const modal = document.getElementById('changePasswordModal');
    
    modal.style.display = 'block';
    
    // Update language for the modal
    const currentLang = typeof currentLanguage !== 'undefined' ? currentLanguage : 'zh-TW';
    const supportedLangs = ['zh-TW', 'en', 'ja'];
    const langToUse = supportedLangs.includes(currentLang) ? currentLang : 'en';
    updateSettingsLanguage(langToUse);
    
    // Clear all inputs
    document.getElementById('oldPasswordInput').value = '';
    document.getElementById('newPasswordInput').value = '';
    document.getElementById('confirmPasswordInput').value = '';

    resetChangePasswordVisibility();
    
    // Focus on old password input
    document.getElementById('oldPasswordInput').focus();
}

setupPasswordToggle('oldPasswordInput', 'oldPasswordToggle');
setupPasswordToggle('newPasswordInput', 'newPasswordToggle');
setupPasswordToggle('confirmPasswordInput', 'confirmPasswordToggle');

// Save username from modal
document.getElementById('saveUsernameBtn').addEventListener('click', async () => {
    const input = document.getElementById('editUsernameInput');
    const value = input.value.trim();
    
    if (!value) {
        const currentLang = typeof currentLanguage !== 'undefined' ? currentLanguage : 'zh-TW';
        const supportedLangs = ['zh-TW', 'en', 'ja'];
        const langToUse = supportedLangs.includes(currentLang) ? currentLang : 'en';
        const errorMessages = {
            'zh-TW': '用戶名稱不能為空',
            'en': 'Username cannot be empty',
            'ja': 'ユーザー名は空にできません'
        };
        showCustomAlert(errorMessages[langToUse] || errorMessages['en']);
        return;
    }
    
    try {
        const response = await fetch('/auth/update-profile', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('access_token')}`
            },
            body: JSON.stringify({ username: value })
        });
        
        if (response.ok) {
            // Update the display field
            document.getElementById('profileUsername').value = value;
            
            // Close modal
            document.getElementById('editUsernameModal').style.display = 'none';
            
            const currentLang = typeof currentLanguage !== 'undefined' ? currentLanguage : 'zh-TW';
            const supportedLangs = ['zh-TW', 'en', 'ja'];
            const langToUse = supportedLangs.includes(currentLang) ? currentLang : 'en';
            const successMessages = {
                'zh-TW': '用戶名稱已更新',
                'en': 'Username updated successfully',
                'ja': 'ユーザー名が正常に更新されました'
            };
            showCustomAlert(successMessages[langToUse] || successMessages['en']);
        } else {
            const error = await response.json();
            const currentLang = typeof currentLanguage !== 'undefined' ? currentLanguage : 'zh-TW';
            const supportedLangs = ['zh-TW', 'en', 'ja'];
            const langToUse = supportedLangs.includes(currentLang) ? currentLang : 'en';
            const errorMessages = {
                'zh-TW': '更新失敗',
                'en': 'Update failed',
                'ja': '更新に失敗しました'
            };
            showCustomAlert(error.error || errorMessages[langToUse] || errorMessages['en']);
        }
    } catch (error) {
        console.error('Error updating username:', error);
        const currentLang = typeof currentLanguage !== 'undefined' ? currentLanguage : 'zh-TW';
        const supportedLangs = ['zh-TW', 'en', 'ja'];
        const langToUse = supportedLangs.includes(currentLang) ? currentLang : 'en';
        const errorMessages = {
            'zh-TW': '更新失敗',
            'en': 'Update failed',
            'ja': '更新に失敗しました'
        };
        showCustomAlert(errorMessages[langToUse] || errorMessages['en']);
    }
});

// Save email from modal
document.getElementById('saveEmailBtn').addEventListener('click', async () => {
    const input = document.getElementById('editEmailInput');
    const value = input.value.trim();
    
    if (!value) {
        const currentLang = typeof currentLanguage !== 'undefined' ? currentLanguage : 'zh-TW';
        const supportedLangs = ['zh-TW', 'en', 'ja'];
        const langToUse = supportedLangs.includes(currentLang) ? currentLang : 'en';
        const errorMessages = {
            'zh-TW': '電子郵件不能為空',
            'en': 'Email cannot be empty',
            'ja': 'メールアドレスは空にできません'
        };
        showCustomAlert(errorMessages[langToUse] || errorMessages['en']);
        return;
    }
    
    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(value)) {
        const currentLang = typeof currentLanguage !== 'undefined' ? currentLanguage : 'zh-TW';
        const supportedLangs = ['zh-TW', 'en', 'ja'];
        const langToUse = supportedLangs.includes(currentLang) ? currentLang : 'en';
        const errorMessages = {
            'zh-TW': '請輸入有效的電子郵件地址',
            'en': 'Please enter a valid email address',
            'ja': '有効なメールアドレスを入力してください'
        };
        showCustomAlert(errorMessages[langToUse] || errorMessages['en']);
        return;
    }
    
    try {
        const response = await fetch('/auth/update-profile', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('access_token')}`
            },
            body: JSON.stringify({ email: value })
        });
        
        if (response.ok) {
            // Update the display field
            document.getElementById('profileEmail').value = value;
            
            // Close modal
            document.getElementById('editEmailModal').style.display = 'none';
            
            const currentLang = typeof currentLanguage !== 'undefined' ? currentLanguage : 'zh-TW';
            const supportedLangs = ['zh-TW', 'en', 'ja'];
            const langToUse = supportedLangs.includes(currentLang) ? currentLang : 'en';
            const successMessages = {
                'zh-TW': '電子郵件已更新',
                'en': 'Email updated successfully',
                'ja': 'メールアドレスが正常に更新されました'
            };
            showCustomAlert(successMessages[langToUse] || successMessages['en']);
        } else {
            const error = await response.json();
            const currentLang = typeof currentLanguage !== 'undefined' ? currentLanguage : 'zh-TW';
            const supportedLangs = ['zh-TW', 'en', 'ja'];
            const langToUse = supportedLangs.includes(currentLang) ? currentLang : 'en';
            const errorMessages = {
                'zh-TW': '更新失敗',
                'en': 'Update failed',
                'ja': '更新に失敗しました'
            };
            showCustomAlert(error.error || errorMessages[langToUse] || errorMessages['en']);
        }
    } catch (error) {
        console.error('Error updating email:', error);
        const currentLang = typeof currentLanguage !== 'undefined' ? currentLanguage : 'zh-TW';
        const supportedLangs = ['zh-TW', 'en', 'ja'];
        const langToUse = supportedLangs.includes(currentLang) ? currentLang : 'en';
        const errorMessages = {
            'zh-TW': '更新失敗',
            'en': 'Update failed',
            'ja': '更新に失敗しました'
        };
        showCustomAlert(errorMessages[langToUse] || errorMessages['en']);
    }
});

// Save password from modal
document.getElementById('savePasswordBtn').addEventListener('click', async () => {
    const oldPassword = document.getElementById('oldPasswordInput').value;
    const newPassword = document.getElementById('newPasswordInput').value;
    const confirmPassword = document.getElementById('confirmPasswordInput').value;
    
    // Validation
    if (!oldPassword || !newPassword || !confirmPassword) {
        const currentLang = typeof currentLanguage !== 'undefined' ? currentLanguage : 'zh-TW';
        const supportedLangs = ['zh-TW', 'en', 'ja'];
        const langToUse = supportedLangs.includes(currentLang) ? currentLang : 'en';
        const errorMessages = {
            'zh-TW': '請填寫所有欄位',
            'en': 'Please fill in all fields',
            'ja': 'すべてのフィールドを入力してください'
        };
        showCustomAlert(errorMessages[langToUse] || errorMessages['en']);
        return;
    }
    
    if (newPassword !== confirmPassword) {
        const currentLang = typeof currentLanguage !== 'undefined' ? currentLanguage : 'zh-TW';
        const supportedLangs = ['zh-TW', 'en', 'ja'];
        const langToUse = supportedLangs.includes(currentLang) ? currentLang : 'en';
        const errorMessages = {
            'zh-TW': '新密碼與確認密碼不匹配',
            'en': 'New passwords do not match',
            'ja': '新しいパスワードが一致しません'
        };
        showCustomAlert(errorMessages[langToUse] || errorMessages['en']);
        return;
    }
    
    if (newPassword.length < 6) {
        const currentLang = typeof currentLanguage !== 'undefined' ? currentLanguage : 'zh-TW';
        const supportedLangs = ['zh-TW', 'en', 'ja'];
        const langToUse = supportedLangs.includes(currentLang) ? currentLang : 'en';
        const errorMessages = {
            'zh-TW': '新密碼至少需要6個字符',
            'en': 'New password must be at least 6 characters',
            'ja': '新しいパスワードは6文字以上である必要があります'
        };
        showCustomAlert(errorMessages[langToUse] || errorMessages['en']);
        return;
    }
    
    try {
        const response = await fetch('/auth/change-password', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('access_token')}`
            },
            body: JSON.stringify({ 
                old_password: oldPassword,
                new_password: newPassword 
            })
        });
        
        if (response.ok) {
            // Close modal
            document.getElementById('changePasswordModal').style.display = 'none';
            
            const currentLang = typeof currentLanguage !== 'undefined' ? currentLanguage : 'zh-TW';
            const supportedLangs = ['zh-TW', 'en', 'ja'];
            const langToUse = supportedLangs.includes(currentLang) ? currentLang : 'en';
            const successMessages = {
                'zh-TW': '密碼已成功更改',
                'en': 'Password changed successfully',
                'ja': 'パスワードが正常に変更されました'
            };
            showCustomAlert(successMessages[langToUse] || successMessages['en']);
        } else {
            const error = await response.json();
            const currentLang = typeof currentLanguage !== 'undefined' ? currentLanguage : 'zh-TW';
            const supportedLangs = ['zh-TW', 'en', 'ja'];
            const langToUse = supportedLangs.includes(currentLang) ? currentLang : 'en';
            const errorMessages = {
                'zh-TW': '密碼更改失敗',
                'en': 'Password change failed',
                'ja': 'パスワードの変更に失敗しました'
            };
            showCustomAlert(error.error || errorMessages[langToUse] || errorMessages['en']);
        }
    } catch (error) {
        console.error('Error changing password:', error);
        const currentLang = typeof currentLanguage !== 'undefined' ? currentLanguage : 'zh-TW';
        const supportedLangs = ['zh-TW', 'en', 'ja'];
        const langToUse = supportedLangs.includes(currentLang) ? currentLang : 'en';
        const errorMessages = {
            'zh-TW': '密碼更改失敗',
            'en': 'Password change failed',
            'ja': 'パスワードの変更に失敗しました'
        };
        showCustomAlert(errorMessages[langToUse] || errorMessages['en']);
    }
});

// Cancel buttons for modals
document.getElementById('cancelUsernameBtn').addEventListener('click', () => {
    document.getElementById('editUsernameModal').style.display = 'none';
});

document.getElementById('cancelEmailBtn').addEventListener('click', () => {
    document.getElementById('editEmailModal').style.display = 'none';
});

document.getElementById('cancelPasswordBtn').addEventListener('click', () => {
    document.getElementById('changePasswordModal').style.display = 'none';
});

// Delete Account Handler - Modal logic
const deleteAccountBtn = document.getElementById('deleteAccountBtn');
if (deleteAccountBtn) {
    deleteAccountBtn.addEventListener('click', () => {
        const modal = document.getElementById('deleteAccountModal');
        const input = document.getElementById('deleteAccountPasswordInput');
        const toggleBtn = document.getElementById('deleteAccountToggle');
        
        // Reset state
        input.value = '';
        input.type = 'password';
        if (toggleBtn) {
            toggleBtn.style.display = 'inline-flex';
            toggleBtn.querySelector('i').className = 'fas fa-eye';
            toggleBtn.setAttribute('aria-pressed', 'false');
        }
        
        modal.style.display = 'block';

        // Update language for the modal
        const currentLang = typeof currentLanguage !== 'undefined' ? currentLanguage : 'zh-TW';
        const supportedLangs = ['zh-TW', 'en', 'ja'];
        const langToUse = supportedLangs.includes(currentLang) ? currentLang : 'en';
        updateSettingsLanguage(langToUse);

        input.focus();
    });
}

// Confirm Delete Account
document.getElementById('confirmDeleteAccountBtn').addEventListener('click', async () => {
    const passwordInput = document.getElementById('deleteAccountPasswordInput');
    const password = passwordInput.value;
    const currentLang = typeof currentLanguage !== 'undefined' ? currentLanguage : 'zh-TW';

    if (!password) {
        showCustomAlert({ 'zh-TW': '請輸入密碼以確認刪除', 'en': 'Please enter your password to confirm deletion', 'ja': '削除を確認するためにパスワードを入力してください' }[currentLang] || '請輸入密碼以確認刪除');
        return;
    }

    try {
        const token = localStorage.getItem('access_token');
        const response = await fetch('/auth/delete-account', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ password })
        });

        if (response.ok) {
            // Clear local tokens and cookies, then redirect to home
            localStorage.removeItem('access_token');
            localStorage.removeItem('refresh_token');

            // Try to call logout to clear cookies server-side (best-effort)
            try {
                await fetch('/auth/logout', { method: 'POST', headers: { 'Authorization': `Bearer ${token}` } });
            } catch (e) {
                // ignore
            }

            document.getElementById('deleteAccountModal').style.display = 'none';
            showCustomAlert((currentLang === 'zh-TW') ? '帳號已刪除，將自動跳轉至首頁' : ((currentLang === 'en') ? 'Account deleted, redirecting to homepage' : 'アカウントは削除されました。ホームにリダイレクトします'));
            setTimeout(() => { window.location.href = '/'; }, 1500);
        } else {
            const data = await response.json().catch(() => ({}));
            showCustomAlert(data.error || ((currentLang === 'zh-TW') ? '刪除失敗' : ((currentLang === 'en') ? 'Deletion failed' : '削除に失敗しました')));
        }
    } catch (err) {
        console.error('Error deleting account:', err);
        showCustomAlert((currentLang === 'zh-TW') ? '刪除失敗，請稍後重試' : ((currentLang === 'en') ? 'Deletion failed, try again later' : '削除に失敗しました。後でもう一度お試しください'));
    }
});

// Cancel Delete Account
document.getElementById('cancelDeleteAccountBtn').addEventListener('click', () => {
    document.getElementById('deleteAccountModal').style.display = 'none';
});

// Toggle Password Visibility for Delete Account
const deleteAccountToggle = document.getElementById('deleteAccountToggle');
if (deleteAccountToggle) {
    deleteAccountToggle.addEventListener('click', () => {
        const input = document.getElementById('deleteAccountPasswordInput');
        const icon = deleteAccountToggle.querySelector('i');
        
        if (input.type === 'password') {
            input.type = 'text';
            icon.className = 'fas fa-eye-slash';
            deleteAccountToggle.setAttribute('aria-pressed', 'true');
        } else {
            input.type = 'password';
            icon.className = 'fas fa-eye';
            deleteAccountToggle.setAttribute('aria-pressed', 'false');
        }
    });
}

// Close modals when clicking outside
window.onclick = function(event) {
    const avatarModal = document.getElementById('avatarModal');
    const apiKeyModal = document.getElementById('apiKeyModal');
    const editUsernameModal = document.getElementById('editUsernameModal');
    const editEmailModal = document.getElementById('editEmailModal');
    const changePasswordModal = document.getElementById('changePasswordModal');
    const deleteAccountModal = document.getElementById('deleteAccountModal');
    
    if (event.target == avatarModal) {
        avatarModal.style.display = 'none';
    }
    if (event.target == apiKeyModal) {
        apiKeyModal.style.display = 'none';
        resetApiKeyForm();
    }
    if (event.target == editUsernameModal) {
        editUsernameModal.style.display = 'none';
    }
    if (event.target == editEmailModal) {
        editEmailModal.style.display = 'none';
    }
    if (event.target == changePasswordModal) {
        changePasswordModal.style.display = 'none';
    }
    if (event.target == deleteAccountModal) {
        deleteAccountModal.style.display = 'none';
    }
};

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
        
        // Save to server
        saveUserProfile({ theme: theme });
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
        
        // Save to server
        saveUserProfile({ language: lang });
        
        // Show language change banner
        const bannerMessages = {
            'zh-TW': '語言已切換為繁體中文',
            'en': 'Language switched to English',
            'ja': '言語が日本語に切り替わりました'
        };
        
        const bannerMessage = bannerMessages[lang] || bannerMessages['en'];
        showBannerMessage(bannerMessage);
    });
});

function showBannerMessage(message, options = {}) {
    if (!message) {
        return;
    }

    // Remove any existing banners
    const existingBanners = document.querySelectorAll('.language-change-banner');
    existingBanners.forEach(banner => {
        if (banner.parentNode) {
            banner.parentNode.removeChild(banner);
        }
    });

    // Create and show banner notification
    const banner = document.createElement('div');
    banner.className = 'language-change-banner';
    banner.textContent = message;
    if (options.clickable) {
        banner.style.cursor = 'pointer';
        banner.setAttribute('role', 'button');
        banner.addEventListener('click', () => {
            if (typeof options.onClick === 'function') {
                options.onClick();
            }
        });
    }
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
}

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
    const t = window.translations && window.translations[langToUse] ? window.translations[langToUse] : {};
    
    if (apiKeys.length === 0) {
        apiKeyList.innerHTML = `
            <div style="text-align: center; color: #666; padding: 20px; background: #f8f9fa; border-radius: 8px; border: 1px solid #e0e0e0;">
                <i class="fas fa-key" style="font-size: 24px; color: #ccc; margin-bottom: 10px;"></i>
                <p style="margin: 0 0 10px 0; font-weight: 500;">${t['api_key.no_keys'] || 'No API keys added yet'}</p>
                <p style="margin: 0; font-size: 14px;">${t['api_key.no_keys_desc'] || 'Please add your Google AI API key'}</p>
            </div>
        `;
        return;
    }
    
    apiKeys.forEach(key => {
        const isSelected = key.id === selectedId;
        const keyItem = document.createElement('div');
        keyItem.className = `api-key-item ${isSelected ? 'selected' : ''}`;
        
        const buttonText = isSelected ? (t['api_key.in_use'] || 'In Use') : (t['api_key.use'] || 'Use');
        
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
    // Update placeholder to current language
    const currentLang = typeof currentLanguage !== 'undefined' ? currentLanguage : 'zh-TW';
    const supportedLangs = ['zh-TW', 'en', 'ja'];
    const langToUse = supportedLangs.includes(currentLang) ? currentLang : 'en';
    const placeholders = {
        'zh-TW': { 'apiKeyValue': '輸入您的 Google AI API 金鑰' },
        'en': { 'apiKeyValue': 'Enter your Google AI API key' },
        'ja': { 'apiKeyValue': 'Google AI APIキーを入力してください' }
    };
    apiKeyValueInput.placeholder = placeholders[langToUse]?.apiKeyValue || placeholders['en'].apiKeyValue;
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

// Save avatar to server
async function saveAvatarToServer(file) {
    if (!file) {
        // Clear avatar
        try {
            const response = await fetch('/auth/update-avatar', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('access_token')}`
                },
                body: new FormData() // Empty form data to clear avatar
            });
            
            if (!response.ok) {
                console.error('Failed to clear avatar on server');
            }
        } catch (error) {
            console.error('Error clearing avatar on server:', error);
        }
        return;
    }
    
    const formData = new FormData();
    formData.append('avatar', file);
    
    try {
        const response = await fetch('/auth/update-avatar', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('access_token')}`
            },
            body: formData
        });
        
        if (response.ok) {
            const result = await response.json();
            console.log('Avatar saved to server successfully');
            // Update the user avatar path for display
            if (result.avatar_path) {
                const avatarPath = result.avatar_path;
                const token = localStorage.getItem('access_token');
                if (avatarPath.startsWith('https://storage.googleapis.com/') || avatarPath.startsWith('gs://')) {
                    userAvatar = `/serve_file?url=${encodeURIComponent(avatarPath)}&token=${encodeURIComponent(token)}`;
                } else if (avatarPath.startsWith('/')) {
                    userAvatar = avatarPath;
                } else {
                    userAvatar = `/static/${avatarPath}`;
                }
                userAvatarPreview.style.backgroundImage = `url(${userAvatar})`;
                userAvatarPreview.style.backgroundSize = 'cover';
                userAvatarPreview.style.backgroundPosition = 'center';
                userAvatarPreview.innerHTML = '';
                // Update global userAvatar for chatbox.js
                if (window.userAvatar !== undefined) {
                    window.userAvatar = userAvatar;
                }
            } else {
                // If avatar_path is null, it's cleared
                userAvatar = null;
                userAvatarPreview.style.backgroundImage = 'none';
                userAvatarPreview.innerHTML = '<i class="fas fa-user"></i>';
                if (window.userAvatar !== undefined) {
                    window.userAvatar = null;
                }
            }
        } else {
            console.error('Failed to save avatar to server');
        }
    } catch (error) {
        console.error('Error saving avatar to server:', error);
    }
}

// ===== User Profile Management =====

// Load user profile settings from server
async function loadUserProfileSettings() {
    try {
        const response = await fetch('/api/user/profile', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('access_token')}`
            }
        });
        
        if (response.ok) {
            const profile = await response.json();
            
            // Apply theme
            if (profile.theme) {
                localStorage.setItem('themeMode', profile.theme);
                initializeTheme();
            }
            
            // Apply language
            if (profile.language && typeof currentLanguage !== 'undefined') {
                currentLanguage = profile.language;
                if (typeof updateUILanguage === 'function') {
                    updateUILanguage(profile.language);
                }
                updateSettingsLanguage(profile.language);
                
                // Update language selector UI
                const langOptions = document.querySelectorAll('.lang-option');
                langOptions.forEach(option => {
                    const lang = option.getAttribute('data-lang');
                    if (lang === profile.language) {
                        option.classList.add('active');
                        option.querySelector('i').className = 'fas fa-check-circle';
                    } else {
                        option.classList.remove('active');
                        option.querySelector('i').className = 'fas fa-circle';
                    }
                });
            }
            
            console.log('User profile settings loaded successfully');
        } else {
            console.error('Failed to load user profile settings');
        }
    } catch (error) {
        console.error('Error loading user profile settings:', error);
    }
}

// Save user profile settings to server
async function saveUserProfile(settings) {
    try {
        const response = await fetch('/api/user/profile', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('access_token')}`
            },
            body: JSON.stringify(settings)
        });
        
        if (response.ok) {
            console.log('Profile settings saved successfully');
        } else {
            console.error('Failed to save profile settings');
        }
    } catch (error) {
        console.error('Error saving profile settings:', error);
    }
}

// Load user profile settings when settings modal opens
document.getElementById('settings').addEventListener('click', () => {
    // Load API keys when opening settings
    setTimeout(() => {
        loadApiKeys();
        loadUserModel();
        loadUserProfileSettings();
        loadChildren(); // Load children profiles
    }, 100);
})

// ===== Children Management =====

let editingChildId = null; // Track which child is being edited

// Load children profiles
async function loadChildren() {
    try {
        const response = await fetch('/api/children', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('access_token')}`
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            renderChildren(data.children || []);
        } else {
            console.error('Failed to load children profiles');
        }
    } catch (error) {
        console.error('Error loading children profiles:', error);
    }
}

// Render children list
function renderChildren(children) {
    const childrenList = document.getElementById('childrenList');
    const childrenEmpty = document.getElementById('childrenEmpty');
    const childForm = document.getElementById('childForm');
    
    // Clear previous content except empty state and form
    const existingCards = childrenList.querySelectorAll('.child-card');
    existingCards.forEach(card => card.remove());
    
    if (children.length === 0) {
        childrenEmpty.style.display = 'block';
        childForm.style.display = 'none';
        return;
    }
    
    childrenEmpty.style.display = 'none';
    
    // Get current language for translations
    const currentLang = typeof currentLanguage !== 'undefined' ? currentLanguage : 'zh-TW';
    const t = window.translations && window.translations[currentLang] ? window.translations[currentLang] : {};
    
    children.forEach(child => {
        const childCard = document.createElement('div');
        childCard.className = 'child-card';
        
        // Format details
        const genderMap = {
            'male': t['settings.children.form.gender.male'] || '男',
            'female': t['settings.children.form.gender.female'] || '女',
            'other': t['settings.children.form.gender.other'] || '其他'
        };
        const genderText = child.gender ? genderMap[child.gender] || child.gender : '';
        const ageText = `${child.age_months} ${t['settings.children.months'] || '個月'}`;
        const details = [genderText, ageText].filter(Boolean).join(' · ');
        
        const encodedName = encodeURIComponent(child.name);
        childCard.innerHTML = `
            <div class="child-avatar">${child.gender === 'male' ? '👦' : child.gender === 'female' ? '👧' : '👶'}</div>
            <div class="child-info">
                <div class="child-name">${child.name}</div>
                <div class="child-details">${details}</div>
            </div>
            <div class="child-actions">
                <button class="child-action-btn child-edit-btn" data-child-id="${child.id}">
                    <i class="fas fa-edit"></i> ${t['settings.profile.edit'] || '編輯'}
                </button>
                <button class="child-action-btn delete child-delete-btn" data-child-id="${child.id}" data-child-name="${encodedName}">
                    <i class="fas fa-trash"></i> ${t['alert.delete'] || '刪除'}
                </button>
            </div>
        `;
        
        childrenList.insertBefore(childCard, childrenEmpty);
    });
}

// Children list event delegation
const childrenList = document.getElementById('childrenList');
if (childrenList) {
    childrenList.addEventListener('click', (event) => {
        const editBtn = event.target.closest('.child-edit-btn');
        if (editBtn) {
            const childId = Number(editBtn.dataset.childId);
            if (Number.isFinite(childId)) {
                editChild(childId);
            }
            return;
        }

        const deleteBtn = event.target.closest('.child-delete-btn');
        if (deleteBtn) {
            const childId = Number(deleteBtn.dataset.childId);
            const childName = decodeURIComponent(deleteBtn.dataset.childName || '');
            if (Number.isFinite(childId)) {
                confirmDeleteChild(childId, childName);
            }
        }
    });
}

// Show add child form
document.getElementById('addChildBtn').addEventListener('click', () => {
    showChildForm();
});

// Show child form (add or edit mode)
function showChildForm(child = null) {
    const childForm = document.getElementById('childForm');
    const formTitle = document.getElementById('childFormTitle');
    const currentLang = typeof currentLanguage !== 'undefined' ? currentLanguage : 'zh-TW';
    const t = window.translations && window.translations[currentLang] ? window.translations[currentLang] : {};
    
    if (child) {
        // Edit mode
        editingChildId = child.id;
        formTitle.textContent = t['settings.children.form.edit'] || '編輯小朋友';
        document.getElementById('childProfileName').value = child.name;
        document.getElementById('childProfileBirthdate').value = child.birthdate;
        document.getElementById('childProfileGender').value = child.gender || '';
        document.getElementById('childProfileNotes').value = child.notes || '';
    } else {
        // Add mode
        editingChildId = null;
        formTitle.textContent = t['settings.children.form.add'] || '添加小朋友';
        document.getElementById('childProfileName').value = '';
        document.getElementById('childProfileBirthdate').value = '';
        document.getElementById('childProfileGender').value = '';
        document.getElementById('childProfileNotes').value = '';
    }
    
    childForm.style.display = 'block';
    childForm.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

// Close child form
document.getElementById('closeChildForm').addEventListener('click', () => {
    hideChildForm();
});

document.getElementById('cancelChildForm').addEventListener('click', () => {
    hideChildForm();
});

function hideChildForm() {
    document.getElementById('childForm').style.display = 'none';
    editingChildId = null;
}

// Save child (create or update)
document.getElementById('saveChildForm').addEventListener('click', async () => {
    const name = document.getElementById('childProfileName').value.trim();
    const birthdate = document.getElementById('childProfileBirthdate').value;
    const genderValue = document.getElementById('childProfileGender').value;
    const notesValue = document.getElementById('childProfileNotes').value.trim();
    
    // Convert empty strings to null
    const gender = genderValue || null;
    const notes = notesValue || null;
    
    if (!name || !birthdate) {
        showCustomAlert(window.translations && window.translations[currentLanguage] ? 
            window.translations[currentLanguage]['settings.children.form.required'] || '請填寫姓名和生日' : 
            '請填寫姓名和生日');
        return;
    }
    
    const payload = { name, birthdate, gender, notes };
    
    try {
        let response;
        if (editingChildId) {
            // Update existing child
            response = await fetch(`/api/children/${editingChildId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('access_token')}`
                },
                body: JSON.stringify(payload)
            });
        } else {
            // Create new child
            response = await fetch('/api/children', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('access_token')}`
                },
                body: JSON.stringify(payload)
            });
        }
        
        if (response.ok) {
            hideChildForm();
            loadChildren(); // Reload list
            const currentLang = typeof currentLanguage !== 'undefined' ? currentLanguage : 'zh-TW';
            const t = window.translations && window.translations[currentLang] ? window.translations[currentLang] : {};
            if (editingChildId) {
                showCustomAlert(t['settings.children.updated'] || '小朋友資料已更新');
            } else {
                showBannerMessage(t['settings.children.created'] || '小朋友資料已添加');
            }
        } else {
            const error = await response.json();
            showCustomAlert(error.error || 'Failed to save child profile');
        }
    } catch (error) {
        console.error('Error saving child:', error);
        showCustomAlert('An error occurred. Please try again.');
    }
});

// Edit child - fetch and show form
async function editChild(childId) {
    try {
        const response = await fetch(`/api/children/${childId}`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('access_token')}`
            }
        });
        
        if (response.ok) {
            const child = await response.json();
            showChildForm(child);
        } else {
            showCustomAlert('Failed to load child profile');
        }
    } catch (error) {
        console.error('Error loading child:', error);
        showCustomAlert('An error occurred. Please try again.');
    }
}

// Confirm and delete child
function confirmDeleteChild(childId, childName) {
    const currentLang = typeof currentLanguage !== 'undefined' ? currentLanguage : 'zh-TW';
    const t = window.translations && window.translations[currentLang] ? window.translations[currentLang] : {};
    const message = (t['settings.children.confirm_delete'] || '確定要刪除 {name} 的資料嗎？').replace('{name}', childName);
    
    showCustomConfirm(message, (confirmed) => {
        if (confirmed) {
            deleteChildProfile(childId);
        }
    });
}

// Delete child profile
async function deleteChildProfile(childId) {
    try {
        const response = await fetch(`/api/children/${childId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('access_token')}`
            }
        });
        
        if (response.ok) {
            loadChildren(); // Reload list
        } else {
            let errorMessage = 'Failed to delete child profile';
            const contentType = response.headers.get('content-type') || '';
            if (contentType.includes('application/json')) {
                const error = await response.json();
                errorMessage = error.error || errorMessage;
            } else {
                const errorText = await response.text();
                if (errorText) {
                    errorMessage = errorText;
                }
            }
            showCustomAlert(errorMessage);
        }
    } catch (error) {
        console.error('Error deleting child:', error);
        showCustomAlert('An error occurred. Please try again.');
    }
}

// Make functions globally accessible
window.editChild = editChild;
window.confirmDeleteChild = confirmDeleteChild;
