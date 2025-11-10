"""
快速生成问卷的示例脚本
展示如何使用 PDFQuestionnaire 生成题目
"""

from app.adk import PDFQuestionnaire
import os

def quick_generate_quiz(pdf_path: str, num_questions: int = 5, user_id: str = 'user_001'):
    """
    快速生成选择题问卷
    
    Args:
        pdf_path: PDF 文件路径
        num_questions: 题目数量
        user_id: 用户 ID
    
    Returns:
        PDFQuestionnaire: 问卷对象
    """
    print(f"🔄 正在从 PDF 生成 {num_questions} 道选择题...")
    
    # 创建选择题问卷
    qnr = PDFQuestionnaire(
        pdf_path=pdf_path,
        user_id=user_id,
        max_questions=num_questions,
        question_type='choice'  # 选择题
    )
    
    print(f"✅ 成功生成 {len(qnr.questions)} 道题目！\n")
    
    # 显示题目
    print("=" * 70)
    print("📋 生成的题目")
    print("=" * 70)
    
    for idx, q_data in enumerate(qnr.questions, 1):
        print(f"\n【题目 {idx}】")
        print(q_data['question'])
        print()
        
        for opt_idx, option in enumerate(q_data['options'], 1):
            # 标记正确答案
            is_correct = (opt_idx - 1) == q_data.get('correct_answer', -1)
            marker = "✓ [正确]" if is_correct else ""
            print(f"  {opt_idx}. {option} {marker}")
    
    print("\n" + "=" * 70)
    
    return qnr


def generate_from_latest_pdf(num_questions: int = 5):
    """
    从最新上传的 PDF 生成题目
    
    Args:
        num_questions: 题目数量
    """
    # 查找最新的 PDF
    upload_dir = 'app/static/upload'
    if not os.path.exists(upload_dir):
        print("❌ 未找到上传目录")
        return None
    
    pdf_files = [f for f in os.listdir(upload_dir) if f.lower().endswith('.pdf')]
    if not pdf_files:
        print("❌ 没有找到 PDF 文件")
        print("请先在聊天界面上传 PDF 文件")
        return None
    
    # 按修改时间排序，取最新的
    pdf_files_with_time = [
        (f, os.path.getmtime(os.path.join(upload_dir, f)))
        for f in pdf_files
    ]
    pdf_files_with_time.sort(key=lambda x: x[1], reverse=True)
    latest_pdf = pdf_files_with_time[0][0]
    
    pdf_path = os.path.join(upload_dir, latest_pdf)
    
    print(f"📄 使用最新 PDF: {latest_pdf}\n")
    
    return quick_generate_quiz(pdf_path, num_questions)


if __name__ == "__main__":
    import sys
    
    print("=" * 70)
    print("🎓 PDF 题目生成器")
    print("=" * 70)
    print()
    
    # 检查命令行参数
    if len(sys.argv) > 1:
        # 提供了 PDF 路径
        pdf_path = sys.argv[1]
        num_q = int(sys.argv[2]) if len(sys.argv) > 2 else 5
        
        if os.path.exists(pdf_path):
            qnr = quick_generate_quiz(pdf_path, num_q)
        else:
            print(f"❌ 文件不存在: {pdf_path}")
    else:
        # 使用最新上传的 PDF
        qnr = generate_from_latest_pdf(num_questions=5)
    
    if qnr:
        print("\n💡 提示:")
        print("  - 运行 qnr.ask_questions() 开始作答")
        print("  - 运行 qnr.save_to_file() 保存记录")
        print(f"  - Test ID: {qnr.test_id}")
