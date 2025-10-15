// Gemini API 配置示例文件
// 复制此文件为 config.js 并填入您的 API 密钥

// 如何获取 Gemini API 密钥:
// 1. 访问 https://makersuite.google.com/app/apikey
// 2. 使用 Google 账号登录
// 3. 点击 "Create API Key" 创建新密钥
// 4. 复制密钥并粘贴到下方

const GEMINI_CONFIG = {
    apiKey: 'YOUR_API_KEY_HERE',  // 请替换为您的真实 API 密钥
    textModel: 'gemini-pro',
    visionModel: 'gemini-pro-vision'
};

// 导出配置
if (typeof module !== 'undefined' && module.exports) {
    module.exports = GEMINI_CONFIG;
}
