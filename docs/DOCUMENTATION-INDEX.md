# 📖 XIAOICE 文檔索引

快速找到你需要的文檔和文件。

---

## 🎯 按需求快速查找

### 👤 我想設置用戶認證系統

**相關文件：**
- 📄 [GETTING-STARTED.md](GETTING-STARTED.md) - ⭐ 開始這裡（5分鐘快速開始）
- 📄 [guides/README-LOGIN.md](guides/README-LOGIN.md) - 登入系統文檔
- 🔧 `backend/.env` - 環境配置

**操作步驟：**
1. 進入 `backend` 目錄
2. 運行 `scripts/setup-backend.sh` (Linux/macOS) 或 `scripts/setup-backend.bat` (Windows)
3. 執行 `python run.py`
4. 訪問 `http://localhost:5500/login.html`

---

### 🔌 我想查看 API 文檔

**相關文件：**
- 📄 [api/README-BACKEND.md](api/README-BACKEND.md) - ⭐ 完整 API 參考
- 📄 [api/README-API.md](api/README-API.md) - API 端點說明
- 🧪 `frontend/test-api.html` - 瀏覽器中測試 API

**快速查看：**
- 6 個 API 端點說明
- 請求/響應示例
- 認證機制
- 故障排除

---

### 🚀 我想部署到生產環境

