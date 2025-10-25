# Authentication System Guide

## Overview

The XIAOICE application now includes a complete user authentication system with login and registration functionality. User credentials are securely stored in the database with password hashing.

## Features

### 1. User Registration
- Users can create a new account with:
  - Username (minimum 3 characters)
  - Email (valid email format required)
  - Password (minimum 6 characters)
- Automatic validation of input fields
- Checks for duplicate usernames and emails
- Automatically creates a user profile with default settings
- Password is securely hashed before storage

### 2. User Login
- Users can log in with:
  - Email address
  - Password
- Session management with Flask-Login
- Remember me functionality (enabled by default)
- Redirects to main chat interface on successful login

### 3. Protected Routes
All main application routes are now protected and require authentication:
- `/` - Main chat interface
- `/demo` - Demo page
- `/chat` - Chat API endpoint
- `/test-api` - API testing page

Unauthenticated users are automatically redirected to `/login`.

### 4. Logout
- Users can logout from the main interface
- Logout button is located in the sidebar footer
- Redirects to login page after logout

## API Endpoints

### Authentication Endpoints (`/auth`)

#### POST `/auth/signup`
Register a new user.

**Request Body:**
```json
{
  "username": "user123",
  "email": "user@example.com",
  "password": "password123"
}
```

**Success Response (201):**
```json
{
  "message": "User registered successfully",
  "user": {
    "id": 1,
    "username": "user123",
    "email": "user@example.com",
    "avatar": null,
    "created_at": "2025-10-25T12:00:00",
    "is_active": true
  }
}
```

**Error Responses:**
- 400: Validation error (missing fields, invalid format, duplicate user)
- 500: Server error

#### POST `/auth/login`
Authenticate a user.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Success Response (200):**
```json
{
  "message": "Login successful",
  "user": {
    "id": 1,
    "username": "user123",
    "email": "user@example.com",
    "avatar": null,
    "created_at": "2025-10-25T12:00:00",
    "is_active": true
  }
}
```

**Error Responses:**
- 400: Missing email or password
- 401: Invalid credentials
- 403: Account disabled
- 500: Server error

#### POST `/auth/logout`
Logout the current user (requires authentication).

**Success Response (200):**
```json
{
  "message": "Logged out successfully"
}
```

#### GET `/auth/check`
Check if the current user is authenticated.

**Success Response (200):**
```json
{
  "authenticated": true,
  "user": { ... }
}
```

or

```json
{
  "authenticated": false
}
```

#### GET `/auth/me`
Get current logged-in user information (requires authentication).

**Success Response (200):**
```json
{
  "user": {
    "id": 1,
    "username": "user123",
    "email": "user@example.com",
    "avatar": null,
    "created_at": "2025-10-25T12:00:00",
    "is_active": true
  }
}
```

## Database Schema

### Users Table
- `id`: Integer, Primary Key
- `username`: String(80), Unique, Indexed
- `email`: String(120), Unique, Indexed
- `password_hash`: String(255)
- `avatar`: Text (base64 or URL)
- `created_at`: DateTime
- `updated_at`: DateTime
- `is_active`: Boolean (default: True)

### User Profiles Table
- `id`: Integer, Primary Key
- `user_id`: Foreign Key to Users
- `language`: String(20), default: 'zh-CN'
- `theme`: String(20), default: 'light'
- `background_type`: String(20), default: 'gradient'
- `background_value`: Text
- `bot_avatar`: Text
- `created_at`: DateTime
- `updated_at`: DateTime

## Security Features

1. **Password Hashing**: Passwords are hashed using Werkzeug's `generate_password_hash` with default settings (pbkdf2:sha256)
2. **Session Management**: Flask-Login manages user sessions securely
3. **CSRF Protection**: Built-in Flask session security
4. **Input Validation**: Email format validation, password strength requirements
5. **SQL Injection Protection**: SQLAlchemy ORM prevents SQL injection attacks

## User Flow

### Registration Flow
1. User navigates to `/login`
2. Clicks "Sign Up" toggle
3. Fills in username, email, and password
4. Clicks "Sign Up" button
5. JavaScript validates and sends POST to `/auth/signup`
6. Server validates input and creates user
7. Success message displayed
8. User switches to login form to sign in

### Login Flow
1. User navigates to `/login` (or is redirected from protected route)
2. Enters email and password
3. Clicks "Sign In" button
4. JavaScript sends POST to `/auth/login`
5. Server validates credentials
6. User session is created
7. User is redirected to main chat interface (`/`)

### Logout Flow
1. User clicks logout button in sidebar
2. JavaScript sends POST to `/auth/logout`
3. Server destroys session
4. User is redirected to `/login`

## Configuration

### Environment Variables
Add to your `.env` file:
```
SECRET_KEY=your-secret-key-here
DATABASE_URL=sqlite:///app.db  # or your database URL
```

### Required Dependencies
```
Flask>=3.1.2
Flask-SQLAlchemy>=3.0.3
Flask-Login>=0.6.3
Flask-Migrate>=4.0.0
```

## Testing

You can test the authentication system using:
1. The web interface at `/login`
2. API testing tools like Postman or curl
3. The built-in test page at `/test-api` (after logging in)

### Example curl commands:

**Register:**
```bash
curl -X POST http://localhost:5000/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser","email":"test@example.com","password":"password123"}'
```

**Login:**
```bash
curl -X POST http://localhost:5000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}' \
  -c cookies.txt
```

**Check Auth:**
```bash
curl http://localhost:5000/auth/check -b cookies.txt
```

**Logout:**
```bash
curl -X POST http://localhost:5000/auth/logout -b cookies.txt
```

## Troubleshooting

### Issue: Can't login after registration
- Make sure you're using the correct email and password
- Check if the account is active (`is_active` field in database)
- Verify that cookies are enabled in your browser

### Issue: Redirected to login page repeatedly
- Clear your browser cookies
- Check that SECRET_KEY is set in your configuration
- Verify that the session is being created properly

### Issue: Database errors
- Run migrations: `flask db upgrade`
- Check database file permissions
- Verify DATABASE_URL configuration

## Next Steps

Potential enhancements:
1. Email verification for new accounts
2. Password reset functionality
3. Two-factor authentication (2FA)
4. OAuth integration (Google, GitHub, etc.)
5. Rate limiting for login attempts
6. Account management (change password, update profile)
7. Admin panel for user management
