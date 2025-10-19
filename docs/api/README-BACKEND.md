# Flask 後端 API 文檔 🚀

完整的 Flask 後端應用程序，用於處理用戶認證和數據庫管理。

## 📋 目錄結構

```
backend/
├── app.py                 # Flask 應用主文件
├── run.py                 # 啟動腳本
├── config.py              # 配置文件
├── models.py              # 數據庫模型
├── routes.py              # API 路由
├── requirements.txt       # 依賴列表
├── .env                   # 環境變量配置
└── xiaoice.db            # SQLite 數據庫（首次運行後自動創建）
```

## 🛠️ 安裝和設置

### 1. 安裝依賴

```bash
cd backend
pip install -r requirements.txt
```

### 2. 配置環境變量

編輯 `.env` 文件，配置必要的環境變量：

```bash
FLASK_ENV=development
FLASK_DEBUG=True
SECRET_KEY=your-secret-key-change-in-production
SQLALCHEMY_DATABASE_URI=sqlite:///xiaoice.db
JWT_SECRET_KEY=your-jwt-secret-key-change-in-production
```

### 3. 運行應用

```bash
python run.py
```

應用將在 `http://localhost:5000` 啟動

## 📊 數據庫模型

### User 模型

存儲用戶基本信息：

| 字段 | 類型 | 說明 |
|------|------|------|
| `id` | Integer | 主鍵 |
| `username` | String(80) | 用戶名（唯一） |
| `email` | String(120) | 郵箱（唯一） |
| `password_hash` | String(255) | 密碼哈希值 |
| `avatar` | Text | 用戶頭像 URL 或 Base64 |
| `created_at` | DateTime | 創建時間 |
| `updated_at` | DateTime | 更新時間 |
| `is_active` | Boolean | 帳戶狀態 |

### UserProfile 模型

存儲用戶偏好設置：

| 字段 | 類型 | 說明 |
|------|------|------|
| `id` | Integer | 主鍵 |
| `user_id` | Integer | 外鍵（用戶 ID） |
| `language` | String(20) | 語言偏好（默認: zh-CN） |
| `theme` | String(20) | 主題偏好（默認: light） |
| `background_type` | String(20) | 背景類型 |
| `background_value` | Text | 背景值 |
| `bot_avatar` | Text | 機器人頭像 URL |
| `created_at` | DateTime | 創建時間 |
| `updated_at` | DateTime | 更新時間 |

## 🔌 API 端點

### 1. 用戶註冊

**端點**: `POST /api/signup`

**請求體**:
```json
{
  "username": "john_doe",
  "email": "john@gmail.com",
  "password": "securePassword123",
  "confirm_password": "securePassword123"
}
```

**成功響應** (201):
```json
{
  "success": true,
  "message": "User registered successfully.",
  "data": {
    "user": {
      "id": 1,
      "username": "john_doe",
      "email": "john@gmail.com",
      "avatar": null,
      "created_at": "2025-10-19T10:30:00",
      "is_active": true
    },
    "access_token": "eyJ0eXAiOiJKV1QiLCJhbGc..."
  }
}
```

**錯誤響應** (400/409):
```json
{
  "error": "Username already exists.",
  "success": false
}
```

### 2. 用戶登入

**端點**: `POST /api/login`

**請求體**:
```json
{
  "email": "john@gmail.com",
  "password": "securePassword123"
}
```

**成功響應** (200):
```json
{
  "success": true,
  "message": "Login successful.",
  "data": {
    "user": {
      "id": 1,
      "username": "john_doe",
      "email": "john@gmail.com",
      "avatar": null,
      "created_at": "2025-10-19T10:30:00",
      "is_active": true
    },
    "profile": {
      "id": 1,
      "user_id": 1,
      "language": "zh-CN",
      "theme": "light",
      "background_type": "gradient",
      "background_value": "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
      "bot_avatar": null
    },
    "access_token": "eyJ0eXAiOiJKV1QiLCJhbGc..."
  }
}
```

**錯誤響應** (401):
```json
{
  "error": "Invalid email or password.",
  "success": false
}
```

### 3. 獲取用戶資料

**端點**: `GET /api/user/profile`

**請求頭**:
```
Authorization: Bearer <access_token>
```

**成功響應** (200):
```json
{
  "success": true,
  "message": "Profile retrieved successfully.",
  "data": {
    "user": { ... },
    "profile": { ... }
  }
}
```

### 4. 更新用戶資料

**端點**: `PUT /api/user/profile`

**請求頭**:
```
Authorization: Bearer <access_token>
Content-Type: application/json
```

**請求體**:
```json
{
  "language": "en",
  "theme": "dark",
  "background_type": "solid",
  "background_value": "#667eea",
  "bot_avatar": "https://..."
}
```

**成功響應** (200):
```json
{
  "success": true,
  "message": "Profile updated successfully.",
  "data": {
    "profile": { ... }
  }
}
```

### 5. 更新用戶頭像

**端點**: `PUT /api/user/avatar`

**請求頭**:
```
Authorization: Bearer <access_token>
Content-Type: application/json
```

**請求體**:
```json
{
  "avatar": "data:image/png;base64,..." 或 "https://..."
}
```

**成功響應** (200):
```json
{
  "success": true,
  "message": "Avatar updated successfully.",
  "data": {
    "user": { ... }
  }
}
```

### 6. 健康檢查

**端點**: `GET /api/health`

**成功響應** (200):
```json
{
  "success": true,
  "message": "API is running."
}
```

