#!/usr/bin/env python3
"""
快速添加 API Key 到数据库
"""

import os
import sys
from dotenv import load_dotenv

load_dotenv()

# 检查 ENCRYPTION_KEY
if not os.environ.get('ENCRYPTION_KEY'):
    print("❌ 错误：请先在 .env 文件中设置 ENCRYPTION_KEY")
    print("\n生成加密密钥：")
    print("python3 -c \"from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())\"")
    sys.exit(1)

from app import create_app
from app.models import db, UserApiKey, UserProfile

# 提示用户输入
print("=" * 80)
print("  添加 Google AI API Key")
print("=" * 80)
print()

user_id = input("请输入用户 ID (默认: 1): ").strip() or "1"
key_name = input("请输入 API Key 名称 (例如: My Google AI Key): ").strip()
api_key = input("请输入 Google AI Studio API Key: ").strip()

if not key_name or not api_key:
    print("❌ API Key 名称和密钥都不能为空！")
    sys.exit(1)

app = create_app()
with app.app_context():
    try:
        # 创建新的 API key
        new_key = UserApiKey(user_id=int(user_id), name=key_name)
        new_key.set_encrypted_key(api_key)
        
        db.session.add(new_key)
        db.session.commit()
        
        # 自动选择这个 API key
        user_profile = UserProfile.query.filter_by(user_id=int(user_id)).first()
        if not user_profile:
            user_profile = UserProfile(user_id=int(user_id))
            db.session.add(user_profile)
        
        user_profile.selected_api_key_id = new_key.id
        db.session.commit()
        
        print()
        print("✅ API Key 已成功添加并设置为默认！")
        print(f"   名称: {key_name}")
        print(f"   ID: {new_key.id}")
        print()
        print("🎉 现在你可以在聊天盒子中使用 AI 功能了！")
        
    except Exception as e:
        print(f"❌ 错误：{e}")
        db.session.rollback()
        sys.exit(1)
