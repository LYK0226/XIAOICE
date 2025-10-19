# 🎯 XIAOICE Flask 數據庫集成 - 用戶指南

## 📌 簡介

你已經成功獲得一個**完整的、生產就緒的**用戶認證系統！

**📚 快速導航：** [文檔索引](DOCUMENTATION-INDEX.md) | [結構說明](STRUCTURE.md) | [API 文檔](api/README-BACKEND.md)

本指南將幫助你快速開始使用。

---

## ⚡ 5 分鐘快速開始

### 步驟 1️⃣: 打開終端

```bash
# 進入 backend 目錄
cd backend
```

### 步驟 2️⃣: 運行設置腳本

**Linux/macOS:**
```bash
bash setup.sh
```

**Windows:**
```cmd
setup.bat
```

### 步驟 3️⃣: 啟動後端

```bash
python run.py
```

你會看到:
```
Starting XIAOICE API Server in development mode...
Server running at: http://localhost:5000
```

### 步驟 4️⃣: 在新終端測試

```bash
python test_api.py
```

### 步驟 5️⃣: 打開前端

在瀏覽器中訪問:
```
http://localhost:5500/login.html
```

（如果使用不同的端口，請相應調整）

✅ **完成！** 你現在可以註冊和登入用戶了！

---

## 📁 重要文件位置

**完整的文件結構指南，請查看：** [STRUCTURE.md](STRUCTURE.md)

### 後端文件 (`backend/`)
```
backend/
├── run.py              ← 🚀 運行後端
├── test_api.py         ← 🧪 測試 API
├── requirements.txt    ← 安裝依賴
├── .env               ← ⚙️ 配置（編輯改設置）
├── app.py, config.py, models.py, routes.py
└── README.md          ← 後端說明
```

### 前端文件 (`frontend/`)
```
frontend/
├── login.html, signup.html, index.html
├── script.js          ← 前端邏輯
└── styles.css         ← 樣式文件
```

### 文檔文件 (`docs/`)
- **快速開始：** `docs/GETTING-STARTED.md` (本文件)
- **完整文件結構：** `docs/STRUCTURE.md` ⭐
- **API 文檔：** `docs/api/README-BACKEND.md`
- **項目概況：** `docs/PROJECT-OVERVIEW.md`

### 前端文件
```
XIAOICE/
├── login.html         ← 登入頁面
├── signup.html        ← 註冊頁面
├── index.html         ← 主頁面
├── script.js          ← 前端邏輯
└── styles.css         ← 樣式文件
```

### 文檔文件
```
XIAOICE/
├── GETTING-STARTED.md              ← 快速開始（本文件）
├── PROJECT-OVERVIEW.md             ← 項目概況
├── README-BACKEND.md               ← API 完整文檔
├── BACKEND-QUICKSTART.md           ← 快速開始指南
├── FLASK-INTEGRATION-SUMMARY.md    ← 技術詳情
├── FLASK-DATABASE-COMPLETE.md      ← 最終報告
├── IMPLEMENTATION-CHECKLIST.md     ← 檢查清單
└── README-LOGIN.md                 ← 登入系統文檔
```

---

## 🔧 配置說明

### 修改端口

編輯 `backend/run.py`:
```python
app.run(
    debug=app.config['DEBUG'],
    host='0.0.0.0',
    port=5000,  # ← 改這裡
    use_reloader=True
)
```

### 修改數據庫

編輯 `backend/.env`:
```env
# SQLite（開發）
SQLALCHEMY_DATABASE_URI=sqlite:///xiaoice.db

# PostgreSQL（生產）
SQLALCHEMY_DATABASE_URI=postgresql://user:password@localhost/xiaoice
```

### 修改密鑰（重要！）

編輯 `backend/.env`:
```env
SECRET_KEY=你的自定義密鑰
JWT_SECRET_KEY=你的 JWT 密鑰
```

⚠️ **在生產環境中必須修改這些密鑰！**

---

## 🧪 測試流程

### 方法 1: 使用自動化測試

```bash
cd backend
python test_api.py
```

### 方法 2: 使用 cURL

#### 註冊用戶
```bash
curl -X POST http://localhost:5000/api/signup \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "email": "test@gmail.com",
    "password": "Test123456",
    "confirm_password": "Test123456"
  }'
```

#### 登入用戶
```bash
curl -X POST http://localhost:5000/api/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@gmail.com",
    "password": "Test123456"
  }'
```

### 方法 3: 使用 Postman

