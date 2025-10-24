# XIAOICE 智能聊天助手 🤖

一個功能強大的 AI 聊天應用，整合了 Google Gemini API，支援智慧對話和圖像辨識。

##  快速開始

### 1. 取得 Google AI Studio API 金鑰

1. 造訪 [Google AI Studio](https://makersuite.google.com/app/apikey)
2. 使用 Google 帳號登錄
3. 點選 **"Create API Key"** 建立新金鑰
4. 複製產生的 API 金鑰

### 2. 設定環境變數

1. 複製 `.env` 檔案（如果不存在，建立一個）
2. 在 `.env` 檔案中設定您的 API 金鑰：

```bash
# Google AI Studio API Key
GOOGLE_API_KEY="YOUR_ACTUAL_API_KEY_HERE"

# Gemini Model (可選)
GEMINI_MODEL="gemini-2.5-flash-lite"
```

⚠️ **重要**：請勿將 API Key提交到 Git 倉庫！

### 3. 安裝依賴並啟動應用

```bash
# 建立並啟動虛擬環境
python -m venv .venv
source .venv/bin/activate 

# 初始化遷移資料庫
flask db init
flask db migrate 
flask db upgrade

# 安裝 Python 依賴
pip install -r requirements.txt

# 測試 API 連接（可選但建議）
python test_api.py

# 啟動應用
python run.py
```

### 4. 存取應用

在瀏覽器中開啟：`http://localhost:5000`

### 5. 測試 API（可選）

造訪 `http://localhost:5000/test-api` 來測試您的 API 設定是否正確。

##  專案結構

```
XIAOICE/
├── app/
│ ├── templates/
│ │ ├── index.html                  # 主聊天頁面
│ │ ├── demo.html                   # 功能展示頁面
│ │ ├── test-api.html               # API 測試頁面
│ │ └── scrollbar-test.html         # 捲軸式測試頁面
    └── login_signup.html           # 登入註冊
│ └── static/                       # 靜態資源目錄
│ ├── css/
│ │ ├── chatbox.css                 # 主聊天頁面專用樣式
    ├── login_signup.css            # 登入註冊頁面專用樣式
│ └── js/
│   ├── api_module.js               # API 互動模組
│   ├── chatbox.js                  # 主要邏輯（包含 API 呼叫）
    ├── login_signup.css            # 登入註冊頁面互動模組
├── docs/
│ ├── BACKGROUND-GUIDE.md           # 背景自訂指南
│ ├── COMPLETE-SUMMARY.md           # 完整總結
│ ├── DEMO-WALKTHROUGH.md           # 功能示範說明
│ ├── DEVELOPMENT-SUMMARY.md        # 開發摘要文檔
│ ├── NAVIGATION-GUIDE.md           # 頁面導航指南
│ ├── PRESETS-SHOWCASE.md           # 預設背景展示
│ ├── QUICKSTART.md                 # 快速開始指南
│ └── README-API.md                 # API 詳細文檔
├── .gitignore                      # Git 忽略文件
└── README.md                       # 本文件
```