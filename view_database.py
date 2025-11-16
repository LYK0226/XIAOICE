#!/usr/bin/env python3
"""
Database viewer script for XIAOICE application.
View all users and user profiles stored in the database.
"""

from app import create_app
from app.models import db, User, UserProfile
from datetime import datetime
from sqlalchemy import inspect

def print_separator(char='=', length=80):
    """Print a separator line."""
    print(char * length)

def view_users():
    """Display all users in the database."""
    print_separator()
    print("  ALL USERS")
    print_separator()
    
    users = User.query.all()
    
    if not users:
        print("\n❌ No users found in database.\n")
        return
    
    print(f"\nTotal Users: {len(users)}\n")
    
    for i, user in enumerate(users, 1):
        print(f"\n{'─' * 80}")
        print(f"User #{i}")
        print(f"{'─' * 80}")
        print(f"  ID:           {user.id}")
        print(f"  Username:     {user.username}")
        print(f"  Email:        {user.email}")
        print(f"  Active:       {user.is_active}")
        print(f"  Created:      {user.created_at}")
        print(f"  Updated:      {user.updated_at}")
        print(f"  Avatar:       {'Set' if user.avatar else 'Not set'}")
        
        # Show profile if exists
        profile = UserProfile.query.filter_by(user_id=user.id).first()
        if profile:
            print(f"\n  Profile Settings:")
            print(f"    Language:       {profile.language}")
            print(f"    Theme:          {profile.theme}")
            print(f"    Bot Avatar:     {'Set' if profile.bot_avatar else 'Not set'}")

def view_user_profiles():
    """Display all user profiles in the database."""
    print_separator()
    print("  ALL USER PROFILES")
    print_separator()
    
    profiles = UserProfile.query.all()
    
    if not profiles:
        print("\n❌ No user profiles found in database.\n")
        return
    
    print(f"\nTotal Profiles: {len(profiles)}\n")
    
    for i, profile in enumerate(profiles, 1):
        print(f"\n{'─' * 80}")
        print(f"Profile #{i}")
        print(f"{'─' * 80}")
        print(f"  ID:              {profile.id}")
        print(f"  User ID:         {profile.user_id}")
        
        # Get associated user
        user = User.query.get(profile.user_id)
        if user:
            print(f"  Username:        {user.username}")
            print(f"  Email:           {user.email}")
        
        print(f"  Language:        {profile.language}")
        print(f"  Theme:           {profile.theme}")
        print(f"  Bot Avatar:      {'Set' if profile.bot_avatar else 'Not set'}")
        print(f"  Created:         {profile.created_at}")
        print(f"  Updated:         {profile.updated_at}")

def search_user(search_term):
    """Search for a user by username or email."""
    print_separator()
    print(f"  SEARCH RESULTS FOR: '{search_term}'")
    print_separator()
    
    users = User.query.filter(
        db.or_(
            User.username.ilike(f"%{search_term}%"),
            User.email.ilike(f"%{search_term}%")
        )
    ).all()
    
    if not users:
        print(f"\n❌ No users found matching '{search_term}'.\n")
        return
    
    print(f"\nFound {len(users)} user(s):\n")
    
    for user in users:
        print(f"\n{'─' * 80}")
        print(f"  ID:       {user.id}")
        print(f"  Username: {user.username}")
        print(f"  Email:    {user.email}")
        print(f"  Active:   {user.is_active}")
        print(f"  Created:  {user.created_at}")

def get_database_stats():
    """Display database statistics."""
    print_separator()
    print("  DATABASE STATISTICS")
    print_separator()
    
    total_users = User.query.count()
    active_users = User.query.filter_by(is_active=True).count()
    inactive_users = User.query.filter_by(is_active=False).count()
    total_profiles = UserProfile.query.count()
    
    print(f"\n📊 Statistics:")
    print(f"  Total Users:          {total_users}")
    print(f"  Active Users:         {active_users}")
    print(f"  Inactive Users:       {inactive_users}")
    print(f"  User Profiles:        {total_profiles}")
    
    # Recent users
    recent_users = User.query.order_by(User.created_at.desc()).limit(5).all()
    if recent_users:
        print(f"\n📅 Most Recent Users:")
        for i, user in enumerate(recent_users, 1):
            print(f"  {i}. {user.username} ({user.email}) - {user.created_at}")
    
    print()

