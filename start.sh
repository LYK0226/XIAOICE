#!/bin/bash
# 🔓 XIAOICE 終極一鍵啟動 - 開啟所有端口
# 使用方式: ./start.sh 或 /workspaces/XIAOICE/start.sh

set -e

echo ""
echo "╔═══════════════════════════════════════════════════════════════╗"
echo "║       🚀 XIAOICE 終極一鍵啟動 - 開啟所有端口                 ║"
echo "╚═══════════════════════════════════════════════════════════════╝"
echo ""

cd /workspaces/XIAOICE

# 1. 停止現有服務
echo "🛑 停止現有服務..."
pkill -9 -f "python3 run.py" 2>/dev/null || true
pkill -9 -f "http.server" 2>/dev/null || true
sleep 1

# 2. 啟動 Docker
echo "🐳 啟動 Docker 服務..."
docker-compose up -d && sleep 3

# 3. 初始化數據庫
echo "💾 初始化數據庫..."
./init-db.sh > /dev/null 2>&1

# 4. 啟動 Flask API
echo "⚙️  啟動 Flask API..."
cd /workspaces/XIAOICE/backend && nohup python3 run.py > /tmp/flask.log 2>&1 & sleep 2

# 5. 啟動前端服務
echo "📱 啟動前端服務..."
cd /workspaces/XIAOICE/frontend && nohup python3 -m http.server -b 0.0.0.0 8080 > /tmp/frontend.log 2>&1 &

sleep 2

echo ""
echo "╔═══════════════════════════════════════════════════════════════╗"
echo "║                  ✅ 所有服務已啟動！                         ║"
echo "╚═══════════════════════════════════════════════════════════════╝"
echo ""

# 6. 顯示信息
echo "🔓 已開放的端口:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  ✅ 5432  PostgreSQL      postgresql://localhost:5432"
echo "  ✅ 5050  pgAdmin         http://localhost:5050"
echo "  ✅ 5000  Flask API       http://localhost:5000/api"
echo "  ✅ 8080  前端應用        http://localhost:8080"
echo ""

echo "🌐 立即訪問:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  📱 應用主頁:    http://localhost:8080"
echo "  🔐 用戶登入:    http://localhost:8080/login.html"
echo "  ✍️  用戶註冊:    http://localhost:8080/signup.html"
echo "  🔧 API 服務:    http://localhost:5000/api"
echo "  📊 數據庫管理:  http://localhost:5050"
echo ""

echo "🔐 預設登入:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  pgAdmin:"
echo "    📧 郵箱: admin@example.com"
echo "    🔑 密碼: admin123"
echo ""
echo "  PostgreSQL:"
echo "    👤 用戶: xiaoice_user"
echo "    🔑 密碼: xiaoice_password"
echo ""

echo "📝 驗證端口:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  運行此命令驗證:"
echo "  /workspaces/XIAOICE/verify-ports.sh"
echo ""

echo "📚 查看日誌:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Flask 日誌:    tail -f /tmp/flask.log"
echo "  前端日誌:      tail -f /tmp/frontend.log"
echo "  Docker 日誌:   docker-compose logs -f"
echo ""

echo "🎉 所有端口已開放，可以開始使用了！"
echo ""
