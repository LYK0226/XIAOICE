/**
 * API Module - 處理所有與後端的交互
 * 將 API 調用邏輯與 UI 邏輯分離
 */

class ChatAPI {
    constructor() {
        this.baseURL = '';  // 使用相對路徑
        this.endpoints = {
            chat: '/chat'
        };
    }

    /**
     * 調用後端聊天 API
     * @param {string} userMessage - 用戶輸入的文字訊息
     * @param {File} imageFile - 可選的圖片文件
     * @param {string} currentLanguage - 當前語言設置
     * @returns {Promise<string>} - AI 回應文字
     */
    async sendChatMessage(userMessage, imageFile = null, currentLanguage = 'zh-CN') {
        const formData = new FormData();
        formData.append('message', userMessage);
        
        if (imageFile) {
            formData.append('image', imageFile);
        }

        try {
            const response = await fetch(this.endpoints.chat, {
                method: 'POST',
                body: formData
            });

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

    /**
     * 發送純文字訊息
     * @param {string} message - 文字訊息
     * @param {string} language - 語言設置
     * @returns {Promise<string>}
     */
    async sendTextMessage(message, language = 'zh-CN') {
        return this.sendChatMessage(message, null, language);
    }

    /**
     * 發送帶圖片的訊息
     * @param {string} message - 文字訊息
     * @param {File} imageFile - 圖片文件
     * @param {string} language - 語言設置
     * @returns {Promise<string>}
     */
    async sendImageMessage(message, imageFile, language = 'zh-CN') {
        return this.sendChatMessage(message, imageFile, language);
    }

    /**
     * 檢查 API 連接狀態
     * @returns {Promise<boolean>}
     */
    async checkConnection() {
        try {
            const response = await fetch('/', {
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
