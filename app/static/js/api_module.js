/**
 * API Module - 處理所有與後端的交互
 * 將 API 調用邏輯與 UI 邏輯分離
 */

class ChatAPI {
    constructor() {
        this.baseURL = '';  // 使用相對路徑
        this.endpoints = {
            chat: '/chat',
            conversations: '/conversations',
            messages: '/messages'
        };
    }

    _getAuthHeaders(contentType = null) {
        const headers = {};
        const accessToken = localStorage.getItem('access_token');
        if (accessToken) {
            headers['Authorization'] = `Bearer ${accessToken}`;
        }
        if (contentType) {
            headers['Content-Type'] = contentType;
        }
        return headers;
    }

    _handleAuthFailure(response) {
        if (response && (response.status === 401 || response.status === 422)) {
            localStorage.removeItem('access_token');
            localStorage.removeItem('refresh_token');
            if (typeof window !== 'undefined' && window.location && window.location.pathname !== '/login') {
                window.location.href = '/login';
            }
        }
    }

    /**
     * 調用後端聊天 API
     * @param {string} userMessage - 用戶輸入的文字訊息
     * @param {File} imageFile - 可選的圖片文件
     * @param {string} currentLanguage - 當前語言設置
     * @returns {Promise<string>} - AI 回應文字
     */
    async sendChatMessage(userMessage, imageFile = null, currentLanguage = 'zh-CN', history = null) {
        const formData = new FormData();
        formData.append('message', userMessage);
        
        if (imageFile) {
            formData.append('image', imageFile);
        }

        if (history) {
            // attach conversation history as JSON string
            formData.append('history', JSON.stringify(history));
        }

        // Get access token from localStorage
        const headers = this._getAuthHeaders();

        try {
            const response = await fetch(this.endpoints.chat, {
                method: 'POST',
                headers: headers,
                body: formData
            });

            this._handleAuthFailure(response);

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || `API Error: ${response.status}`);
            }

            const data = await response.json();
            return data.response;

        } catch (error) {
            console.error('Backend API Error:', error);
            
            // 返回對應語言的錯誤訊息
            const errorMessages = {
                'zh-CN': '抱歉，服務暫時無法使用。請稍後再試。',
                'zh-TW': '抱歉，服務暫時無法使用。請稍後再試。',
                'en': 'Sorry, the service is temporarily unavailable. Please try again later.'
            };
            
            throw new Error(errorMessages[currentLanguage] || errorMessages['zh-CN']);
        }
    }

    async fetchConversations() {
        const response = await fetch(this.endpoints.conversations, {
            method: 'GET',
            headers: this._getAuthHeaders()
        });

        this._handleAuthFailure(response);

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || `API Error: ${response.status}`);
        }

        return response.json();
    }

    async createConversation(title = null) {
        const payload = {};
        if (title && title.trim()) {
            payload.title = title.trim();
        }

        const response = await fetch(this.endpoints.conversations, {
            method: 'POST',
            headers: this._getAuthHeaders('application/json'),
            body: JSON.stringify(payload)
        });

        this._handleAuthFailure(response);

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || `API Error: ${response.status}`);
        }

        return response.json();
    }

    async addMessage(conversationId, content, sender, metadata = null, files = null) {
        if (files && files.length > 0) {
            // Use FormData for file uploads
            const formData = new FormData();
            formData.append('conversation_id', conversationId);
            formData.append('content', content);
            formData.append('sender', sender);
            
            if (metadata) {
                formData.append('metadata', JSON.stringify(metadata));
            }
            
            files.forEach((file) => {
                formData.append('files', file);
            });
            
            const headers = this._getAuthHeaders(); // Don't set Content-Type for FormData
            
            const response = await fetch(this.endpoints.messages, {
                method: 'POST',
                headers: headers,
                body: formData
            });
            
            this._handleAuthFailure(response);
            
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || `API Error: ${response.status}`);
            }
            
            return response.json();
        } else {
            // Use JSON for text-only messages
            const payload = {
                conversation_id: conversationId,
                content,
                sender
            };
            
            if (metadata) {
                payload.metadata = metadata;
            }
            
            const response = await fetch(this.endpoints.messages, {
                method: 'POST',
                headers: this._getAuthHeaders('application/json'),
                body: JSON.stringify(payload)
            });
            
            this._handleAuthFailure(response);
            
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || `API Error: ${response.status}`);
            }
            
            return response.json();
        }
    }

    async fetchConversationMessages(conversationId) {
        const response = await fetch(`${this.endpoints.conversations}/${conversationId}/messages`, {
            method: 'GET',
            headers: this._getAuthHeaders()
        });

        this._handleAuthFailure(response);

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || `API Error: ${response.status}`);
        }

        return response.json();
    }

    async updateConversation(conversationId, updates) {
        const response = await fetch(`${this.endpoints.conversations}/${conversationId}`, {
            method: 'PATCH',
            headers: this._getAuthHeaders('application/json'),
            body: JSON.stringify(updates)
        });

        this._handleAuthFailure(response);

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || `API Error: ${response.status}`);
        }

        return response.json();
    }

    async deleteConversation(conversationId) {
        const response = await fetch(`${this.endpoints.conversations}/${conversationId}`, {
            method: 'DELETE',
            headers: this._getAuthHeaders()
        });

        this._handleAuthFailure(response);

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || `API Error: ${response.status}`);
        }

        return response.json();
    }

    /**
     * 發送純文字訊息
     * @param {string} message - 文字訊息
     * @param {string} language - 語言設置
     * @returns {Promise<string>}
     */
    async sendTextMessage(message, language = 'zh-CN', history = null) {
        return this.sendChatMessage(message, null, language, history);
    }

    /**
     * 發送帶圖片的訊息
     * @param {string} message - 文字訊息
     * @param {File} imageFile - 圖片文件
     * @param {string} language - 語言設置
     * @returns {Promise<string>}
     */
    async sendImageMessage(message, imageFile, language = 'zh-CN', history = null) {
        return this.sendChatMessage(message, imageFile, language, history);
    }

    /**
     * 檢查 API 連接狀態
     * @returns {Promise<boolean>}
     */
    async checkConnection() {
        try {
            const response = await fetch('/login', {
                method: 'GET'
            });
            return response.ok;
        } catch (error) {
            console.error('Connection check failed:', error);
            return false;
        }
    }
}

// 創建全域 API 實例
const chatAPI = new ChatAPI();

// 導出給其他模塊使用
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { ChatAPI, chatAPI };
}
