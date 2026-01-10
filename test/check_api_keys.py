#!/usr/bin/env python3
"""
Check API keys stored in the database.
This utility helps verify API keys are properly configured.
"""

import os
import sys

# Add app directory to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from dotenv import load_dotenv
load_dotenv()

from app import create_app
from app.models import db, User, UserApiKey


def main():
    """Display API keys from database."""
    app = create_app()
    
    with app.app_context():
        print("\n" + "="*80)
        print("XIAOICE Database API Keys")
        print("="*80 + "\n")
        
        # Get all API keys
        api_keys = UserApiKey.query.all()
        
        if not api_keys:
            print("No API keys found in database.")
            print("\nTo add an API key:")
            print("1. Start the app: python run.py")
            print("2. Login to the web interface")
            print("3. Go to Settings")
            print("4. Add your Google AI API key")
            print()
            return
        
        print(f"Found {len(api_keys)} API key(s):\n")
        
        for key in api_keys:
            user = User.query.get(key.user_id)
            status = "✓ Active" if key.is_active else "✗ Inactive"
            
            print(f"ID: {key.id}")
            print(f"User: {user.username if user else 'Unknown'} (ID: {key.user_id})")
            print(f"Name: {key.name or '(unnamed)'}")
            print(f"Status: {status}")
            
            # Show masked key
            decrypted = key.get_decrypted_key()
            if decrypted:
                if len(decrypted) > 12:
                    masked = decrypted[:6] + '*' * (len(decrypted) - 12) + decrypted[-6:]
                else:
                    masked = '*' * len(decrypted)
                print(f"Key: {masked}")
                print(f"Length: {len(decrypted)} characters")
            else:
                print("Key: (Unable to decrypt - check ENCRYPTION_KEY)")
            
            print(f"Created: {key.created_at}")
            print("-" * 80)
        
        # Check for active keys
        active_keys = [k for k in api_keys if k.is_active]
        if active_keys:
            print(f"\n✓ {len(active_keys)} active API key(s) available for use")
            print("The multi-agent system can use these keys for testing.\n")
        else:
            print("\n⚠ Warning: No active API keys found!")
            print("Please activate at least one API key in the settings.\n")
        
        # Check encryption key
        encryption_key = os.environ.get('ENCRYPTION_KEY')
        if encryption_key:
            print("✓ ENCRYPTION_KEY is set in environment")
        else:
            print("⚠ Warning: ENCRYPTION_KEY not found in environment")
            print("  API key decryption may not work properly")
        
        print()


if __name__ == "__main__":
    main()
