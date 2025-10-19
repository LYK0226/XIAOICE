#!/usr/bin/env python3
"""
PostgreSQL Database Initialization Script
Creates all tables and initializes the database
"""
import os
import sys
from pathlib import Path

# Add backend directory to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app import create_app, db

def init_postgresql_db():
    """Initialize PostgreSQL database"""
    app = create_app()
    
    with app.app_context():
        print("🔧 正在連接 PostgreSQL 數據庫...")
        
        try:
            # Create all tables based on models
            print("📝 正在創建數據庫表...")
            db.create_all()
            print("✅ 數據庫表創建成功！")
            
            # Display created tables
            inspector = db.inspect(db.engine)
            tables = inspector.get_table_names()
            
            print(f"\n📊 已創建表 ({len(tables)} 個):")
            for table_name in tables:
                columns = inspector.get_columns(table_name)
                print(f"\n  ✓ {table_name} ({len(columns)} 列)")
                for col in columns:
                    col_type = str(col['type'])
                    nullable = "NULL" if col['nullable'] else "NOT NULL"
                    print(f"    - {col['name']}: {col_type} ({nullable})")
            
            print("\n✅ PostgreSQL 數據庫初始化完成！")
            print("\n📌 連接字符串:")
            print(f"   {app.config['SQLALCHEMY_DATABASE_URI']}")
            
        except Exception as e:
            print(f"\n❌ 錯誤: {str(e)}")
            print("\n💡 確保 PostgreSQL 服務器正在運行:")
            print("   sudo service postgresql start")
            print("\n💡 或更新 .env 文件中的連接字符串")
            sys.exit(1)

if __name__ == '__main__':
    init_postgresql_db()
