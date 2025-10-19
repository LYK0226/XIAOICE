#!/usr/bin/env python3
"""
Simple test script for XIAOICE API
Run this after starting the Flask server to test all endpoints
"""

import requests
import json
import sys

# API Configuration
API_BASE_URL = 'http://localhost:5000/api'

class Colors:
    GREEN = '\033[92m'
    RED = '\033[91m'
    BLUE = '\033[94m'
    YELLOW = '\033[93m'
    END = '\033[0m'

def print_header(text):
    print(f"\n{Colors.BLUE}{'='*50}")
    print(f"  {text}")
    print(f"{'='*50}{Colors.END}\n")

def print_success(text):
    print(f"{Colors.GREEN}✓ {text}{Colors.END}")

def print_error(text):
    print(f"{Colors.RED}✗ {text}{Colors.END}")

def print_info(text):
    print(f"{Colors.YELLOW}ℹ {text}{Colors.END}")

def test_health_check():
    """Test health check endpoint"""
    print_header("1. Health Check")
    try:
        response = requests.get(f'{API_BASE_URL}/health')
        data = response.json()
        if response.status_code == 200 and data.get('success'):
            print_success(f"API is running: {data.get('message')}")
            return True
        else:
            print_error(f"Unexpected response: {data}")
            return False
    except Exception as e:
        print_error(f"Connection failed: {str(e)}")
        return False

def test_signup():
    """Test user signup"""
    print_header("2. User Registration")
    
    payload = {
        "username": "testuser123",
        "email": "testuser@gmail.com",
        "password": "TestPassword123",
        "confirm_password": "TestPassword123"
    }
    
    print_info(f"Registering user: {payload['username']}")
    
    try:
        response = requests.post(
            f'{API_BASE_URL}/signup',
            json=payload,
            headers={'Content-Type': 'application/json'}
        )
        data = response.json()
        
        if response.status_code == 201 and data.get('success'):
            user = data.get('data', {}).get('user', {})
            token = data.get('data', {}).get('access_token', '')
            print_success(f"Registration successful!")
            print(f"  User ID: {user.get('id')}")
            print(f"  Username: {user.get('username')}")
            print(f"  Email: {user.get('email')}")
            print_info(f"Token: {token[:50]}...")
            return token, user
        elif response.status_code == 409:
            print_info(f"User already exists: {data.get('error')}")
            # Try login instead
            print_info("Attempting to login with existing user...")
            return None, None
        else:
            print_error(f"Registration failed: {data.get('error')}")
            return None, None
    except Exception as e:
        print_error(f"Error: {str(e)}")
        return None, None

def test_login():
    """Test user login"""
    print_header("3. User Login")
    
    payload = {
        "email": "testuser@gmail.com",
        "password": "TestPassword123"
    }
    
    print_info(f"Logging in: {payload['email']}")
    
    try:
        response = requests.post(
            f'{API_BASE_URL}/login',
            json=payload,
            headers={'Content-Type': 'application/json'}
        )
        data = response.json()
        
        if response.status_code == 200 and data.get('success'):
            user = data.get('data', {}).get('user', {})
            token = data.get('data', {}).get('access_token', '')
            profile = data.get('data', {}).get('profile', {})
            
            print_success("Login successful!")
            print(f"  Username: {user.get('username')}")
            print(f"  Email: {user.get('email')}")
            print(f"  Language: {profile.get('language', 'Not set')}")
            print_info(f"Token: {token[:50]}...")
            return token, user
        else:
            print_error(f"Login failed: {data.get('error')}")
            return None, None
    except Exception as e:
        print_error(f"Error: {str(e)}")
        return None, None

def test_get_profile(token):
    """Test get user profile"""
    print_header("4. Get User Profile")
    
    if not token:
        print_error("No token available. Skipping.")
        return False
    
    try:
        response = requests.get(
            f'{API_BASE_URL}/user/profile',
            headers={
                'Authorization': f'Bearer {token}',
                'Content-Type': 'application/json'
            }
        )
        data = response.json()
        
        if response.status_code == 200 and data.get('success'):
            user = data.get('data', {}).get('user', {})
            profile = data.get('data', {}).get('profile', {})
            
            print_success("Profile retrieved successfully!")
            print(f"  ID: {user.get('id')}")
            print(f"  Username: {user.get('username')}")
            print(f"  Email: {user.get('email')}")
            print(f"  Language: {profile.get('language', 'Not set')}")
            print(f"  Created: {user.get('created_at', 'Not set')}")
            return True
        else:
            print_error(f"Failed to retrieve profile: {data.get('error')}")
            return False
    except Exception as e:
        print_error(f"Error: {str(e)}")
        return False

