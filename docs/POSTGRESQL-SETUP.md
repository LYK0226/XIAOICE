# PostgreSQL 設置指南

## 1. 安裝 PostgreSQL

### Ubuntu/Debian
```bash
sudo apt-get update
sudo apt-get install postgresql postgresql-contrib
```

### macOS
```bash
brew install postgresql
```

### Windows
下載安裝程序: https://www.postgresql.org/download/windows/

## 2. 啟動 PostgreSQL 服務

### Ubuntu/Debian
```bash
sudo service postgresql start
sudo systemctl enable postgresql  # 開機自啟
```

### macOS
```bash
brew services start postgresql
```

### Windows
PostgreSQL 應該已作為服務安裝

## 3. 創建數據庫和用戶

```bash
# 連接到 PostgreSQL
sudo -u postgres psql

# 在 PostgreSQL 提示符中執行:
CREATE USER postgres WITH PASSWORD 'password';
CREATE DATABASE xiaoice OWNER postgres;
GRANT ALL PRIVILEGES ON DATABASE xiaoice TO postgres;
\q
```

## 4. 驗證連接

```bash
psql -U postgres -d xiaoice -h localhost -W
# 輸入密碼: password
```

## 5. 初始化數據庫表

```bash
cd /workspaces/XIAOICE/backend
python3 init_postgres_db.py
```

## 6. 配置說明

文件 `.env` 包含 PostgreSQL 連接字符串:
```
SQLALCHEMY_DATABASE_URI=postgresql://postgres:password@localhost:5432/xiaoice
```

格式: `postgresql://[username]:[password]@[host]:[port]/[database]`

### 自定義連接設置

修改 `.env` 文件:
- **用戶**: 改為你的 PostgreSQL 用戶名
- **密碼**: 改為你設置的密碼
- **主機**: localhost (默認)
- **端口**: 5432 (默認)
- **數據庫**: xiaoice (或你的數據庫名)

## 7. 故障排除

### 連接被拒絕
```
確保 PostgreSQL 服務正在運行
sudo service postgresql status
sudo service postgresql start
```

### 用戶不存在
```
使用上述步驟重新創建用戶和數據庫
```

### 權限錯誤
```
確保用戶對數據庫有足夠權限:
GRANT ALL PRIVILEGES ON DATABASE xiaoice TO postgres;
```

## 8. 遷移回 SQLite (可選)

如要恢復使用 SQLite:
1. 編輯 `.env`:
   ```
   SQLALCHEMY_DATABASE_URI=sqlite:///xiaoice.db
   ```
2. 重新啟動 Flask 服務器

## 常用 PostgreSQL 命令

```bash
# 列出所有數據庫
psql -U postgres -l

# 連接到特定數據庫
psql -U postgres -d xiaoice

# 備份數據庫
pg_dump -U postgres xiaoice > backup.sql

# 恢復數據庫
psql -U postgres xiaoice < backup.sql

# 刪除數據庫
dropdb -U postgres xiaoice
```

## 設置完成

所有配置已完成！按照上述步驟操作後，你的 XIAOICE 應用將使用 PostgreSQL 數據庫。
