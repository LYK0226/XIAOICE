// Sidebar functionality for chatbox
// This module handles all sidebar-related features including conversation list management

const conversationList = document.querySelector('.chat-list');

// Conversation management state
let conversationsCache = [];
let isLoadingConversation = false;

// Function to sort conversations (pinned first, then by date)
function sortConversations(conversations = []) {
    const clone = Array.isArray(conversations) ? [...conversations] : [];
    return clone.sort((a, b) => {
        const aPinned = a?.is_pinned ? 1 : 0;
        const bPinned = b?.is_pinned ? 1 : 0;
        if (aPinned !== bPinned) {
            return bPinned - aPinned;
        }

        const aTime = new Date(a?.updated_at || a?.created_at || 0).getTime() || 0;
        const bTime = new Date(b?.updated_at || b?.created_at || 0).getTime() || 0;
        return bTime - aTime;
    });
}

// Function to close all open conversation menus
function closeAllConversationMenus() {
    const openItems = document.querySelectorAll('.conversation-item.menu-open');
    openItems.forEach((item) => item.classList.remove('menu-open'));
}

// Function to render the conversation list
function renderConversationList(conversations = []) {
    if (!conversationList) {
        return;
    }

    const t = translations[currentLanguage];
    const sorted = sortConversations(conversations);
    conversationList.innerHTML = '';

    if (!sorted.length) {
        const emptyState = document.createElement('li');
        emptyState.className = 'empty-state';
        emptyState.textContent = t.noConversations;
        conversationList.appendChild(emptyState);
        return;
    }

    const createConversationActionButton = (iconClass, label, handler) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'conversation-action';
        button.title = label;
        button.innerHTML = `<i class="${iconClass}"></i><span>${label}</span>`;
        button.addEventListener('click', async (event) => {
            event.stopPropagation();
            closeAllConversationMenus();
            try {
                await handler(event);
            } catch (error) {
                console.error('Conversation action failed', error);
            }
        });
        return button;
    };

    sorted.forEach((conversation) => {
        const item = document.createElement('li');
        item.classList.add('conversation-item');
        item.dataset.conversationId = conversation.id;

        if (conversation.is_pinned) {
            item.classList.add('pinned');
        }

        if (Number(conversation.id) === Number(activeConversationId)) {
            item.classList.add('active');
        }

        const icon = document.createElement('i');
        icon.className = conversation.is_pinned ? 'fas fa-thumbtack' : 'fas fa-comments';
        item.appendChild(icon);

        const textWrapper = document.createElement('div');
        textWrapper.className = 'conversation-text';

        const title = document.createElement('span');
        title.className = 'conversation-title';
        const titleText = (conversation.title || '').trim() || t.untitledConversation;
        title.textContent = titleText;
        textWrapper.appendChild(title);

        item.appendChild(textWrapper);

        const menuToggle = document.createElement('button');
        menuToggle.type = 'button';
        menuToggle.className = 'conversation-menu-toggle';
        menuToggle.innerHTML = '<i class="fas fa-ellipsis-h"></i>';
        menuToggle.addEventListener('click', (event) => {
            event.stopPropagation();
            const isOpen = item.classList.contains('menu-open');
            closeAllConversationMenus();
            if (!isOpen) {
                item.classList.add('menu-open');
            }
        });

        const dropdown = document.createElement('div');
        dropdown.className = 'conversation-dropdown';
        dropdown.addEventListener('click', (event) => event.stopPropagation());

        const renameButton = createConversationActionButton('fas fa-pen', t.renameAction, () => renameConversation(conversation.id));
        const pinButton = createConversationActionButton(
            'fas fa-thumbtack',
            conversation.is_pinned ? t.unpinAction : t.pinAction,
            () => togglePinConversation(conversation.id)
        );
        pinButton.classList.toggle('active', Boolean(conversation.is_pinned));

        const deleteButton = createConversationActionButton('fas fa-trash', t.deleteAction, () => deleteConversationById(conversation.id));

        dropdown.appendChild(renameButton);
        dropdown.appendChild(pinButton);
        dropdown.appendChild(deleteButton);

        item.appendChild(menuToggle);
        item.appendChild(dropdown);

        item.addEventListener('click', () => {
            closeAllConversationMenus();
            openConversation(conversation.id);
        });

        conversationList.appendChild(item);
    });
}

