#!/bin/bash
# 诊断脚本

echo "🔍 诊断 XIAOICE 应用..."
echo ""

echo "1️⃣  检查进程状态"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
ps aux | grep -E "run.py|http.server|pgadmin" | grep -v grep || echo "❌ 没有运行 Flask、前端或 pgAdmin"
echo ""

echo "2️⃣  检查端口占用"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "端口 5000 (Flask):"
lsof -i :5000 2>/dev/null || echo "  ❌ 未被占用"
echo "端口 8080 (前端):"
lsof -i :8080 2>/dev/null || echo "  ❌ 未被占用"
echo "端口 5432 (PostgreSQL):"
lsof -i :5432 2>/dev/null || echo "  ❌ 未被占用"
echo "端口 5050 (pgAdmin):"
lsof -i :5050 2>/dev/null || echo "  ❌ 未被占用"
echo ""

echo "3️⃣  测试 API 连接"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
timeout 3 curl -s -I http://localhost:5000/api/health > /dev/null 2>&1
if [ $? -eq 0 ]; then
    echo "✅ Flask API 响应正常"
else
    echo "❌ Flask API 无响应"
fi
echo ""

echo "4️⃣  测试前端"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
timeout 3 curl -s http://localhost:8080 | head -3 > /dev/null 2>&1
if [ $? -eq 0 ]; then
    echo "✅ 前端服务器正常"
else
    echo "❌ 前端服务器无响应"
fi
echo ""

echo "5️⃣  检查日志"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
if [ -f /tmp/flask.log ]; then
    echo "Flask 日志最后 3 行:"
    tail -3 /tmp/flask.log
else
    echo "❌ 没有找到 Flask 日志"
fi
echo ""

echo "6️⃣  数据库连接"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
docker-compose ps 2>/dev/null | grep -E "postgres|pgadmin" || echo "❌ Docker 服务未运行"
echo ""

echo "💡 建议："
echo "1. 如果 Flask 无响应，运行: /workspaces/XIAOICE/fix-loading.sh"
echo "2. 如果还是有问题，运行: docker-compose up -d"
echo "3. 然后重启所有服务"