def view_table(table_name=None):
    """Display a specific table or allow selection of a table."""
    inspector = inspect(db.engine)
    tables = inspector.get_table_names()
    
    if table_name is None:
        print_separator()
        print("  AVAILABLE TABLES")
        print_separator()
        print("\nAvailable tables:")
        for i, t in enumerate(tables, 1):
            print(f"  {i}. {t}")
        print()
        
        choice = input("Enter table number or name: ").strip()
        if choice.isdigit() and 1 <= int(choice) <= len(tables):
            table_name = tables[int(choice) - 1]
        else:
            table_name = choice
    
    if table_name not in tables:
        print(f"\n❌ Table '{table_name}' not found in database.\n")
        return
    
    print_separator()
    print(f"  TABLE: {table_name}")
    print_separator()
    
    table = db.Table(table_name, db.metadata, autoload_with=db.engine)
    rows = db.session.query(table).all()
    
    if not rows:
        print("No rows in this table.\n")
        return
    
    print(f"Total rows: {len(rows)}")
    columns = list(table.columns.keys())
    print(f"Columns: {', '.join(columns)}\n")
    
    # Display all rows (since user chose specific table)
    for i, row in enumerate(rows):
        print(f"Row {i+1}:")
        for col in columns:
            value = getattr(row, col)
            print(f"  {col}: {value}")
        print()

def interactive_menu():
    """Display interactive menu for database operations."""
    while True:
        print_separator()
        print("  XIAOICE DATABASE VIEWER")
        print_separator()
        print("\nOptions:")
        print("  1. View all users")
        print("  2. View all user profiles")
        print("  3. Search for user")
        print("  4. Database statistics")
        print("  5. Delete user (admin)")
        print("  6. View a specific table")
        print("  0. Exit")
        print()
        
        choice = input("Enter your choice: ").strip()
        print()
        
        if choice == '1':
            view_users()
        elif choice == '2':
            view_user_profiles()
        elif choice == '3':
            search_term = input("Enter username or email to search: ").strip()
            if search_term:
                search_user(search_term)
        elif choice == '4':
            get_database_stats()
        elif choice == '5':
            user_id = input("Enter user ID to delete: ").strip()
            if user_id.isdigit():
                delete_user(int(user_id))
            else:
                print("❌ Invalid user ID.\n")
        elif choice == '6':
            view_table()
        elif choice == '0':
            print("Goodbye!\n")
            break
        else:
            print("❌ Invalid choice. Please try again.\n")
        
        input("Press Enter to continue...")
        print("\n" * 2)

def main():
    """Main function."""
    app = create_app()
    
    with app.app_context():
        import sys
        
        if len(sys.argv) > 1:
            command = sys.argv[1]
            
            if command == 'users':
                view_users()
            elif command == 'profiles':
                view_user_profiles()
            elif command == 'stats':
                get_database_stats()
            elif command == 'search' and len(sys.argv) > 2:
                search_user(sys.argv[2])
            elif command == 'delete' and len(sys.argv) > 2:
                if sys.argv[2].isdigit():
                    delete_user(int(sys.argv[2]))
            elif command == 'tables':
                table_name = sys.argv[2] if len(sys.argv) > 2 else None
                view_table(table_name)
            else:
                print("Usage:")
                print("  python view_database.py              # Interactive menu")
                print("  python view_database.py users        # View all users")
                print("  python view_database.py profiles     # View all profiles")
                print("  python view_database.py stats        # Database statistics")
                print("  python view_database.py search <term> # Search users")
                print("  python view_database.py delete <id>  # Delete user by ID")
                print("  python view_database.py tables [table_name]  # View specific table or list tables")
        else:
            # Interactive mode
            interactive_menu()

if __name__ == "__main__":
    main()
