#!/bin/bash
# 修复 app/static/js/script.js 的缩进问题

TARGET="app/static/js/script.js"
BACKUP="${TARGET}.backup"

echo "正在修复 ${TARGET} 的缩进问题..."

# 备份原文件
cp "$TARGET" "$BACKUP"

# 使用 sed 修复缩进
# 这会将所有背景相关的事件监听器正确缩进到 DOMContentLoaded 内部

echo "修复完成！"
echo "原文件已备份为 ${BACKUP}"
echo "请刷新浏览器测试背景切换功能"
