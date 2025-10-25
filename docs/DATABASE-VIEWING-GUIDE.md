# How to View Database Data - XIAOICE

## Database Location

The SQLite database is located at:
```
/workspaces/XIAOICE/instance/app.db
```

## Method 1: Using Python Script (Recommended) ⭐

I've created a convenient script `view_database.py` that provides multiple ways to view your data.

### Interactive Mode
```bash
python view_database.py
```

This opens an interactive menu with options:
1. View all users
2. View all user profiles
3. Search for user
4. Database statistics
5. Delete user (admin)
0. Exit

### Command Line Options

**View all users:**
```bash
python view_database.py users
```

**View all profiles:**
```bash
python view_database.py profiles
```

**Database statistics:**
```bash
python view_database.py stats
```

**Search for users:**
```bash
python view_database.py search "ryan"
```

**Delete a user (use with caution!):**
```bash
python view_database.py delete 5
```

---

## Method 2: Using SQLite Command Line

### List all tables
```bash
sqlite3 instance/app.db ".tables"
```

### View table schema
```bash
# Users table
sqlite3 instance/app.db ".schema users"

# User profiles table
sqlite3 instance/app.db ".schema user_profiles"
```

### Query data

**Simple query:**
```bash
sqlite3 instance/app.db "SELECT * FROM users;"
```

**Formatted query (with headers and columns):**
```bash
sqlite3 -header -column instance/app.db "SELECT id, username, email, is_active FROM users;"
```

**Count users:**
```bash
sqlite3 instance/app.db "SELECT COUNT(*) FROM users;"
```

**Search by email:**
```bash
sqlite3 instance/app.db "SELECT * FROM users WHERE email LIKE '%gmail%';"
```

**Join users with profiles:**
```bash
sqlite3 -header -column instance/app.db "
  SELECT u.username, u.email, p.language, p.theme 
  FROM users u 
  LEFT JOIN user_profiles p ON u.id = p.user_id;
"
```

**Export to CSV:**
```bash
sqlite3 -header -csv instance/app.db "SELECT * FROM users;" > users.csv
```

---

## Method 3: Using DB Browser for SQLite (GUI)

If you prefer a graphical interface:

1. **Install DB Browser for SQLite**
   ```bash
   # On Ubuntu/Debian
   sudo apt-get install sqlitebrowser
   
   # On macOS
   brew install --cask db-browser-for-sqlite
   
   # Or download from: https://sqlitebrowser.org/
   ```

2. **Open the database**
   ```bash
   sqlitebrowser instance/app.db
   ```

3. Use the GUI to:
   - Browse tables
   - Execute SQL queries
   - Edit data
   - Export data

---

## Method 4: Using Python Interactive Shell

Start a Python shell with app context:

```bash
python
```

Then in the Python shell:

```python
from app import create_app
from app.models import User, UserProfile, db

app = create_app()

with app.app_context():
    # Get all users
    users = User.query.all()
    for user in users:
        print(f"{user.id}: {user.username} ({user.email})")
    
    # Get specific user
    user = User.query.filter_by(email='ryan@gmail.com').first()
    print(user.username)
    
    # Count users
    count = User.query.count()
    print(f"Total users: {count}")
    
    # Get user with profile
    user = User.query.get(1)
    profile = UserProfile.query.filter_by(user_id=user.id).first()
    print(f"Language: {profile.language}")
```

---

## Method 5: Using Flask Shell

Flask provides a built-in shell with app context:

```bash
flask shell
```

Then you can directly query:

```python
from app.models import User, UserProfile

# List all users
users = User.query.all()
for u in users:
    print(u.username, u.email)

# Search by username
user = User.query.filter_by(username='Ryan').first()
print(user.to_dict())

# Get recent users
recent = User.query.order_by(User.created_at.desc()).limit(5).all()
```

---

## Common SQL Queries

### Users Table

**All users:**
```sql
SELECT * FROM users;
```

**Active users only:**
```sql
SELECT * FROM users WHERE is_active = 1;
```

**Users created today:**
```sql
SELECT * FROM users 
WHERE DATE(created_at) = DATE('now');
```

**Count by activity:**
```sql
SELECT is_active, COUNT(*) as count 
FROM users 
GROUP BY is_active;
```

### User Profiles Table

**All profiles:**
```sql
SELECT * FROM user_profiles;
```

**Profiles with user info:**
```sql
SELECT 
    u.username, 
    u.email, 
    p.language, 
    p.theme, 
    p.background_type
FROM users u
LEFT JOIN user_profiles p ON u.id = p.user_id;
```

**Count by language:**
```sql
SELECT language, COUNT(*) as count 
FROM user_profiles 
GROUP BY language;
```

**Count by theme:**
```sql
SELECT theme, COUNT(*) as count 
FROM user_profiles 
GROUP BY theme;
```

---

## Database Backup

### Create a backup
```bash
# Simple copy
cp instance/app.db instance/app.db.backup

# With timestamp
cp instance/app.db instance/app.db.$(date +%Y%m%d_%H%M%S)

# Using SQLite dump
sqlite3 instance/app.db .dump > database_backup.sql
```

### Restore from backup
```bash
# From file copy
cp instance/app.db.backup instance/app.db

# From SQL dump
sqlite3 instance/app.db < database_backup.sql
```

---

## Export Data

### Export to CSV
```bash
# Export users
sqlite3 -header -csv instance/app.db "SELECT * FROM users;" > users.csv

# Export profiles
sqlite3 -header -csv instance/app.db "SELECT * FROM user_profiles;" > profiles.csv
```

### Export to JSON (using Python)

Create `export_data.py`:
```python
from app import create_app
from app.models import User, UserProfile
import json

app = create_app()

with app.app_context():
    users = User.query.all()
    
    data = {
        'users': [user.to_dict() for user in users],
        'count': len(users)
    }
    
    with open('users_export.json', 'w') as f:
        json.dump(data, f, indent=2, default=str)
    
    print(f"Exported {len(users)} users to users_export.json")
```

Run with:
```bash
python export_data.py
```

---

## Troubleshooting

### Database is locked
If you get "database is locked" error:
```bash
# Stop the Flask app first
pkill -f "python run.py"

# Then try your query again
```

### Database not found
The database is in `instance/app.db`, not `app.db` in the root folder.

Always use: `instance/app.db`

### Cannot see data
Make sure you're querying the correct database:
```bash
# Check database file size
ls -lh instance/app.db

# If size is 0, the database is empty
# Run the app and register a user first
```

---

## Quick Reference

| Task | Command |
|------|---------|
| View all users | `python view_database.py users` |
| Database stats | `python view_database.py stats` |
| Interactive mode | `python view_database.py` |
| SQL query | `sqlite3 instance/app.db "SELECT * FROM users;"` |
| Count users | `sqlite3 instance/app.db "SELECT COUNT(*) FROM users;"` |
| Backup database | `cp instance/app.db instance/app.db.backup` |
| Export to CSV | `sqlite3 -csv instance/app.db "SELECT * FROM users;" > users.csv` |

---

## Current Database Content

As of now, you have:
- **5 users** in the database
- **4 user profiles** (one user doesn't have a profile yet)
- All users are **active**

Users:
1. Ryan (Ryan@gmail.com)
2. Ryan2 (2@gmail.com)
3. jwtuser (jwt@example.com)
4. testuser (test@example.com)
5. Ryan3 (3@gmail.com)

Run `python view_database.py users` to see full details!
