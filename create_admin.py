import os
import sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app import create_app
from app.models import db, User

app = create_app()

with app.app_context():
    admin_username = 'admin@gmail.com'
    admin_password = 'admin'
    
    existing_admin = User.query.filter_by(username=admin_username).first()
    
    if existing_admin:
        existing_admin.set_password(admin_password)
        existing_admin.role = 'admin'
        db.session.commit()
        print(f'Admin user "{admin_username}" password updated and role set to admin.')
    else:
        admin = User(
            username=admin_username,
            email=admin_username,
            role='admin'
        )
        admin.set_password(admin_password)
        db.session.add(admin)
        db.session.commit()
        print(f'Admin user "{admin_username}" created with password "{admin_password}".')
