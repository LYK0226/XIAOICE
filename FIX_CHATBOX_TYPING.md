# 🔧 聊天盒子显示"正在輸入..."的修复方案

## 问题原因

你的聊天盒子一直显示"正在輸入..."是因为：

1. ❌ **缺少 Google AI API Key** - 没有配置API密钥，无法调用AI模型
2. ✅ **应用上下文错误** - 已修复（代码中的 `current_app.logger` 问题）

## 解决步骤

### 步骤 1️⃣：获取 Google AI Studio API Key

1. 访问 [Google AI Studio](https://aistudio.google.com/app/apikey)
2. 登录你的 Google 账号
3. 点击 "Create API Key" 或 "Get API Key"
4. 复制生成的 API Key（格式类似：`AIzaSy...`）

### 步骤 2️⃣：添加 API Key 到系统

#### 方法A：通过Web界面（推荐）

1. 打开浏览器访问你的聊天应用
2. 登录账号
3. 点击左侧边栏的 **⚙️ 设定** 按钮
4. 选择 **"高级"** 标签页
5. 点击 **"➕ 添加 API 金鑰"** 按钮
6. 填写表单：
   - **金鑰名稱**: 例如 "My Google AI Key"
   - **API 金鑰**: 粘贴刚才复制的 API Key
7. 点击 **"保存"**
8. 系统会自动选择这个key

#### 方法B：通过命令行

运行脚本添加API Key：

```bash
python add_api_key.py
```

按提示输入：
- 用户 ID (默认: 1)
- API Key 名称 (例如: My Google AI Key)  
- Google AI Studio API Key

### 步骤 3️⃣：选择 AI 模型

1. 在设定页面的 **"高级"** 标签
2. 在 **"AI 模型選擇"** 下拉菜单中选择：
   - `Gemini 2.5 Flash (推薦)` - 快速响应
   - `Gemini 2.5 Pro (高品質)` - 高质量输出
   - `Gemini 2.0 Flash ADK (實驗性)` - ADK实验版本

### 步骤 4️⃣：测试聊天

1. 返回聊天页面
2. 输入一条消息，例如："你好"
3. 点击发送
4. 应该会看到 AI 的回复！

## 验证 API Key 是否正确配置

运行测试脚本：

```bash
# 测试基本API连接
python test_api.py

# 测试ADK模型
python test_adk.py
```

如果测试通过，你会看到：
```
✅ API Key 已獲取
✅ API 已成功配置
✅ API 請求成功！
📝 AI 回應：
Hello! 測試成功！
```

## 常见问题排查

### Q1: 还是显示"正在輸入..."？

**检查清单**：
- [ ] 确认已添加 API Key
- [ ] 确认 API Key 已被选中（在设定中查看）
- [ ] 确认 `.env` 文件中有 `ENCRYPTION_KEY`
- [ ] 查看浏览器控制台（F12）是否有错误信息
- [ ] 查看 Flask 终端输出是否有错误

### Q2: 显示 "API key error" 或 "unauthorized"？

你的 API Key 可能无效或过期：
1. 重新生成新的 API Key
2. 在设定中删除旧的 key，添加新的

### Q3: 显示 "user location is not supported"？

Google AI 服务在你的地区不可用：
1. 使用 VPN 连接到支持的地区（如美国）
2. 或者考虑使用其他 AI 服务

### Q4: 如何生成 ENCRYPTION_KEY？

在终端运行：
```bash
python3 -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
```

然后将输出添加到 `.env` 文件：
```
ENCRYPTION_KEY="your_generated_key_here"
```

## 技术细节

### 数据流程

```
用户输入消息
    ↓
前端: chatbox.js → sendMessageWithFiles()
    ↓
API调用: POST /chat/stream
    ↓
后端: routes.py → chat_stream()
    ↓
获取用户的 API Key 和 AI 模型设置
    ↓
调用: vertex_ai.generate_streaming_response()
    ↓
Google Gemini API (使用你的 API Key)
    ↓
流式返回文本块
    ↓
前端: 逐字显示打字效果
```

### 修复的代码变更

**文件**: `app/routes.py`

**问题**: 在生成器函数中使用 `current_app.logger` 导致应用上下文错误

**修复**: 在生成器外部捕获 logger 引用
```python
# Before (错误)
def generate():
    try:
        ...
    except Exception as e:
        current_app.logger.error(...)  # ❌ 上下文错误

# After (修复)
logger = current_app.logger  # ✅ 在外部捕获

def generate():
    try:
        ...
    except Exception as e:
        logger.error(...)  # ✅ 使用捕获的引用
```

## 需要帮助？

如果问题仍然存在：

1. **查看完整日志**：
   ```bash
   # 查看 Flask 应用的终端输出
   # 查看浏览器控制台 (F12 → Console)
   ```

2. **验证数据库**：
   ```bash
   python view_database.py
   ```
   检查是否有 API Key 记录

3. **检查环境变量**：
   ```bash
   cat .env
   ```
   确认有 `ENCRYPTION_KEY`

---

**最后更新**: 2025-11-09
**版本**: 1.0
