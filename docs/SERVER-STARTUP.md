# Flask 服務器啟動指南

## 問題分析

Flask 開發服務器 (`python3 run.py`) 無法持續運行的原因：

1. **調試模式自動重啟** - 代碼變化時自動重載
2. **終端關閉時進程終止** - 沒有正確的後台運行配置
3. **單線程限制** - 開發服務器只支持有限的併發
4. **無自動恢復** - 如果崩潰不會自動重啟

## 解決方案

### 方案 1: 使用 Gunicorn（推薦）

**啟動方式：**
```bash
cd /workspaces/XIAOICE/backend
gunicorn --bind 0.0.0.0:5000 --workers 4 --threads 2 --worker-class gthread 'run:app'
```

**或使用腳本：**
```bash
bash /workspaces/XIAOICE/backend/start_gunicorn.sh
```

**優點：**
- ✅ 生產級性能
- ✅ 多進程/多線程支持
- ✅ 自動錯誤處理
- ✅ 更穩定可靠

### 方案 2: 使用 Docker Compose（最推薦）

**一鍵啟動整個應用棧（PostgreSQL + Flask）：**
```bash
cd /workspaces/XIAOICE
docker-compose up -d
```

**查看日誌：**
```bash
docker-compose logs -f flask
```

**停止應用：**
```bash
docker-compose down
```

**優點：**
- ✅ 容器隔離
- ✅ 自動重啟（`restart: unless-stopped`）
- ✅ 健康檢查
- ✅ 數據持久化
- ✅ 易於部署

### 方案 3: 後台運行（簡單）

**使用 nohup：**
```bash
cd /workspaces/XIAOICE/backend
nohup python3 run.py > server.log 2>&1 &
```

**查看日誌：**
```bash
tail -f /workspaces/XIAOICE/backend/server.log
```

**停止服務器：**
```bash
pkill -f "python3 run.py"
```

## 推薦配置

### 開發環境
使用方案 3 (nohup) 或方案 1 (Gunicorn)

### 生產環境
使用方案 2 (Docker Compose)

## 常用命令

```bash
# 查看進程狀態
ps aux | grep -E "python|gunicorn|flask" | grep -v grep

# 檢查端口 5000 的進程
lsof -i :5000

# 查看服務器日誌
tail -f /workspaces/XIAOICE/backend/server.log

# 手動測試 API
curl http://localhost:5000/api/health

# 查看 Docker 容器狀態
docker ps | grep xiaoice

# 查看 Docker 日誌
docker logs xiaoice-flask
```

## 更新 requirements.txt

已自動添加 Gunicorn：
```bash
pip install gunicorn
pip freeze > requirements.txt
```

## 自動啟動配置（可選）

### Linux Systemd Service

創建 `/etc/systemd/system/xiaoice.service`:
```ini
[Unit]
Description=XIAOICE Flask Application
After=network.target

[Service]
Type=simple
User=codespace
WorkingDirectory=/workspaces/XIAOICE/backend
ExecStart=/usr/bin/python3 -m gunicorn --bind 0.0.0.0:5000 --workers 4 'run:app'
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

啟用服務：
```bash
sudo systemctl enable xiaoice
sudo systemctl start xiaoice
sudo systemctl status xiaoice
```

## 故障排除

### 端口被佔用
```bash
# 找到佔用進程
lsof -i :5000

# 終止進程
kill -9 <PID>
```

### 數據庫連接失敗
```bash
# 確保 PostgreSQL 容器正在運行
docker ps | grep postgres

# 重啟容器
docker restart xiaoice-postgres
```

### 應用崩潰
```bash
# 查看詳細日誌
docker-compose logs flask

# 或檢查文件日誌
tail -100 /workspaces/XIAOICE/backend/server.log
```

## 驗證服務狀態

```bash
# 檢查 API 健康狀態
curl http://localhost:5000/api/health

# 預期輸出
# {"success": true, "message": "API is running."}
```

## 性能優化建議

1. **Gunicorn Workers 數量**
   - CPU 綁定任務: `2 x CPU cores + 1`
   - IO 綁定任務: `4-12 x CPU cores`
   - 當前配置: 4 workers（適合多數情況）

2. **數據庫連接池**
   ```python
   # 在 config.py 中
   SQLALCHEMY_ENGINE_OPTIONS = {
       'pool_size': 10,
       'pool_recycle': 3600,
       'pool_pre_ping': True
   }
   ```

3. **緩存策略**
   - 使用 Redis 緩存
   - 啟用瀏覽器緩存

## 更多資源

- Gunicorn 文檔: https://gunicorn.org/
- Docker Compose 文檔: https://docs.docker.com/compose/
- Flask 部署: https://flask.palletsprojects.com/deployment/
