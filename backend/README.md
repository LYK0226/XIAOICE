# XIAOICE Flask Backend 🚀

完整的 Flask REST API，用於 XIAOICE 智能聊天助手應用。

## ⚡ 快速開始

### 方法 1: 自動設置（推薦）

#### Linux/macOS:
```bash
bash setup.sh
```

#### Windows:
```cmd
setup.bat
```

### 方法 2: 手動設置

```bash
# 安裝依賴
pip install -r requirements.txt

# 運行應用
python run.py
```

## 📁 文件說明

| 文件 | 說明 |
|------|------|
| `app.py` | Flask 應用主文件 |
| `config.py` | 配置管理 |
| `models.py` | 數據庫模型 |
| `routes.py` | API 路由 |
| `run.py` | 啟動腳本 |
| `requirements.txt` | Python 依賴 |
| `.env` | 環境變量配置 |
| `test_api.py` | API 測試腳本 |
| `README-BACKEND.md` | 完整 API 文檔 |

## 🔌 API 端點

```
POST   /api/signup              # 用戶註冊
POST   /api/login               # 用戶登入
GET    /api/user/profile        # 獲取用戶資料（需認證）
PUT    /api/user/profile        # 更新用戶資料（需認證）
PUT    /api/user/avatar         # 更新頭像（需認證）
GET    /api/health              # 健康檢查
```

## 🧪 測試 API

```bash
# 在後端運行後
python test_api.py
```

## 📚 文檔

- [完整 API 文檔](README-BACKEND.md)
- [快速開始指南](../BACKEND-QUICKSTART.md)
- [集成總結](../FLASK-INTEGRATION-SUMMARY.md)

## 🔧 配置

編輯 `.env` 文件配置：

```env
FLASK_ENV=development          # 開發/生產模式
FLASK_DEBUG=True               # 調試模式
SECRET_KEY=your-key            # Flask 密鑰
SQLALCHEMY_DATABASE_URI=...    # 數據庫 URI
JWT_SECRET_KEY=your-jwt-key    # JWT 密鑰
```

## 💾 數據庫

自動使用 SQLite (`xiaoice.db`)，首次運行時自動創建。

查看數據庫：
- 使用 [SQLiteBrowser](https://sqlitebrowser.org/)
- 或使用 Python: `python -c "from models import *; ..."`

## 🚀 部署

使用 Gunicorn：
```bash
pip install gunicorn
gunicorn -w 4 app:create_app()
```

使用 Docker：
```bash
docker build -t xiaoice-api .
docker run -p 5000:5000 xiaoice-api
```

## ⚙️ 故障排除

### 端口被占用
```bash
# Linux/macOS
lsof -i :5000
kill -9 <PID>

# Windows
netstat -ano | findstr :5000
taskkill /PID <PID> /F
```

### 模塊找不到
```bash
pip install -r requirements.txt
```

### CORS 錯誤
檢查 `app.py` 中的 CORS 配置，確保前端地址在允許列表中。

## 📊 技術棧

- **框架**: Flask 2.3.3
- **ORM**: SQLAlchemy 2.0.21
- **認證**: Flask-JWT-Extended 4.5.2
- **數據庫**: SQLite (開發) / PostgreSQL (生產)
- **CORS**: Flask-CORS 4.0.0

## 🔐 安全

- ✅ 密碼加密 (Werkzeug)
- ✅ JWT 認證
- ✅ 輸入驗證
- ✅ CORS 保護

⚠️ 生產環境必須更改 `SECRET_KEY` 和 `JWT_SECRET_KEY`

## 📞 聯繫

遇到問題？查看完整文檔或提交 Issue。

---

**版本**: 1.0  
**狀態**: ✅ 準備好使用  
**最後更新**: 2025年10月19日
