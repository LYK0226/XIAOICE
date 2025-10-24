# Gemini API 配置

此项目使用 Google Gemini API 来提供 AI 聊天和图像识别功能。

## 快速开始

### 1. 获取 Gemini API 密钥

1. 访问 [Google AI Studio](https://makersuite.google.com/app/apikey)
2. 使用您的 Google 账号登录
3. 点击 **"Create API Key"** 创建新的 API 密钥
4. 复制生成的 API 密钥

### 2. 配置 API 密钥

```bash
cp .env.example .env
```

在 `.env` 文件中填入 `GEMINI_API_KEY`，并可根据需要设置 `GEMINI_TEXT_MODEL` 与 `GEMINI_VISION_MODEL`。

### 3. 启动服务器

```bash
uvicorn app.main:app --reload
```

### 4. 访问应用

在浏览器中打开：`http://localhost:8000/`

## 功能特性

### ✅ 已集成的功能

1. **AI 文字对话**
   - 使用 Gemini Pro 模型
   - 支持多语言对话（简体中文、繁体中文、英文）
   - 自然的对话体验

2. **AI 图像识别**
   - 使用 Gemini Pro Vision 模型
   - 支持图片上传和分析
   - 可识别图片内容、文字、试卷等

3. **多语言支持**
   - 简体中文（默认）
   - 繁体中文
   - English

4. **其他功能**
   - 自定义头像上传
   - Emoji 表情选择器
   - 消息历史保存

## API 使用说明

### Gemini Pro（文字对话）
- **模型**: `gemini-pro`
- **免费额度**: 每分钟 60 次请求
- **用途**: 普通文字对话

### Gemini Pro Vision（图像识别）
- **模型**: `gemini-pro-vision`
- **免费额度**: 每分钟 60 次请求
- **用途**: 图片分析、OCR 识别、试卷解析

## 注意事项

⚠️ **安全提示**：
- 不要将包含真实 API 密钥的文件提交到公共代码仓库
- 建议使用环境变量或配置文件来管理密钥
- 对于生产环境，应该使用后端服务器来保护 API 密钥

## 故障排查

### 问题：API 调用失败
**解决方案**：
1. 检查 API 密钥是否正确
2. 确认 API 密钥已启用
3. 检查浏览器控制台的错误信息
4. 确认网络连接正常

### 问题：图像识别不工作
**解决方案**：
1. 确保图片格式为 JPEG、PNG 或 WebP
2. 图片大小不超过 4MB
3. 检查 API 配额是否用完

## 更多信息

- [Gemini API 文档](https://ai.google.dev/docs)
- [API 定价](https://ai.google.dev/pricing)
- [API 配额限制](https://ai.google.dev/docs/quota)

## 项目文件结构

```
XIAOICE/
├── app/
│   ├── templates/
│   │   ├── index.html        # 主页面
│   │   ├── demo.html         # 功能展示页面
│   │   ├── test-api.html     # API 测试页面
│   │   └── scrollbar-test.html
│   ├── main.py
│   └── static/
│       ├── css/
│       │   ├── force-scrollbar.css
│       │   └── styles.css
│       └── js/
│           ├── config.example.js
│           └── chatbox.js
└── README-API.md             # 本文件
```
