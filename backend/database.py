"""
Database initialization and management module
Handles all database table creation and schema setup
"""

from models import db, User, UserProfile
from datetime import datetime

def create_all_tables(app):
    """
    Create all database tables
    
    Args:
        app: Flask application instance
    
    Returns:
        dict: Status information
    """
    with app.app_context():
        print("🔨 正在创建数据库表...")
        print("-" * 50)
        
        try:
            db.create_all()
            
            # Get table information
            inspector = db.inspect(db.engine)
            tables = inspector.get_table_names()
            
            print(f"✅ 数据库表创建成功！\n")
            print("📋 已创建的表：")
            for table in tables:
                columns = inspector.get_columns(table)
                print(f"\n  📌 {table}")
                for col in columns:
                    col_type = str(col['type'])
                    nullable = "NULL" if col['nullable'] else "NOT NULL"
                    print(f"     • {col['name']}: {col_type} {nullable}")
            
            print("\n" + "-" * 50)
            print("✅ 数据库初始化完成！\n")
            
            return {
                'success': True,
                'message': 'All tables created successfully',
                'tables': tables
            }
            
        except Exception as e:
            print(f"\n❌ 错误：{str(e)}\n")
            return {
                'success': False,
                'message': f'Table creation failed: {str(e)}',
                'error': str(e)
            }

def drop_all_tables(app):
    """
    Drop all database tables (WARNING: DESTRUCTIVE)
    
    Args:
        app: Flask application instance
    
    Returns:
        dict: Status information
    """
    with app.app_context():
        print("⚠️  警告：这将删除所有数据表！")
        print("确认？(y/n): ", end="")
        
        response = input().strip().lower()
        
        if response != 'y':
            print("❌ 已取消\n")
            return {'success': False, 'message': 'Operation cancelled'}
        
        try:
            print("\n🗑️  正在删除所有表...")
            db.drop_all()
            print("✅ 所有表已删除！\n")
            
            return {
                'success': True,
                'message': 'All tables dropped successfully'
            }
            
        except Exception as e:
            print(f"\n❌ 错误：{str(e)}\n")
            return {
                'success': False,
                'message': f'Drop failed: {str(e)}',
                'error': str(e)
            }

def check_tables(app):
    """
    Check existing tables in database
    
    Args:
        app: Flask application instance
    
    Returns:
        dict: Table information
    """
    with app.app_context():
        try:
            inspector = db.inspect(db.engine)
            tables = inspector.get_table_names()
            
            print("\n📋 数据库表状态：\n")
            
            if not tables:
                print("  ❌ 未找到任何表")
                return {'success': True, 'tables': [], 'count': 0}
            
            for table in tables:
                columns = inspector.get_columns(table)
                rows = db.session.query(db.text(f'COUNT(*) FROM {table}')).scalar()
                print(f"  ✅ {table}")
                print(f"     列数: {len(columns)}, 行数: {rows}")
            
            print(f"\n总计: {len(tables)} 个表\n")
            
            return {
                'success': True,
                'tables': tables,
                'count': len(tables)
            }
            
        except Exception as e:
            print(f"\n❌ 错误：{str(e)}\n")
            return {
                'success': False,
                'message': f'Check failed: {str(e)}',
                'error': str(e)
            }

def reset_database(app):
    """
    Reset database: drop all tables and recreate them
    
    Args:
        app: Flask application instance
    
    Returns:
        dict: Status information
    """
    with app.app_context():
        print("⚠️  警告：这将重置整个数据库！")
        print("确认？(y/n): ", end="")
        
        response = input().strip().lower()
        
        if response != 'y':
            print("❌ 已取消\n")
            return {'success': False, 'message': 'Operation cancelled'}
        
        try:
            print("\n🔄 正在重置数据库...")
            print("-" * 50)
            
            # Drop all tables
            print("🗑️  删除现有表...")
            db.drop_all()
            print("✅ 表已删除")
            
            # Create new tables
            print("🔨 创建新表...")
            db.create_all()
            print("✅ 表已创建")
            
            # Verify
            inspector = db.inspect(db.engine)
            tables = inspector.get_table_names()
            
            print("\n📋 新表：")
            for table in tables:
                print(f"  ✅ {table}")
            
            print("\n" + "-" * 50)
            print("✅ 数据库重置完成！\n")
            
            return {
                'success': True,
                'message': 'Database reset successfully',
                'tables': tables
            }
            
        except Exception as e:
            print(f"\n❌ 错误：{str(e)}\n")
            return {
                'success': False,
                'message': f'Reset failed: {str(e)}',
                'error': str(e)
            }

def seed_sample_data(app):
    """
    Create sample data for testing
    
    Args:
        app: Flask application instance
    
    Returns:
        dict: Status information
    """
    with app.app_context():
        try:
            print("\n🌱 创建示例数据...")
            print("-" * 50)
            
            # Check if sample data exists
            existing_user = User.query.filter_by(email='demo@example.com').first()
            if existing_user:
                print("⚠️  示例用户已存在")
                return {
                    'success': False,
                    'message': 'Sample data already exists'
                }
            
            # Create sample user
            demo_user = User(
                username='demo_user',
                email='demo@example.com',
                is_active=True
            )
            demo_user.set_password('Demo1234')
            
            db.session.add(demo_user)
            db.session.flush()  # Get the user ID without committing
            
            # Create sample profile
            demo_profile = UserProfile(
                user_id=demo_user.id,
                language='zh-CN',
                theme='light',
                background_type='gradient',
                background_value='linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
            )
            
            db.session.add(demo_profile)
            db.session.commit()
            
            print(f"✅ 示例用户创建成功")
            print(f"   邮箱: demo@example.com")
            print(f"   密码: Demo1234")
            print(f"   用户名: demo_user\n")
            
            return {
                'success': True,
                'message': 'Sample data created successfully',
                'user': {
                    'id': demo_user.id,
                    'username': demo_user.username,
                    'email': demo_user.email
                }
            }
            
        except Exception as e:
            db.session.rollback()
            print(f"\n❌ 错误：{str(e)}\n")
            return {
                'success': False,
                'message': f'Seed failed: {str(e)}',
                'error': str(e)
            }

if __name__ == '__main__':
    """
    CLI for database management
    Usage: python database.py [command]
    
    Commands:
        create   - Create all tables
        drop     - Drop all tables (DESTRUCTIVE)
        reset    - Reset database (DESTRUCTIVE)
        check    - Check existing tables
        seed     - Create sample data
    """
    
    import sys
    from app import create_app
    
    app = create_app()
    
    if len(sys.argv) < 2:
        print("\n📚 数据库管理工具\n")
        print("用法: python database.py [command]\n")
        print("命令：")
        print("  create  - 创建所有表")
        print("  drop    - 删除所有表 (⚠️ 危险)")
        print("  reset   - 重置数据库 (⚠️ 危险)")
        print("  check   - 检查现有表")
        print("  seed    - 创建示例数据\n")
        sys.exit(0)
    
    command = sys.argv[1].lower()
    
    if command == 'create':
        create_all_tables(app)
    elif command == 'drop':
        drop_all_tables(app)
    elif command == 'reset':
        reset_database(app)
    elif command == 'check':
        check_tables(app)
    elif command == 'seed':
        seed_sample_data(app)
    else:
        print(f"❌ 未知命令: {command}\n")
        sys.exit(1)
