// Settings functionality - separated from chatbox.js

// ===== Translation System for Settings =====

const settingsSupportedLanguages = ['zh-TW', 'zh-CN', 'en', 'ja'];
let settingsTranslationsPromise = null;
let i18nNavigationInProgress = false;

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

function withTimeout(promise, ms) {
    let timeoutId;
    const timeoutPromise = new Promise((resolve) => {
        timeoutId = setTimeout(resolve, ms);
    });

    return Promise.race([
        promise.finally(() => clearTimeout(timeoutId)),
        timeoutPromise
    ]);
}

async function preloadPreferredLanguage() {
    const preferred = localStorage.getItem('preferredLanguage') || 'zh-TW';
    const lang = settingsSupportedLanguages.includes(preferred) ? preferred : 'zh-TW';
    const cached = loadTranslationCache(lang);

    if (cached) {
        window.translations = window.translations || {};
        window.translations[lang] = cached;
        return;
    }

    try {
        const response = await fetch(`/static/i18n/${lang}.json`, { cache: 'force-cache' });
        if (!response.ok) {
            throw new Error(`Failed to preload ${lang} translations`);
        }
        const data = await response.json();
        storeTranslationCache(lang, data);
        window.translations = window.translations || {};
        window.translations[lang] = data;
    } catch (error) {
        console.warn('Failed to preload preferred language before navigation:', error);
    }
}

function resolveNavigationPath(targetUrl) {
    try {
        const parsed = new URL(targetUrl, window.location.origin);
        if (parsed.origin !== window.location.origin) {
            return null;
        }
        return `${parsed.pathname}${parsed.search}`;
    } catch (error) {
        return null;
    }
}

function setPreloadedNavigationMarker(targetUrl) {
    const path = resolveNavigationPath(targetUrl);
    if (!path) {
        return;
    }

    const normalizedPath = path === '/index' ? '/' : path;
    try {
        sessionStorage.setItem('__preloaded_nav_ready_path', normalizedPath);
    } catch (error) {
        // no-op
    }
}

async function waitForIframeI18nReady(frame, timeoutMs) {
    const startedAt = Date.now();

    while (Date.now() - startedAt < timeoutMs) {
        try {
            const doc = frame.contentDocument;
            if (doc && doc.documentElement) {
                const root = doc.documentElement;
                const ready = root.getAttribute('data-i18n-ready') === 'true';
                const pending = root.getAttribute('data-i18n-pending') === 'true';
                if (ready || !pending) {
                    return;
                }
            }
        } catch (error) {
            return;
        }

        await new Promise((resolve) => setTimeout(resolve, 50));
    }
}

async function preloadTargetPage(targetUrl) {
    const path = resolveNavigationPath(targetUrl);
    if (!path) {
        return;
    }

    const frame = document.createElement('iframe');
    frame.setAttribute('aria-hidden', 'true');
    frame.style.position = 'fixed';
    frame.style.width = '1px';
    frame.style.height = '1px';
    frame.style.opacity = '0';
    frame.style.pointerEvents = 'none';
    frame.style.left = '-9999px';
    frame.style.top = '-9999px';
    frame.src = path;

    try {
        const loadPromise = new Promise((resolve) => {
            frame.addEventListener('load', resolve, { once: true });
            frame.addEventListener('error', resolve, { once: true });
        });

        document.body.appendChild(frame);
        await withTimeout(loadPromise, 10000);
        await waitForIframeI18nReady(frame, 5000);
    } catch (error) {
        try {
            await fetch(path, {
                method: 'GET',
                credentials: 'same-origin',
                cache: 'force-cache'
            });
        } catch (fallbackError) {
            console.warn('Failed to preload target page before navigation:', fallbackError);
        }
    } finally {
        if (frame.parentNode) {
            frame.parentNode.removeChild(frame);
        }
    }
}

async function navigateWithPreloadedPage(targetUrl) {
    if (!targetUrl || i18nNavigationInProgress) {
        return;
    }

    i18nNavigationInProgress = true;

    try {
        await withTimeout(Promise.all([
            preloadPreferredLanguage(),
            preloadTargetPage(targetUrl)
        ]), 16000);
    } finally {
        setPreloadedNavigationMarker(targetUrl);
        window.location.href = targetUrl;
    }
}

window.navigateWithPreloadedPage = navigateWithPreloadedPage;

async function ensureSettingsTranslations() {
    const existingTranslations = window.translations || {};
    settingsSupportedLanguages.forEach((lang) => {
        if (!existingTranslations[lang]) {
            const cached = loadTranslationCache(lang);
            if (cached) {
                existingTranslations[lang] = cached;
            }
        }
    });
    const hasAllTranslations = settingsSupportedLanguages.every((lang) => existingTranslations[lang]);

    if (hasAllTranslations) {
        return existingTranslations;
    }

    if (!settingsTranslationsPromise) {
        settingsTranslationsPromise = Promise.all(
            settingsSupportedLanguages.map(async (lang) => {
                if (existingTranslations[lang]) {
                    return;
                }

                try {
                    const response = await fetch(`/static/i18n/${lang}.json`);
                    if (!response.ok) {
                        throw new Error(`Failed to load ${lang} translations`);
                    }
                    existingTranslations[lang] = await response.json();
                    storeTranslationCache(lang, existingTranslations[lang]);
                } catch (error) {
                    console.error(`Error loading ${lang} translations:`, error);
                    existingTranslations[lang] = {};
                }
            })
        ).then(() => {
            window.translations = existingTranslations;
            return existingTranslations;
        });
    }

    return settingsTranslationsPromise;
}

