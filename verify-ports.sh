#!/bin/bash
# 驗證所有端口是否已開放

echo "🔍 驗證 XIAOICE 端口配置..."
echo "================================"
echo ""

# 檢查 Docker 配置
echo "📋 Docker 配置檢查："
grep -q "0.0.0.0:5432" docker-compose.yml && echo "  ✅ PostgreSQL 5432 - 已開放" || echo "  ❌ PostgreSQL 5432 - 未開放"
grep -q "0.0.0.0:5050" docker-compose.yml && echo "  ✅ pgAdmin 5050 - 已開放" || echo "  ❌ pgAdmin 5050 - 未開放"

# 檢查 Flask 配置
echo ""
echo "📋 Flask 配置檢查："
grep -q "host='0.0.0.0'" backend/app.py && echo "  ✅ Flask 5000 - 已開放" || echo "  ❌ Flask 5000 - 未開放"

# 檢查前端配置
echo ""
echo "📋 前端配置檢查："
grep -q "0.0.0.0:8080" quick-fix.sh && echo "  ✅ 前端 8080 - 已開放" || echo "  ❌ 前端 8080 - 未開放"

# 測試端口連接
echo ""
echo "🧪 測試端口連接（需運行服務）："
echo ""

test_port() {
    local port=$1
    local name=$2
    if timeout 1 bash -c "echo >/dev/tcp/127.0.0.1/$port" 2>/dev/null; then
        echo "  ✅ $port ($name) - 可連接"
    else
        echo "  ⏳ $port ($name) - 服務未啟動"
    fi
}

test_port 5432 "PostgreSQL"
test_port 5050 "pgAdmin"
test_port 5000 "Flask API"
test_port 8080 "前端服務"

echo ""
echo "================================"
echo "✅ 所有端口配置已驗證！"
echo ""
echo "🚀 啟動服務："
echo "   /workspaces/XIAOICE/quick-fix.sh"
echo ""