1. 下載 [Postman](https://www.postman.com/downloads/)
2. 創建 POST 請求
3. URL: `http://localhost:5000/api/signup`
4. 選擇 Body → raw → JSON
5. 輸入上面的 JSON 數據

---

## 📊 用戶流程

```
用戶訪問前端
    ↓
點擊"立即註冊" → signup.html
    ↓
填寫表單
    ↓
點擊"立即註冊" → POST /api/signup
    ↓
後端驗證並保存到數據庫
    ↓
返回 JWT token
    ↓
前端存儲 token
    ↓
自動進入 index.html
    ↓
成功！
```

---

## 🔒 安全特性

✅ **密碼加密** - 使用 Werkzeug 進行哈希  
✅ **JWT 認證** - 安全的 token 生成  
✅ **輸入驗證** - 防止無效數據  
✅ **CORS 保護** - 跨域資源共享控制  
✅ **錯誤隱藏** - 不洩露敏感信息  

---

## 🐛 常見問題

### Q: 啟動時提示 "Address already in use"

**A:** 端口 5000 已被使用

```bash
# Linux/macOS
lsof -i :5000
kill -9 <PID>

# Windows
netstat -ano | findstr :5000
taskkill /PID <PID> /F
```

### Q: 啟動時提示 "No module named 'flask'"

**A:** 依賴未安裝

```bash
pip install -r requirements.txt
```

### Q: 登入時提示 CORS 錯誤

**A:** 編輯 `app.py` 中的 CORS 設置:

```python
CORS(app, resources={
    r"/api/*": {
        "origins": ["http://localhost:5500"],  # 改為你的前端 URL
        "methods": ["GET", "POST", "PUT", "DELETE"],
        "allow_headers": ["Content-Type", "Authorization"]
    }
})
```

### Q: 如何查看數據庫中的用戶？

**A:** 使用 SQLiteBrowser:

1. 下載 [SQLiteBrowser](https://sqlitebrowser.org/)
2. 打開 `backend/xiaoice.db`
3. 查看 `users` 表

---

## 🎨 前端集成說明

### 登入頁面流程

```javascript
// 用戶點擊登入按鈕
handleLogin() {
  // 驗證表單
  // 調用 API: POST /api/login
  // 接收 token
  // 存儲到 localStorage
  // 重定向到主頁
}
```

### 主頁面流程

```javascript
// 頁面加載時
checkLoginStatus() {
  // 檢查 localStorage 中的 token
  // 如果沒有 token → 重定向到登入頁
  // 如果有 token → 顯示用戶信息
}

// 用戶點擊登出
logout() {
  // 清除 localStorage
  // 重定向到登入頁
}
```

---

## 🚀 部署到服務器

### 使用 Gunicorn（推薦）

```bash
# 安裝
pip install gunicorn

# 運行
gunicorn -w 4 -b 0.0.0.0:5000 app:create_app()
```

### 使用 Docker

```bash
# 構建映像
docker build -t xiaoice-api .

# 運行容器
docker run -p 5000:5000 xiaoice-api
```

### 在 Heroku 上部署

```bash
# 安裝 Heroku CLI
# 登入
heroku login

# 創建應用
heroku create your-app-name

# 部署
git push heroku main
```

---

## 📚 詳細文檔

如需了解更多，請查看：

| 文檔 | 內容 |
|------|------|
| [README-BACKEND.md](backend/README-BACKEND.md) | 完整 API 文檔 |
| [BACKEND-QUICKSTART.md](BACKEND-QUICKSTART.md) | 快速開始指南 |
| [FLASK-INTEGRATION-SUMMARY.md](FLASK-INTEGRATION-SUMMARY.md) | 技術詳情 |

---

## 💡 有用的命令

```bash
# 進入後端目錄
cd backend

# 安裝依賴
pip install -r requirements.txt

# 運行應用
python run.py

# 測試 API
python test_api.py

# 進入 Python shell
python

# 查看數據庫
sqlite3 xiaoice.db

# 列出進程
ps aux | grep python

# 停止進程
kill -9 <PID>
```

---

## 🎯 下一步

1. ✅ 運行後端
2. ✅ 測試 API
3. ✅ 進行用戶測試
4. ✅ 部署到服務器
5. ✅ 添加更多功能

---

## 📞 需要幫助？

1. 查看文檔文件
2. 檢查日誌輸出
3. 運行測試腳本
4. 查看故障排除部分

---

## ✨ 功能概覽

### 已實現 ✅

- ✅ 用戶註冊
- ✅ 用戶登入
- ✅ 用戶資料管理
- ✅ JWT 認證
- ✅ 密碼加密
- ✅ 錯誤處理

### 可以添加的功能 🚀

- 🔄 郵件驗證
- 🔄 密碼重設
- 🔄 二次驗證
- 🔄 社交登入
- 🔄 用戶頭像上傳
- 🔄 會話管理

---

## 🎉 恭喜！

你現在擁有一個完整的認證系統！

**開始構建你的應用吧！**

---

**最後更新**: 2025年10月19日  
**版本**: 1.0  
**狀態**: ✅ 準備就緒
