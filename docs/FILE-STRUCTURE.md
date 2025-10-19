# 📂 XIAOICE 完整文件結構指南

完整的項目文件位置和分類說明。

**📚 快速導航：** [文檔索引](DOCUMENTATION-INDEX.md) | [快速開始](GETTING-STARTED.md) | [項目概況](PROJECT-OVERVIEW.md)

---

## 🏗️ 項目根目錄結構

```
XIAOICE/
├── backend/                          ← 後端應用程式
├── 前端文件 (HTML/CSS/JS)
├── 文檔文件 (Markdown)
├── 配置文件
└── 工具和腳本
```

---

## 🔧 後端應用程式 (`backend/`)

### 核心應用文件
```
backend/
├── run.py                          ← 🚀 啟動後端服務器（首先運行這個）
├── app.py                          ← Flask 應用工廠
├── config.py                       ← 環境配置管理 (開發/測試/生產)
├── models.py                       ← SQLAlchemy 數據庫模型
├── routes.py                       ← RESTful API 路由 (6個端點)
└── requirements.txt                ← Python 依賴列表
```

### 配置和環境
```
backend/
├── .env                            ← 環境變量 (編輯此文件改設置)
├── .env.example                    ← 環境變量模板
└── .gitignore                      ← Git 忽略配置
```

### 數據庫
```
backend/
└── xiaoice.db                      ← SQLite 數據庫 (首次運行後自動創建)
```

### 文檔
```
backend/
├── README.md                       ← 後端快速說明
└── README-BACKEND.md               ← 完整 API 文檔和故障排除
```

### 測試和設置
```
backend/
├── test_api.py                     ← 🧪 API 自動測試腳本
├── setup.sh                        ← 🐧 Linux/macOS 自動設置腳本
└── setup.bat                       ← 🪟 Windows 自動設置腳本
```

---

## 🎨 前端文件 (根目錄)

### HTML 頁面
```
XIAOICE/
├── login.html                      ← 用戶登入頁面
├── signup.html                     ← 用戶註冊頁面
├── index.html                      ← 主應用頁面
├── demo.html                       ← 功能演示頁面
├── scrollbar-test.html             ← 滾動條測試頁面
└── test-api.html                   ← API 測試頁面 (瀏覽器中)
```

### JavaScript 和 CSS
```
XIAOICE/
├── script.js                       ← 前端邏輯 (登入、註冊、用戶管理)
├── styles.css                      ← 主樣式表
├── force-scrollbar.css             ← 滾動條樣式
└── config.example.js               ← JavaScript 配置模板
```

---

## 📚 文檔文件 (根目錄)

### 快速開始指南
```
XIAOICE/
├── GETTING-STARTED.md              ← ⭐ 新用戶必讀 (5分鐘快速開始)
├── QUICKSTART.md                   ← 簡化的快速開始
└── BACKEND-QUICKSTART.md           ← 後端快速開始
```

### 系統文檔
```
XIAOICE/
├── README.md                       ← 項目主 README
├── PROJECT-OVERVIEW.md             ← 項目概況和統計
├── FLASK-INTEGRATION-SUMMARY.md    ← 技術整合詳情
├── FLASK-DATABASE-COMPLETE.md      ← 完整功能報告
└── README-BACKEND.md               ← API 完整參考
```

### 指南文檔
```
XIAOICE/
├── README-LOGIN.md                 ← 登入系統文檔
├── README-API.md                   ← API 端點詳細說明
├── BACKGROUND-GUIDE.md             ← 背景設置指南
├── NAVIGATION-GUIDE.md             ← 導航指南
├── DEMO-WALKTHROUGH.md             ← 演示走位
├── DEVELOPMENT-SUMMARY.md          ← 開發摘要
└── PRESETS-SHOWCASE.md             ← 預設展示
```

### 質量保證
```
XIAOICE/
├── IMPLEMENTATION-CHECKLIST.md     ← 實現清單 (100項檢查)
└── COMPLETE-SUMMARY.md             ← 完整總結
```

---

## ⚙️ 配置和工具文件 (根目錄)

