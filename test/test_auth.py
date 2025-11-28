#!/usr/bin/env python3
"""
Test script for the authentication system.
This script demonstrates the complete user registration and login flow.
"""

import requests
import json

# Base URL for the application
BASE_URL = "http://127.0.0.1:5000"

def test_signup():
    """Test user registration."""
    print("\n=== Testing User Registration ===")
    
    signup_data = {
        "username": "testuser",
        "email": "test@example.com",
        "password": "password123"
    }
    
    response = requests.post(
        f"{BASE_URL}/auth/signup",
        json=signup_data,
        headers={"Content-Type": "application/json"}
    )
    
    print(f"Status Code: {response.status_code}")
    print(f"Response: {json.dumps(response.json(), indent=2)}")
    
    return response.status_code in [200, 201]

def test_login():
    """Test user login and return tokens."""
    print("\n=== Testing User Login ===")
    
    login_data = {
        "email": "test@example.com",
        "password": "password123"
    }
    
    response = requests.post(
        f"{BASE_URL}/auth/login",
        json=login_data,
        headers={"Content-Type": "application/json"}
    )
    
    print(f"Status Code: {response.status_code}")
    print(f"Response: {json.dumps(response.json(), indent=2)}")
    
    if response.status_code == 200:
        data = response.json()
        return {
            'access_token': data.get('access_token'),
            'refresh_token': data.get('refresh_token')
        }
    return None

def test_auth_check(tokens):
    """Test authentication check."""
    print("\n=== Testing Auth Check ===")
    
    headers = {"Authorization": f"Bearer {tokens['access_token']}"}
    response = requests.get(f"{BASE_URL}/auth/check", headers=headers)
    print(f"Status Code: {response.status_code}")
    print(f"Response: {json.dumps(response.json(), indent=2)}")

def test_get_user_info(tokens):
    """Test getting current user information."""
    print("\n=== Testing Get Current User ===")
    
    headers = {"Authorization": f"Bearer {tokens['access_token']}"}
    response = requests.get(f"{BASE_URL}/auth/me", headers=headers)
    print(f"Status Code: {response.status_code}")
    print(f"Response: {json.dumps(response.json(), indent=2)}")

def test_protected_route(tokens):
    """Test accessing a protected route."""
    print("\n=== Testing Protected Route (Main Page) ===")
    
    headers = {"Authorization": f"Bearer {tokens['access_token']}"}
    response = requests.get(f"{BASE_URL}/", headers=headers)
    print(f"Status Code: {response.status_code}")
    print(f"Can access main page: {response.status_code == 200}")

def test_logout(tokens):
    """Test user logout."""
    print("\n=== Testing Logout ===")
    
    headers = {"Authorization": f"Bearer {tokens['access_token']}"}
    response = requests.post(f"{BASE_URL}/auth/logout", headers=headers)
    print(f"Status Code: {response.status_code}")
    print(f"Response: {json.dumps(response.json(), indent=2)}")

def test_access_after_logout(tokens):
    """Test that protected routes are inaccessible after logout."""
    print("\n=== Testing Access After Logout ===")
    
    # Note: Since JWT is stateless, logout doesn't invalidate tokens
    # In a real app, you'd implement token blacklisting
    headers = {"Authorization": f"Bearer {tokens['access_token']}"}
    response = requests.get(f"{BASE_URL}/", headers=headers)
    print(f"Status Code: {response.status_code}")
    print(f"Still accessible (JWT stateless): {response.status_code == 200}")

def main():
    """Run all tests."""
    print("=" * 60)
    print("XIAOICE Authentication System Test")
    print("=" * 60)
    
    # Test 1: Sign up
    signup_success = test_signup()
    
    if not signup_success:
        print("\n⚠️  Note: If signup failed with 'Email already registered', ")
        print("    the test user already exists. Continuing with login test...")
    
    # Test 2: Login
    tokens = test_login()
    
    if not tokens:
        print("\n❌ Login failed! Cannot continue with remaining tests.")
        return
    
    # Test 3: Check authentication status
    test_auth_check(tokens)
    
    # Test 4: Get current user info
    test_get_user_info(tokens)
    
    # Test 5: Access protected route
    test_protected_route(tokens)
    
    # Test 6: Logout
    test_logout(tokens)
    
    # Test 7: Try accessing protected route after logout
    test_access_after_logout(tokens)

    # Test 8: Upload avatar image
    try:
        print('\n=== Testing Avatar Upload ===')
        # Create a small 1x1 PNG file bytes
        png_bytes = b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x06\x00\x00\x00\x1f\x15\xc4\x89\x00\x00\x00\x0bIDATx\x9cc```\x00\x00\x00\x02\x00\x01\xe2!\xbc\x33\x00\x00\x00\x00IEND\xaeB`\x82"
        files = {'avatar': ('avatar.png', png_bytes, 'image/png')}
        headers = {'Authorization': f"Bearer {tokens['access_token']}"}
        response = requests.post(f"{BASE_URL}/auth/update-avatar", headers=headers, files=files)
        print(f"Status Code: {response.status_code}")
        print(f"Response: {json.dumps(response.json(), indent=2)}")
    except Exception as e:
        print(f"Avatar upload test error: {e}")
    
    print("\n" + "=" * 60)
    print("✅ All tests completed!")
    print("=" * 60)

if __name__ == "__main__":
    try:
        main()
    except requests.exceptions.ConnectionError:
        print("\n❌ Error: Cannot connect to the server.")
        print("Please make sure the Flask app is running on http://127.0.0.1:5000")
    except Exception as e:
        print(f"\n❌ Error: {e}")
