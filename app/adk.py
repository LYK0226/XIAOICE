"""
ADK (Agent Developer Kit) Functions
时间和文档处理工具函数
"""

from datetime import datetime
import pytz
import PyPDF2
import os
from typing import Optional, Dict, List


def get_current_time(timezone: str = 'Asia/Taipei') -> str:
    """
    获取当前时间
    
    Args:
        timezone: 时区，默认为台北时间
        
    Returns:
        str: 当前时间的字符串，格式为 "YYYY年MM月DD日 HH:MM:SS 星期X"
    """
    try:
        tz = pytz.timezone(timezone)
        now = datetime.now(tz)
        
        weekdays = ['星期一', '星期二', '星期三', '星期四', '星期五', '星期六', '星期日']
        weekday_zh = weekdays[now.weekday()]
        
        return f"{now.strftime('%Y年%m月%d日 %H:%M:%S')} {weekday_zh}"
    except Exception as e:
        # 如果时区有问题，使用系统本地时间
        now = datetime.now()
        weekdays = ['星期一', '星期二', '星期三', '星期四', '星期五', '星期六', '星期日']
        weekday_zh = weekdays[now.weekday()]
        return f"{now.strftime('%Y年%m月%d日 %H:%M:%S')} {weekday_zh}"


def read_pdf(file_path: str, max_pages: Optional[int] = None) -> Dict:
    """
    读取 PDF 文件内容
    
    Args:
        file_path: PDF 文件路径
        max_pages: 最多读取的页数，None 表示读取所有页
        
    Returns:
        dict: 包含 PDF 内容和元数据的字典
            - success: bool, 是否成功
            - text: str, 提取的文本内容
            - num_pages: int, 总页数
            - metadata: dict, PDF 元数据
            - error: str, 错误信息（如果失败）
    """
    try:
        # 检查文件是否存在
        if not os.path.exists(file_path):
            return {
                'success': False,
                'error': f'文件不存在: {file_path}'
            }
        
        # 打开 PDF 文件
        with open(file_path, 'rb') as file:
            pdf_reader = PyPDF2.PdfReader(file)
            
            # 获取 PDF 信息
            num_pages = len(pdf_reader.pages)
            metadata = pdf_reader.metadata
            
            # 确定要读取的页数
            pages_to_read = num_pages if max_pages is None else min(max_pages, num_pages)
            
            # 提取文本
            text_content = []
            for page_num in range(pages_to_read):
                page = pdf_reader.pages[page_num]
                text = page.extract_text()
                text_content.append(f"--- 第 {page_num + 1} 页 ---\n{text}\n")
            
            full_text = '\n'.join(text_content)
            
            # 构建元数据字典
            metadata_dict = {}
            if metadata:
                for key, value in metadata.items():
                    # 移除 PDF 元数据的 '/' 前缀
                    clean_key = key.lstrip('/')
                    metadata_dict[clean_key] = str(value) if value else None
            
            return {
                'success': True,
                'text': full_text,
                'num_pages': num_pages,
                'pages_read': pages_to_read,
                'metadata': metadata_dict,
                'file_path': file_path
            }
            
    except PyPDF2.errors.PdfReadError as e:
        return {
            'success': False,
            'error': f'PDF 读取错误: {str(e)}'
        }
    except Exception as e:
        return {
            'success': False,
            'error': f'处理错误: {str(e)}'
        }


def extract_pdf_page(file_path: str, page_number: int) -> Dict:
    """
    提取 PDF 指定页面的内容
    
    Args:
        file_path: PDF 文件路径
        page_number: 页码（从 1 开始）
        
    Returns:
        dict: 包含页面内容的字典
    """
    try:
        if not os.path.exists(file_path):
            return {
                'success': False,
                'error': f'文件不存在: {file_path}'
            }
        
        with open(file_path, 'rb') as file:
            pdf_reader = PyPDF2.PdfReader(file)
            num_pages = len(pdf_reader.pages)
            
            # 检查页码是否有效
            if page_number < 1 or page_number > num_pages:
                return {
                    'success': False,
                    'error': f'页码超出范围。文件共有 {num_pages} 页，请求第 {page_number} 页。'
                }
            
            # 提取指定页面（页码从0开始，所以要减1）
            page = pdf_reader.pages[page_number - 1]
            text = page.extract_text()
            
            return {
                'success': True,
                'page_number': page_number,
                'text': text,
                'total_pages': num_pages
            }
            
    except Exception as e:
        return {
            'success': False,
            'error': f'提取页面错误: {str(e)}'
        }


def get_pdf_info(file_path: str) -> Dict:
    """
    获取 PDF 文件的基本信息（不读取内容）
    
    Args:
        file_path: PDF 文件路径
        
    Returns:
        dict: PDF 文件信息
    """
    try:
        if not os.path.exists(file_path):
            return {
                'success': False,
                'error': f'文件不存在: {file_path}'
            }
        
        with open(file_path, 'rb') as file:
            pdf_reader = PyPDF2.PdfReader(file)
            
            # 获取基本信息
            num_pages = len(pdf_reader.pages)
            metadata = pdf_reader.metadata
            
            # 文件大小
            file_size = os.path.getsize(file_path)
            file_size_mb = file_size / (1024 * 1024)
            
            # 构建元数据
            metadata_dict = {}
            if metadata:
                for key, value in metadata.items():
                    clean_key = key.lstrip('/')
                    metadata_dict[clean_key] = str(value) if value else None
            
            return {
                'success': True,
                'file_path': file_path,
                'file_size_bytes': file_size,
                'file_size_mb': round(file_size_mb, 2),
                'num_pages': num_pages,
                'metadata': metadata_dict,
                'is_encrypted': pdf_reader.is_encrypted
            }
            
    except Exception as e:
        return {
            'success': False,
            'error': f'获取信息错误: {str(e)}'
        }


# 示例用法
if __name__ == "__main__":
    print("当前时间:", get_current_time())
    print("\nPDF 读取示例:")
    print("result = read_pdf('example.pdf', max_pages=5)")
    print("page = extract_pdf_page('example.pdf', 1)")
    print("info = get_pdf_info('example.pdf')")


