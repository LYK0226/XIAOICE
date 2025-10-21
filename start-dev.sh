#!/bin/bash
# XIAOICE 开发环境启动脚本（支持 SQLite 或 PostgreSQL + pgAdmin）

echo "🚀 启动 XIAOICE 应用"
echo "=================================="

# 选择数据库类型
echo ""
echo "选择数据库类型："
echo "1) SQLite (默认，快速开发)"
echo "2) PostgreSQL + pgAdmin (完整数据库管理)"
echo ""
read -p "请输入选择 [1-2] (默认: 1): " db_choice

if [ "$db_choice" == "2" ]; then
    echo ""
    echo "📍 启动 PostgreSQL 和 pgAdmin..."
    docker-compose up -d
    sleep 5
    
    export SQLALCHEMY_DATABASE_URI="postgresql://xiaoice_user:xiaoice_password@localhost:5432/xiaoice"
    
    echo "✅ PostgreSQL 和 pgAdmin 已启动"
    echo "   🔗 pgAdmin: http://localhost:5050"
    echo "   📧 登录邮箱: admin@xiaoice.local"
    echo "   🔐 登录密码: admin"
    echo ""
    echo "📌 在 pgAdmin 中添加服务器连接："
    echo "   主机: postgres"
    echo "   端口: 5432"
    echo "   用户名: xiaoice_user"
    echo "   密码: xiaoice_password"
    echo ""
else
    export SQLALCHEMY_DATABASE_URI="sqlite:///xiaoice.db"
    echo "📍 使用 SQLite 数据库"
fi

# 启动 Flask 后端（5000 端口）
echo "📍 启动 Flask 后端（5000 端口）..."
cd backend
python3 run.py > /tmp/flask.log 2>&1 &
FLASK_PID=$!
sleep 3

# 启动前端（8080 端口）
echo "📍 启动前端服务器（8080 端口）..."
cd ../frontend
python3 -m http.server 8080 > /tmp/frontend.log 2>&1 &
FRONTEND_PID=$!
sleep 2

echo ""
echo "✅ 所有服务已启动！"
echo ""
echo "📊 服务状态："
echo "  🌐 前端:     http://localhost:8080"
echo "  🔌 API:      http://localhost:5000/api/health"
if [ "$db_choice" == "2" ]; then
    echo "  🗄️  数据库:    PostgreSQL (localhost:5432)"
    echo "  �️  pgAdmin:   http://localhost:5050"
else
    echo "  �💾 数据库:    SQLite (xiaoice.db)"
fi
echo ""
echo "📝 进程信息："
echo "  Flask PID:    $FLASK_PID"
echo "  Frontend PID: $FRONTEND_PID"
echo ""
echo "🛑 停止服务："
if [ "$db_choice" == "2" ]; then
    echo "  docker-compose down"
fi
echo "  kill $FLASK_PID $FRONTEND_PID"
echo "  或按 Ctrl+C"
echo ""

# 等待进程
wait $FLASK_PID $FRONTEND_PID