def test_update_profile(token):
    """Test update user profile"""
    print_header("5. Update User Profile")
    
    if not token:
        print_error("No token available. Skipping.")
        return False
    
    payload = {
        "language": "en",
        "theme": "dark",
        "background_type": "solid",
        "background_value": "#667eea"
    }
    
    print_info(f"Updating profile with: {json.dumps(payload, indent=2)}")
    
    try:
        response = requests.put(
            f'{API_BASE_URL}/user/profile',
            json=payload,
            headers={
                'Authorization': f'Bearer {token}',
                'Content-Type': 'application/json'
            }
        )
        data = response.json()
        
        if response.status_code == 200 and data.get('success'):
            profile = data.get('data', {}).get('profile', {})
            print_success("Profile updated successfully!")
            print(f"  Language: {profile.get('language')}")
            print(f"  Theme: {profile.get('theme')}")
            print(f"  Background Type: {profile.get('background_type')}")
            return True
        else:
            print_error(f"Update failed: {data.get('error')}")
            return False
    except Exception as e:
        print_error(f"Error: {str(e)}")
        return False

def test_update_avatar(token):
    """Test update user avatar"""
    print_header("6. Update User Avatar")
    
    if not token:
        print_error("No token available. Skipping.")
        return False
    
    # Using a simple placeholder URL
    payload = {
        "avatar": "https://api.dicebear.com/7.x/avataaars/svg?seed=testuser123"
    }
    
    print_info(f"Updating avatar with URL")
    
    try:
        response = requests.put(
            f'{API_BASE_URL}/user/avatar',
            json=payload,
            headers={
                'Authorization': f'Bearer {token}',
                'Content-Type': 'application/json'
            }
        )
        data = response.json()
        
        if response.status_code == 200 and data.get('success'):
            user = data.get('data', {}).get('user', {})
            print_success("Avatar updated successfully!")
            print(f"  Avatar URL: {user.get('avatar', 'Not set')[:60]}...")
            return True
        else:
            print_error(f"Update failed: {data.get('error')}")
            return False
    except Exception as e:
        print_error(f"Error: {str(e)}")
        return False

def main():
    """Run all tests"""
    print(f"\n{Colors.BLUE}{'*'*50}")
    print(f"  XIAOICE API Test Suite")
    print(f"  Testing: {API_BASE_URL}")
    print(f"{'*'*50}{Colors.END}\n")
    
    # Test 1: Health check
    if not test_health_check():
        print_error("API server is not running!")
        print_info("Start the API server with: python run.py")
        sys.exit(1)
    
    # Test 2: Signup or Login
    token = None
    user = None
    
    result = test_signup()
    if result[0]:
        token, user = result
    else:
        # If signup fails (user exists), try login
        token, user = test_login()
    
    # Test 3: Login (if signup succeeded)
    if not token:
        print_error("Could not get auth token. Tests cannot continue.")
        sys.exit(1)
    
    # Test 4: Get Profile
    test_get_profile(token)
    
    # Test 5: Update Profile
    test_update_profile(token)
    
    # Test 6: Update Avatar
    test_update_avatar(token)
    
    # Summary
    print_header("Test Summary")
    print_success("All tests completed!")
    print_info(f"Test user: testuser@gmail.com")
    print_info(f"Test password: TestPassword123")
    print()

if __name__ == '__main__':
    try:
        main()
    except KeyboardInterrupt:
        print(f"\n{Colors.YELLOW}Test interrupted by user{Colors.END}\n")
        sys.exit(0)
    except Exception as e:
        print(f"\n{Colors.RED}Unexpected error: {str(e)}{Colors.END}\n")
        sys.exit(1)
