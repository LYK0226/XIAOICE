#!/usr/bin/env python3
"""
測試 ADK 模型調用
"""

import os
import sys
from dotenv import load_dotenv

# 載入環境變數
load_dotenv()

print("🔍 測試 ADK 模型調用...\n")

# 導入應用程式
try:
    from app import create_app
    from app.models import UserApiKey
    print("✅ 應用程式已導入")
except ImportError as e:
    print(f"❌ 錯誤：無法導入應用程式\n   {e}")
    sys.exit(1)

# 創建應用程式實例並獲取 API key
app = create_app()
with app.app_context():
    # 從資料庫獲取第一個有效的 API key
    user_api_key = UserApiKey.query.filter_by(is_active=True).first()
    if not user_api_key:
        print("❌ 錯誤：資料庫中沒有找到有效的 API key")
        print("   請確保至少有一個有效的 user_api_keys 記錄")
        sys.exit(1)
    
    api_key = user_api_key.get_decrypted_key()
    if not api_key:
        print("❌ 錯誤：無法解密 API key")
        sys.exit(1)

print(f"✅ API Key 已獲取（長度：{len(api_key)} 字元）")

# 導入 google.genai
try:
    from google import genai
    print("✅ google-genai 套件已正確安裝")
except ImportError as e:
    print(f"❌ 錯誤：無法導入 google.genai\n   {e}")
    sys.exit(1)

# 配置 API
try:
    client = genai.Client(api_key=api_key)
    print("✅ API 已成功配置")
except Exception as e:
    print(f"❌ 錯誤：無法配置 API\n   {e}")
    sys.exit(1)

# 測試 ADK 模型
model_name = 'gemini-2.0-flash-exp'
print(f"\n📡 測試 ADK 模型：{model_name}")

# 發送測試請求
print("\n💬 發送測試請求...")
try:
    response = client.models.generate_content(
        model=model_name,
        contents="請用繁體中文說：Hello! ADK 測試成功！"
    )
    print("✅ ADK API 請求成功！")
    print(f"\n📝 ADK 回應：\n{response.candidates[0].content.parts[0].text}\n")
    print("🎉 ADK 模型可以正常使用！")
except Exception as e:
    print(f"❌ 錯誤：ADK API 請求失敗\n   {e}")
    print("\n💡 可能的原因：")
    print("   1. ADK 模型名稱不正確（請確認正確的模型 ID）")
    print("   2. 您的 API key 沒有訪問此模型的權限")
    print("   3. 此模型在您的地區不可用")
    sys.exit(1)

print("\n✅ 所有測試通過！您現在可以在聊天盒子中使用 ADK 模型了。")