// Function to update or insert a conversation in the cache
function upsertConversation(conversation) {
    if (!conversation) {
        return;
    }

    const existingIndex = conversationsCache.findIndex((item) => Number(item.id) === Number(conversation.id));
    if (existingIndex >= 0) {
        conversationsCache[existingIndex] = conversation;
    } else {
        conversationsCache.push(conversation);
    }

    conversationsCache = sortConversations(conversationsCache);
    renderConversationList(conversationsCache);
}

// Function to load all conversations
async function loadConversations() {
    try {
        const data = await chatAPI.fetchConversations();
        conversationsCache = sortConversations(data.conversations || []);
        renderConversationList(conversationsCache);

        if (conversationsCache.length && !activeConversationId) {
            await openConversation(conversationsCache[0].id, { force: true });
        }
    } catch (error) {
        console.error('Failed to load conversations', error);
    }
}

// Function to open a conversation
async function openConversation(conversationId, options = {}) {
    const force = options.force || false;

    if (!conversationId || isLoadingConversation) {
        return;
    }

    if (!force && Number(activeConversationId) === Number(conversationId)) {
        return;
    }

    isLoadingConversation = true;
    activeConversationId = conversationId;
    renderConversationList(conversationsCache);

    try {
        const data = await chatAPI.fetchConversationMessages(conversationId);
        const messages = data.messages || [];

        messagesDiv.innerHTML = '';
        conversationHistory = [];

        if (!messages.length) {
            renderWelcomeMessage();
            return;
        }

        messages.forEach((message) => {
            const isUser = message.sender === 'user';
            let element;
            if (message.uploaded_files && message.uploaded_files.length > 0) {
                element = createMessageWithUploadedFiles(message.content, message.uploaded_files, isUser);
            } else {
                element = createMessage(message.content, isUser);
            }
            messagesDiv.appendChild(element);
            conversationHistory.push({
                role: isUser ? 'user' : 'bot',
                content: message.content,
                time: message.created_at ? new Date(message.created_at).getTime() : Date.now()
            });
        });

        messagesDiv.scrollTop = messagesDiv.scrollHeight;
    } catch (error) {
        console.error('Failed to load conversation messages', error);
        alert(translations[currentLanguage].conversationLoadError);
    } finally {
        isLoadingConversation = false;
    }
}

// Function to rename a conversation
async function renameConversation(conversationId) {
    const t = translations[currentLanguage];
    const conversation = conversationsCache.find((item) => Number(item.id) === Number(conversationId));
    const currentTitle = conversation?.title || '';

    const result = prompt(t.renamePrompt, currentTitle);
    if (result === null) {
        return;
    }

    const newTitle = result.trim();
    if (!newTitle || newTitle === currentTitle) {
        return;
    }

    try {
        const response = await chatAPI.updateConversation(conversationId, { title: newTitle });
        if (response?.conversation) {
            upsertConversation(response.conversation);
        }
    } catch (error) {
        console.error('Failed to rename conversation', error);
        alert(t.renameError);
    }
}

// Function to toggle pin status of a conversation
async function togglePinConversation(conversationId) {
    const t = translations[currentLanguage];
    const conversation = conversationsCache.find((item) => Number(item.id) === Number(conversationId));
    if (!conversation) {
        return;
    }

    const desiredState = !conversation.is_pinned;

    try {
        const response = await chatAPI.updateConversation(conversationId, { is_pinned: desiredState });
        if (response?.conversation) {
            upsertConversation(response.conversation);
        }
    } catch (error) {
        console.error('Failed to toggle pin', error);
        alert(t.pinError);
    }
}

// Function to delete a conversation
async function deleteConversationById(conversationId) {
    const t = translations[currentLanguage];

    if (!confirm(t.deleteConfirm)) {
        return;
    }

    try {
        await chatAPI.deleteConversation(conversationId);
        const wasActive = Number(activeConversationId) === Number(conversationId);

        conversationsCache = conversationsCache.filter((item) => Number(item.id) !== Number(conversationId));
        conversationsCache = sortConversations(conversationsCache);
        renderConversationList(conversationsCache);

        if (!conversationsCache.length) {
            activeConversationId = null;
            conversationHistory = [];
            renderWelcomeMessage();
            return;
        }

        if (wasActive) {
            activeConversationId = null;
            const nextConversation = conversationsCache[0];
            if (nextConversation) {
                await openConversation(nextConversation.id, { force: true });
            }
        }
    } catch (error) {
        console.error('Failed to delete conversation', error);
        alert(t.deleteError);
    }
}

