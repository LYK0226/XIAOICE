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
### 賦予管理員權限

```bash
# 建立管理員帳號
python create_admin.py

username = 'admin@gmail.com'
password = 'admin'
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
│   ├── AGENTS.md                     # agent 設計與協調說明
│   ├── auth.py                       # JWT 驗證、登入/註冊邏輯
│   ├── child_assessment.py           # 兒童評估流程與分數計算
│   ├── config.py                     # 環境與設定常數
│   ├── gcp_bucket.py                 # GCS 上傳/下載/刪除 API 封裝
│   ├── models.py                     # ORM：User, Conversation, Message, FileUpload
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
│   │   ├── knowledge_base.py        # RAG 支援、文件處理與檢索邏輯
│   │   ├── prompts.py                # 內建 prompt 與 system instructions
│   │   ├── video_analysis_agent.py   # 影片/多媒體專用 agent
│   │   └── instructions/             # agent prompts 與片段
│   ├── pose_detection/               # 姿勢檢測：前端 JS + 後端評估
│   │   ├── pose_assessment.py        # 後端評分/規則引擎（把姿勢資料轉成評估分數）
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
│   │   ├── chunker.py               # 文件分段
│   │   ├── embeddings.py            # 向量化/embedding wrapper
│   │   ├── processor.py             # 文本處理 pipeline
│   │   └── retriever.py             # 相似度檢索
│   ├── static/                       # 靜態資源 (UI、JS、CSS)
│   │   ├── css/                      # 視覺樣式
│   │   ├── data/                     # emojis.json、i18n 資源
│   │   ├── i18n/                     # 翻譯檔
│   │   ├── js/                       # `chatbox.js`（主 UI），`pose_detection.js`（前端檢測 UI）
│   │   └── upload/                   # 前端上傳暫存
│   └── templates/                    # Jinja 模板 (chat, auth, settings, assessments)
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

# Install opencode and the plugin
```bash
npm install -g @google/gemini-cli
npm i -g opencode-ai
npx oh-my-opencode install --no-tui --claude=no --openai=no --gemini=yes --copilot=yes
```