### 配置文件
```
XIAOICE/
├── .env.example                    ← 環境變量示例
├── config.example.js               ← JavaScript 配置示例
└── .gitignore                      ← Git 忽略規則
```

### 設置和維護腳本
```
XIAOICE/
├── setup.sh                        ← 🐧 Linux/macOS 全局設置
├── fix-indentation.sh              ← 修復代碼縮進
└── .git/                           ← Git 版本控制目錄
```

---

## 🚀 快速使用方法

### 首次設置

1. **進入後端目錄**
   ```bash
   cd backend
   ```

2. **運行自動設置**
   - **Linux/macOS:**
     ```bash
     bash setup.sh
     ```
   - **Windows:**
     ```cmd
     setup.bat
     ```

3. **啟動後端**
   ```bash
   python run.py
   ```

4. **新終端測試 API**
   ```bash
   python test_api.py
   ```

5. **瀏覽器訪問前端**
   ```
   http://localhost:5500/login.html
   ```

### 編輯配置

**編輯後端設置：** `backend/.env`
```ini
FLASK_ENV=development
FLASK_DEBUG=True
DB_PATH=xiaoice.db
JWT_SECRET_KEY=your-secret-key-here
```

### 測試和開發

- **API 測試：** `backend/test_api.py`
- **前端測試：** `test-api.html` (在瀏覽器打開)
- **功能演示：** `demo.html`

---

## 📊 文件分類統計

| 類別 | 數量 | 位置 |
|------|------|------|
| **後端 Python 文件** | 5 | `backend/` |
| **前端 HTML 文件** | 6 | 根目錄 |
| **樣式文件** | 2 | 根目錄 |
| **JavaScript 文件** | 2 | 根目錄 |
| **文檔 Markdown** | 15+ | 根目錄 |
| **設置/配置** | 4 | `backend/` + 根目錄 |
| **測試文件** | 2 | `backend/` + 根目錄 |

---

## 🔍 按用途快速查找

### 我想...

**👤 編輯登入系統**
- → `login.html` + `signup.html` + `script.js`

**🔌 查看 API 文檔**
- → `backend/README-BACKEND.md` 或 `README-API.md`

**⚙️ 改變配置**
- → `backend/.env`

**🧪 測試 API**
- → `backend/test_api.py` 或瀏覽器打開 `test-api.html`

**📖 學習系統**
- → 從 `GETTING-STARTED.md` 開始

**🚀 部署到生產**
- → 參考 `backend/README-BACKEND.md` 的部署章節

**🐛 修復問題**
- → `backend/README-BACKEND.md` 的故障排除部分

**📊 了解項目**
- → `PROJECT-OVERVIEW.md`

**🎨 自定義前端**
- → `styles.css` 和 `script.js`

---

## 💾 數據和數據庫

### 數據庫位置
```
backend/xiaoice.db                 ← SQLite 數據庫 (自動創建)
```

### 查看數據庫

```bash
# 進入 backend 目錄
cd backend

# 打開 SQLite 查看
sqlite3 xiaoice.db

# 在 SQLite 中查看表
.tables
.schema user
SELECT * FROM user;
```

---

## 🔐 重要安全文件

這些文件包含敏感信息，**不要提交到版本控制：**

```
backend/.env                       ← ⚠️ 環境密鑰
backend/xiaoice.db                ← ⚠️ 用戶數據
```

這些已在 `.gitignore` 中配置。

---

## 📱 支持的瀏覽器

在以下 URL 訪問：

- **登入頁面：** `http://localhost:5500/login.html`
- **註冊頁面：** `http://localhost:5500/signup.html`
- **主頁面：** `http://localhost:5500/index.html`
- **API 測試：** `http://localhost:5500/test-api.html`
- **演示頁面：** `http://localhost:5500/demo.html`

（端口號根據你的 web 服務器配置調整）

---

## 🆘 需要幫助？

1. **查看快速開始：** `GETTING-STARTED.md`
2. **查看 API 文檔：** `backend/README-BACKEND.md`
3. **查看故障排除：** `backend/README-BACKEND.md#-故障排除`
4. **查看項目概況：** `PROJECT-OVERVIEW.md`

---

**Last Updated:** October 2025  
**Version:** 1.0 - Complete Integration
