#!/usr/bin/env python3
"""
重置并重新添加 API Key
"""

import os
import sys
from dotenv import load_dotenv

# 加载新的 .env 文件
load_dotenv(override=True)

# 检查 ENCRYPTION_KEY
encryption_key = os.environ.get('ENCRYPTION_KEY')
if not encryption_key:
    print("❌ 错误：ENCRYPTION_KEY 未设置")
    sys.exit(1)

print("✅ ENCRYPTION_KEY 已加载")
print(f"   长度: {len(encryption_key)}")

from app import create_app
from app.models import db, UserApiKey, UserProfile

app = create_app()
with app.app_context():
    # 删除所有旧的 API keys（因为它们用错误的密钥加密）
    old_keys = UserApiKey.query.all()
    for key in old_keys:
        db.session.delete(key)
    
    db.session.commit()
    print(f"\n✅ 已删除 {len(old_keys)} 个旧的 API keys")
    
    # 重置用户的 selected_api_key_id
    profiles = UserProfile.query.all()
    for profile in profiles:
        profile.selected_api_key_id = None
    
    db.session.commit()
    print(f"✅ 已重置 {len(profiles)} 个用户配置")
    
    print("\n" + "="*80)
    print("  现在请在网页上重新添加你的 Google AI API Key")
    print("="*80)
    print()
    print("步骤：")
    print("1. 刷新浏览器页面")
    print("2. 点击左侧 '⚙️ 设定' 按钮")
    print("3. 选择 '高级' 标签")
    print("4. 点击 '添加 API 金鑰'")
    print("5. 填入你的 Google AI Studio API Key")
    print()
