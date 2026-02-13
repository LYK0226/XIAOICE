#!/usr/bin/env python3
"""
测试 VertexServiceAccount 模型的加密功能
"""
import json
from app import create_app, db
from app.models import VertexServiceAccount

def test_vertex_account():
    app = create_app()
    
    with app.app_context():
        # 测试用的服务账号 JSON（示例）
        test_service_account = {
            "type": "service_account",
            "project_id": "test-project-12345",
            "private_key_id": "key123",
            "private_key": "-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBg...\n-----END PRIVATE KEY-----\n",
            "client_email": "test-sa@test-project.iam.gserviceaccount.com",
            "client_id": "123456789",
            "auth_uri": "https://accounts.google.com/o/oauth2/auth",
            "token_uri": "https://oauth2.googleapis.com/token",
            "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
            "client_x509_cert_url": "https://www.googleapis.com/robot/v1/metadata/x509/test-sa%40test-project.iam.gserviceaccount.com"
        }
        
        print("=" * 60)
        print("测试 VertexServiceAccount 加密功能")
        print("=" * 60)
        
        # 测试 1: 创建并加密
        print("\n1️⃣  测试创建和加密...")
        account = VertexServiceAccount(
            user_id=1,
            name="Test Vertex Account",
            location="us-central1"
        )
        
        try:
            account.set_encrypted_credentials(json.dumps(test_service_account))
            print("   ✅ 加密成功")
            print(f"   - Project ID: {account.project_id}")
            print(f"   - Client Email: {account.client_email}")
            print(f"   - 加密数据长度: {len(account.encrypted_credentials)} 字符")
        except Exception as e:
            print(f"   ❌ 加密失败: {e}")
            return
        
        # 测试 2: 解密
        print("\n2️⃣  测试解密...")
        try:
            decrypted = account.get_decrypted_credentials()
            decrypted_dict = json.loads(decrypted)
            print("   ✅ 解密成功")
            print(f"   - 解密后 project_id: {decrypted_dict['project_id']}")
            print(f"   - 解密后 client_email: {decrypted_dict['client_email']}")
        except Exception as e:
            print(f"   ❌ 解密失败: {e}")
            return
        
        # 测试 3: 验证数据完整性
        print("\n3️⃣  测试数据完整性...")
        if decrypted_dict == test_service_account:
            print("   ✅ 数据完整，加密/解密循环成功")
        else:
            print("   ❌ 数据不一致")
            return
        
        # 测试 4: to_dict() 方法
        print("\n4️⃣  测试 to_dict() 方法...")
        dict_data = account.to_dict()
        print("   ✅ to_dict() 成功")
        print(f"   - 包含字段: {', '.join(dict_data.keys())}")
        print(f"   - Masked email: {dict_data.get('masked_client_email', 'N/A')}")
        
        # 测试 5: 包含凭证的 to_dict()
        print("\n5️⃣  测试 to_dict(include_credentials=True)...")
        dict_with_creds = account.to_dict(include_credentials=True)
        if 'credentials' in dict_with_creds and dict_with_creds['credentials']:
            print("   ✅ 凭证已包含")
        else:
            print("   ❌ 凭证未包含")
        
        # 测试 6: 验证缺失字段的错误处理
        print("\n6️⃣  测试错误处理...")
        invalid_json = json.dumps({"type": "service_account"})  # 缺少 project_id
        test_account = VertexServiceAccount(user_id=1, name="Invalid")
        try:
            test_account.set_encrypted_credentials(invalid_json)
            print("   ❌ 应该抛出 ValueError")
        except ValueError as e:
            print(f"   ✅ 正确捕获错误: {e}")
        
        print("\n" + "=" * 60)
        print("✅ 所有测试通过！")
        print("=" * 60)

if __name__ == "__main__":
    test_vertex_account()
