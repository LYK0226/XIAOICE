# API Key Retrieval Flow - Visual Diagram

```
┌─────────────────┐    JWT Token    ┌─────────────────┐
│   User Request  │ ──────────────► │  /chat/stream   │
│                 │                 │   Endpoint      │
└─────────────────┘                 └─────────────────┘
                                         │
                                         ▼
┌─────────────────┐    user_id = 1    ┌─────────────────┐
│ JWT Decode      │ ◄──────────────── │ get_jwt_identity()│
│                 │                   │                 │
└─────────────────┘                   └─────────────────┘
                                         │
                                         ▼
┌─────────────────┐   user_id=1      ┌─────────────────┐
│  UserProfile    │ ◄──────────────── │   Query DB      │
│   Table         │                   │                 │
│                 │                   │ user_profile =  │
│ selected_api_   │                   │ UserProfile.    │
│ key_id = 5      │                   │ query.filter_   │
│                 │                   │ by(user_id=1)   │
└─────────────────┘                   └─────────────────┘
                                         │
                                         ▼
┌─────────────────┐ selected_api_key ┌─────────────────┐
│  UserApiKey     │ ◄──────────────── │ Relationship    │
│   Table         │                   │ Access          │
│                 │                   │                 │
│ id=5            │                   │ user_profile.   │
│ encrypted_key   │                   │ selected_api_key│
│ = "encrypted"   │                   │                 │
└─────────────────┘                   └─────────────────┘
                                         │
                                         ▼
┌─────────────────┐   ENCRYPTION_KEY  ┌─────────────────┐
│   Decryption    │ ◄──────────────── │ get_decrypted_  │
│                 │                   │ key()           │
│ Plain API Key   │                   │                 │
│ "AIzaSy..."     │                   │ Fernet.decrypt()│
└─────────────────┘                   └─────────────────┘
                                         │
                                         ▼
┌─────────────────┐   api_key param   ┌─────────────────┐
│ Multi-Agent     │ ◄──────────────── │ generate_       │
│ System          │                   │ streaming_      │
│                 │                   │ response()      │
│ Coordinator     │                   │                 │
│ Text Agent      │                   │ api_key=        │
│ Media Agent     │                   │ "AIzaSy..."     │
└─────────────────┘                   └─────────────────┘
                                         │
                                         ▼
┌─────────────────┐   Google AI API   ┌─────────────────┐
│   Google AI     │ ◄──────────────── │   API Calls     │
│   Services      │                   │                 │
│ Gemini 3      │                   │ Streaming        │
│ Flash/Pro       │                   │ Responses       │
└─────────────────┘                   └─────────────────┘
```

## Database Schema Involved

### user_profiles table
```sql
CREATE TABLE user_profiles (
    id INTEGER PRIMARY KEY,
    user_id INTEGER NOT NULL,
    selected_api_key_id INTEGER,  -- ← Points to user_api_keys.id
    ai_model VARCHAR(50) DEFAULT 'gemini-3-flash',
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (selected_api_key_id) REFERENCES user_api_keys(id)
);
```

### user_api_keys table
```sql
CREATE TABLE user_api_keys (
    id INTEGER PRIMARY KEY,
    user_id INTEGER NOT NULL,
    name VARCHAR(100),
    encrypted_key TEXT NOT NULL,  -- ← Fernet encrypted
    is_active BOOLEAN DEFAULT TRUE,
    FOREIGN KEY (user_id) REFERENCES users(id)
);
```

## Code Flow Summary

1. **Authentication**: JWT token → user_id
2. **Profile Lookup**: user_profiles table → selected_api_key_id
3. **Key Retrieval**: user_api_keys table → encrypted_key
4. **Decryption**: Fernet cipher → plain API key
5. **Agent Usage**: API key passed to multi-agent system
6. **AI Calls**: Google AI services receive authenticated requests

## Security Layers

🔐 **JWT Authentication** - User identity verification  
🔐 **Database Encryption** - API keys stored encrypted  
🔐 **Runtime Decryption** - Keys only decrypted when needed  
🔐 **Per-User Isolation** - Each user has their own keys  
🔐 **Key Selection** - Users choose which key to use  

## Example Data Flow

```
User: Ryan01 (id=1)
Profile: selected_api_key_id = 5
API Key Record: id=5, encrypted_key="gAAAAA..."
Decrypted: "AIzaSy***************************o_pkMg"
Agent: Uses "AIzaSy***************************o_pkMg" for Google AI
```

---

**Your API key retrieval system is secure, efficient, and seamlessly integrated with the multi-agent architecture!** 🛡️
