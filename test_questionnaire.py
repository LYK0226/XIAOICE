#!/usr/bin/env python3
"""
PDF 問卷功能測試腳本
"""

import os
from app.adk import PDFQuestionnaire, create_questionnaire_from_pdf, load_questionnaire_from_file

def test_basic_questionnaire():
    """測試基本問卷功能"""
    print("=" * 70)
    print("🧪 測試 1: 基本問卷功能")
    print("=" * 70)
    
    # 查找 PDF 文件
    upload_dir = 'app/static/upload'
    pdf_files = []
    if os.path.exists(upload_dir):
        pdf_files = [f for f in os.listdir(upload_dir) if f.lower().endswith('.pdf')]
    
    if not pdf_files:
        print("⚠️  未找到 PDF 文件，請先上傳 PDF 到 app/static/upload 目錄")
        return False
    
    pdf_path = os.path.join(upload_dir, pdf_files[0])
    print(f"📄 使用 PDF: {pdf_files[0]}\n")
    
    # 創建問卷
    qnr = PDFQuestionnaire(pdf_path, user_id='test_user_001', max_questions=5)
    
    print(f"✅ 問卷創建成功！")
    print(f"   Test ID: {qnr.test_id}")
    print(f"   User ID: {qnr.user_id}")
    print(f"   總題數: {len(qnr.questions)}\n")
    
    # 顯示問題
    print("生成的問題：")
    for idx, q in enumerate(qnr.questions, 1):
        print(f"   Q{idx}: {q}")
    
    return True


def test_save_and_load():
    """測試儲存和載入功能"""
    print("\n" + "=" * 70)
    print("🧪 測試 2: 儲存和載入功能")
    print("=" * 70)
    
    # 查找 PDF 文件
    upload_dir = 'app/static/upload'
    pdf_files = [f for f in os.listdir(upload_dir) if f.lower().endswith('.pdf')]
    if not pdf_files:
        return False
    
    pdf_path = os.path.join(upload_dir, pdf_files[0])
    
    # 創建問卷並模擬作答
    qnr = create_questionnaire_from_pdf(pdf_path, 'test_user_002', max_questions=3)
    
    print(f"📝 模擬作答 {len(qnr.questions)} 題...")
    for idx, q in enumerate(qnr.questions, 1):
        answer = f"這是第 {idx} 題的測試答案：Lorem ipsum dolor sit amet."
        qnr.save_qa(q, answer)
        print(f"   ✓ Q{idx} 已作答")
    
    # 獲取摘要
    summary = qnr.get_summary()
    print(f"\n📊 問卷摘要：")
    for key, value in summary.items():
        print(f"   {key}: {value}")
    
    # 儲存到文件
    print(f"\n💾 儲存問答記錄...")
    output_path = qnr.save_to_file()
    
    if output_path:
        print(f"   ✅ 已儲存到: {output_path}")
        
        # 載入文件
        print(f"\n📂 載入問答記錄...")
        result = load_questionnaire_from_file(output_path)
        
        if result['success']:
            data = result['data']
            print(f"   ✅ 載入成功！")
            print(f"   Test ID: {data['test_id']}")
            print(f"   User ID: {data['user_id']}")
            print(f"   總題數: {len(data['questions'])}")
            print(f"   已答題數: {len(data['answers'])}")
        else:
            print(f"   ❌ 載入失敗: {result['error']}")
    
    return True


def test_interactive_mode():
    """測試互動模式"""
    print("\n" + "=" * 70)
    print("🧪 測試 3: 互動模式測試")
    print("=" * 70)
    
    choice = input("\n是否要進行互動式問卷測試？(y/n): ").strip().lower()
    if choice != 'y':
        print("已跳過互動測試")
        return
    
    # 查找 PDF 文件
    upload_dir = 'app/static/upload'
    pdf_files = [f for f in os.listdir(upload_dir) if f.lower().endswith('.pdf')]
    
    if pdf_files:
        print(f"\n找到以下 PDF 文件：")
        for idx, f in enumerate(pdf_files, 1):
            print(f"   {idx}. {f}")
        
        choice = input(f"\n選擇文件 (1-{len(pdf_files)}): ").strip()
        try:
            file_idx = int(choice) - 1
            if 0 <= file_idx < len(pdf_files):
                pdf_path = os.path.join(upload_dir, pdf_files[file_idx])
            else:
                print("無效選擇，使用第一個文件")
                pdf_path = os.path.join(upload_dir, pdf_files[0])
        except:
            pdf_path = os.path.join(upload_dir, pdf_files[0])
    else:
        pdf_path = input("請輸入 PDF 檔案路徑：").strip()
    
    user_id = input("請輸入使用者 ID：").strip() or "test_user"
    max_q = input("最多幾題？(預設 5)：").strip() or "5"
    
    try:
        qnr = PDFQuestionnaire(pdf_path, user_id, int(max_q))
        print(f"\n✅ 成功生成 {len(qnr.questions)} 道問題！")
        
        # 開始作答
        qnr.ask_questions()
        
        # 顯示結果
        summary = qnr.get_summary()
        print("\n📊 問卷摘要：")
        for key, value in summary.items():
            print(f"   {key}: {value}")
        
        # 儲存選項
        save = input("\n儲存問答記錄？(y/n): ").strip().lower()
        if save == 'y':
            output_path = qnr.save_to_file()
            print(f"\n所有問答記錄：")
            for idx, qa in enumerate(qnr.answers, 1):
                print(f"\n   [{idx}]")
                print(f"   Q: {qa['question']}")
                print(f"   A: {qa['answer']}")
                print(f"   時間: {qa['timestamp']}")
    
    except Exception as e:
        print(f"❌ 錯誤: {str(e)}")


def main():
    """主測試函數"""
    print("\n" + "=" * 70)
    print("📚 PDF 問卷自動生成與問答儲存功能 - 測試腳本")
    print("=" * 70)
    
    # 測試 1: 基本功能
    if test_basic_questionnaire():
        # 測試 2: 儲存和載入
        test_save_and_load()
    
    # 測試 3: 互動模式
    test_interactive_mode()
    
    print("\n" + "=" * 70)
    print("✅ 所有測試完成！")
    print("=" * 70)
    print("\n💡 提示：")
    print("   - 問答記錄儲存在 qa_logs/ 目錄")
    print("   - 可以使用 load_questionnaire_from_file() 載入歷史記錄")
    print("   - 每個問卷都有唯一的 test_id\n")


if __name__ == "__main__":
    main()
