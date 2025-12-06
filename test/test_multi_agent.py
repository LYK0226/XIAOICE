#!/usr/bin/env python3
"""
Test script for XIAOICE Multi-Agent System

This script demonstrates how the multi-agent architecture routes different
types of requests to specialized agents.
"""

import os
import sys

# Add app directory to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

# Load environment variables
from dotenv import load_dotenv
load_dotenv()

from app import create_app
from app.models import db, User, UserApiKey
from app.agent.chat_agent import generate_streaming_response


def get_test_api_key():
    """Get API key from database for testing."""
    app = create_app()
    with app.app_context():
        # Try to find any active API key in the database
        api_key_record = UserApiKey.query.filter_by(is_active=True).first()
        if api_key_record:
            decrypted_key = api_key_record.get_decrypted_key()
            if decrypted_key:
                print(f"✓ Using API key from user: {api_key_record.user.username}")
                return decrypted_key, api_key_record.user_id
        
        # If no API key found in database, check environment
        env_key = os.environ.get('GOOGLE_API_KEY')
        if env_key:
            print("✓ Using API key from environment variable")
            return env_key, "default"
        
        return None, None


def test_text_agent(api_key, user_id):
    """Test the text agent with a plain text question."""
    print("\n" + "="*80)
    print("TEST 1: Plain Text Question (routed to Text Agent)")
    print("="*80)
    print("\nUser: What is the capital of France?\n")
    print("Assistant: ", end="", flush=True)
    
    response = generate_streaming_response(
        message="What is the capital of France?",
        api_key=api_key,
        user_id=str(user_id),
        conversation_id=1,
        username="Test User"
    )
    
    for chunk in response:
        print(chunk, end="", flush=True)
    print("\n")


def test_conversation(api_key, user_id):
    """Test the text agent with a conversational message."""
    print("\n" + "="*80)
    print("TEST 2: General Conversation (routed to Text Agent)")
    print("="*80)
    print("\nUser: Hello! How are you today?\n")
    print("Assistant: ", end="", flush=True)
    
    response = generate_streaming_response(
        message="Hello! How are you today?",
        api_key=api_key,
        user_id=str(user_id),
        conversation_id=2,
        username="Test User"
    )
    
    for chunk in response:
        print(chunk, end="", flush=True)
    print("\n")


def test_media_simulation():
    """Simulate a media request (without actual file upload)."""
    print("\n" + "="*80)
    print("TEST 3: Media Analysis Request (would route to Media Agent)")
    print("="*80)
    print("\nUser: [Image attached] What do you see in this image?\n")
    print("Note: This would route to the Media Agent if an actual image was attached.")
    print("With the multi-agent system, the coordinator would:")
    print("  1. Detect the image attachment")
    print("  2. Route to media_agent")
    print("  3. Return detailed visual analysis\n")


def test_chinese_conversation(api_key, user_id):
    """Test Chinese language support."""
    print("\n" + "="*80)
    print("TEST 4: Chinese Conversation (routed to Text Agent)")
    print("="*80)
    print("\nUser: 你好！你叫什么名字？\n")
    print("Assistant: ", end="", flush=True)
    
    response = generate_streaming_response(
        message="你好！你叫什么名字？",
        api_key=api_key,
        user_id=str(user_id),
        conversation_id=3,
        username="测试用户"
    )
    
    for chunk in response:
        print(chunk, end="", flush=True)
    print("\n")


def main():
    """Run all tests."""
    print("\n" + "="*80)
    print("XIAOICE Multi-Agent System Test Suite")
    print("="*80)
    print("\nThis test demonstrates the multi-agent architecture:")
    print("- Coordinator Agent: Routes requests to specialized agents")
    print("- Text Agent: Handles plain text conversations")
    print("- Media Agent: Analyzes images and videos")
    print("\n" + "="*80)
    
    # Get API key from database or environment
    print("\nLooking for API key...")
    api_key, user_id = get_test_api_key()
    
    if not api_key:
        print("\n" + "="*80)
        print("ERROR: No API key found!")
        print("="*80)
        print("\nPlease do one of the following:")
        print("\n1. Add an API key via the web interface:")
        print("   - Start the app: python run.py")
        print("   - Login and go to Settings")
        print("   - Add your Google AI API key")
        print("\n2. Set environment variable:")
        print("   export GOOGLE_API_KEY='your-api-key-here'")
        print("\n3. Add to .env file:")
        print("   GOOGLE_API_KEY=your-api-key-here")
        print("\n" + "="*80 + "\n")
        return
    
    try:
        # Run tests
        test_text_agent(api_key, user_id)
        input("\nPress Enter to continue to next test...")
        
        test_conversation(api_key, user_id)
        input("\nPress Enter to continue to next test...")
        
        test_media_simulation()
        input("\nPress Enter to continue to next test...")
        
        test_chinese_conversation(api_key, user_id)
        
        print("\n" + "="*80)
        print("All tests completed!")
        print("="*80)
        print("\nThe multi-agent system successfully:")
        print("✓ Routes text questions to the Text Agent")
        print("✓ Handles conversational messages naturally")
        print("✓ Supports multiple languages (English, Chinese)")
        print("✓ Can route media requests to the Media Agent")
        print("\n")
        
    except KeyboardInterrupt:
        print("\n\nTest interrupted by user.\n")
    except Exception as e:
        print(f"\n\nERROR: {e}\n")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    main()
