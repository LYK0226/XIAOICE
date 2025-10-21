#!/bin/bash
# 快速启动 PostgreSQL + pgAdmin（无需密码）

echo "🚀 启动 PostgreSQL 和 pgAdmin..."
echo "=================================="

# 启动 Docker 服务
docker-compose up -d

echo ""
echo "⏳ 等待服务启动..."
sleep 5

echo ""
echo "✅ 服务已启动！"
echo ""
echo "📊 访问信息："
echo "  🖥️  pgAdmin URL:      http://localhost:5050"
echo "  📧 登录邮箱:        admin@xiaoice.local"
echo "  🔐 登录密码:        admin"
echo ""
echo "🗄️  数据库连接信息："
echo "  主机:               postgres"
echo "  端口:               5432"
echo "  数据库:             xiaoice"
echo "  用户名:             xiaoice_user"
echo "  密码:               xiaoice_password"
echo ""
echo "📝 创建 pgAdmin 连接步骤："
echo "  1. 打开 http://localhost:5050"
echo "  2. 用 admin@xiaoice.local / admin 登录"
echo "  3. 右键 'Servers' > 'Create' > 'Server'"
echo "  4. 名称: 'XIAOICE'"
echo "  5. 切换到 'Connection' 标签"
echo "  6. 输入上面的连接信息"
echo "  7. 点击 'Save'"
echo ""
echo "🛑 停止服务："
echo "  docker-compose down"
echo ""
