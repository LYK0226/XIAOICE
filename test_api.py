#!/usr/bin/env python3
"""
測試 Google AI Studio API 連接
使用此腳本驗證 API key 設定是否正確
"""

import os
import sys
from dotenv import load_dotenv

# 載入環境變數
load_dotenv()

print("🔍 檢查 Google AI Studio API 設定...\n")

# 檢查 API key
api_key = os.environ.get('GOOGLE_API_KEY')
if not api_key:
    print("❌ 錯誤：GOOGLE_API_KEY 未在環境變數中設定")
    print("   請在 .env 文件中設定您的 API key")
    print("   範例：GOOGLE_API_KEY=\"your-api-key-here\"")
    sys.exit(1)

print(f"✅ API Key 已找到（長度：{len(api_key)} 字元）")

# 嘗試導入 google.generativeai
try:
    import google.generativeai as genai
    print("✅ google.generativeai 套件已正確安裝")
except ImportError as e:
    print("❌ 錯誤：無法導入 google.generativeai")
    print(f"   {e}")
    print("   請執行：pip install google-generativeai")
    sys.exit(1)

# 配置 API
try:
    genai.configure(api_key=api_key)
    print("✅ API 已成功配置")
except Exception as e:
    print(f"❌ 錯誤：無法配置 API")
    print(f"   {e}")
    sys.exit(1)

# 測試模型
model_name = os.environ.get('GEMINI_MODEL', 'gemini-1.5-flash')
print(f"\n📡 測試模型：{model_name}")

try:
    model = genai.GenerativeModel(model_name)
    print("✅ 模型初始化成功")
except Exception as e:
    print(f"❌ 錯誤：無法初始化模型")
    print(f"   {e}")
    sys.exit(1)

# 發送測試請求
print("\n💬 發送測試請求...")
try:
    response = model.generate_content("請用繁體中文說：Hello! 測試成功！")
    print("✅ API 請求成功！")
    print(f"\n📝 AI 回應：\n{response.text}\n")
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
    files = genai.list_files()
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
