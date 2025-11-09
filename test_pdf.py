#!/usr/bin/env python3
"""
测试 PDF 读取功能
"""

from app import create_app
from app.models import db, UserApiKey
from app.vertex_ai import generate_streaming_response
from app.adk import read_pdf, get_pdf_info
import os

app = create_app()

def test_pdf_functions():
    """测试 PDF 基础功能"""
    print("🧪 测试 PDF 基础功能...")
    print("=" * 70)
    
    # 测试错误处理
    print("\n1. 测试错误处理（文件不存在）:")
    result = get_pdf_info('nonexistent.pdf')
    print(f"   success: {result['success']}")
    print(f"   error: {result.get('error', 'N/A')}")
    
    print("\n✅ PDF 基础功能测试完成！")
    print("\n提示: 要测试实际 PDF 文件，请:")
    print("   1. 上传一个 PDF 文件到 uploads/ 目录")
    print("   2. 在聊天界面上传 PDF 文件")
    print("   3. AI 会自动读取并分析 PDF 内容")


def test_with_real_pdf():
    """如果有真实的 PDF 文件，测试完整流程"""
    # 查找 uploads 目录中的 PDF 文件
    upload_dir = 'uploads'
    pdf_files = []
    
    if os.path.exists(upload_dir):
        pdf_files = [f for f in os.listdir(upload_dir) if f.lower().endswith('.pdf')]
    
    if not pdf_files:
        print("\n📁 未找到 PDF 文件进行测试")
        print("   你可以将测试 PDF 文件放到 uploads/ 目录中")
        return
    
    print(f"\n📄 找到 PDF 文件: {pdf_files[0]}")
    pdf_path = os.path.join(upload_dir, pdf_files[0])
    
    # 测试读取 PDF 信息
    print("\n获取 PDF 信息...")
    info = get_pdf_info(pdf_path)
    if info['success']:
        print(f"   ✅ 文件大小: {info['file_size_mb']} MB")
        print(f"   ✅ 页数: {info['num_pages']}")
        print(f"   ✅ 是否加密: {info['is_encrypted']}")
    
    # 测试读取内容
    print("\n读取 PDF 内容（前 3 页）...")
    content = read_pdf(pdf_path, max_pages=3)
    if content['success']:
        print(f"   ✅ 读取了 {content['pages_read']} / {content['num_pages']} 页")
        print(f"   ✅ 内容预览: {content['text'][:200]}...")
        
        # 测试与 AI 集成
        print("\n🤖 测试 AI 分析 PDF...")
        with app.app_context():
            key = db.session.get(UserApiKey, 1)
            if key:
                api_key = key.get_decrypted_key()
                
                print("   问题: 请总结这个 PDF 的主要内容")
                print("   AI 回复: ", end="", flush=True)
                
                for chunk in generate_streaming_response(
                    message="请总结这个 PDF 的主要内容，用 3-5 句话概括。",
                    pdf_path=pdf_path,
                    api_key=api_key,
                    model_name='gemini-2.5-flash'
                ):
                    print(chunk, end="", flush=True)
                
                print("\n\n   ✅ AI 分析完成！")
            else:
                print("   ⚠️  未找到 API key，跳过 AI 测试")


if __name__ == "__main__":
    test_pdf_functions()
    test_with_real_pdf()
    
    print("\n" + "=" * 70)
    print("📚 PDF 功能使用说明:")
    print("=" * 70)
    print("\n在聊天界面中:")
    print("  1. 点击上传按钮，选择 PDF 文件")
    print("  2. 输入你的问题（例如: '总结这个文档'）")
    print("  3. 发送消息")
    print("  4. AI 会自动读取 PDF 并回答你的问题")
    print("\n支持的功能:")
    print("  ✅ 自动提取 PDF 文本内容")
    print("  ✅ 支持多页 PDF（最多 50 页）")
    print("  ✅ 获取 PDF 元数据（作者、标题等）")
    print("  ✅ AI 可以分析、总结、回答 PDF 相关问题")
    print()
