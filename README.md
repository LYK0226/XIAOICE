# XIAOICE 智能聊天助手 🤖

XIAOICE is an intelligent chat assistant with multimodal support (text, images, videos) and real-time pose detection capabilities.

## Features

- 🤖 **Multi-agent AI System**: Powered by Google ADK with specialized agents for text and media
- 💬 **Real-time Chat**: WebSocket-based streaming responses
- 🖼️ **Multimodal Support**: Analyze images and videos (up to 500MB)
- 🧍 **Pose Detection**: Real-time human pose detection and action recognition via webcam
- 🔐 **Secure Authentication**: JWT-based authentication with encrypted API key storage
- 🌍 **Multi-language**: Support for Chinese (Traditional), English, and Japanese
- 🎨 **Customizable**: User preferences for themes, language, and AI models
 
### 安裝依賴並啟動應用
##  ⚠️ 將資料夾「.credentials」和文件「.env」複製到根目錄中
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

# 設定.env
# 產生安全金鑰值：
# SECRET_KEY / JWT_SECRET_KEY：
python -c "import secrets; print(secrets.token_urlsafe(48))"

# 產生ENCRYPTION_KEY
# ENCRYPTION_KEY:
python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"

# 啟動應用
python run.py
flask --debug run --host=0.0.0.0
```

### 賦予管理員權限

```bash
# 建立管理員帳號
python create_admin.py

