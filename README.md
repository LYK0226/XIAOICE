# XIAOICE 智能聊天助手 🤖

一个功能强大的 AI 聊天应用，集成了 Google Gemini API，支持智能对话和图像识别。

##  快速开始

### 1. 获取 Google AI Studio API 密钥

1. 访问 [Google AI Studio](https://makersuite.google.com/app/apikey)
2. 使用 Google 账号登录
3. 点击 **"Create API Key"** 创建新密钥
4. 复制生成的 API 密钥

### 2. 配置环境变量

1. 复制 `.env` 文件（如果不存在，创建一个）
2. 在 `.env` 文件中设置您的 API 密钥：

```bash
# Google AI Studio API Key
GOOGLE_API_KEY="YOUR_ACTUAL_API_KEY_HERE"

# Gemini Model (可选)
GEMINI_MODEL="gemini-2.5-flash-lite"
```

⚠️ **重要**：请勿将 API Key提交到 Git 仓库！

### 3. 安装依赖并启动应用

```bash
# 克隆项目
git clone https://github.com/LYK0226/XIAOICE.git
cd XIAOICE

# 创建并激活虚拟环境
python -m venv .venv
source .venv/bin/activate  # Linux/Mac
# 或在 Windows 上使用: .venv\Scripts\activate

# 安装 Python 依赖
pip install -r requirements.txt

# 测试 API 连接（可选但推荐）
python test_api.py

# 启动应用
python run.py
```

### 4. 访问应用

在浏览器中打开：`http://localhost:5000`

### 5. 测试 API（可选）

访问 `http://localhost:5000/test-api` 来测试您的 API 配置是否正确。

##  项目结构

```
XIAOICE/
├── app/
│   ├── templates/
│   │   ├── index.html              # 主聊天页面
│   │   ├── demo.html               # 功能展示页面
│   │   ├── test-api.html           # API 测试页面
│   │   └── scrollbar-test.html     # 滚动条样式测试页面
│   └── static/                     # 静态资源目录
│       ├── css/
│       │   ├── chatbox.css            # 主聊天页面专用样式
│       │   ├── force-scrollbar.css # 滚动条样式覆盖
│       └── js/
│           ├── api_module.js        # API 交互模块
│           ├── chatbox.js           # 主要逻辑（包含 API 调用）
│           ├── config.example.js   # API 密钥配置示例
├── docs/
│   ├── BACKGROUND-GUIDE.md         # 背景自定义指南
│   ├── COMPLETE-SUMMARY.md         # 完整总结
│   ├── DEMO-WALKTHROUGH.md         # 功能演示说明
│   ├── DEVELOPMENT-SUMMARY.md      # 开发总结文档
│   ├── NAVIGATION-GUIDE.md         # 页面导航指南
│   ├── PRESETS-SHOWCASE.md         # 预设背景展示
│   ├── QUICKSTART.md               # 快速开始指南
│   └── README-API.md               # API 详细文档
├── fix-indentation.sh              # 缩进修复脚本
├── setup.sh                        # 快速配置脚本
├── .env.example                    # 环境变量示例
├── .gitignore                      # Git 忽略文件
└── README.md                       # 本文件
```