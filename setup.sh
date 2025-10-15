#!/bin/bash

# XIAOICE Gemini API 快速配置脚本

echo "=================================="
echo "  🤖 XIAOICE Gemini API 配置工具"
echo "=================================="
echo ""

# 检查是否提供了 API 密钥
if [ -z "$1" ]; then
    echo "❌ 错误：请提供 Gemini API 密钥"
    echo ""
    echo "用法："
    echo "  ./setup.sh YOUR_API_KEY"
    echo ""
    echo "如何获取 API 密钥："
    echo "  1. 访问 https://makersuite.google.com/app/apikey"
    echo "  2. 使用 Google 账号登录"
    echo "  3. 点击 'Create API Key' 创建新密钥"
    echo "  4. 复制密钥并运行: ./setup.sh YOUR_COPIED_KEY"
    echo ""
    exit 1
fi

API_KEY="$1"

# 备份原文件
echo "📦 正在备份原文件..."
cp script.js script.js.backup
echo "✅ 备份完成: script.js.backup"
echo ""

# 替换 API 密钥
echo "🔧 正在配置 API 密钥..."
sed -i "s/const GEMINI_API_KEY = 'YOUR_API_KEY_HERE';/const GEMINI_API_KEY = '$API_KEY';/" script.js

if [ $? -eq 0 ]; then
    echo "✅ API 密钥配置成功！"
    echo ""
    echo "🎉 配置完成！"
    echo ""
    echo "下一步："
    echo "  1. 启动服务器: python3 -m http.server 8000"
    echo "  2. 打开浏览器访问: http://localhost:8000/app/templates/index.html"
    echo "  3. 测试 API: http://localhost:8000/app/templates/test-api.html"
    echo ""
else
    echo "❌ 配置失败，请手动编辑 script.js 文件"
    exit 1
fi