function applySettingsLanguage(t) {
    if (!t) {
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

    // Update placeholders for generic fields
    document.querySelectorAll('[data-i18n-placeholder]').forEach(element => {
        const key = element.getAttribute('data-i18n-placeholder');
        if (t[key]) {
            element.placeholder = t[key];
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

    if (typeof updateAdvancedSummary === 'function') {
        updateAdvancedSummary();
    }

    if (typeof updateSummaryApiKeyOptions === 'function') {
        updateSummaryApiKeyOptions(advancedConfigState.apiKeys, advancedConfigState.selectedApiKeyId);
    }
}

// Function to update settings page language
function updateSettingsLanguage(lang) {
    const translationsSource = window.translations && window.translations[lang] ? window.translations[lang] : null;

    if (translationsSource) {
        applySettingsLanguage(translationsSource);
        return;
    }

    ensureSettingsTranslations()
        .then((translations) => {
            const t = translations && translations[lang] ? translations[lang] : null;
            if (!t) {
                console.warn(`Translations for ${lang} not loaded yet`);
                return;
            }
            applySettingsLanguage(t);
        })
        .catch((error) => {
            console.error('Failed to load translations for settings:', error);
        });
}

function initializeSettingsLanguage() {
    const savedLanguage = localStorage.getItem('preferredLanguage');
    const initialLanguage = savedLanguage || 'zh-TW';

    if (typeof currentLanguage === 'undefined') {
        window.currentLanguage = initialLanguage;
    }

    let cacheHit = false;
    const cached = loadTranslationCache(initialLanguage);
    if (cached) {
        window.translations = window.translations || {};
        window.translations[initialLanguage] = cached;
        updateSettingsLanguage(initialLanguage);
        cacheHit = true;
    }

    const markReady = () => {
        if (window.__i18nDeferReady) {
            return;
        }
        document.documentElement.setAttribute('data-i18n-ready', 'true');
        document.documentElement.removeAttribute('data-i18n-pending');
    };

    if (cacheHit) {
        markReady();
    }

    ensureSettingsTranslations()
        .then(() => {
            if (!cacheHit) {
                updateSettingsLanguage(initialLanguage);
                markReady();
            }
        })
        .catch((error) => {
            console.error('Failed to initialize settings language:', error);
            markReady();
        });
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
        const supportedLangs = settingsSupportedLanguages;
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
        const supportedLangs = settingsSupportedLanguages;
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
        const supportedLangs = settingsSupportedLanguages;
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

(() => {
    const boot = () => {
        try {
            initializeSettingsLanguage();
        } catch (error) {
            console.error('Failed to boot settings language:', error);
            if (!window.__i18nDeferReady) {
                document.documentElement.setAttribute('data-i18n-ready', 'true');
                document.documentElement.removeAttribute('data-i18n-pending');
            }
        }
    };

    if (document.readyState === 'loading') {
        window.addEventListener('DOMContentLoaded', boot);
    } else {
        boot();
    }
})();

// ===== Avatar Settings =====

// Avatar Modal Functionality
const avatarModal = document.getElementById('avatarModal');
const userAvatarInput = document.getElementById('userAvatarInput');
const userAvatarPreview = document.getElementById('userAvatarPreview');

// Open modal when settings is clicked
document.getElementById('settings').addEventListener('click', () => {
    avatarModal.style.display = 'block';
    
    // Update settings language to current interface language
    const currentLang = (typeof currentLanguage !== 'undefined' && currentLanguage)
        ? currentLanguage
        : (localStorage.getItem('preferredLanguage') || 'zh-TW');
    // If current language is not supported, default to English
    const supportedLangs = settingsSupportedLanguages;
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
    const supportedLangs = settingsSupportedLanguages;
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
    const supportedLangs = settingsSupportedLanguages;
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
    const supportedLangs = settingsSupportedLanguages;
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
        const supportedLangs = settingsSupportedLanguages;
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
            const supportedLangs = settingsSupportedLanguages;
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
            const supportedLangs = settingsSupportedLanguages;
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
        const supportedLangs = settingsSupportedLanguages;
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
        const supportedLangs = settingsSupportedLanguages;
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
        const supportedLangs = settingsSupportedLanguages;
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
            const supportedLangs = settingsSupportedLanguages;
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
            const supportedLangs = settingsSupportedLanguages;
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
        const supportedLangs = settingsSupportedLanguages;
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
        const supportedLangs = settingsSupportedLanguages;
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
        const supportedLangs = settingsSupportedLanguages;
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
        const supportedLangs = settingsSupportedLanguages;
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
            const supportedLangs = settingsSupportedLanguages;
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
            const supportedLangs = settingsSupportedLanguages;
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
        const supportedLangs = settingsSupportedLanguages;
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
        const supportedLangs = settingsSupportedLanguages;
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
if (document.readyState === 'loading') {
    window.addEventListener('DOMContentLoaded', () => {
        initializeTheme();
        initSettingsUI();
    });
} else {
    initializeTheme();
    initSettingsUI();
}

function initSettingsUI() {
    const settingsGroups = document.querySelectorAll('.settings-group');
    const settingsContents = document.querySelectorAll('.settings-content');

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
}

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
    
    // Remove the early anti-FOUC class now that real theme class takes over
    document.documentElement.classList.remove('dark-theme-early');
    
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
    option.addEventListener('click', async () => {
        langOptions.forEach(o => {
            o.classList.remove('active');
            o.querySelector('i').className = 'fas fa-circle';
        });
        option.classList.add('active');
        option.querySelector('i').className = 'fas fa-check-circle';
        const lang = option.getAttribute('data-lang');
        console.log('Language changed to:', lang);
        
        // Load translations for the new language
        try {
            const response = await fetch(`/static/i18n/${lang}.json`, { cache: 'no-store' });
            if (response.ok) {
                const data = await response.json();
                storeTranslationCache(lang, data);
                window.translations = window.translations || {};
                window.translations[lang] = data;
            }
        } catch (error) {
            console.warn('Failed to load translations for', lang, error);
        }
        
        // Update current language and UI
        if (typeof currentLanguage !== 'undefined') {
            currentLanguage = lang;
        } else {
            window.currentLanguage = lang;
        }
        if (typeof updateUILanguage === 'function') {
            updateUILanguage(lang);
        }
        
        // Update settings page language
        updateSettingsLanguage(lang);

        // Persist language locally for non-chat pages
        localStorage.setItem('preferredLanguage', lang);
        
        // Reload API keys to update button text
        if (typeof loadApiKeys === 'function') {
            loadApiKeys();
        }
        
        // Save to server
        saveUserProfile({ language: lang });
        
        // Show language change banner
        const bannerMessages = {
            'zh-TW': '語言已切換為繁體中文',
            'zh-CN': '语言已切换为简体中文',
            'en': 'Language switched to English',
            'ja': '言語が日本語に切り替わりました'
        };
        
        window.dispatchEvent(new CustomEvent('languageChanged', { detail: { lang } }));
        
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
const showAdvancedConfigBtn = document.getElementById('showAdvancedConfigBtn');
const advancedConfigDetails = document.getElementById('advancedConfigDetails');
const addConfigModal = document.getElementById('addConfigModal');
const openAddConfigModalBtn = document.getElementById('openAddConfigModalBtn');
const saveConfigBtn = document.getElementById('saveConfigBtn');
const cancelConfigBtn = document.getElementById('cancelConfigBtn');
const configListContainer = document.getElementById('configListContainer');
const summaryProviderToggle = document.getElementById('summaryProviderToggle');
const summaryModelSelect = document.getElementById('summaryModelSelect');
const summaryApiKeySelect = document.getElementById('summaryApiKeySelect');
const apiKeySection = document.getElementById('apiKeySection');
const providerCardsContainer = document.getElementById('providerCardsContainer');
const providerInput = document.getElementById('aiProviderSelect');

const advancedConfigState = {
    provider: null,
    model: null,
    apiKeys: [],
    selectedApiKeyId: null,
    vertexAccounts: [],
    selectedVertexAccountId: null,
    vertexProjectId: null,
    vertexLocation: null
};

// Model options by provider
const modelOptions = {
    'ai_studio': [
        { value: 'gemini-3-flash-preview', label: 'Gemini 3 Flash' },
        { value: 'gemini-3-pro-preview', label: 'Gemini 3 Pro' }
    ],
    'vertex_ai': [
        { value: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash' },
        { value: 'gemini-2.5-pro', label: 'Gemini 2.5 Pro' },
        //{ value: 'gemini-3-flash-preview', label: 'Gemini 3 Flash' },
        //{ value: 'gemini-3-pro-preview', label: 'Gemini 3 Pro' }
    ]
};

function getSettingsLang() {
    const currentLang = typeof currentLanguage !== 'undefined' ? currentLanguage : 'zh-TW';
    const supportedLangs = settingsSupportedLanguages;
    return supportedLangs.includes(currentLang) ? currentLang : 'en';
}

function getSettingsTranslations() {
    const lang = getSettingsLang();
    return window.translations && window.translations[lang] ? window.translations[lang] : {};
}

function getActiveProvider() {
    if (providerInput && providerInput.value) {
        return providerInput.value;
    }
    return advancedConfigState.provider || 'ai_studio';
}

function filterApiKeysForProvider(apiKeys, provider) {
    return apiKeys.filter(key => key.provider === provider);
}

function getModelLabel(modelValue, provider) {
    const options = modelOptions[provider] || modelOptions['ai_studio'];
    const match = options.find(option => option.value === modelValue);
    return match ? match.label : modelValue;
}

function updateSummaryModelOptions(provider) {
    if (!summaryModelSelect) {
        return;
    }

    const models = modelOptions[provider] || modelOptions['ai_studio'];
    summaryModelSelect.innerHTML = '';
    models.forEach(model => {
        const option = document.createElement('option');
        option.value = model.value;
        option.textContent = model.label;
        summaryModelSelect.appendChild(option);
    });
}

function updateSummaryProviderButtons(provider) {
    if (!summaryProviderToggle) {
        return;
    }

    const buttons = summaryProviderToggle.querySelectorAll('.summary-provider-btn');
    buttons.forEach(btn => {
        if (btn.dataset.provider === provider) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });
}

function updateAuthModeVisibility() {
    const provider = getActiveProvider();
    const vertexConfigSection = document.getElementById('vertexConfigSection');

    if (provider === 'vertex_ai') {
        if (vertexConfigSection) {
            vertexConfigSection.style.display = 'block';
        }
        if (apiKeySection) {
            apiKeySection.style.display = 'none';
        }
        if (summaryApiKeySelect) {
            summaryApiKeySelect.disabled = false;
        }
    } else {
        if (vertexConfigSection) {
            vertexConfigSection.style.display = 'none';
        }
        if (apiKeySection) {
            apiKeySection.style.display = 'block';
        }
        if (summaryApiKeySelect) {
            summaryApiKeySelect.disabled = false;
        }
    }
}

function updateSummaryApiKeyOptions(apiKeys, selectedId) {
    if (!summaryApiKeySelect) {
        return;
    }

    const t = getSettingsTranslations();
    const provider = getActiveProvider();
    summaryApiKeySelect.innerHTML = '';

    const placeholder = document.createElement('option');
    placeholder.value = '';
    if (provider === 'vertex_ai') {
        placeholder.textContent = t['settings.advanced.summary.vertex_account_placeholder'] || 'Select a service account';
    } else {
        placeholder.textContent = t['settings.advanced.summary.api_key_placeholder'] || 'Select an API key';
    }
    summaryApiKeySelect.appendChild(placeholder);

    if (provider === 'vertex_ai') {
        const accounts = advancedConfigState.vertexAccounts || [];
        accounts.forEach(account => {
            const option = document.createElement('option');
            const projectId = account.project_id ? account.project_id : 'project';
            option.value = String(account.id);
            option.textContent = `${account.name} (${projectId})`;
            summaryApiKeySelect.appendChild(option);
        });
        if (advancedConfigState.selectedVertexAccountId && accounts.some(account => account.id === advancedConfigState.selectedVertexAccountId)) {
            summaryApiKeySelect.value = String(advancedConfigState.selectedVertexAccountId);
        } else {
            summaryApiKeySelect.value = '';
        }
        return;
    }

    const filteredKeys = filterApiKeysForProvider(apiKeys, provider);
    filteredKeys.forEach(key => {
        const option = document.createElement('option');
        const providerLabel = key.provider === 'vertex_ai' ? 'Vertex AI' : 'AI Studio';
        option.value = String(key.id);
        option.textContent = `${key.name} (${providerLabel})`;
        summaryApiKeySelect.appendChild(option);
    });

    if (selectedId && filteredKeys.some(key => key.id === selectedId)) {
        summaryApiKeySelect.value = String(selectedId);
    } else {
        summaryApiKeySelect.value = '';
    }
}

async function persistProviderSelection(selectedProvider, selectedModel) {
    try {
        const body = { ai_provider: selectedProvider };
        if (selectedModel) {
            body.ai_model = selectedModel;
        }
        const response = await fetch('/api/user/model', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('access_token')}`
            },
            body: JSON.stringify(body)
        });

        if (!response.ok) {
            console.error('Failed to update provider');
        }
    } catch (error) {
        console.error('Error updating provider:', error);
    }
}

async function persistModelSelection(selectedModel) {
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
            return true;
        }
        return false;
    } catch (error) {
        console.error('Error saving AI model:', error);
        return false;
    }
}

async function applyProviderSelection(selectedProvider, options = {}) {
    const { persist = true } = options;

    if (providerInput) {
        providerInput.value = selectedProvider;
    }

    updateModelOptions(selectedProvider);
    updateSummaryModelOptions(selectedProvider);
    updateSummaryProviderButtons(selectedProvider);
    updateAuthModeVisibility();

    const cards = document.querySelectorAll('.provider-card');
    cards.forEach(card => {
        if (card.dataset.value === selectedProvider) {
            card.classList.add('active');
        } else {
            card.classList.remove('active');
        }
    });

    advancedConfigState.provider = selectedProvider;
    syncAdvancedConfigStateFromInputs();
    updateSummaryApiKeyOptions(advancedConfigState.apiKeys, advancedConfigState.selectedApiKeyId);
    if (typeof renderApiKeys === 'function') {
        renderApiKeys(advancedConfigState.apiKeys, advancedConfigState.selectedApiKeyId);
    }
    updateAdvancedSummary();

    if (summaryModelSelect) {
        const fallbackModel = summaryModelSelect.value || (modelOptions[selectedProvider] || [])[0]?.value;
        if (fallbackModel) {
            summaryModelSelect.value = fallbackModel;
            advancedConfigState.model = fallbackModel;
            updateAdvancedSummary();
        }
    }

    if (persist) {
        // Persist both provider and the newly-selected model
        await persistProviderSelection(selectedProvider, advancedConfigState.model);
    }
}

function syncAdvancedConfigStateFromInputs() {
    const providerSelect = document.getElementById('aiProviderSelect');
    const locationSelect = document.getElementById('vertexLocation');

    advancedConfigState.provider = providerSelect ? providerSelect.value : advancedConfigState.provider;
    advancedConfigState.model = summaryModelSelect ? summaryModelSelect.value : advancedConfigState.model;
    advancedConfigState.vertexLocation = locationSelect ? locationSelect.value : advancedConfigState.vertexLocation;
}

function updateAdvancedSummary() {
    const modelEl = document.getElementById('advancedSelectedModel');
    const providerEl = document.getElementById('advancedSelectedProvider');
    const listEl = document.getElementById('advancedConfigList');

    if (!modelEl || !providerEl) {
        return;
    }

    const t = getSettingsTranslations();
    const providerLabel = advancedConfigState.provider === 'vertex_ai'
        ? (t['settings.advanced.provider.vertex_ai'] || 'Vertex AI')
        : (t['settings.advanced.provider.ai_studio'] || 'AI Studio (Gemini API)');
    const modelLabel = advancedConfigState.model
        ? getModelLabel(advancedConfigState.model, advancedConfigState.provider || 'ai_studio')
        : '-';

    modelEl.textContent = modelLabel || '-';
    providerEl.textContent = providerLabel || '-';

    if (!listEl) {
        return;
    }

    listEl.innerHTML = '';
    const items = [];

    if (advancedConfigState.apiKeys.length > 0) {
        const selectedLabel = t['api_key.in_use'] || 'In Use';
        const keyNames = advancedConfigState.apiKeys.map(key => {
            const isSelected = key.id === advancedConfigState.selectedApiKeyId;
            return `${key.name}${isSelected ? ` (${selectedLabel})` : ''}`;
        });
        items.push({
            label: t['settings.advanced.summary.api_keys'] || 'API Keys',
            value: keyNames.join(', ')
        });
    }

    if (advancedConfigState.provider === 'vertex_ai') {
        const selectedAccount = (advancedConfigState.vertexAccounts || []).find(account => account.id === advancedConfigState.selectedVertexAccountId);
        if (selectedAccount) {
            const locationText = selectedAccount.location ? ` (${selectedAccount.location})` : '';
            items.push({
                label: t['settings.advanced.summary.vertex'] || 'Vertex AI',
                value: `${selectedAccount.name} - ${selectedAccount.project_id}${locationText}`
            });
        } else if (advancedConfigState.vertexProjectId) {
            const locationText = advancedConfigState.vertexLocation ? ` (${advancedConfigState.vertexLocation})` : '';
            items.push({
                label: t['settings.advanced.summary.vertex'] || 'Vertex AI',
                value: `${advancedConfigState.vertexProjectId}${locationText}`
            });
        }
    }

    if (items.length === 0) {
        const empty = document.createElement('div');
        empty.className = 'summary-item empty';
        empty.textContent = t['settings.advanced.summary.no_configs'] || 'No configurations yet';
        listEl.appendChild(empty);
        return;
    }

    items.forEach(item => {
        const row = document.createElement('div');
        row.className = 'summary-item';
        row.innerHTML = `<span class="summary-label">${item.label}</span><span class="summary-value-text">${item.value}</span>`;
        listEl.appendChild(row);
    });
}

if (showAdvancedConfigBtn && advancedConfigDetails) {
    showAdvancedConfigBtn.addEventListener('click', () => {
        // Toggle visibility
        const isVisible = advancedConfigDetails.style.display !== 'none';
        
        if (isVisible) {
            // Hide config details
            advancedConfigDetails.style.display = 'none';
            const icon = showAdvancedConfigBtn.querySelector('i');
            if (icon) {
                icon.className = 'fas fa-cog';
            }
        } else {
            // Show config details
            advancedConfigDetails.style.display = 'block';
            const icon = showAdvancedConfigBtn.querySelector('i');
            if (icon) {
                icon.className = 'fas fa-times';
            }
            // Load configuration list
            renderConfigurationList();
        }
    });
}

if (summaryProviderToggle) {
    summaryProviderToggle.addEventListener('click', async (event) => {
        const button = event.target.closest('.summary-provider-btn');
        if (!button) {
            return;
        }

        const selectedProvider = button.dataset.provider || 'ai_studio';
        await applyProviderSelection(selectedProvider, { persist: true });
    });
}


if (summaryModelSelect) {
    summaryModelSelect.addEventListener('change', async (event) => {
        const selectedModel = event.target.value;
        advancedConfigState.model = selectedModel;
        updateAdvancedSummary();

        const success = await persistModelSelection(selectedModel);
        if (!success) {
            const errorMessages = {
                'zh-TW': '保存失敗',
                'en': 'Save failed',
                'ja': '保存に失敗しました'
            };
            const currentLang = typeof currentLanguage !== 'undefined' ? currentLanguage : 'zh-TW';
            const supportedLangs = settingsSupportedLanguages;
            const langToUse = supportedLangs.includes(currentLang) ? currentLang : 'en';
            showCustomAlert(errorMessages[langToUse] || errorMessages['en']);
        }
    });
}

if (summaryApiKeySelect) {
    summaryApiKeySelect.addEventListener('change', async (event) => {
        const selectedId = Number(event.target.value);
        if (!Number.isFinite(selectedId)) {
            return;
        }
        if (!selectedId) {
            return;
        }

        if (getActiveProvider() === 'vertex_ai') {
            await activateVertexAccount(selectedId);
            return;
        }

        await toggleApiKey(selectedId);
    });
}

// Load API keys when settings modal opens
document.getElementById('settings').addEventListener('click', () => {
    // Load API keys when opening settings
    setTimeout(() => {
        if (advancedConfigDetails) {
            advancedConfigDetails.style.display = 'none';
        }
        if (showAdvancedConfigBtn) {
            // Reset button icon
            const icon = showAdvancedConfigBtn.querySelector('i');
            if (icon) {
                icon.className = 'fas fa-cog';
            }
        }
        loadApiKeys();
        loadVertexAccounts();
        loadUserModel();
    }, 100);
});

// Modal event listeners (Legacy API Key Modal - only attach if elements exist)
if (cancelApiKeyBtn) {
    cancelApiKeyBtn.addEventListener('click', () => {
        apiKeyModal.style.display = 'none';
        resetApiKeyForm();
    });
}

window.onclick = function(event) {
    if (apiKeyModal && event.target == apiKeyModal) {
        apiKeyModal.style.display = 'none';
        resetApiKeyForm();
    }
};

// Add API key button (Legacy - only attach if element exists)
if (addApiKeyBtn) {
    addApiKeyBtn.addEventListener('click', () => {
        const currentLang = typeof currentLanguage !== 'undefined' ? currentLanguage : 'zh-TW';
        // If current language is not supported, default to English
        const supportedLangs = settingsSupportedLanguages;
        const langToUse = supportedLangs.includes(currentLang) ? currentLang : 'en';
        updateSettingsLanguage(langToUse); // Update language for the modal
        apiKeyModal.style.display = 'block';
        apiKeyNameInput.focus();
    });
}

// Save API key (Legacy - only attach if element exists)
if (saveApiKeyBtn) {
    saveApiKeyBtn.addEventListener('click', async () => {
    const name = apiKeyNameInput.value.trim();
    const apiKey = apiKeyValueInput.value.trim();
    const provider = getActiveProvider();
    const normalizedProvider = provider === 'vertex_ai' ? 'ai_studio' : provider;
    
    if (!name || !apiKey) {
        // Get current language for error message
        const currentLang = typeof currentLanguage !== 'undefined' ? currentLanguage : 'zh-TW';
        const supportedLangs = settingsSupportedLanguages;
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
            body: JSON.stringify({ name, api_key: apiKey, provider: normalizedProvider })
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
            const supportedLangs = settingsSupportedLanguages;
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
        const supportedLangs = settingsSupportedLanguages;
        const langToUse = supportedLangs.includes(currentLang) ? currentLang : 'en';
        showCustomAlert(errorMessages[langToUse] || errorMessages['en']);
    }
    });
}

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
            advancedConfigState.apiKeys = data.api_keys || [];
            advancedConfigState.selectedApiKeyId = data.selected_api_key_id || null;
            renderApiKeys(data.api_keys || [], data.selected_api_key_id);
            updateSummaryApiKeyOptions(advancedConfigState.apiKeys, advancedConfigState.selectedApiKeyId);
            updateAdvancedSummary();
        } else {
            console.error('Failed to load API keys');
        }
    } catch (error) {
        console.error('Error loading API keys:', error);
    }
}

// Load Vertex service accounts
async function loadVertexAccounts() {
    try {
        const response = await fetch('/api/vertex/accounts', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('access_token')}`
            }
        });

        if (response.ok) {
            const data = await response.json();
            advancedConfigState.vertexAccounts = data.accounts || [];
            updateSummaryApiKeyOptions(advancedConfigState.apiKeys, advancedConfigState.selectedApiKeyId);
            updateAdvancedSummary();
        } else {
            console.error('Failed to load Vertex accounts');
        }
    } catch (error) {
        console.error('Error loading Vertex accounts:', error);
    }
}

// Activate Vertex service account
async function activateVertexAccount(accountId) {
    try {
        const response = await fetch(`/api/vertex/accounts/${accountId}/activate`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('access_token')}`
            }
        });

        if (response.ok) {
            const result = await response.json();
            const account = result.account || {};
            advancedConfigState.selectedVertexAccountId = accountId;
            advancedConfigState.vertexProjectId = account.project_id || null;
            advancedConfigState.vertexLocation = account.location || null;
            updateSummaryApiKeyOptions(advancedConfigState.apiKeys, advancedConfigState.selectedApiKeyId);
            updateAdvancedSummary();
        } else {
            console.error('Failed to activate Vertex account');
        }
    } catch (error) {
        console.error('Error activating Vertex account:', error);
    }
}

// Render API keys
function renderApiKeys(apiKeys, selectedId) {
    if (!apiKeyList) {
        return;
    }
    apiKeyList.innerHTML = '';
    
    // Get current language
    const currentLang = typeof currentLanguage !== 'undefined' ? currentLanguage : 'zh-TW';
    const supportedLangs = settingsSupportedLanguages;
    const langToUse = supportedLangs.includes(currentLang) ? currentLang : 'en';
    const t = window.translations && window.translations[langToUse] ? window.translations[langToUse] : {};

    const provider = getActiveProvider();

    if (provider === 'vertex_ai') {
        apiKeyList.innerHTML = `
            <div style="text-align: center; color: #666; padding: 20px; background: #f8f9fa; border-radius: 8px; border: 1px solid #e0e0e0;">
                <i class="fas fa-shield-alt" style="font-size: 24px; color: #ccc; margin-bottom: 10px;"></i>
                <p style="margin: 0; font-size: 14px;">${t['settings.advanced.vertex.using_service_account'] || 'Using service account for Vertex AI'}</p>
            </div>
        `;
        return;
    }

    const filteredKeys = filterApiKeysForProvider(apiKeys, 'ai_studio');
    
    if (filteredKeys.length === 0) {
        apiKeyList.innerHTML = `
            <div style="text-align: center; color: #666; padding: 20px; background: #f8f9fa; border-radius: 8px; border: 1px solid #e0e0e0;">
                <i class="fas fa-key" style="font-size: 24px; color: #ccc; margin-bottom: 10px;"></i>
                <p style="margin: 0 0 10px 0; font-weight: 500;">${t['api_key.no_keys'] || 'No API keys added yet'}</p>
                <p style="margin: 0; font-size: 14px;">${t['api_key.no_keys_desc'] || 'Please add your Google AI API key'}</p>
            </div>
        `;
        return;
    }
    
    filteredKeys.forEach(key => {
        const isSelected = key.id === selectedId;
        const keyItem = document.createElement('div');
        keyItem.className = `api-key-item ${isSelected ? 'selected' : ''}`;
        
        const buttonText = isSelected ? (t['api_key.in_use'] || 'In Use') : (t['api_key.use'] || 'Use');
        
        // Provider badge
        const providerLabel = key.provider === 'vertex_ai' ? 'Vertex AI' : 'AI Studio';
        const providerColor = key.provider === 'vertex_ai' ? '#4285f4' : '#ea4335';
        
        keyItem.innerHTML = `
            <div class="api-key-info">
                <div class="api-key-name">
                    ${key.name}
                    <span style="display: inline-block; margin-left: 8px; padding: 2px 8px; background: ${providerColor}; color: white; border-radius: 4px; font-size: 11px; font-weight: 500;">${providerLabel}</span>
                </div>
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
            const supportedLangs = settingsSupportedLanguages;
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
        const supportedLangs = settingsSupportedLanguages;
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
    const supportedLangs = settingsSupportedLanguages;
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
    const supportedLangs = settingsSupportedLanguages;
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

// ===== Configuration Management =====

// Render configuration list (AI Studio + Vertex AI)
function renderConfigurationList() {
    if (!configListContainer) return;
    
    const t = getSettingsTranslations();
    const allConfigs = [];
    
    // Add AI Studio configurations
    advancedConfigState.apiKeys.forEach(key => {
        if (key.provider !== 'vertex_ai') {
            allConfigs.push({
                type: 'ai_studio',
                id: key.id,
                name: key.name,
                maskedKey: key.masked_key,
                isActive: key.id === advancedConfigState.selectedApiKeyId && getActiveProvider() === 'ai_studio'
            });
        }
    });
    
    // Add Vertex AI configurations
    advancedConfigState.vertexAccounts.forEach(account => {
        allConfigs.push({
            type: 'vertex_ai',
            id: account.id,
            name: account.name,
            projectId: account.project_id,
            location: account.location,
            isActive: account.id === advancedConfigState.selectedVertexAccountId && getActiveProvider() === 'vertex_ai'
        });
    });
    
    if (allConfigs.length === 0) {
        configListContainer.innerHTML = `
            <div style="text-align: center; color: #666; padding: 32px; background: #f8f9fa; border-radius: 8px; border: 1px solid #e0e0e0;">
                <i class="fas fa-inbox" style="font-size: 48px; color: #ccc; margin-bottom: 16px; display: block;"></i>
                <p style="margin: 0 0 8px 0; font-weight: 500; font-size: 16px;">${t['settings.advanced.no_configs'] || '尚未添加任何配置'}</p>
                <p style="margin: 0; font-size: 14px; opacity: 0.8;">${t['settings.advanced.no_configs_desc'] || '點擊下方按鈕添加您的第一個配置'}</p>
            </div>
        `;
        return;
    }
    
    configListContainer.innerHTML = allConfigs.map(config => {
        const providerLabel = config.type === 'ai_studio' ? 
            (t['settings.advanced.provider.ai_studio'] || 'AI Studio') : 
            'Service Account';
        const providerColor = config.type === 'ai_studio' ? '#ea4335' : '#4285f4';
        
        const statusBadge = config.isActive ? 
            `<span style="display: inline-block; padding: 4px 12px; background: #4caf50; color: white; border-radius: 12px; font-size: 11px; font-weight: 600; margin-left: 8px;">${t['api_key.in_use'] || '使用中'}</span>` : 
            '';
        
        let detailInfo = '';
        if (config.type === 'ai_studio') {
            detailInfo = `<div style="color: #666; font-size: 13px; margin-top: 4px;">${config.maskedKey}</div>`;
        } else {
            detailInfo = `<div style="color: #666; font-size: 13px; margin-top: 4px;">Project: ${config.projectId} | Location: ${config.location}</div>`;
        }
        
        return `
            <div class="config-item" style="background: white; border: 1px solid #e0e0e0; border-radius: 8px; padding: 16px; margin-bottom: 12px;">
                <div style="display: flex; justify-content: space-between; align-items: start;">
                    <div style="flex: 1;">
                        <div style="display: flex; align-items: center; margin-bottom: 8px;">
                            <span style="display: inline-block; padding: 4px 10px; background: ${providerColor}; color: white; border-radius: 4px; font-size: 11px; font-weight: 600;">${providerLabel}</span>
                        </div>
                        <div style="font-weight: 600; font-size: 15px; margin-bottom: 4px;">
                            ${config.name}
                            ${statusBadge}
                        </div>
                        ${detailInfo}
                    </div>
                    <div style="display: flex; gap: 8px; margin-left: 16px;">
                        <button class="api-key-btn delete" onclick="deleteConfig('${config.type}', ${config.id}, '${config.name.replace(/'/g, "\\'")}')">

                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

// Activate a configuration
async function activateConfig(type, id) {
    if (type === 'ai_studio') {
        await applyProviderSelection('ai_studio', { persist: true });
        await toggleApiKey(id);
    } else {
        await applyProviderSelection('vertex_ai', { persist: true });
        await activateVertexAccount(id);
    }
    renderConfigurationList();
}

// Delete a configuration
async function deleteConfig(type, id, name) {
    const t = getSettingsTranslations();
    const confirmMessage = t['settings.advanced.delete_config_confirm'] || `確定要刪除配置 "${name}" 嗎？`;
    
    showCustomConfirm(confirmMessage, async (confirmed) => {
        if (!confirmed) return;
        
        try {
            let response;
            if (type === 'ai_studio') {
                response = await fetch(`/api/keys/${id}`, {
                    method: 'DELETE',
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('access_token')}`
                    }
                });
            } else {
                response = await fetch(`/api/vertex/accounts/${id}`, {
                    method: 'DELETE',
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('access_token')}`
                    }
                });
            }
            
            if (response.ok) {
                // Reload data
                await loadApiKeys();
                await loadVertexAccounts();
                renderConfigurationList();
                
                const successMessage = t['settings.advanced.delete_config_success'] || '配置已刪除';
                showCustomAlert(successMessage);
            } else {
                const error = await response.json();
                showCustomAlert(error.error || (t['settings.advanced.delete_config_failed'] || '刪除失敗'));
            }
        } catch (error) {
            console.error('Error deleting configuration:', error);
            showCustomAlert(t['settings.advanced.delete_config_failed'] || '刪除失敗');
        }
    });
}

// Make functions global
window.activateConfig = activateConfig;
window.deleteConfig = deleteConfig;

// Open add configuration modal
if (openAddConfigModalBtn) {
    openAddConfigModalBtn.addEventListener('click', () => {
        if (addConfigModal) {
            addConfigModal.style.display = 'block';
            // Reset to AI Studio tab
            switchConfigTab('ai_studio');
            resetAddConfigForm();
            // Update language
            const lang = getSettingsLang();
            updateSettingsLanguage(lang);
        }
    });
}

// Cancel add configuration
if (cancelConfigBtn) {
    cancelConfigBtn.addEventListener('click', () => {
        if (addConfigModal) {
            addConfigModal.style.display = 'none';
            resetAddConfigForm();
        }
    });
}

// Close modal on outside click
window.addEventListener('click', (event) => {
    if (event.target === addConfigModal) {
        addConfigModal.style.display = 'none';
        resetAddConfigForm();
    }
});

// Switch between AI Studio and Vertex AI tabs
function switchConfigTab(provider) {
    const tabs = document.querySelectorAll('.config-tab-btn');
    const aiStudioForm = document.getElementById('aiStudioConfigForm');
    const vertexAiForm = document.getElementById('vertexAiConfigForm');
    
    tabs.forEach(tab => {
        const tabProvider = tab.dataset.configProvider;
        if (tabProvider === provider) {
            tab.classList.add('active');
            tab.style.borderBottom = '3px solid #8B7AA8';
            tab.style.color = '#8B7AA8';
            tab.style.fontWeight = '600';
        } else {
            tab.classList.remove('active');
            tab.style.borderBottom = '3px solid transparent';
            tab.style.color = '#666';
            tab.style.fontWeight = '500';
        }
    });
    
    if (aiStudioForm && vertexAiForm) {
        if (provider === 'ai_studio') {
            aiStudioForm.style.display = 'block';
            vertexAiForm.style.display = 'none';
        } else {
            aiStudioForm.style.display = 'none';
            vertexAiForm.style.display = 'block';
        }
    }
}

// Tab click handlers
document.querySelectorAll('.config-tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        const provider = btn.dataset.configProvider;
        switchConfigTab(provider);
    });
});

// Vertex AI file upload for config modal
const configVertexUploadBtn = document.getElementById('configVertexUploadBtn');
const configVertexClearBtn = document.getElementById('configVertexClearBtn');
const configVertexServiceAccountFile = document.getElementById('configVertexServiceAccountFile');
const configVertexServiceAccount = document.getElementById('configVertexServiceAccount');
const configVertexProjectIdDisplay = document.getElementById('configVertexProjectIdDisplay');
const configDetectedProjectId = document.getElementById('configDetectedProjectId');

if (configVertexUploadBtn && configVertexServiceAccountFile) {
    configVertexUploadBtn.addEventListener('click', () => {
        configVertexServiceAccountFile.click();
    });
    
    configVertexServiceAccountFile.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                try {
                    const json = JSON.parse(event.target.result);
                    configVertexServiceAccount.value = event.target.result;
                    
                    if (json.project_id && configDetectedProjectId && configVertexProjectIdDisplay) {
                        configDetectedProjectId.textContent = json.project_id;
                        configVertexProjectIdDisplay.style.display = 'block';
                    }
                    
                    if (configVertexClearBtn) {
                        configVertexClearBtn.style.display = 'block';
                    }
                } catch (error) {
                    const t = getSettingsTranslations();
                    showCustomAlert(t['settings.advanced.vertex.invalid_json'] || '無效的 JSON 檔案');
                    configVertexServiceAccount.value = '';
                }
            };
            reader.readAsText(file);
        }
    });
}

if (configVertexClearBtn) {
    configVertexClearBtn.addEventListener('click', () => {
        configVertexServiceAccount.value = '';
        configVertexServiceAccountFile.value = '';
        if (configVertexProjectIdDisplay) {
            configVertexProjectIdDisplay.style.display = 'none';
        }
        configVertexClearBtn.style.display = 'none';
    });
}

// Save configuration
if (saveConfigBtn) {
    saveConfigBtn.addEventListener('click', async () => {
        const activeTab = document.querySelector('.config-tab-btn.active');
        const provider = activeTab ? activeTab.dataset.configProvider : 'ai_studio';
        
        if (provider === 'ai_studio') {
            await saveAiStudioConfig();
        } else {
            await saveVertexAiConfig();
        }
    });
}

// Save AI Studio configuration
async function saveAiStudioConfig() {
    const nameInput = document.getElementById('configAiStudioName');
    const keyInput = document.getElementById('configAiStudioKey');
    const t = getSettingsTranslations();
    
    const name = nameInput.value.trim();
    const apiKey = keyInput.value.trim();
    
    if (!name || !apiKey) {
        showCustomAlert(t['settings.advanced.fill_all_fields'] || '請填寫所有必填欄位');
        return;
    }
    
    try {
        const response = await fetch('/api/keys', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('access_token')}`
            },
            body: JSON.stringify({
                name: name,
                api_key: apiKey,
                provider: 'ai_studio'
            })
        });
        
        if (response.ok) {
            addConfigModal.style.display = 'none';
            resetAddConfigForm();
            await loadApiKeys();
            renderConfigurationList();
            showCustomAlert(t['settings.advanced.config_added'] || '配置已添加');
        } else {
            const error = await response.json();
            showCustomAlert(error.error || (t['settings.advanced.config_add_failed'] || '添加配置失敗'));
        }
    } catch (error) {
        console.error('Error adding AI Studio config:', error);
        showCustomAlert(t['settings.advanced.config_add_failed'] || '添加配置失敗');
    }
}

// Save Vertex AI configuration
async function saveVertexAiConfig() {
    const nameInput = document.getElementById('configVertexName');
    const locationInput = document.getElementById('configVertexLocation');
    const serviceAccountInput = document.getElementById('configVertexServiceAccount');
    const t = getSettingsTranslations();
    
    const name = nameInput.value.trim();
    const location = locationInput.value;
    const serviceAccount = serviceAccountInput.value.trim();
    
    if (!name || !serviceAccount) {
        showCustomAlert(t['settings.advanced.fill_all_fields'] || '請填寫所有必填欄位');
        return;
    }
    
    try {
        // Validate JSON
        JSON.parse(serviceAccount);
        
        const response = await fetch('/api/vertex/accounts', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('access_token')}`
            },
            body: JSON.stringify({
                name: name,
                location: location,
                service_account_json: serviceAccount
            })
        });
        
        if (response.ok) {
            addConfigModal.style.display = 'none';
            resetAddConfigForm();
            await loadVertexAccounts();
            renderConfigurationList();
            showCustomAlert(t['settings.advanced.config_added'] || '配置已添加');
        } else {
            const error = await response.json();
            showCustomAlert(error.error || (t['settings.advanced.config_add_failed'] || '添加配置失敗'));
        }
    } catch (error) {
        if (error instanceof SyntaxError) {
            showCustomAlert(t['settings.advanced.vertex.invalid_json'] || '無效的 JSON 檔案');
        } else {
            console.error('Error adding Vertex AI config:', error);
            showCustomAlert(t['settings.advanced.config_add_failed'] || '添加配置失敗');
        }
    }
}

// Reset add configuration form
function resetAddConfigForm() {
    // AI Studio fields
    const aiStudioName = document.getElementById('configAiStudioName');
    const aiStudioKey = document.getElementById('configAiStudioKey');
    if (aiStudioName) aiStudioName.value = '';
    if (aiStudioKey) aiStudioKey.value = '';
    
    // Vertex AI fields
    const vertexName = document.getElementById('configVertexName');
    const vertexLocation = document.getElementById('configVertexLocation');
    if (vertexName) vertexName.value = '';
    if (vertexLocation) vertexLocation.selectedIndex = 0;
    
    if (configVertexServiceAccount) configVertexServiceAccount.value = '';
    if (configVertexServiceAccountFile) configVertexServiceAccountFile.value = '';
    if (configVertexProjectIdDisplay) configVertexProjectIdDisplay.style.display = 'none';
    if (configVertexClearBtn) configVertexClearBtn.style.display = 'none';
}

// ===== AI Model Management =====

// Update model dropdown based on provider
function updateModelOptions(provider) {
    updateSummaryModelOptions(provider);
    updateAuthModeVisibility();
}

if (providerCardsContainer && providerInput) {
    const cards = providerCardsContainer.querySelectorAll('.provider-card');
    
    cards.forEach(card => {
        card.addEventListener('click', async () => {
            const selectedProvider = card.dataset.value;
            await applyProviderSelection(selectedProvider, { persist: true });
        });
    });
}

// Load user's selected AI model and provider
async function loadUserModel() {
    try {
        const response = await fetch('/api/user/model', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('access_token')}`
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            const providerSelect = document.getElementById('aiProviderSelect');
            
            // Set provider
            const activeProvider = (data.ai_provider && ['ai_studio', 'vertex_ai'].includes(data.ai_provider)) ? data.ai_provider : 'ai_studio';
            
            if (providerSelect) {
                providerSelect.value = activeProvider;
            }
            
            updateModelOptions(activeProvider);
            updateSummaryModelOptions(activeProvider);
            updateSummaryProviderButtons(activeProvider);
            
            // Update cards visual state
            const cards = document.querySelectorAll('.provider-card');
            cards.forEach(c => {
                if (c.dataset.value === activeProvider) {
                    c.classList.add('active');
                } else {
                    c.classList.remove('active');
                }
            });
            
            if (summaryModelSelect) {
                summaryModelSelect.value = data.ai_model || summaryModelSelect.value;
            }

            advancedConfigState.provider = activeProvider;
            advancedConfigState.model = data.ai_model || (summaryModelSelect ? summaryModelSelect.value : null);
            advancedConfigState.selectedVertexAccountId = data.selected_vertex_account_id || null;
            advancedConfigState.vertexProjectId = data.vertex_account ? data.vertex_account.project_id : null;
            advancedConfigState.vertexLocation = data.vertex_account ? data.vertex_account.location : null;
            updateAuthModeVisibility();
            updateAdvancedSummary();
            
            // Load Vertex configuration if applicable
            if (data.ai_provider === 'vertex_ai') {
                const locationSelect = document.getElementById('vertexLocation');
                if (locationSelect && data.vertex_account && data.vertex_account.location) {
                    locationSelect.value = data.vertex_account.location;
                }
            }

            updateSummaryApiKeyOptions(advancedConfigState.apiKeys, advancedConfigState.selectedApiKeyId);
            if (typeof renderApiKeys === 'function') {
                renderApiKeys(advancedConfigState.apiKeys, advancedConfigState.selectedApiKeyId);
            }
        } else {
            console.error('Failed to load user model');
        }
    } catch (error) {
        console.error('Error loading user model:', error);
    }
}

// Save user's selected AI model handled by summaryModelSelect

// Handle Vertex service account file upload
const vertexUploadFileBtn = document.getElementById('vertexUploadFileBtn');
const vertexServiceAccountFile = document.getElementById('vertexServiceAccountFile');
const vertexServiceAccount = document.getElementById('vertexServiceAccount');
const vertexClearFileBtn = document.getElementById('vertexClearFileBtn');

if (vertexUploadFileBtn && vertexServiceAccountFile) {
    vertexUploadFileBtn.addEventListener('click', () => {
        vertexServiceAccountFile.click();
    });
    
    vertexServiceAccountFile.addEventListener('change', async (event) => {
        const file = event.target.files[0];
        if (file) {
            if (!file.name.endsWith('.json')) {
                const currentLang = typeof currentLanguage !== 'undefined' ? currentLanguage : 'zh-TW';
                const supportedLangs = settingsSupportedLanguages;
                const langToUse = supportedLangs.includes(currentLang) ? currentLang : 'en';
                const messages = {
                    'zh-TW': '請選擇 JSON 檔案',
                    'en': 'Please select a JSON file',
                    'ja': 'JSONファイルを選択してください'
                };
                showCustomAlert(messages[langToUse] || messages['en']);
                return;
            }
            
            try {
                const reader = new FileReader();
                reader.onload = (e) => {
                    const content = e.target.result;
                    // Validate JSON and extract project_id
                    try {
                        const serviceAccountData = JSON.parse(content);
                        
                        // Extract project_id
                        const projectId = serviceAccountData.project_id;
                        if (!projectId) {
                            const currentLang = typeof currentLanguage !== 'undefined' ? currentLanguage : 'zh-TW';
                            const supportedLangs = settingsSupportedLanguages;
                            const langToUse = supportedLangs.includes(currentLang) ? currentLang : 'en';
                            const messages = {
                                'zh-TW': '服務帳戶 JSON 檔案缺少 project_id 欄位',
                                'en': 'Service account JSON missing project_id field',
                                'ja': 'サービスアカウントJSONにproject_idフィールドがありません'
                            };
                            showCustomAlert(messages[langToUse] || messages['en']);
                            return;
                        }
                        
                        // Validate required fields
                        if (!serviceAccountData.private_key || !serviceAccountData.client_email) {
                            const currentLang = typeof currentLanguage !== 'undefined' ? currentLanguage : 'zh-TW';
                            const supportedLangs = settingsSupportedLanguages;
                            const langToUse = supportedLangs.includes(currentLang) ? currentLang : 'en';
                            const messages = {
                                'zh-TW': '服務帳戶 JSON 檔案缺少必要欄位',
                                'en': 'Service account JSON missing required fields',
                                'ja': 'サービスアカウントJSONに必要なフィールドがありません'
                            };
                            showCustomAlert(messages[langToUse] || messages['en']);
                            return;
                        }
                        
                        vertexServiceAccount.value = content;
                        
                        // Display the detected project ID
                        const projectIdDisplay = document.getElementById('vertexProjectIdDisplay');
                        const detectedProjectIdSpan = document.getElementById('detectedProjectId');
                        if (projectIdDisplay && detectedProjectIdSpan) {
                            detectedProjectIdSpan.textContent = projectId;
                            projectIdDisplay.style.display = 'block';
                        }
                        
                        if (vertexClearFileBtn) {
                            vertexClearFileBtn.style.display = 'block';
                        }
                        // Update button text to show file loaded
                        vertexUploadFileBtn.innerHTML = '<i class="fas fa-check-circle"></i> <span>' + file.name + '</span>';
                        vertexUploadFileBtn.style.backgroundColor = '#4caf50';
                    } catch (err) {
                        console.error('JSON parse error:', err);
                        const currentLang = typeof currentLanguage !== 'undefined' ? currentLanguage : 'zh-TW';
                        const supportedLangs = settingsSupportedLanguages;
                        const langToUse = supportedLangs.includes(currentLang) ? currentLang : 'en';
                        const messages = {
                            'zh-TW': 'JSON 檔案格式無效',
                            'en': 'Invalid JSON file format',
                            'ja': 'JSONファイルの形式が無効です'
                        };
                        showCustomAlert(messages[langToUse] || messages['en']);
                    }
                };
                reader.readAsText(file);
            } catch (error) {
                console.error('Error reading file:', error);
            }
        }
    });
}

if (vertexClearFileBtn && vertexServiceAccount && vertexUploadFileBtn) {
    vertexClearFileBtn.addEventListener('click', () => {
        vertexServiceAccount.value = '';
        vertexServiceAccountFile.value = '';
        vertexClearFileBtn.style.display = 'none';
        
        // Hide project ID display
        const projectIdDisplay = document.getElementById('vertexProjectIdDisplay');
        if (projectIdDisplay) {
            projectIdDisplay.style.display = 'none';
        }
        
        vertexUploadFileBtn.innerHTML = '<i class="fas fa-upload"></i> <span data-i18n="settings.advanced.vertex.upload">上傳檔案</span>';
        vertexUploadFileBtn.style.backgroundColor = '';
    });
}

// Save Vertex AI configuration
const saveVertexConfigBtn = document.getElementById('saveVertexConfigBtn');
if (saveVertexConfigBtn) {
    saveVertexConfigBtn.addEventListener('click', async () => {
        const name = document.getElementById('vertexAccountName')?.value.trim();
        const location = document.getElementById('vertexLocation').value;
        const serviceAccount = document.getElementById('vertexServiceAccount').value.trim();
        
        const currentLang = typeof currentLanguage !== 'undefined' ? currentLanguage : 'zh-TW';
        const supportedLangs = settingsSupportedLanguages;
        const langToUse = supportedLangs.includes(currentLang) ? currentLang : 'en';
        
        // Validation
        if (!name) {
            const messages = {
                'zh-TW': '請輸入配置名稱',
                'en': 'Please enter configuration name',
                'ja': '設定名を入力してください'
            };
            showCustomAlert(messages[langToUse] || messages['en']);
            return;
        }
        
        if (!serviceAccount) {
            const messages = {
                'zh-TW': '請上傳服務帳戶 JSON 檔案',
                'en': 'Please upload service account JSON file',
                'ja': 'サービスアカウントJSONファイルをアップロードしてください'
            };
            showCustomAlert(messages[langToUse] || messages['en']);
            return;
        }
        
        // Validate JSON format and extract project_id
        let projectId;
        try {
            const serviceAccountData = JSON.parse(serviceAccount);
            projectId = serviceAccountData.project_id;
            
            if (!projectId) {
                const messages = {
                    'zh-TW': '服務帳戶 JSON 缺少 project_id',
                    'en': 'Service account JSON missing project_id',
                    'ja': 'サービスアカウントJSONにproject_idがありません'
                };
                showCustomAlert(messages[langToUse] || messages['en']);
                return;
            }
        } catch (e) {
            const messages = {
                'zh-TW': '服務帳戶 JSON 格式無效',
                'en': 'Invalid service account JSON format',
                'ja': 'サービスアカウントJSONの形式が無効です'
            };
            showCustomAlert(messages[langToUse] || messages['en']);
            return;
        }
        
        try {
            const response = await fetch('/api/vertex/accounts', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('access_token')}`
                },
                body: JSON.stringify({
                    name: name,
                    location: location,
                    service_account_json: serviceAccount
                })
            });
            
            if (response.ok) {
                const successMessages = {
                    'zh-TW': 'Vertex AI 配置已保存',
                    'en': 'Vertex AI configuration saved',
                    'ja': 'Vertex AI設定を保存しました'
                };
                showCustomAlert(successMessages[langToUse] || successMessages['en']);

                advancedConfigState.vertexProjectId = projectId;
                advancedConfigState.vertexLocation = location;
                updateAdvancedSummary();
                loadVertexAccounts();
                
                // Clear the form for security
                document.getElementById('vertexAccountName').value = '';
                document.getElementById('vertexServiceAccount').value = '';
                const projectIdDisplay = document.getElementById('vertexProjectIdDisplay');
                if (projectIdDisplay) {
                    projectIdDisplay.style.display = 'none';
                }
                if (vertexServiceAccountFile) {
                    vertexServiceAccountFile.value = '';
                }
                if (vertexClearFileBtn) {
                    vertexClearFileBtn.style.display = 'none';
                }
                if (vertexUploadFileBtn) {
                    vertexUploadFileBtn.innerHTML = '<i class="fas fa-upload"></i> <span data-i18n="settings.advanced.vertex.upload">上傳檔案</span>';
                    vertexUploadFileBtn.style.backgroundColor = '';
                }
            } else {
                const error = await response.json();
                const errorMessages = {
                    'zh-TW': '保存失敗',
                    'en': 'Save failed',
                    'ja': '保存に失敗しました'
                };
                showCustomAlert(error.error || errorMessages[langToUse] || errorMessages['en']);
            }
        } catch (error) {
            console.error('Error saving Vertex configuration:', error);
            const errorMessages = {
                'zh-TW': '保存失敗',
                'en': 'Save failed',
                'ja': '保存に失敗しました'
            };
            showCustomAlert(errorMessages[langToUse] || errorMessages['en']);
        }
    });
}

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
            if (profile.language) {
                if (typeof currentLanguage !== 'undefined') {
                    currentLanguage = profile.language;
                } else {
                    window.currentLanguage = profile.language;
                }
                if (typeof updateUILanguage === 'function') {
                    updateUILanguage(profile.language);
                }
                updateSettingsLanguage(profile.language);
                
                // Always update language selector UI to reflect server state
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
    
    // Clear previous content except empty state
    const existingCards = childrenList.querySelectorAll('.child-card');
    existingCards.forEach(card => card.remove());
    
    if (children.length === 0) {
        childrenEmpty.style.display = 'block';
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

// Child Modal Elements
const childModal = document.getElementById('childModal');
const childModalTitle = document.getElementById('childModalTitle');
const childModalName = document.getElementById('childModalName');
const childModalBirthdate = document.getElementById('childModalBirthdate');
const childModalGender = document.getElementById('childModalGender');
const childModalNotes = document.getElementById('childModalNotes');
const saveChildModalBtn = document.getElementById('saveChildModalBtn');
const cancelChildModalBtn = document.getElementById('cancelChildModalBtn');

// Show add child modal
document.getElementById('addChildBtn').addEventListener('click', () => {
    showChildModal();
});

// Show child modal (add or edit mode)
function showChildModal(child = null) {
    const currentLang = typeof currentLanguage !== 'undefined' ? currentLanguage : 'zh-TW';
    const t = window.translations && window.translations[currentLang] ? window.translations[currentLang] : {};
    
    if (child) {
        // Edit mode
        editingChildId = child.id;
        childModalTitle.textContent = t['settings.children.form.edit'] || '編輯小朋友';
        childModalName.value = child.name;
        childModalBirthdate.value = child.birthdate;
        childModalGender.value = child.gender || '';
        childModalNotes.value = child.notes || '';
    } else {
        // Add mode
        editingChildId = null;
        childModalTitle.textContent = t['settings.children.form.add'] || '添加小朋友';
        childModalName.value = '';
        childModalBirthdate.value = '';
        childModalGender.value = '';
        childModalNotes.value = '';
    }
    
    childModal.style.display = 'block';
    childModalName.focus();
}

// Close child modal
function hideChildModal() {
    childModal.style.display = 'none';
    editingChildId = null;
}

if (cancelChildModalBtn) {
    cancelChildModalBtn.addEventListener('click', () => {
        hideChildModal();
    });
}

// Close modal when clicking outside
if (childModal) {
    window.addEventListener('click', (event) => {
        if (event.target === childModal) {
            hideChildModal();
        }
    });
}

// Click on date input to open date picker
if (childModalBirthdate) {
    childModalBirthdate.addEventListener('click', () => {
        childModalBirthdate.showPicker();
    });
    
    // Also open on focus for better accessibility
    childModalBirthdate.addEventListener('focus', () => {
        childModalBirthdate.showPicker();
    });
}

// Save child (create or update)
if (saveChildModalBtn) {
    saveChildModalBtn.addEventListener('click', async () => {
        const name = childModalName.value.trim();
        const birthdate = childModalBirthdate.value;
        const genderValue = childModalGender.value;
        const notesValue = childModalNotes.value.trim();
        
        // Convert empty strings to null
        const gender = genderValue || null;
        const notes = notesValue || null;
        
        if (!name || !birthdate) {
            showCustomAlert(window.translations && window.translations[currentLanguage] ? 
                window.translations[currentLanguage]['settings.children.form.required'] || '請填寫姓名和出生日期' : 
                '請填寫姓名和出生日期');
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
                hideChildModal();
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
}

// Edit child - fetch and show modal
async function editChild(childId) {
    try {
        const response = await fetch(`/api/children/${childId}`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('access_token')}`
            }
        });
        
        if (response.ok) {
            const child = await response.json();
            showChildModal(child);
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
window.showChildModal = showChildModal;
window.hideChildModal = hideChildModal;
