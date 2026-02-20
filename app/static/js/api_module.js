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

    /**
     * Attempt to refresh the access token using the stored refresh token.
     * Returns true if refresh succeeded, false otherwise.
     */
    async _tryRefreshToken() {
        const refreshToken = localStorage.getItem('refresh_token');
        if (!refreshToken) return false;

        try {
            const res = await fetch('/auth/refresh', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${refreshToken}`,
                    'Content-Type': 'application/json'
                }
            });
            if (res.ok) {
                const data = await res.json();
                if (data.access_token) {
                    localStorage.setItem('access_token', data.access_token);
                    return true;
                }
            }
        } catch (e) {
            console.warn('Token refresh failed:', e);
        }
        return false;
    }

    async _handleAuthFailure(response) {
        if (response && (response.status === 401 || response.status === 422)) {
            // Try to refresh first
            const refreshed = await this._tryRefreshToken();
            if (refreshed) return true; // caller should retry the request

            localStorage.removeItem('access_token');
            localStorage.removeItem('refresh_token');
            if (typeof window !== 'undefined' && window.location && window.location.pathname !== '/login') {
                window.location.href = '/login';
            }
        }
        return false;
    }

    /**
     * Fetch wrapper that auto-refreshes the access token on 401 and retries once.
     * Usage: const response = await this._authFetch(url, options);
     */
    async _authFetch(url, options = {}) {
        // Inject auth headers
        options.headers = { ...this._getAuthHeaders(), ...options.headers };
        let response = await fetch(url, options);

        if (response.status === 401 || response.status === 422) {
            const refreshed = await this._tryRefreshToken();
            if (refreshed) {
                // Update auth header with new token and retry
                options.headers = { ...this._getAuthHeaders(), ...options.headers };
                response = await fetch(url, options);
            }
            if (response.status === 401 || response.status === 422) {
                localStorage.removeItem('access_token');
                localStorage.removeItem('refresh_token');
                if (typeof window !== 'undefined' && window.location && window.location.pathname !== '/login') {
                    window.location.href = '/login';
                }
            }
        }
        return response;
    }

    /**
     * 調用後端聊天 API (串流版本)
     * @param {string} userMessage - 用戶輸入的文字訊息
     * @param {File} imageFile - 可選的圖片文件
     * @param {string} imageUrl - 可選的圖片 URL
     * @param {string} imageMimeType - 圖片 MIME 類型
     * @param {string} currentLanguage - 當前語言設置
     * @param {function} onChunk - 回調函數，用於處理每個文字區塊
     * @param {function} onComplete - 完成時的回調函數
     * @param {function} onError - 錯誤時的回調函數
     * @returns {Promise} - 可取消的 Promise
     */
    async streamChatMessage(userMessage, imageFile = null, imageUrl = null, imageMimeType = null, currentLanguage = 'zh-TW', history = null, onChunk, onComplete, onError, conversationId = null) {
        const formData = new FormData();
        formData.append('message', userMessage);
        
        if (imageUrl) {
            formData.append('image_url', imageUrl);
            if (imageMimeType) {
                formData.append('image_mime_type', imageMimeType);
            }
        } else if (imageFile) {
            formData.append('image', imageFile);
        }

        if (history) {
            // attach conversation history as JSON string
            formData.append('history', JSON.stringify(history));
        }

        // Send conversation_id so the backend uses per-conversation ADK sessions
        if (conversationId) {
            formData.append('conversation_id', conversationId);
        }

        // Get access token from localStorage
        const headers = this._getAuthHeaders();

        // Create AbortController for cancellation support
        this._currentAbortController = new AbortController();

        try {
            let response = await fetch('/chat/stream', {
                method: 'POST',
                headers: headers,
                body: formData,
                signal: this._currentAbortController.signal
            });

            // If access token expired, try refresh and retry once
            if (response.status === 401 || response.status === 422) {
                const refreshed = await this._tryRefreshToken();
                if (refreshed) {
                    response = await fetch('/chat/stream', {
                        method: 'POST',
                        headers: this._getAuthHeaders(),
                        body: formData,
                        signal: this._currentAbortController.signal
                    });
                }
                if (response.status === 401 || response.status === 422) {
                    localStorage.removeItem('access_token');
                    localStorage.removeItem('refresh_token');
                    if (typeof window !== 'undefined' && window.location && window.location.pathname !== '/login') {
                        window.location.href = '/login';
                    }
                    return;
                }
            }

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || `API Error: ${response.status}`);
            }

            const reader = response.body.getReader();
            const decoder = new TextDecoder();

            let buffer = '';
            let isDone = false;

            while (!isDone) {
                const { done, value } = await reader.read();
                isDone = done;

                if (value) {
                    buffer += decoder.decode(value, { stream: true });
                    
                    // Process complete SSE messages
                    const lines = buffer.split('\n');
                    buffer = lines.pop(); // Keep incomplete line in buffer
                    
                    for (const line of lines) {
                        if (line.startsWith('data: ')) {
                            const raw = line.slice(6); // Remove 'data: '
                            if (raw.trim()) {
                                // Server JSON-encodes chunks to preserve newlines in SSE.
                                try {
                                    onChunk(JSON.parse(raw));
                                } catch (_) {
                                    onChunk(raw); // fallback for non-JSON data
                                }
                            }
                        }
                    }
                }
            }

            // Process any remaining data
            if (buffer.trim()) {
                const lines = buffer.split('\n');
                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        const raw = line.slice(6);
                        if (raw.trim()) {
                            try {
                                onChunk(JSON.parse(raw));
                            } catch (_) {
                                onChunk(raw);
                            }
                        }
                    }
                }
            }

            if (onComplete) {
                onComplete();
            }

        } catch (error) {
            // If aborted by user, call onComplete (not onError) — the partial response is kept
            if (error.name === 'AbortError') {
                if (onComplete) onComplete();
                return;
            }

            console.error('Streaming API Error:', error);
            
            if (onError) {
                onError(error);
            } else {
                // 返回對應語言的錯誤訊息
                const errorMessages = {
                    'zh-TW': '抱歉，服務暫時無法使用。請稍後再試。',
                    'en': 'Sorry, the service is temporarily unavailable. Please try again later.'
                };
                
                throw new Error(errorMessages[currentLanguage] || errorMessages['zh-TW']);
            }
        } finally {
            this._currentAbortController = null;
        }
    }

    /**
     * Abort the current streaming request (if any).
     */
    abortStream() {
        if (this._currentAbortController) {
            this._currentAbortController.abort();
            this._currentAbortController = null;
        }
    }

    async fetchConversations() {
        const response = await this._authFetch(this.endpoints.conversations, {
            method: 'GET'
        });

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

        const response = await this._authFetch(this.endpoints.conversations, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || `API Error: ${response.status}`);
        }

        return response.json();
    }

    async addMessage(conversationId, content, sender, metadata = null, files = null, tempId = null) {
        if (files && files.length > 0) {
            // Use FormData for file uploads
            const formData = new FormData();
            formData.append('conversation_id', conversationId);
            formData.append('content', content);
            formData.append('sender', sender);
            
            if (metadata) {
                formData.append('metadata', JSON.stringify(metadata));
            }
            
            // Add temp_id for optimistic UI tracking
            if (tempId) {
                formData.append('temp_id', tempId);
            }
            
            files.forEach((file) => {
                formData.append('files', file);
            });
            
            const response = await this._authFetch(this.endpoints.messages, {
                method: 'POST',
                body: formData
            });
            
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
            
            // Add temp_id for optimistic UI tracking
            if (tempId) {
                payload.temp_id = tempId;
            }
            
            const response = await this._authFetch(this.endpoints.messages, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || `API Error: ${response.status}`);
            }
            
            return response.json();
        }
    }

    async fetchConversationMessages(conversationId) {
        const response = await this._authFetch(`${this.endpoints.conversations}/${conversationId}/messages`, {
            method: 'GET'
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || `API Error: ${response.status}`);
        }

        return response.json();
    }

    async updateConversation(conversationId, updates) {
        const response = await this._authFetch(`${this.endpoints.conversations}/${conversationId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updates)
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || `API Error: ${response.status}`);
        }

        return response.json();
    }

    async deleteConversation(conversationId) {
        const response = await this._authFetch(`${this.endpoints.conversations}/${conversationId}`, {
            method: 'DELETE'
        });

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
     * @param {Array} history - 對話歷史
     * @returns {Promise<string>}
     */
    async sendTextMessage(message, language = 'zh-TW', history = null) {
        return new Promise((resolve, reject) => {
            let fullResponse = '';

            this.streamChatMessage(
                message,
                null, // no image file
                language,
                history,
                (chunk) => {
                    // Accumulate chunks
                    fullResponse += chunk;
                },
                () => {
                    // On complete, resolve with the full response
                    resolve(fullResponse);
                },
                (error) => {
                    // On error, reject with the error
                    reject(error);
                }
            );
        });
    }

    /**
     * 發送帶圖片的訊息
     * @param {string} message - 文字訊息
     * @param {string} imageUrl - 圖片 URL
     * @param {string} imageMimeType - 圖片 MIME 類型
     * @param {string} language - 語言設置
     * @param {Array} history - 對話歷史
     * @returns {Promise<string>}
     */
    async sendImageMessage(message, imageUrl, imageMimeType, language = 'zh-TW', history = null) {
        return new Promise((resolve, reject) => {
            let fullResponse = '';

            this.streamChatMessage(
                message,
                null, // no imageFile
                imageUrl,
                imageMimeType,
                language,
                history,
                (chunk) => {
                    // Accumulate chunks
                    fullResponse += chunk;
                },
                () => {
                    // On complete, resolve with the full response
                    resolve(fullResponse);
                },
                (error) => {
                    // On error, reject with the error
                    reject(error);
                }
            );
        });
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
