"""
ADK (Agent Developer Kit) Functions
时间工具函数
"""

from datetime import datetime
import pytz


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



