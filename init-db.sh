#!/bin/bash
# 初始化数据库脚本

echo "🔧 初始化 XIAOICE 数据库..."

cd /workspaces/XIAOICE/backend
python3 database.py create

echo ""
echo "✅ 完成！可以运行: /workspaces/XIAOICE/quick-fix.sh"
