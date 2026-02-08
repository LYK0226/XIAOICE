#!/usr/bin/env python3
"""
测试 Vertex AI API 端点
需要先创建用户并获取 access_token
"""
import json

def print_api_endpoints():
    """打印新增的 Vertex AI API 端点"""
    print("=" * 70)
    print("Vertex AI Service Account API 端点")
    print("=" * 70)
    
    endpoints = [
        {
            "method": "POST",
            "path": "/api/vertex/accounts",
            "description": "创建新的 Vertex AI 配置",
            "body": {
                "name": "My Vertex Account",
                "location": "us-central1",
                "service_account_json": "{...完整的服务账号 JSON...}"
            }
        },
        {
            "method": "GET",
            "path": "/api/vertex/accounts",
            "description": "获取用户所有 Vertex AI 配置",
            "body": None
        },
        {
            "method": "PUT",
            "path": "/api/vertex/accounts/<id>",
            "description": "更新指定的 Vertex AI 配置",
            "body": {
                "name": "Updated Name",
                "location": "us-west1"
            }
        },
        {
            "method": "DELETE",
            "path": "/api/vertex/accounts/<id>",
            "description": "删除指定的 Vertex AI 配置",
            "body": None
        },
        {
            "method": "POST",
            "path": "/api/vertex/accounts/<id>/activate",
            "description": "激活指定的 Vertex AI 配置（设为当前使用）",
            "body": None
        }
    ]
    
    for i, ep in enumerate(endpoints, 1):
        print(f"\n{i}. {ep['method']} {ep['path']}")
        print(f"   描述: {ep['description']}")
        if ep['body']:
            print(f"   请求体: {json.dumps(ep['body'], indent=2, ensure_ascii=False)}")
        print(f"   需要 JWT: ✅ (Authorization: Bearer <token>)")
    
    print("\n" + "=" * 70)
    print("使用说明")
    print("=" * 70)
    print("""
1. 用户上传服务账号 JSON 文件
2. 前端自动提取 project_id 并显示
3. POST 到 /api/vertex/accounts 创建配置
4. 系统自动：
   - 验证 JSON 格式
   - 提取 project_id 和 client_email
   - 加密完整的服务账号 JSON
   - 存储到 vertex_service_accounts 表
5. 用户可以创建多个配置，通过 activate 端点切换使用

安全特性：
✅ 使用 Fernet 对称加密存储凭证
✅ 只存储加密后的数据
✅ 每次使用时才解密
✅ 支持用户级别的配置隔离
""")

if __name__ == "__main__":
    print_api_endpoints()
