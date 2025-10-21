# 🚀 快速開始

## 一鍵啟動

```bash
/workspaces/XIAOICE/quick-fix.sh
```

## 訪問地址

| 服務 | URL |
|------|-----|
| 前端 | http://localhost:8080 |
| 註冊 | http://localhost:8080/signup.html |
| 登入 | http://localhost:8080/login.html |
| API | http://localhost:5000/api |
| pgAdmin | http://localhost:5050 |

## 預設登入

**pgAdmin:**
```
郵箱: admin@example.com
密碼: admin123
```

**PostgreSQL:**
```
用戶: xiaoice_user
密碼: xiaoice_password
```

## 手動啟動（可選）

```bash
# Docker (PostgreSQL + pgAdmin)
docker-compose up -d

# Flask API
cd backend && python3 run.py &

# 前端服務
cd frontend && python3 -m http.server 8080 &
```

## API 端點

### 註冊
```http
POST /api/signup
{
  "username": "user123",
  "email": "user@example.com",
  "password": "password123",
  "confirm_password": "password123"
}
```

### 登入
```http
POST /api/login
{
  "email": "user@example.com",
  "password": "password123"
}
```

### 個人資料（需要 Token）
```http
GET /api/user/profile
Authorization: Bearer {access_token}
```

## 常用命令

```bash
# 數據庫管理
./manage-tables.sh check          # 查看表
./manage-tables.sh create         # 創建表
./manage-tables.sh reset          # 重置

# 查看日誌
tail -f /tmp/flask.log
tail -f /tmp/frontend.log

# 診斷
./diagnose.sh
```

## 常見問題

**Q: 註冊頁面加載中？**
```bash
/workspaces/XIAOICE/quick-fix.sh
```

**Q: 端口被占用？**
```bash
lsof -i :5000 | grep -v grep | awk '{print $2}' | xargs kill -9
```

**Q: 重置數據庫？**
```bash
/workspaces/XIAOICE/manage-tables.sh reset
```

---

📚 詳細文檔見 `USER_AUTH_GUIDE.md`
