#!/bin/bash
# Gunicorn Server Startup Script
# 使用 Gunicorn 啟動 Flask 服務器（更穩定）

cd /workspaces/XIAOICE/backend

# Kill any existing processes on port 5000
lsof -i :5000 | grep LISTEN | awk '{print $2}' | xargs kill -9 2>/dev/null || true

echo "🚀 正在啟動 XIAOICE Flask 服務器..."
echo "📊 使用 Gunicorn (生產級 WSGI 服務器)"
echo "🌐 地址: http://localhost:5000"
echo ""

# Start Gunicorn with 4 workers
gunicorn \
    --bind 0.0.0.0:5000 \
    --workers 4 \
    --threads 2 \
    --worker-class gthread \
    --timeout 120 \
    --access-logfile - \
    --error-logfile - \
    --log-level info \
    'run:app' &

GUNICORN_PID=$!
echo "✅ Gunicorn PID: $GUNICORN_PID"

# Wait for server to start
sleep 2

# Verify server is running
if curl -s http://localhost:5000/api/health > /dev/null; then
    echo "✅ 服務器已成功啟動！"
else
    echo "❌ 服務器啟動失敗"
    exit 1
fi

# Keep process in foreground
wait $GUNICORN_PID
