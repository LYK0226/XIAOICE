#!/usr/bin/env python3
"""
Verify and Display Database Contents
驗證並顯示數據庫內容
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app import create_app, db
from models import User, UserProfile

def view_database():
    """View all database contents"""
    app = create_app()
    
    with app.app_context():
        print("📊 数据库内容概览")
        print("=" * 60)
        
        # Users
        users = User.query.all()
        print(f"\n👥 用户表 (共 {len(users)} 个用户):")
        print("-" * 60)
        for user in users:
            print(f"\n  ID: {user.id}")
            print(f"  用户名: {user.username}")
            print(f"  邮箱: {user.email}")
            print(f"  头像: {user.avatar[:50]}..." if user.avatar else "  头像: 无")
            print(f"  激活: {user.is_active}")
            print(f"  创建: {user.created_at}")
            print(f"  更新: {user.updated_at}")
        
        # Profiles
        profiles = UserProfile.query.all()
        print(f"\n\n👤 用户配置表 (共 {len(profiles)} 个配置):")
        print("-" * 60)
        for profile in profiles:
            user = User.query.get(profile.user_id)
            print(f"\n  配置ID: {profile.id}")
            print(f"  用户: {user.username if user else '未知'}")
            print(f"  语言: {profile.language}")
            print(f"  主题: {profile.theme}")
            print(f"  背景类型: {profile.background_type}")
            print(f"  背景值: {profile.background_value[:50]}...")
            print(f"  机器人头像: {profile.bot_avatar[:50]}..." if profile.bot_avatar else "  机器人头像: 无")
        
        print("\n" + "=" * 60)
        print(f"✅ 总计: {len(users)} 个用户, {len(profiles)} 个配置")

if __name__ == '__main__':
    view_database()