**相關文件：**
- 📄 [api/README-BACKEND.md#-部署生產環境](api/README-BACKEND.md#-部署生產環境) - 部署指南章節
- 📄 [PROJECT-OVERVIEW.md](PROJECT-OVERVIEW.md) - 項目架構概覽
- 🔧 `backend/config.py` - 環境配置

**關鍵步驟：**
1. 更新 `backend/.env` 為生產設置
2. 使用 PostgreSQL 數據庫
3. 設置 JWT 密鑰
4. 配置 CORS 跨域設置

---

### 🐛 我遇到問題，需要故障排除

**相關文件：**
- 📄 [api/README-BACKEND.md#-故障排除](api/README-BACKEND.md#-故障排除) - ⭐ 查看這裡
- 📄 [PROJECT-OVERVIEW.md](PROJECT-OVERVIEW.md) - 常見問題

**常見問題：**
- 數據庫連接錯誤 → 檢查 `.env` 文件
- JWT 驗證失敗 → 確保令牌正確傳遞
- CORS 錯誤 → 配置 `config.py` 中的 CORS 設置
- 端口占用 → 改變 `run.py` 中的端口

---

### 📊 我想了解項目架構

**相關文件：**
- 📄 [PROJECT-OVERVIEW.md](PROJECT-OVERVIEW.md) - ⭐ 項目概況
- 📄 [technical/FLASK-INTEGRATION-SUMMARY.md](technical/FLASK-INTEGRATION-SUMMARY.md) - 技術整合詳情
- 📄 [technical/FLASK-DATABASE-COMPLETE.md](technical/FLASK-DATABASE-COMPLETE.md) - 完整功能報告

**包含內容：**
- 系統架構圖
- 技術棧說明
- 數據流程
- 安全特性

---

### 🎨 我想自定義前端

**相關文件：**
- 📄 `frontend/styles.css` - 主樣式表
- 📄 `frontend/script.js` - 前端邏輯
- 📄 `frontend/login.html`, `frontend/signup.html` - HTML 模板
- 📄 [guides/BACKGROUND-GUIDE.md](guides/BACKGROUND-GUIDE.md) - 背景自定義

**可修改的內容：**
- CSS 顏色和佈局
- JavaScript 邏輯
- HTML 結構
- 背景設置

---

### ✅ 我想查看完成清單

**相關文件：**
- 📄 [technical/IMPLEMENTATION-CHECKLIST.md](technical/IMPLEMENTATION-CHECKLIST.md) - ⭐ 100項實施檢查
- 📄 [technical/COMPLETE-SUMMARY.md](technical/COMPLETE-SUMMARY.md) - 完整總結

---

## 📂 按文件類型分類

### 🚀 快速開始文檔

| 文件 | 用途 | 閱讀時間 |
|------|------|--------|
| [GETTING-STARTED.md](GETTING-STARTED.md) | 5分鐘快速開始 | ⏱️ 5 分鐘 |
| [QUICKSTART.md](QUICKSTART.md) | 簡化快速開始 | ⏱️ 3 分鐘 |
| [BACKEND-QUICKSTART.md](BACKEND-QUICKSTART.md) | 後端快速開始 | ⏱️ 5 分鐘 |

### 📚 完整文檔

| 文件 | 用途 | 分類 |
|------|------|------|
| [README.md](README.md) | 項目主 README | 📖 總覽 |
| [PROJECT-OVERVIEW.md](PROJECT-OVERVIEW.md) | 項目概況 | 📖 架構 |
| [FILE-STRUCTURE.md](FILE-STRUCTURE.md) | 文件結構指南 | 📖 導覽 |
| [backend/README-BACKEND.md](backend/README-BACKEND.md) | 完整 API 文檔 | 📖 API |
| [README-API.md](README-API.md) | API 端點說明 | 📖 API |
| [README-LOGIN.md](README-LOGIN.md) | 登入系統文檔 | 📖 功能 |

### 🔧 技術文檔

| 文件 | 用途 | 分類 |
|------|------|------|
| [FLASK-INTEGRATION-SUMMARY.md](FLASK-INTEGRATION-SUMMARY.md) | 技術整合詳情 | 🔧 架構 |
| [FLASK-DATABASE-COMPLETE.md](FLASK-DATABASE-COMPLETE.md) | 完整功能報告 | 🔧 報告 |
| [DEVELOPMENT-SUMMARY.md](DEVELOPMENT-SUMMARY.md) | 開發摘要 | 🔧 開發 |
| [IMPLEMENTATION-CHECKLIST.md](IMPLEMENTATION-CHECKLIST.md) | 實施清單 | ✅ 檢查 |

### 🎨 功能指南

| 文件 | 用途 | 分類 |
|------|------|------|
| [BACKGROUND-GUIDE.md](BACKGROUND-GUIDE.md) | 背景自定義指南 | 🎨 界面 |
| [NAVIGATION-GUIDE.md](NAVIGATION-GUIDE.md) | 導航指南 | 🎨 界面 |
| [PRESETS-SHOWCASE.md](PRESETS-SHOWCASE.md) | 預設展示 | 🎨 界面 |
| [DEMO-WALKTHROUGH.md](DEMO-WALKTHROUGH.md) | 演示走位 | 🎨 教程 |

---

## 🗂️ 按位置分類

### 根目錄文件

**HTML 頁面**
- `login.html` - 登入頁面
- `signup.html` - 註冊頁面
- `index.html` - 主頁面
- `demo.html` - 功能演示
- `test-api.html` - API 測試

**樣式和腳本**
- `styles.css` - 主樣式表
- `script.js` - 前端邏輯

**文檔**
- 15+ Markdown 文件（見上表）

### 後端目錄 (`backend/`)

**Python 應用**
- `run.py` - 啟動腳本
- `app.py` - Flask 主應用
- `config.py` - 配置管理
- `models.py` - 數據庫模型
- `routes.py` - API 路由

**配置和依賴**
- `requirements.txt` - Python 依賴
- `.env` - 環境變量
- `.env.example` - 示例配置

**工具和測試**
- `test_api.py` - API 測試
- `setup.sh` - Linux/macOS 設置
- `setup.bat` - Windows 設置

**文檔**
- `README.md` - 後端說明
- `README-BACKEND.md` - 完整 API 文檔

---

## 🎓 學習路徑

### 初級用戶
1. 📖 [GETTING-STARTED.md](GETTING-STARTED.md) - 快速開始
2. 🔧 [api/README-BACKEND.md](api/README-BACKEND.md) - API 文檔
3. 📚 [PROJECT-OVERVIEW.md](PROJECT-OVERVIEW.md) - 項目概況

### 中級開發者
1. 📖 [PROJECT-OVERVIEW.md](PROJECT-OVERVIEW.md) - 架構概覽
2. 🔧 [technical/FLASK-INTEGRATION-SUMMARY.md](technical/FLASK-INTEGRATION-SUMMARY.md) - 技術詳情
3. 🎨 [guides/BACKGROUND-GUIDE.md](guides/BACKGROUND-GUIDE.md) - 自定義指南

### 進階用戶
1. 🔧 [api/README-BACKEND.md](api/README-BACKEND.md) - 完整文檔
2. 📊 [technical/IMPLEMENTATION-CHECKLIST.md](technical/IMPLEMENTATION-CHECKLIST.md) - 檢查清單
3. 🚀 [api/README-BACKEND.md#-部署生產環境](api/README-BACKEND.md#-部署生產環境) - 部署指南

---

## 🔍 快速搜索

### 我想找關於...的信息

**認證** → [guides/README-LOGIN.md](guides/README-LOGIN.md)  
**API** → [api/README-BACKEND.md](api/README-BACKEND.md)  
**數據庫** → [PROJECT-OVERVIEW.md](PROJECT-OVERVIEW.md)  
**部署** → [api/README-BACKEND.md#-部署生產環境](api/README-BACKEND.md#-部署生產環境)  
**錯誤** → [api/README-BACKEND.md#-故障排除](api/README-BACKEND.md#-故障排除)  
**背景** → [guides/BACKGROUND-GUIDE.md](guides/BACKGROUND-GUIDE.md)  
**功能展示** → [guides/DEMO-WALKTHROUGH.md](guides/DEMO-WALKTHROUGH.md)  
**設置** → [BACKEND-QUICKSTART.md](BACKEND-QUICKSTART.md)  

---

## 📞 需要幫助？

1. **快速問題** → 查看 [STRUCTURE.md](STRUCTURE.md)
2. **API 問題** → 查看 [api/README-BACKEND.md](api/README-BACKEND.md)
3. **設置問題** → 查看 [GETTING-STARTED.md](GETTING-STARTED.md)
4. **錯誤排除** → 查看 [api/README-BACKEND.md#-故障排除](api/README-BACKEND.md#-故障排除)

---

**Last Updated:** October 2025  
**Total Documents:** 18 Markdown 文件  
**Total Guide Pages:** 3