## 🔐 JWT 認證

所有受保護的端點都需要在請求頭中提供 JWT token：

```
Authorization: Bearer <token>
```

Token 從登入或註冊響應中獲取，默認有效期為 30 天。

## 📝 驗證規則

### 用戶名驗證
- 最少 3 個字符，最多 80 個字符
- 只允許字母、數字和下劃線
- 必須唯一

### 郵箱驗證
- 必須是有效的郵箱格式
- 必須唯一

### 密碼驗證
- 最少 6 個字符
- 客戶端和服務器端都進行驗證

## 🚀 前端集成

### 簽名註冊

前端 `signup.html` 調用 API：

```javascript
const response = await fetch('http://localhost:5000/api/signup', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    username: 'john_doe',
    email: 'john@gmail.com',
    password: 'securePassword123',
    confirm_password: 'securePassword123'
  })
});

const data = await response.json();

if (data.success) {
  localStorage.setItem('xiaoice_access_token', data.data.access_token);
  localStorage.setItem('xiaoice_user', JSON.stringify(data.data.user));
  window.location.href = 'index.html';
}
```

### 登入

前端 `login.html` 調用 API：

```javascript
const response = await fetch('http://localhost:5000/api/login', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    email: 'john@gmail.com',
    password: 'securePassword123'
  })
});

const data = await response.json();

if (data.success) {
  localStorage.setItem('xiaoice_access_token', data.data.access_token);
  localStorage.setItem('xiaoice_user', JSON.stringify(data.data.user));
  window.location.href = 'index.html';
}
```

### 受保護的請求

使用 JWT token 訪問受保護的端點：

```javascript
const token = localStorage.getItem('xiaoice_access_token');

const response = await fetch('http://localhost:5000/api/user/profile', {
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  }
});

const data = await response.json();
```

## 🛡️ 安全性考慮

> ⚠️ **重要**: 以下是生產環境必須實施的安全措施

1. **密鑰管理**
   - 更改 `SECRET_KEY` 和 `JWT_SECRET_KEY`
   - 使用環境變量存儲敏感信息
   - 定期輪換密鑰

2. **HTTPS**
   - 始終在生產環境中使用 HTTPS
   - 在代理（如 Nginx）中配置 SSL/TLS

3. **CORS**
   - 限制 CORS 源到允許的域名
   - 不要在生產環境中使用 `*`

4. **密碼安全**
   - 已使用 Werkzeug 進行密碼哈希
   - 考慮添加密碼複雜性規則

5. **速率限制**
   - 實現登入嘗試速率限制
   - 防止暴力攻擊

6. **輸入驗證**
   - 所有輸入都經過驗證
   - 防止 SQL 注入

7. **日誌和監控**
   - 實現審計日誌
   - 監控異常活動

## 🐛 故障排除

### 數據庫錯誤

```bash
# 刪除舊數據庫
rm backend/xiaoice.db

# 重新運行應用（將自動創建新數據庫）
python run.py
```

### CORS 錯誤

確保前端應用在 CORS 允許的源中。編輯 `app.py` 中的 CORS 配置：

```python
CORS(app, resources={
    r"/api/*": {
        "origins": ["http://localhost:5500", "https://yourdomain.com"],
        "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        "allow_headers": ["Content-Type", "Authorization"]
    }
})
```

### JWT 超期

Token 默認有效期 30 天。可在 `config.py` 中修改：

```python
JWT_ACCESS_TOKEN_EXPIRES = timedelta(days=30)
```

## 📦 部署

### 使用 Gunicorn (推薦)

```bash
# 安裝 Gunicorn
pip install gunicorn

# 運行應用
gunicorn -w 4 -b 0.0.0.0:5000 app:create_app
```

### 使用 Docker

創建 `Dockerfile`：

```dockerfile
FROM python:3.9

WORKDIR /app

COPY requirements.txt .
RUN pip install -r requirements.txt

COPY . .

CMD ["python", "run.py"]
```

構建並運行：

```bash
docker build -t xiaoice-api .
docker run -p 5000:5000 xiaoice-api
```

## 📚 相關文檔

- [前端登入系統文檔](README-LOGIN.md)
- [Flask 官方文檔](https://flask.palletsprojects.com/)
- [SQLAlchemy 文檔](https://docs.sqlalchemy.org/)
- [JWT 認證文檔](https://flask-jwt-extended.readthedocs.io/)

## 🔄 API 測試工具

推薦使用以下工具測試 API：

1. **Postman** - https://www.postman.com/
2. **Insomnia** - https://insomnia.rest/
3. **cURL** - 命令行工具

### 使用 cURL 示例

```bash
# 註冊
curl -X POST http://localhost:5000/api/signup \
  -H "Content-Type: application/json" \
  -d '{
    "username": "john_doe",
    "email": "john@gmail.com",
    "password": "securePassword123",
    "confirm_password": "securePassword123"
  }'

# 登入
curl -X POST http://localhost:5000/api/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@gmail.com",
    "password": "securePassword123"
  }'

# 獲取資料（需要 token）
curl -X GET http://localhost:5000/api/user/profile \
  -H "Authorization: Bearer <your_token>"
```

## 📞 支持

遇到問題？請檢查：
1. Flask 應用是否在運行
2. 是否啟用了 CORS
3. 數據庫連接是否正確
4. JWT token 是否有效

---

**版本**: 1.0  
**最後更新**: 2025年10月19日  
**狀態**: ✅ 生產就緒
