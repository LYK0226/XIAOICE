# XIAOICE 用户认证系统指南

## ✅ 已完成的设置

### 1. 数据库表
已创建以下表：
- **users**: 存储用户信息（id, username, email, password_hash, avatar, created_at, updated_at, is_active）
- **user_profiles**: 存储用户个人设置（id, user_id, language, theme, background_type, background_value, bot_avatar, created_at, updated_at）

### 2. 后端 API

#### 注册 API
```
POST /api/signup
Content-Type: application/json

{
  "username": "john_doe",
  "email": "john@example.com",
  "password": "password123",
  "confirm_password": "password123"
}

响应 (201 Created):
{
  "success": true,
  "message": "Registered",
  "data": {
    "user": {
      "id": 1,
      "username": "john_doe",
      "email": "john@example.com",
      "avatar": null,
      "created_at": "2025-10-21T...",
      "is_active": true
    },
    "access_token": "eyJ0eXAiOiJKV1QiLC..."
  }
}
```

#### 登录 API
```
POST /api/login
Content-Type: application/json

{
  "email": "john@example.com",
  "password": "password123"
}

响应 (200 OK):
{
  "success": true,
  "message": "Login success",
  "data": {
    "user": {...},
    "profile": {...},
    "access_token": "eyJ0eXAiOiJKV1QiLC..."
  }
}
```

#### 获取个人资料 API
```
GET /api/user/profile
Authorization: Bearer {access_token}

响应 (200 OK):
{
  "success": true,
  "data": {
    "user": {...},
    "profile": {...}
  }
}
```

### 3. 前端实现

#### 登录页面
- 位置: `frontend/login.html`
- 功能:
  - 检查用户输入（邮箱/用户名和密码）
  - 调用 `/api/login` 获取 token
  - 保存 token 和用户信息到 localStorage
  - 登录成功后重定向到主页

#### 注册页面
- 位置: `frontend/signup.html`
- 功能:
  - 用户注册表单
  - 密码确认验证
  - 调用 `/api/signup` 创建新用户
  - 成功后自动登录并重定向

#### 主页权限检查
- 位置: `frontend/index.html`
- 功能:
  - 页面加载时检查 localStorage 中的 `xiaoice_loggedIn` 和 `xiaoice_access_token`
  - 如果未登录，重定向到登录页面
  - 显示登录用户的邮箱

---

## 🚀 快速开始

### 1. 启动所有服务
```bash
cd /workspaces/XIAOICE

# 启动 Docker (PostgreSQL + pgAdmin)
docker-compose up -d

# 启动 Flask 后端
cd backend && python3 run.py &

# 启动前端
cd ../frontend && python3 -m http.server 8080 &
```

### 2. 访问应用
- **前端**: http://localhost:8080
- **API**: http://localhost:5000/api/health
- **pgAdmin**: http://localhost:5050

### 3. 测试流程

#### 注册新用户
1. 打开 http://localhost:8080/signup.html
2. 填写表单：
   - 用户名: `testuser`
   - 邮箱: `test@example.com`
   - 密码: `Test1234`
   - 确认密码: `Test1234`
3. 点击注册
4. 应该看到成功消息并自动重定向到主页

#### 登录
1. 打开 http://localhost:8080/login.html
2. 输入：
   - 邮箱: `test@example.com`
   - 密码: `Test1234`
3. 点击登入
4. 应该看到主页（聊天界面）

#### 验证数据库
1. 打开 pgAdmin: http://localhost:5050
2. 登录凭证:
   - 邮箱: `admin@example.com`
   - 密码: `admin123`
3. 在左侧找到 XIAOICE 服务器 → 数据库 → xiaoice → Schemas → public → Tables
4. 查看 `users` 和 `user_profiles` 表中的数据

---

## 🔐 安全功能

### 密码安全
- 密码在后端使用 `werkzeug.security.generate_password_hash()` 进行哈希
- 登录时使用 `check_password_hash()` 验证
- 密码在传输中应使用 HTTPS（生产环境）

### 身份验证
- 使用 JWT (JSON Web Tokens)
- Token 存储在 localStorage（前端）
- 保护的 API 需要 `Authorization: Bearer {token}` 头

### 验证规则
| 字段 | 规则 |
|------|------|
| **username** | 3-80 字符，只允许字母、数字、下划线 |
| **email** | 有效的邮箱格式 |
| **password** | 至少 6 个字符 |
| **unique** | username 和 email 在数据库中必须唯一 |

---

## 🐛 故障排查

### 问题: 注册失败 "User exists"
- **原因**: 该邮箱或用户名已被注册
- **解决**: 使用不同的邮箱或用户名

### 问题: 登录失败 "Invalid credentials"
- **原因**: 邮箱或密码错误
- **解决**: 检查邮箱和密码是否正确

### 问题: 无法连接数据库
- **原因**: PostgreSQL 未启动或连接信息错误
- **解决**: 运行 `docker-compose up -d` 启动 PostgreSQL

### 问题: Token 过期
- **原因**: Token 有效期为 30 天
- **解决**: 重新登录获取新 Token

---

## 📊 数据库架构

### users 表
```sql
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(80) UNIQUE NOT NULL,
    email VARCHAR(120) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    avatar TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    is_active BOOLEAN DEFAULT TRUE
);
```

### user_profiles 表
```sql
CREATE TABLE user_profiles (
    id SERIAL PRIMARY KEY,
    user_id INTEGER UNIQUE NOT NULL REFERENCES users(id),
    language VARCHAR(20) DEFAULT 'zh-CN',
    theme VARCHAR(20) DEFAULT 'light',
    background_type VARCHAR(20) DEFAULT 'gradient',
    background_value TEXT DEFAULT 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    bot_avatar TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

---

## 🔄 下一步

1. **添加邮箱验证** - 注册时发送验证邮件
2. **密码重置功能** - 忘记密码时重置
3. **社交登录** - 添加 Google、GitHub 登录
4. **用户个人资料编辑** - 修改用户信息
5. **两因素认证 (2FA)** - 提高安全性

---

需要帮助？查看代码或运行测试！ 🚀
