#!/usr/bin/env python3
"""
Database initialization script for XIAOICE
This script creates all database tables and initializes the database
"""

import os
import sys

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app import create_app
from models import db

def init_database():
    """Initialize the database"""
    print("🔧 正在初始化數據庫...")
    
    # Create Flask app
    app = create_app('development')
    
    with app.app_context():
        # Create all tables
        print("📝 創建數據庫表...")
        db.create_all()
        print("✅ 數據庫表創建成功！")
        
        # Print database info
        print("\n📊 數據庫信息：")
        print(f"   數據庫路徑: {app.config['SQLALCHEMY_DATABASE_URI']}")
        print(f"   已創建的表:")
        
        # List all tables
        inspector = db.inspect(db.engine)
        tables = inspector.get_table_names()
        
        if tables:
            for table in tables:
                columns = inspector.get_columns(table)
                print(f"   - {table}")
                for col in columns:
                    print(f"       • {col['name']} ({col['type']})")
        else:
            print("   ⚠️  沒有找到任何表")
        
        print("\n✅ 數據庫初始化完成！")
        print("\n💡 下一步:")
        print("   1. 啟動 Flask 服務器: python run.py")
        print("   2. 訪問登錄頁面: http://localhost:5000/login.html")
        print("   3. 創建新帳戶或登錄")

if __name__ == '__main__':
    try:
        init_database()
    except Exception as e:
        print(f"❌ 錯誤: {str(e)}")
        sys.exit(1)
