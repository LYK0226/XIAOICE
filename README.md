# XIAOICE 智能聊天助手 🤖

一个功能强大的 AI 聊天应用，集成了 Google Gemini API，支持智能对话和图像识别。

![Status](https://img.shields.io/badge/status-active-success.svg)
![Version](https://img.shields.io/badge/version-2.0-blue.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)

## ✨ 主要功能

### 🎯 核心功能
- **🤖 AI 智能对话** - 使用 Google Gemini Pro 模型，提供自然流畅的对话体验
- **👁️ AI 图像识别** - 使用 Gemini Pro Vision，可分析图片内容、识别文字、解析试卷
- **🌍 多语言支持** - 支持简体中文、繁体中文、英文三种语言
- **😊 Emoji 表情** - 内置丰富的表情选择器，8 大分类数百个表情
- **👤 自定义头像** - 可上传用户和 AI 的自定义头像
- **🎨 背景定制** - 支持渐变色、纯色、图片三种背景类型，8 种预设 + 自定义选项
- **💾 本地存储** - 自动保存语言偏好、头像和背景设置

### 🎨 界面特色
- 完全可自定义的背景（渐变/纯色/图片）
- 8 种精美预设渐变色
- 支持上传个人背景图片
- 双向页面导航（聊天 ⇄ 功能展示）
- 响应式布局，支持各种设备
- 流畅的动画效果
- 直观的侧边栏导航
- 优雅的消息气泡设计

## 🚀 快速开始

### 1. 获取 Gemini API 密钥

1. 访问 [Google AI Studio](https://makersuite.google.com/app/apikey)
2. 使用 Google 账号登录
3. 点击 **"Create API Key"** 创建新密钥
4. 复制生成的 API 密钥

### 2. 配置 API 密钥

打开 `script.js` 文件，找到第 21 行：

```javascript
const GEMINI_API_KEY = 'YOUR_API_KEY_HERE';
```

将 `YOUR_API_KEY_HERE` 替换为您的真实 API 密钥。

### 3. 启动应用

```bash
# 克隆项目
git clone https://github.com/LYK0226/XIAOICE.git
cd XIAOICE

# 启动本地服务器
python3 -m http.server 8000
```

### 4. 访问应用

在浏览器中打开：`http://localhost:8000/app/templates/index.html`

### 5. 测试 API（可选）

访问 `http://localhost:8000/app/templates/test-api.html` 来测试您的 API 配置是否正确。

## 📖 使用指南

### 发送消息
1. 在底部输入框输入消息
2. 点击发送按钮或按 Enter 键
3. AI 会自动回复您的消息

### 图像识别
1. 点击输入框旁的图片图标
2. 选择要分析的图片
3. AI 会自动识别并分析图片内容
4. 支持试卷识别和文字提取

### 切换语言
- 点击顶部的语言切换按钮
- 选择：简体中文 / 繁體中文 / English

### 添加表情
1. 点击输入框旁的表情图标
2. 选择表情分类
3. 点击表情即可插入

### 自定义头像
1. 点击侧边栏的"设置"按钮
2. 选择"头像"标签页
3. 分别上传用户和 AI 的头像
4. 头像会自动保存到本地

### 自定义背景 🆕
1. 点击侧边栏的"设置"按钮
2. 选择"背景"标签页
3. 选择背景类型：
   - **渐变色**：8 种预设 + 自定义双色渐变
   - **纯色**：10 种预设 + 自定义颜色选择
   - **图片**：上传个人背景图片（支持 JPG、PNG、WebP）
4. 背景会自动保存，下次打开自动加载

详细使用说明请查看：[背景自定义指南](BACKGROUND-GUIDE.md)

### 页面导航 🆕
- **聊天页面**：顶部右侧有"功能展示"按钮，点击查看所有功能介绍
- **演示页面**：右上角有"返回聊天"按钮，快速回到聊天界面
- 支持双向快速切换，查看功能和使用无缝衔接

详细说明请查看：[页面导航指南](NAVIGATION-GUIDE.md)

## 🛠️ 技术栈

- **前端**: HTML5, CSS3, JavaScript (ES6+)
- **AI 服务**: Google Gemini API
  - Gemini Pro (文字对话)
  - Gemini Pro Vision (图像识别)
- **图标**: Font Awesome 6.0
- **存储**: localStorage

## 📁 项目结构

```
XIAOICE/
├── app/
│   ├── templates/
│   │   ├── index.html          # 主聊天页面
│   │   ├── demo.html           # 功能展示页面
│   │   ├── test-api.html       # API 测试页面
│   │   └── scrollbar-test.html # 滚动条样式测试页面
│   └── static/                 # 静态资源目录
│       ├── css/
│       └── js/
├── styles.css                  # 全局样式文件
├── script.js                   # 主要逻辑（包含 API 调用）
├── setup.sh                    # 快速配置脚本
├── config.example.js           # API 密钥配置示例
├── .gitignore                  # Git 忽略文件
├── README.md                   # 本文件
├── README-API.md               # API 详细文档
├── QUICKSTART.md               # 快速开始指南
├── BACKGROUND-GUIDE.md         # 背景自定义指南
├── PRESETS-SHOWCASE.md         # 预设背景展示
├── NAVIGATION-GUIDE.md         # 页面导航指南
└── DEVELOPMENT-SUMMARY.md      # 开发总结文档
```

## 🔒 安全建议

⚠️ **重要提示**：

1. **不要泄露 API 密钥** - 不要将包含真实密钥的代码提交到公共仓库
2. **使用环境变量** - 生产环境应该使用后端服务来保护密钥
3. **限制 API 调用** - 建议设置每日调用限额
4. **监控使用情况** - 定期检查 API 使用量

## 📊 API 配额

Gemini API 免费额度：
- **请求频率**: 每分钟 60 次
- **每日限额**: 1500 次请求
- **上下文长度**: 最多 30,000 tokens

详情请查看 [API 定价页面](https://ai.google.dev/pricing)

## 🐛 故障排查

### API 调用失败
- ✅ 检查 API 密钥是否正确
- ✅ 确认 API 密钥已启用
- ✅ 查看浏览器控制台错误信息
- ✅ 确认网络连接正常

### 图像识别不工作
- ✅ 确保图片格式为 JPEG、PNG 或 WebP
- ✅ 图片大小不超过 4MB
- ✅ 检查 API 配额是否用完

## 📚 更多资源

- [Gemini API 官方文档](https://ai.google.dev/docs)
- [API 快速入门](https://ai.google.dev/tutorials/get_started_web)
- [最佳实践指南](https://ai.google.dev/docs/best_practices)

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

## 📝 更新日志

### Version 2.2 (2024-10-08) 🆕
- ✅ 添加页面导航功能
- ✅ 聊天页面添加"功能展示"入口
- ✅ 演示页面添加"返回聊天"按钮
- ✅ 支持双向快速切换
- ✅ 优化用户浏览体验

### Version 2.1 (2024-10-08)
- ✅ 添加背景自定义功能
- ✅ 8 种精美预设渐变色
- ✅ 支持纯色背景选择
- ✅ 支持上传背景图片
- ✅ 自定义双色渐变
- ✅ 设置标签页优化

### Version 2.0 (2024-10-08)
- ✅ 集成 Google Gemini API
- ✅ 支持真实 AI 对话
- ✅ 支持 AI 图像识别
- ✅ 添加 API 测试工具

### Version 1.0
- ✅ 基础聊天界面
- ✅ 多语言支持
- ✅ Emoji 表情选择器
- ✅ 自定义头像上传

## 📄 许可证

MIT License

---

**Made with ❤️ by LYK0226**