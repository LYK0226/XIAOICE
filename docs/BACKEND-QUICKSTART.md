# Flask 後端快速開始指南 ⚡

快速設置並運行 Flask 後端 API 服務器的步驟。

**完整文件位置指南：** [FILE-STRUCTURE.md](FILE-STRUCTURE.md)

## 📝 前置需求

- Python 3.7 或更高版本
- pip 包管理器
- 終端/命令行工具

## 🚀 快速開始 (5 分鐘)

### 第 1 步：進入後端目錄

```bash
cd backend
```

### 第 2 步：安裝依賴

```bash
pip install -r requirements.txt
```

這將安裝以下包：
- Flask - Web 框架
- Flask-SQLAlchemy - ORM
- Flask-CORS - 跨域資源共享
- Flask-JWT-Extended - JWT 認證
- python-dotenv - 環境變量管理

### 第 3 步：運行應用

```bash
python run.py
```

✅ 應用現在運行在 `http://localhost:5000`

## 🧪 測試 API

### 使用 cURL 測試

#### 1. 健康檢查

```bash
curl http://localhost:5000/api/health
```

應該返回：
```json
{
  "success": true,
  "message": "API is running."
}
```

#### 2. 註冊用戶

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

應該返回 access_token

#### 3. 登入用戶

```bash
curl -X POST http://localhost:5000/api/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@gmail.com",
    "password": "Test123456"
  }'
```

#### 4. 獲取用戶資料（需要 token）

```bash
curl -X GET http://localhost:5000/api/user/profile \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

### 使用 Postman 測試

1. 下載並安裝 [Postman](https://www.postman.com/downloads/)
2. 創建新請求
3. 填入 URL: `http://localhost:5000/api/signup`
4. 選擇 POST 方法
5. 在 Body 標籤選擇 raw 並設置為 JSON
6. 輸入 JSON 數據並點擊 Send

## 📋 環境變量

編輯 `.env` 文件來配置應用：

```
FLASK_ENV=development      # 開發模式
FLASK_DEBUG=True           # 啟用調試
SECRET_KEY=your-secret-key # 更改此值！
SQLALCHEMY_DATABASE_URI=sqlite:///xiaoice.db  # 數據庫路徑
JWT_SECRET_KEY=your-jwt-secret  # 更改此值！
```

### 生產環境配置

```
FLASK_ENV=production
FLASK_DEBUG=False
SECRET_KEY=<生成強隨機密鑰>
JWT_SECRET_KEY=<生成強隨機密鑰>
```

## 🔧 常見問題

### Q: 提示 "Address already in use"
**A:** 端口 5000 被占用
```bash
# Linux/Mac
lsof -i :5000
kill -9 <PID>

# Windows
netstat -ano | findstr :5000
taskkill /PID <PID> /F
```

### Q: 提示 "No module named 'flask'"
**A:** 依賴未安裝
```bash
pip install -r requirements.txt
```

### Q: 數據庫錯誤
**A:** 刪除並重新創建數據庫
```bash
rm xiaoice.db
python run.py
```

### Q: CORS 錯誤
**A:** 確保前端服務器在允許的源列表中

編輯 `app.py`：
```python
CORS(app, resources={
    r"/api/*": {
        "origins": ["http://localhost:5500"],  # 添加你的前端 URL
        "methods": ["GET", "POST", "PUT", "DELETE"],
        "allow_headers": ["Content-Type", "Authorization"]
    }
})
```

## 📊 查看數據庫

### 使用 SQLite 瀏覽器

安裝 SQLite 瀏覽器：

```bash
# Linux
sudo apt-get install sqlitebrowser

# macOS
brew install sqlitebrowser

# Windows
# 下載: https://sqlitebrowser.org/dl/
```

然後打開 `xiaoice.db` 文件查看數據。

### 使用 Python 查詢

```python
from app import create_app
from models import db, User

app = create_app()
with app.app_context():
    users = User.query.all()
    for user in users:
        print(f"用戶: {user.username}, 郵箱: {user.email}")
```

## 🐛 調試模式

### 啟用詳細日誌

編輯 `run.py`：

```python
import logging
logging.basicConfig(level=logging.DEBUG)
```

### 使用 Flask Shell

```bash
export FLASK_APP=app.py
flask shell

# 在 shell 中執行
>>> from models import db, User
>>> users = User.query.all()
>>> print(users)
```

## 🚀 下一步

1. **前端集成**: 在前端代碼中更新 API URL
2. **部署**: 使用 Gunicorn 或 Docker 部署
3. **增強功能**: 添加郵件驗證、密碼重設等
4. **監控**: 設置日誌和錯誤追蹤

## 📚 更多資源

- [完整 API 文檔](README-BACKEND.md)
- [前端登入系統文檔](../README-LOGIN.md)
- [Flask 官方文檔](https://flask.palletsprojects.com/)

## 💡 貼士

- 開發時使用 `FLASK_ENV=development` 啟用自動重載
- 使用 VSCode 的 [Thunder Client](https://www.thunderclient.com/) 擴展測試 API
- 安裝 [ngrok](https://ngrok.com/) 在公網暴露本地 API 用於測試

---

**需要幫助？** 檢查 logs 並查看[故障排除指南](README-BACKEND.md#-故障排除)
