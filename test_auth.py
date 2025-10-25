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
    """Test user login and return session."""
    print("\n=== Testing User Login ===")
    
    login_data = {
        "email": "test@example.com",
        "password": "password123"
    }
    
    session = requests.Session()
    response = session.post(
        f"{BASE_URL}/auth/login",
        json=login_data,
        headers={"Content-Type": "application/json"}
    )
    
    print(f"Status Code: {response.status_code}")
    print(f"Response: {json.dumps(response.json(), indent=2)}")
    
    if response.status_code == 200:
        return session
    return None

def test_auth_check(session):
    """Test authentication check."""
    print("\n=== Testing Auth Check ===")
    
    response = session.get(f"{BASE_URL}/auth/check")
    print(f"Status Code: {response.status_code}")
    print(f"Response: {json.dumps(response.json(), indent=2)}")

def test_get_user_info(session):
    """Test getting current user information."""
    print("\n=== Testing Get Current User ===")
    
    response = session.get(f"{BASE_URL}/auth/me")
    print(f"Status Code: {response.status_code}")
    print(f"Response: {json.dumps(response.json(), indent=2)}")

def test_protected_route(session):
    """Test accessing a protected route."""
    print("\n=== Testing Protected Route (Main Page) ===")
    
    response = session.get(f"{BASE_URL}/")
    print(f"Status Code: {response.status_code}")
    print(f"Can access main page: {response.status_code == 200}")

def test_logout(session):
    """Test user logout."""
    print("\n=== Testing Logout ===")
    
    response = session.post(f"{BASE_URL}/auth/logout")
    print(f"Status Code: {response.status_code}")
    print(f"Response: {json.dumps(response.json(), indent=2)}")

def test_access_after_logout(session):
    """Test that protected routes are inaccessible after logout."""
    print("\n=== Testing Access After Logout ===")
    
    response = session.get(f"{BASE_URL}/")
    print(f"Status Code: {response.status_code}")
    print(f"Should be redirected to login: {response.status_code == 302}")

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
    session = test_login()
    
    if not session:
        print("\n❌ Login failed! Cannot continue with remaining tests.")
        return
    
    # Test 3: Check authentication status
    test_auth_check(session)
    
    # Test 4: Get current user info
    test_get_user_info(session)
    
    # Test 5: Access protected route
    test_protected_route(session)
    
    # Test 6: Logout
    test_logout(session)
    
    # Test 7: Try accessing protected route after logout
    test_access_after_logout(session)
    
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
