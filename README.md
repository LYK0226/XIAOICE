# XIAOICE 智能聊天助手 🤖

### ⚠️ **重要**：請勿將 API Key提交到 Git 倉庫！

### 安裝依賴並啟動應用

```bash
# 建立並啟動虛擬環境
python -m venv .venv && source .venv/bin/activate

# 安裝 Python 依賴
pip install -r requirements.txt

# 初始化遷移資料庫
flask db init
flask db migrate 
flask db upgrade

# 測試 API 連接（可選但建議）
python test_api.py

# 啟動應用
python run.py
flask --debug run --host=0.0.0.0
```
# 啟動 Docker 伺服器
cd .devcontainer && docker-compose up -d

# 停止 Docker 伺服器
cd .devcontainer && docker-compose down

# 列出 Docker 伺服器
cd .devcontainer && docker ps

### 查看資料庫資料

```bash
python view_database.py
```

**查看所有用戶:**
```bash
python view_database.py users
```

**查看所有個人資料:**
```bash
python view_database.py profiles
```

**資料庫統計資訊:**
```bash
python view_database.py stats
```

**搜尋用戶:**
```bash
python view_database.py search "ryan"
```

**刪除用戶（謹慎使用！）:**
```bash
python view_database.py delete 5
```

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