# 🚀 5 分钟快速开始指南

## 第一步：获取 API 密钥（2 分钟）

1. **打开网站**  
   访问：https://makersuite.google.com/app/apikey

2. **登录账号**  
   使用您的 Google 账号登录

3. **创建密钥**  
   点击蓝色的 **"Create API Key"** 按钮

4. **复制密钥**  
   复制生成的 API 密钥（类似：AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXX）

---

## 第二步：配置密钥（1 分钟）

### 方法 1：使用自动配置脚本（推荐）

```bash
# 在项目目录运行
./setup.sh YOUR_API_KEY
```

### 方法 2：手动配置

1. 打开 `app/static/js/script.js` 文件
2. 找到第 21 行：
   ```javascript
   const GEMINI_API_KEY = 'YOUR_API_KEY_HERE';
   ```
3. 将 `YOUR_API_KEY_HERE` 替换为您的真实密钥
4. 保存文件

---

## 第三步：启动应用（1 分钟）

```bash
# 启动本地服务器
python3 -m http.server 8000
```

---

## 第四步：开始使用（1 分钟）

1. **打开主应用**  
   浏览器访问：http://localhost:8000/app/templates/index.html

2. **测试 API（可选）**  
   访问测试页面：http://localhost:8000/app/templates/test-api.html

3. **开始聊天**  
   在输入框输入消息，AI 会自动回复！

---

## 🎉 完成！

现在您可以：
- ✅ 与 AI 聊天（支持中英文）
- ✅ 上传图片让 AI 识别
- ✅ 切换语言（简中/繁中/英文）
- ✅ 发送表情
- ✅ 自定义头像

---

## ⚠️ 常见问题

### Q: API 调用失败怎么办？
**A:** 
1. 检查密钥是否正确复制（没有多余空格）
2. 访问 app/templates/test-api.html 测试连接
3. 查看浏览器控制台的错误信息

### Q: 每天能用多少次？
**A:** 免费额度：
- 每分钟 60 次请求
- 每天 1500 次请求

### Q: 支持哪些图片格式？
**A:** 
- JPEG、PNG、WebP
- 最大 4MB

### Q: 如何保护 API 密钥？
**A:**
- 不要将包含密钥的代码上传到公共仓库
- 生产环境应该使用后端服务
- 定期更换 API 密钥

---

## 📞 需要帮助？

- 📖 查看完整文档：README.md
- 🔧 API 详细说明：README-API.md
- 🌐 官方文档：https://ai.google.dev/docs

---

**祝您使用愉快！🎊**
