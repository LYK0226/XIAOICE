#!/bin/bash
# XIAOICE 一键启动脚本

set -e
cd /workspaces/XIAOICE

echo "🚀 启动 XIAOICE..."

# 1. 停止现有服务
pkill -9 -f "python3 run.py" 2>/dev/null || true
pkill -9 -f "http.server" 2>/dev/null || true
sleep 1

# 2. 启动 Docker
docker-compose up -d && sleep 3

# 3. 初始化数据库
./init-db.sh

# 4. 启动 Flask
cd backend && nohup python3 run.py > /tmp/flask.log 2>&1 & sleep 2

# 5. 启动前端
cd ../frontend && nohup python3 -m http.server 8080 > /tmp/frontend.log 2>&1 &

echo ""
echo "✅ 所有服务已启动！"
echo ""
echo "访问地址:"
echo "  • 前端: http://localhost:8080"
echo "  • 注册: http://localhost:8080/signup.html"
echo "  • 登录: http://localhost:8080/login.html"
echo "  • API:  http://localhost:5000/api"
echo ""
