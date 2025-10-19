#!/usr/bin/env python3
"""
Seed Database with Sample Data
為數據庫填充示例數據
"""
import os
import sys
from datetime import datetime, timedelta
from pathlib import Path

# Add backend directory to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app import create_app, db
from models import User, UserProfile
from werkzeug.security import generate_password_hash

def seed_database():
    """Seed database with sample users"""
    app = create_app()
    
    with app.app_context():
        print("🌱 開始填充數據庫...")
        
        try:
            # Check if data already exists
            existing_users = User.query.count()
            if existing_users > 0:
                print(f"⚠️  數據庫已有 {existing_users} 個用戶")
                response = input("是否要清空並重新填充？(y/n): ")
                if response.lower() != 'y':
                    print("❌ 取消操作")
                    return
                # Clear existing data
                db.session.query(UserProfile).delete()
                db.session.query(User).delete()
                db.session.commit()
                print("✅ 已清空舊數據")
            
            # Sample users data
            sample_users = [
                {
                    'username': 'demo_user',
                    'email': 'demo@example.com',
                    'password': 'demo123456',
                    'avatar': 'https://api.dicebear.com/7.x/avataaars/svg?seed=demo_user'
                },
                {
                    'username': 'test_user',
                    'email': 'test@example.com',
                    'password': 'test123456',
                    'avatar': 'https://api.dicebear.com/7.x/avataaars/svg?seed=test_user'
                },
                {
                    'username': 'admin',
                    'email': 'admin@xiaoice.com',
                    'password': 'admin123456',
                    'avatar': 'https://api.dicebear.com/7.x/avataaars/svg?seed=admin'
                },
                {
                    'username': 'user123',
                    'email': 'user123@example.com',
                    'password': 'user123456',
                    'avatar': 'https://api.dicebear.com/7.x/avataaars/svg?seed=user123'
                },
            ]
            
            # Create users and profiles
            created_count = 0
            for user_data in sample_users:
                user = User(
                    username=user_data['username'],
                    email=user_data['email'],
                    password_hash=generate_password_hash(user_data['password']),
                    avatar=user_data['avatar'],
                    is_active=True,
                    created_at=datetime.utcnow(),
                    updated_at=datetime.utcnow()
                )
                db.session.add(user)
                db.session.flush()  # Get user ID
                
                # Create user profile
                profile = UserProfile(
                    user_id=user.id,
                    language='zh-CN',
                    theme='light',
                    background_type='gradient',
                    background_value='linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    bot_avatar='https://api.dicebear.com/7.x/bottts/svg?seed=XIAOICE',
                    created_at=datetime.utcnow(),
                    updated_at=datetime.utcnow()
                )
                db.session.add(profile)
                created_count += 1
                print(f"  ✅ 創建用戶: {user_data['username']} (密碼: {user_data['password']})")
            
            # Commit all changes
            db.session.commit()
            
            print(f"\n✅ 成功填充 {created_count} 個用戶！")
            
            # Display summary
            print("\n📊 數據庫摘要:")
            print(f"  - 用戶總數: {User.query.count()}")
            print(f"  - 用戶配置總數: {UserProfile.query.count()}")
            
            print("\n🔐 測試帳戶:")
            all_users = User.query.all()
            for user in all_users:
                print(f"  - 用戶名: {user.username}")
                print(f"    郵箱: {user.email}")
                print(f"    密碼: (查看上方輸出)")
                print()
            
        except Exception as e:
            print(f"\n❌ 錯誤: {str(e)}")
            import traceback
            traceback.print_exc()
            sys.exit(1)

if __name__ == '__main__':
    seed_database()