username = 'admin@gmail.com'
password = 'admin123'
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
│   ├── docker-compose.yml
│   └── pgadmin_servers.xml
├── .vscode/                          # VS Code workspace settings
├── app/                              # Flask 應用程式與 AI agent
│   ├── __init__.py                   # create_app()、Blueprint 與 SocketIO 初始化
│   ├── adk.py                        # ADK 連線 / session helpers
│   ├── admin_routes.py               # 管理員後台路由
│   ├── AGENTS.md                     # agent 設計與協調說明
│   ├── auth.py                       # JWT 驗證、登入/註冊邏輯
│   ├── child_assessment.py           # 兒童評估流程與分數計算
│   ├── config.py                     # 環境與設定常數
│   ├── gcp_bucket.py                 # GCS 上傳/下載/刪除 API 封裝
│   ├── models.py                     # ORM：User, Conversation, Message, FileUpload, Assessment
│   ├── report_generator.py           # 產生影片／評估報表 (PDF/JSON)
│   ├── routes.py                     # SSE `/chat/stream`、上傳、會話管理等 HTTP endpoints
│   ├── socket_events.py              # Socket.IO connect/streaming handlers (JWT on connect)
│   ├── video_access_routes.py        # 受控影片存取 URL / 權限檢查
│   ├── video_cleanup.py              # 背景清理工作 (過期檔案、暫存)
│   ├── video_processor.py            # 影片上傳後的分析 pipeline / 存儲流程
│   ├── agent/                        # Multi-agent AI system (ADK coordinator + specialists)
│   │   ├── __init__.py
│   │   ├── AGENTS.md
│   │   ├── chat_agent.py             # 協調器：管理會話上下文、streaming、模型選擇
│   │   ├── prompts.py                # 內建 prompt 與 system instructions
│   │   └── video_analysis_agent.py   # 影片/多媒體專用 agent
│   ├── pose_detection/               # 姿勢檢測：前端 JS + 後端評估
│   │   ├── pose_assessment.py        # 後端評分/規則引擎
│   │   ├── action_detector.js        # 動作分類器
│   │   ├── movement_analyzers.js    # 各部位動作分析邏輯
│   │   ├── movement_descriptor.js   # 自然語言描述生成器
│   │   ├── movement_detector.js     # 偵測動作事件
│   │   ├── multi_person_detector.js # 多人追蹤/選取
│   │   ├── multi_person_selector.js # 人物選擇 UI 邏輯
│   │   ├── pose_detector_3d.js      # MediaPipe client-side 3D 偵測
│   │   ├── pose_error_handler.js    # 偵測錯誤處理
│   │   └── pose_renderer.js         # Canvas 渲染與 overlay
│   ├── rag/                          # RAG / embeddings 工具
│   │   ├── __init__.py
│   │   ├── chunker.py               # 文件分段
│   │   ├── embeddings.py            # 向量化/embedding wrapper
│   │   ├── enricher.py              # 語境增強
│   │   ├── processor.py             # 文本處理 pipeline
│   │   └── retriever.py             # 相似度檢索
│   ├── static/                       # 靜態資源 (UI、JS、CSS)
│   │   ├── css/                      # 視覺樣式
│   │   │   ├── admin.css             # 管理員後台樣式
│   │   │   ├── chatbox.css           # 聊天視窗與主介面樣式
│   │   │   ├── forget_password.css   # 忘記密碼頁面樣式
│   │   │   ├── index.css             # 首頁樣式
│   │   │   ├── login_signup.css      # 登入與註冊頁面樣式
│   │   │   ├── pose_detection.css    # 姿勢檢測功能樣式
│   │   │   ├── settings.css          # 使用者設定頁面樣式
│   │   │   ├── sidebar.css           # 側邊欄導航樣式
│   │   │   └── video_access.css      # 影片存取頁面樣式
│   │   ├── data/                     # emojis.json、i18n 資源
│   │   ├── i18n/                     # 翻譯檔 (多語言支援)
│   │   │   ├── en.json               # 英文語系
│   │   │   ├── ja.json               # 日文語系
│   │   │   ├── zh-CN.json            # 簡體中文語系
│   │   │   └── zh-TW.json            # 繁體中文語系
│   │   ├── js/                       # 前端邏輯
│   │   │   ├── admin.js              # 管理員後台前端邏輯
│   │   │   ├── api_module.js         # API 請求封裝模組
│   │   │   ├── assessment_config.js  # 評估系統配置
│   │   │   ├── assessment_questions.js # 評估問題清單
│   │   │   ├── chatbox.js            # 主聊天介面與訊息處理
│   │   │   ├── child_assessment.js   # 兒童評估前端流程控制
│   │   │   ├── forget_password.js    # 忘記密碼邏輯
│   │   │   ├── login_signup.js       # 登入/註冊驗證與提交
│   │   │   ├── pose_detection.js     # 姿勢檢測 UI 與 MediaPipe 整合
│   │   │   ├── settings.js           # 偏好設定與 API Key 管理
│   │   │   ├── sidebar.js            # 側邊欄互動與會話切換
│   │   │   ├── socket_module.js      # WebSocket (Socket.IO) 連線模組
│   │   │   ├── uploads.js            # 檔案上傳預覽與進度處理
│   │   │   └── video_access.js       # 影片觀看與權限驗證邏輯
│   │   └── upload/                   # 前端上傳暫存
│   └── templates/                    # html 模板
│       ├── admin.html                # 管理員控制面板
│       ├── chatbox.html              # 核心聊天介面
│       ├── child_assessment_templates.html # 評估題目模板
│       ├── forget_password.html      # 重設密碼頁面
│       ├── index.html                # 首頁 / 進入點
│       ├── login_signup.html         # 身份驗證頁面
│       ├── pose_detection.html       # 姿勢檢測展示頁面
│       ├── setting.html              # 帳號與偏好設定頁面
│       └── video_access.html         # 影片播放與評估頁面
├── videos_quesyions/                 # 教學與評估用影片目錄
├── docs/                             # 使用手冊、架構與部署說明
├── migrations/                       # Alembic migration 檔案
│   └── versions/                      # schema 版本歷史
├── test/                             # pytest 測試 (單元與整合測試)
├── create_admin.py                   # 建立管理員使用的簡易腳本
├── run.py                            # 本地開發伺服器啟動指令
├── test_vertex_account.py            # 範例 / 驗證帳號測試工具
├── requirements.txt                  # Python 相依套件
├── package-lock.json                 # Node 前端依賴鎖檔
├── README.md                         # 本檔案
├── .env.example / .env               # 環境變數範本與 (本地) .env
└── view_database.py                  # DB 查詢 / 檢視小工具
```