// Close conversation menus when clicking outside
document.addEventListener('click', (event) => {
    if (!event.target.closest('.conversation-item')) {
        closeAllConversationMenus();
    }
});

// Sidebar state tracking
let sidebarManuallyClosed = false;
let sidebarManuallyOpened = false;

// Sidebar button functionality
const newChatBtn = document.getElementById('newChat');
if (newChatBtn) {
    newChatBtn.addEventListener('click', () => {
        closeAllConversationMenus();
        activeConversationId = null;
        conversationHistory = [];
        renderWelcomeMessage();
        renderConversationList(conversationsCache);
    });
}

const sidebarToggle = document.getElementById('sidebarToggle');
const sidebarShowBtn = document.getElementById('sidebarShowBtn');
if (sidebarToggle) {
    sidebarToggle.addEventListener('click', () => {
        const sidebar = document.getElementById('sidebar');
        const wasHidden = sidebar.classList.contains('hidden');
        sidebar.classList.toggle('hidden');
        
        if (sidebar.classList.contains('hidden')) {
            // User manually closed the sidebar
            sidebarManuallyClosed = true;
            sidebarManuallyOpened = false;
        } else {
            // User manually opened the sidebar
            sidebarManuallyOpened = true;
            sidebarManuallyClosed = false;
        }
        
        if (sidebarShowBtn) {
            sidebarShowBtn.style.display = sidebar.classList.contains('hidden') ? 'flex' : 'none';
        }
    });
}

if (sidebarShowBtn) {
    sidebarShowBtn.addEventListener('click', () => {
        const sidebar = document.getElementById('sidebar');
        sidebar.classList.remove('hidden');
        sidebarShowBtn.style.display = 'none';
        
        // User manually opened the sidebar
        sidebarManuallyOpened = true;
        sidebarManuallyClosed = false;
    });
}

// Track previous screen size state
let previousScreenWasSmall = null;

// Function to handle responsive sidebar behavior
function handleResponsiveSidebar() {
    const sidebar = document.getElementById('sidebar');
    const sidebarShowBtn = document.getElementById('sidebarShowBtn');
    const isSmallScreen = window.innerWidth <= 1024;
    
    // Detect transition between screen sizes
    const transitionedToSmall = previousScreenWasSmall === false && isSmallScreen === true;
    const transitionedToLarge = previousScreenWasSmall === true && isSmallScreen === false;
    
    if (isSmallScreen) {
        // On smaller screens
        // If user manually closed it, keep it closed
        if (sidebarManuallyClosed) {
            sidebar.classList.add('hidden');
            if (sidebarShowBtn) {
                sidebarShowBtn.style.display = 'flex';
            }
        } else if (!sidebarManuallyOpened || transitionedToSmall) {
            // Auto-hide if not manually opened, or if just transitioned to small screen
            sidebar.classList.add('hidden');
            if (sidebarShowBtn) {
                sidebarShowBtn.style.display = 'flex';
            }
        }
    } else {
        // On larger screens
        // If user manually closed it, keep it closed
        if (sidebarManuallyClosed) {
            sidebar.classList.add('hidden');
            if (sidebarShowBtn) {
                sidebarShowBtn.style.display = 'flex';
            }
        } else if (!sidebarManuallyOpened || transitionedToLarge) {
            // Auto-show if not manually opened/closed, or if just transitioned to large screen
            sidebar.classList.remove('hidden');
            if (sidebarShowBtn) {
                sidebarShowBtn.style.display = 'none';
            }
        }
    }
    
    // Update previous screen state
    previousScreenWasSmall = isSmallScreen;
}

// Initialize responsive behavior on page load
window.addEventListener('DOMContentLoaded', () => {
    loadConversations();
    // Initialize manual state flags based on current visibility
    const sidebar = document.getElementById('sidebar');
    const isSmallScreen = window.innerWidth <= 1024;
    
    if (isSmallScreen && sidebar.classList.contains('hidden')) {
        // Starts hidden on small screen - auto-hidden, not manually closed
        sidebarManuallyClosed = false;
        sidebarManuallyOpened = false;
    } else if (!isSmallScreen && !sidebar.classList.contains('hidden')) {
        // Starts visible on large screen - auto-visible, not manually opened
        sidebarManuallyClosed = false;
        sidebarManuallyOpened = false;
    }
    
    handleResponsiveSidebar(); // Check initial screen size
});

// Handle window resize
window.addEventListener('resize', handleResponsiveSidebar);
