#!/usr/bin/env python3
"""
選擇題問卷測試腳本
"""

import os
from app.adk import PDFQuestionnaire

def demo_choice_quiz():
    """演示選擇題功能"""
    print("=" * 70)
    print("📝 PDF 選擇題問卷演示")
    print("=" * 70)
    
    # 查找 PDF 文件
    upload_dir = 'app/static/upload'
    pdf_files = []
    if os.path.exists(upload_dir):
        pdf_files = [f for f in os.listdir(upload_dir) if f.lower().endswith('.pdf')]
    
    if not pdf_files:
        print("\n⚠️  未找到 PDF 文件")
        print("請先上傳 PDF 到 app/static/upload 目錄")
        return
    
    print(f"\n找到 {len(pdf_files)} 個 PDF 文件")
    print(f"使用: {pdf_files[0]}\n")
    
    pdf_path = os.path.join(upload_dir, pdf_files[0])
    
    # 創建選擇題問卷
    print("🔄 正在生成選擇題...")
    qnr = PDFQuestionnaire(
        pdf_path=pdf_path,
        user_id='demo_user',
        max_questions=5,
        question_type='choice'  # 選擇題模式
    )
    
    print(f"✅ 成功生成 {len(qnr.questions)} 道選擇題！")
    print(f"Test ID: {qnr.test_id}\n")
    
    # 顯示問題預覽
    print("=" * 70)
    print("📋 題目預覽")
    print("=" * 70)
    
    for idx, q_data in enumerate(qnr.questions, 1):
        print(f"\n【題目 {idx}】{q_data['question']}")
        
        for opt_idx, option in enumerate(q_data['options'], 1):
            # 顯示正確答案標記（僅供演示）
            is_correct = (opt_idx - 1) == q_data.get('correct_answer', -1)
            marker = "✓" if is_correct else " "
            print(f"  [{marker}] {opt_idx}. {option[:70]}{'...' if len(option) > 70 else ''}")
        
        if 'context' in q_data:
            print(f"\n  💡 來源: {q_data['context'][:80]}...")
    
    print("\n" + "=" * 70)
    print("🎮 開始作答")
    print("=" * 70)
    
    # 互動作答
    choice = input("\n是否要開始作答？(y/n): ").strip().lower()
    if choice == 'y':
        qnr.ask_questions()
        
        # 顯示詳細摘要
        summary = qnr.get_summary()
        print("\n" + "=" * 70)
        print("📊 測驗結果")
        print("=" * 70)
        
        for key, value in summary.items():
            key_zh = {
                'test_id': 'Test ID',
                'user_id': '使用者 ID',
                'question_type': '問題類型',
                'total_questions': '總題數',
                'answered_questions': '已答題數',
                'completion_rate': '完成率',
                'pdf_pages': 'PDF 頁數',
                'correct_answers': '答對題數',
                'score': '分數'
            }.get(key, key)
            
            value_zh = value
            if key == 'question_type':
                value_zh = '選擇題' if value == 'choice' else '簡答題'
            
            print(f"  {key_zh}: {value_zh}")
        
        # 儲存選項
        save = input("\n💾 是否儲存問答記錄？(y/n): ").strip().lower()
        if save == 'y':
            output_path = qnr.save_to_file()
            
            if output_path:
                print("\n✅ 問答記錄已儲存！")
                print(f"檔案位置: {output_path}")
                
                # 顯示答題詳情
                show_detail = input("\n是否顯示答題詳情？(y/n): ").strip().lower()
                if show_detail == 'y':
                    print("\n" + "=" * 70)
                    print("📝 答題詳情")
                    print("=" * 70)
                    
                    for idx, ans in enumerate(qnr.answers, 1):
                        print(f"\n【第 {idx} 題】")
                        print(f"問題: {ans['question']}")
                        print(f"答案: {ans['answer']}")
                        
                        if ans.get('is_correct') is not None:
                            status = "✅ 正確" if ans['is_correct'] else "❌ 錯誤"
                            print(f"結果: {status}")
                            
                            if not ans['is_correct'] and 'correct_answer_index' in ans:
                                correct_idx = ans['correct_answer_index']
                                correct_opt = ans['options'][correct_idx]
                                print(f"正確答案: {correct_idx + 1}. {correct_opt}")
                        
                        print(f"時間: {ans['timestamp']}")
    else:
        print("\n已取消作答")
    
    print("\n" + "=" * 70)
    print("✅ 演示完成！")
    print("=" * 70)


if __name__ == "__main__":
    demo_choice_quiz()
