# PDF 读取功能文档

## 📚 功能概述

XIAOICE 聊天机器人现在支持 PDF 文件分析功能！你可以上传 PDF 文件，AI 会自动读取内容并回答相关问题。

## ✨ 功能特性

- ✅ **自动提取文本**: 自动从 PDF 中提取所有文本内容
- ✅ **多页支持**: 支持最多 50 页的 PDF 文件
- ✅ **元数据读取**: 获取 PDF 的作者、标题等信息
- ✅ **智能分析**: AI 可以总结、分析、回答 PDF 相关问题
- ✅ **错误处理**: 完善的错误处理和用户反馈

## 🚀 使用方法

### 在聊天界面中使用

1. **上传 PDF 文件**
   - 点击聊天框中的上传按钮（📎）
   - 选择 PDF 文件
   
2. **提问**
   - 输入你想问的问题，例如：
     - "请总结这个文档的主要内容"
     - "文档中提到了哪些重点？"
     - "帮我提取文档中的关键信息"
   
3. **获取回答**
   - AI 会自动读取 PDF 内容
   - 并根据内容回答你的问题

### 在代码中使用

```python
from app.adk import read_pdf, extract_pdf_page, get_pdf_info

# 1. 读取整个 PDF（限制页数）
result = read_pdf('document.pdf', max_pages=10)
if result['success']:
    print(f"总页数: {result['num_pages']}")
    print(f"已读取: {result['pages_read']} 页")
    print(f"内容: {result['text']}")

# 2. 读取指定页面
page = extract_pdf_page('document.pdf', 1)  # 读取第1页
if page['success']:
    print(f"第 {page['page_number']} 页内容:")
    print(page['text'])

# 3. 获取 PDF 信息（不读取内容）
info = get_pdf_info('document.pdf')
if info['success']:
    print(f"文件大小: {info['file_size_mb']} MB")
    print(f"总页数: {info['num_pages']}")
    print(f"是否加密: {info['is_encrypted']}")
    print(f"元数据: {info['metadata']}")
```

## 📖 API 函数说明

### `read_pdf(file_path, max_pages=None)`

读取 PDF 文件的全部或部分内容。

**参数:**
- `file_path` (str): PDF 文件路径
- `max_pages` (int, optional): 最多读取的页数，None 表示读取所有页

**返回值:**
```python
{
    'success': bool,           # 是否成功
    'text': str,              # 提取的文本内容
    'num_pages': int,         # 总页数
    'pages_read': int,        # 实际读取的页数
    'metadata': dict,         # PDF 元数据
    'file_path': str,         # 文件路径
    'error': str              # 错误信息（失败时）
}
```

### `extract_pdf_page(file_path, page_number)`

提取 PDF 指定页面的内容。

**参数:**
- `file_path` (str): PDF 文件路径
- `page_number` (int): 页码（从 1 开始）

**返回值:**
```python
{
    'success': bool,          # 是否成功
    'page_number': int,       # 页码
    'text': str,             # 页面文本
    'total_pages': int,      # 总页数
    'error': str             # 错误信息（失败时）
}
```

### `get_pdf_info(file_path)`

获取 PDF 文件的基本信息（不读取内容）。

**参数:**
- `file_path` (str): PDF 文件路径

**返回值:**
```python
{
    'success': bool,              # 是否成功
    'file_path': str,            # 文件路径
    'file_size_bytes': int,      # 文件大小（字节）
    'file_size_mb': float,       # 文件大小（MB）
    'num_pages': int,            # 总页数
    'metadata': dict,            # PDF 元数据
    'is_encrypted': bool,        # 是否加密
    'error': str                 # 错误信息（失败时）
}
```

## 🔧 技术实现

### 后端集成

PDF 功能已集成到 `vertex_ai.py` 的流式响应生成器中：

```python
from app.vertex_ai import generate_streaming_response

# PDF 会自动处理
for chunk in generate_streaming_response(
    message="总结这个文档",
    pdf_path="/path/to/document.pdf",
    api_key=api_key,
    model_name='gemini-2.5-flash'
):
    print(chunk, end="", flush=True)
```

### 前端集成

当用户上传 PDF 文件时：
1. 文件保存到 `uploads/` 目录
2. `routes.py` 检测 `.pdf` 扩展名
3. 将路径传递给 `generate_streaming_response`
4. AI 自动读取并分析 PDF 内容

## ⚙️ 配置

PDF 功能的配置选项：

```python
# app/vertex_ai.py
MAX_PDF_PAGES = 50  # 最多读取 50 页（避免超出 token 限制）
```

## 🎯 使用场景

1. **文档总结**: "请总结这份报告的主要发现"
2. **信息提取**: "提取文档中所有提到的日期和人名"
3. **问答**: "根据这份合同，违约金是多少？"
4. **翻译**: "请翻译这份 PDF 文档的第一页"
5. **分析**: "分析这份财务报表的关键指标"

## 📝 注意事项

- PDF 文件最多读取 50 页（防止超出 AI token 限制）
- 仅提取文本内容，不处理图片、表格等
- 加密的 PDF 文件需要先解密
- 扫描版 PDF（图片格式）需要 OCR 处理（当前不支持）

## 🐛 故障排除

### PDF 无法读取
- 检查文件是否损坏
- 确认文件不是加密的
- 确认文件格式正确（.pdf）

### 内容提取不完整
- PDF 可能包含图片或表格
- 某些特殊格式的 PDF 可能无法完全提取

### AI 回答不准确
- 尝试提供更具体的问题
- 确认 PDF 内容被正确提取
- 如果 PDF 页数太多，尝试提取特定页面

## 📚 相关文件

- `app/adk.py` - PDF 读取功能实现
- `app/vertex_ai.py` - AI 集成
- `app/routes.py` - 文件上传处理
- `test_pdf.py` - 测试脚本

## 🔮 未来增强

- [ ] OCR 支持（扫描版 PDF）
- [ ] 表格提取
- [ ] 图片识别
- [ ] 多文件对比分析
- [ ] PDF 内容搜索
