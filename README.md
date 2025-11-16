# XIAOICE 智能聊天助手 🤖

### ⚠️ **重要**：請勿將 ENCRYPTION_KEY 提交到 Git 倉庫！

### .env
```bash
# Environment variables for Flask and Google AI Studio
# Flask
SECRET_KEY="your_very_secret_key_here"
FLASK_APP="run.py"
FLASK_ENV="development"

# Database
DATABASE_URL=postgresql://xiaoice_user:xiaoice_password@localhost:5432/xiaoice
CREATE_DB_ON_STARTUP=true

# Encryption key for API keys (generate a secure random key)
# DO NOT COMMIT: Replace "your_32_byte_encryption_key_here" with your actual Fernet key
ENCRYPTION_KEY="your_32_byte_encryption_key_here"

```
# API 設定

### 取得您的加密金鑰 (填入 .env -> ENCRYPTION_KEY="your_32_byte_encryption_key_here")
python3 -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"

設定 -> 高級 ->填入你的 API Key


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

# API 設定

# 取得您的加密金鑰 (填入 .env -> ENCRYPTION_KEY="your_32_byte_encryption_key_here")
python3 -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"

設定 -> 高級 ->填入你的 API Key

# 測試 API 連接（可選但建議）
python test_api.py

# 啟動應用
python run.py
flask --debug run --host=0.0.0.0
```

### Docker 伺服器

```bash
# 啟動 Docker 伺服器
cd .devcontainer && docker-compose up -d

# 停止 Docker 伺服器
cd .devcontainer && docker-compose down

# 列出 Docker 伺服器
cd .devcontainer && docker ps
```

### 查看資料庫資料

```bash
python view_database.py

#查看所有用戶
python view_database.py users

#查看所有個人資料
python view_database.py profiles

#資料庫統計資訊
python view_database.py stats

#搜尋用戶
python view_database.py search "ryan"

#刪除用戶（謹慎使用！
python view_database.py delete 5
```

##  專案結構

```
XIAOICE/
├── .devcontainer/                   # Docker 開發環境配置
│ ├── docker-compose.yml            # Docker Compose 配置
│ └── pgadmin_servers.xml           # PgAdmin 伺服器配置
├── .vscode/                        # VS Code 設定
├── app/                            # Flask 應用程式
│ ├── __init__.py                   # Flask 應用初始化
│ ├── auth.py                       # 認證相關功能
│ ├── config.py                     # 應用配置
│ ├── models.py                     # 資料庫模型
│ ├── routes.py                     # 路由定義
│ ├── vertex_ai.py                  # Vertex AI 整合
│ ├── static/                       # 靜態資源目錄
│ │ ├── css/
│ │ │ ├── chatbox.css              # 主聊天頁面專用樣式
│ │ │ ├── sidebar.css              # 側邊欄專用樣式
│ │ │ ├── settings.css             # 設定頁面專用樣式
│ │ │ ├── login_signup.css         # 登入註冊頁面專用樣式
│ │ │ └── forget_password.css      # 忘記密碼頁面專用樣式
│ │ ├── js/
│ │ │ ├── api_module.js            # API 互動模組
│ │ │ ├── chatbox.js               # 主要聊天邏輯
│ │ │ ├── sidebar.js               # 側邊欄對話管理功能
│ │ │ ├── settings.js              # 設定頁面互動模組
│ │ │ ├── login_signup.js          # 登入註冊頁面互動模組
│ │ │ └── forget_password.js       # 忘記密碼頁面互動模組
│ │ └── upload/                    # 上傳檔案目錄
│ └── templates/                   # HTML 模板
│     ├── index.html               # 主聊天頁面
│     ├── login_signup.html        # 登入註冊頁面
│     ├── setting.html             # 設定頁面
│     └── forget_password.html     # 忘記密碼頁面
├── instance/                       # 應用實例資料
├── migrations/                     # 資料庫遷移檔案
│ ├── alembic.ini                  # Alembic 配置
│ ├── env.py                       # 遷移環境
│ ├── README                       # 遷移說明
│ ├── script.py.mako               # 遷移腳本模板
│ └── versions/                    # 遷移版本
├── .env                           # 環境變數配置
├── .gitignore                     # Git 忽略文件
├── README.md                      # 本文件
├── requirements.txt               # Python 依賴
├── run.py                         # 應用啟動腳本
├── test_api.py                    # API 測試腳本
├── test_auth.py                   # 認證測試腳本
└── view_database.py               # 資料庫查看工具
```
