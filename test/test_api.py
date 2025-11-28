#!/usr/bin/env python3
"""
測試 Google AI Studio API 連接
使用此腳本驗證 API key 設定是否正確
"""

import os
import sys
from dotenv import load_dotenv

import os
import sys
from dotenv import load_dotenv

# 載入環境變數
load_dotenv()

print("🔍 檢查 Google AI Studio API 設定...\n")

# 檢查 ENCRYPTION_KEY
encryption_key = os.environ.get('ENCRYPTION_KEY')
if not encryption_key:
    print("❌ 錯誤：ENCRYPTION_KEY 未在環境變數中設定")
    print("   請在 .env 文件中設定您的加密金鑰")
    sys.exit(1)

print("✅ ENCRYPTION_KEY 已找到")

# 導入應用程式和模型
try:
    from app import create_app
    from app.models import UserApiKey
    print("✅ 應用程式和模型已正確導入")
except ImportError as e:
    print("❌ 錯誤：無法導入應用程式或模型")
    print(f"   {e}")
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
        print("   請檢查 ENCRYPTION_KEY 是否正確")
        sys.exit(1)

print(f"✅ API Key 已從資料庫獲取（長度：{len(api_key)} 字元）")

# 嘗試導入 google.genai
try:
    from google import genai
    print("✅ google-genai 套件已正確安裝")
except ImportError as e:
    print("❌ 錯誤：無法導入 google.genai")
    print(f"   {e}")
    print("   請執行：pip install google-genai")
    sys.exit(1)

# 配置 API
try:
    client = genai.Client(api_key=api_key)
    print("✅ API 已成功配置")
except Exception as e:
    print(f"❌ 錯誤：無法配置 API")
    print(f"   {e}")
    sys.exit(1)

# 測試模型
model_name = os.environ.get('GEMINI_MODEL', 'gemini-2.5-flash')
print(f"\n📡 測試模型：{model_name}")

# 發送測試請求
print("\n💬 發送測試請求...")
try:
    response = client.models.generate_content(
        model=model_name,
        contents="請用繁體中文說：Hello! 測試成功！"
    )
    print("✅ API 請求成功！")
    print(f"\n📝 AI 回應：\n{response.candidates[0].content.parts[0].text}\n")
except Exception as e:
    print(f"❌ 錯誤：API 請求失敗")
    print(f"   {e}")
    
    # 提供常見錯誤的解決建議
    error_str = str(e).lower()
    if "api key" in error_str or "invalid" in error_str:
        print("\n💡 建議：")
        print("   1. 確認 API key 是否正確")
        print("   2. 前往 https://makersuite.google.com/app/apikey 重新生成")
        print("   3. 確保 API key 已啟用")
    elif "quota" in error_str or "limit" in error_str:
        print("\n💡 建議：")
        print("   1. 您可能已超過免費配額限制")
        print("   2. 請稍後再試")
        print("   3. 考慮升級到付費方案")
    
    sys.exit(1)

# 測試圖像功能（可選）
print("🖼️  測試圖像上傳功能...")
try:
    # 列出可用的文件（如果有的話）
    files = client.files.list()
    print(f"✅ 圖像上傳功能可用（當前已上傳 {len(list(files))} 個文件）")
except Exception as e:
    print(f"⚠️  警告：圖像功能測試失敗：{e}")

print("\n" + "="*50)
print("🎉 所有測試通過！您的 Google AI Studio API 已正確設定。")
print("="*50)
print("\n現在可以啟動應用程式：")
print("  python run.py")
print("\n或使用 Gunicorn（生產環境）：")
print("  gunicorn -w 4 -b 0.0.0.0:8080 'app:create_app()'")
