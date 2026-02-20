# XIAOICE 智能聊天助手 🤖

XIAOICE is an intelligent chat assistant with multimodal support (text, images, videos) and real-time pose detection capabilities.

### ⚠️ **重要**：建立一個名為「.credentials」的新資料夾，並將 GCP 憑證放入其中。！

## Features

- 🤖 **Multi-agent AI System**: Powered by Google ADK with specialized agents for text and media
- 💬 **Real-time Chat**: WebSocket-based streaming responses
- 🖼️ **Multimodal Support**: Analyze images and videos (up to 500MB)
- 🧍 **Pose Detection**: Real-time human pose detection and action recognition via webcam
- 🔐 **Secure Authentication**: JWT-based authentication with encrypted API key storage
- 🌍 **Multi-language**: Support for Chinese (Traditional), English, and Japanese
- 🎨 **Customizable**: User preferences for themes, language, and AI models
 
### Setting up your .env file (step-by-step) ✅

```bash
# Copy .env.example to .env
cp .env.example .env

# Generate secure secret values (choose one of the generators below):
# Secure Flask / JWT secret (recommended for both):
python -c "import secrets; print(secrets.token_urlsafe(48))"

# `ENCRYPTION_KEY` 
python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
```


### 安裝依賴並啟動應用

```bash
# 建立並啟動虛擬環境
python -m venv .venv && source .venv/bin/activate
# windows
python -m venv .venv; .\.venv\Scripts\Activate

# 安裝 Python 依賴
pip install -r requirements.txt

# 初始化遷移資料庫
flask db init
flask db migrate 
flask db upgrade

# 啟動應用
python run.py
flask --debug run --host=0.0.0.0
```

### 測試

```bash
# 運行所有測試
pytest

# 運行單一測試文件
pytest test/test_rag.py -v

# 運行單一測試
pytest test/test_rag.py::TestRagEndpoints::test_list_documents_requires_admin -v

# API 連接測試
python test_api.py
```

### 賦予管理員權限

```sql
-- 將用戶設為管理員（需要知道用戶 email）
UPDATE users SET role = 'admin' WHERE email = '用戶郵箱';
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

## Pose Detection Feature

The pose detection feature enables real-time human pose tracking and action recognition through your webcam.

### Quick Start

1. **Open XIAOICE**: Navigate to the main chat interface
2. **Click Pose Detection Button**: Activate the pose detection mode
3. **Allow Camera Access**: Grant permission when prompted
4. **Start Moving**: The system will detect your pose and recognize your actions in real-time

### Supported Actions
- **Standing**: Upright posture with arms at sides
- **Sitting**: Seated position with bent hips and knees
- **Walking**: Alternating leg movements
- **Raising Hands**: One or both hands above shoulder level
- **Squatting**: Bent knees with lowered hips

📖 **For detailed instructions, troubleshooting, and tips, see the [Pose Detection User Guide](document/POSE_DETECTION_USER_GUIDE.md)**

### Performance Tips
- Use `POSE_MODEL_COMPLEXITY=0` for faster processing on lower-end hardware
- Increase confidence thresholds for more accurate but stricter detection
- Reduce `POSE_MAX_CONCURRENT_SESSIONS` if experiencing high CPU usage

### Browser Compatibility
- Ensure your browser has webcam permissions enabled
- For best performance, use Chrome or Edge (Chromium-based browsers)
- Safari users may need to enable camera access in System Preferences

### Privacy & Security
- ✅ Real-time processing only - no video recording
- ✅ No data storage - frames are immediately discarded
- ✅ Secure WebSocket connections
- ✅ No third-party data sharing

## Key Dependencies

### Backend
- **Flask 3.1.2**: Web framework
- **Flask-SocketIO 5.4.1**: Real-time WebSocket communication
- **Google ADK 1.18.0**: Multi-agent AI system
- **Google GenAI 1.52.0**: AI model integration
- **Google Cloud Storage 3.5.0**: File storage
- **SQLAlchemy**: Database ORM
- **Cryptography 46.0.3**: API key encryption
- **Pillow 12.0.0**: Image processing

### Frontend
- **MediaPipe Pose (Browser)**: Real-time 3D pose detection
- **WebRTC**: Webcam access
- **Canvas API**: Pose visualization

### Testing
- **pytest ≥9.0.1**: Unit testing framework
- **Hypothesis 6.148.7**: Property-based testing

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
│ ├── gcp_bucket.py                 # Google Cloud Storage 整合
│ ├── models.py                     # 資料庫模型
│ ├── routes.py                     # 路由定義
│ ├── socket_events.py              # WebSocket event handlers
│ ├── agent/                        # Multi-agent AI system
│ │   ├── chat_agent.py            # ADK agent manager and coordinators
│ │   └── __init__.py
│ ├── pose_detection/              # Pose detection modules (frontend JS)
│ │   ├── movement_analyzers.js   # Body part movement analyzers
│ │   ├── movement_descriptor.js  # Natural language descriptions
│ │   ├── movement_detector.js    # Movement detection logic
│ │   ├── pose_detector_3d.js     # 3D pose detection
│ │   ├── pose_error_handler.js   # Error handling
│ │   └── pose_renderer.js        # Canvas rendering
│ ├── static/                       # 靜態資源目錄
│ │ ├── css/
│ │ │ ├── chatbox.css              # 主聊天頁面專用樣式
│ │ │ ├── sidebar.css              # 側邊欄專用樣式
│ │ │ ├── settings.css             # 設定頁面專用樣式
│ │ │ ├── login_signup.css         # 登入註冊頁面專用樣式
│ │ │ ├── forget_password.css      # 忘記密碼頁面專用樣式
│ │ │ └── pose_detection.css       # 姿勢檢測介面樣式
│ │ ├── js/
│ │ │ ├── api_module.js            # API 互動模組
│ │ │ ├── chatbox.js               # 主要聊天邏輯
│ │ │ ├── sidebar.js               # 側邊欄對話管理功能
│ │ │ ├── settings.js              # 設定頁面互動模組
│ │ │ ├── login_signup.js          # 登入註冊頁面互動模組
│ │ │ ├── forget_password.js       # 忘記密碼頁面互動模組
│ │ │ ├── pose_detection.js        # 姿勢檢測 UI 模組
│ │ │ ├── pose_renderer.js         # Canvas 渲染器
│ │ │ └── socket_module.js         # WebSocket 連接管理
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
├── test/                          # 測試目錄
│ ├── check_api_keys.py            # API key 驗證工具
│ ├── test_3d_pose_module_initialization.py  # 3D 姿勢模組初始化測試
│ ├── test_api.py                  # API 連接測試
│ └── test_multi_agent.py          # Multi-agent 系統測試
├── .env                           # 環境變數配置
├── .gitignore                     # Git 忽略文件
├── README.md                      # 本文件
├── requirements.txt               # Python 依賴
├── run.py                         # 應用啟動腳本
└── view_database.py               # 資料庫查看工具
```

# Install opencode and the plugin
```bash
npm install -g @google/gemini-cli
npm i -g opencode-ai
npx oh-my-opencode install --no-tui --claude=no --openai=no --gemini=yes --copilot=yes
```
