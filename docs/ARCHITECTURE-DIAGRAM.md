# Authentication System Architecture

## System Components

```
┌─────────────────────────────────────────────────────────────────┐
│                         XIAOICE Application                      │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                          Frontend Layer                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌──────────────────┐           ┌──────────────────┐           │
│  │  login_signup.html│           │   index.html     │           │
│  │                   │           │                  │           │
│  │  • Login Form     │           │  • Chat UI       │           │
│  │  • Signup Form    │           │  • Logout Button │           │
│  │  • Toggle Switch  │           │  • Sidebar       │           │
│  └────────┬──────────┘           └────────┬─────────┘           │
│           │                               │                      │
│  ┌────────▼──────────┐           ┌────────▼─────────┐           │
│  │login_signup.js    │           │  chatbox.js      │           │
│  │                   │           │                  │           │
│  │• Form Validation  │           │• Logout Handler  │           │
│  │• API Calls        │           │• Chat Functions  │           │
│  │• Error Handling   │           │                  │           │
│  └────────┬──────────┘           └────────┬─────────┘           │
│           │                               │                      │
└───────────┼───────────────────────────────┼──────────────────────┘
            │                               │
            │         HTTP Requests         │
            │                               │
┌───────────▼───────────────────────────────▼──────────────────────┐
│                         Backend Layer                             │
├───────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌──────────────────────────────────────────────────────┐        │
│  │             Flask Application (__init__.py)          │        │
│  │                                                       │        │
│  │  • Flask-Login Configuration                         │        │
│  │  • User Loader Function                              │        │
│  │  • Blueprint Registration                            │        │
│  └──────────────────┬───────────────────────────────────┘        │
│                     │                                             │
│  ┌──────────────────▼────────────┐  ┌────────────────────┐       │
│  │      auth.py (Blueprint)      │  │  routes.py         │       │
│  │                               │  │                    │       │
│  │  /auth/signup                 │  │  / (protected)     │       │
│  │  /auth/login                  │  │  /demo (protected) │       │
│  │  /auth/logout                 │  │  /chat (protected) │       │
│  │  /auth/check                  │  │  /login (public)   │       │
│  │  /auth/me                     │  │                    │       │
│  └───────────────┬───────────────┘  └──────────┬─────────┘       │
│                  │                             │                 │
│                  │                             │                 │
│  ┌───────────────▼─────────────────────────────▼──────────┐      │
│  │                  Flask-Login                            │      │
│  │                                                          │      │
│  │  • Session Management                                   │      │
│  │  • Login Required Decorator                             │      │
│  │  • Current User Context                                 │      │
│  │  • User Authentication                                  │      │
│  └────────────────────────┬─────────────────────────────────┘     │
│                           │                                       │
└───────────────────────────┼───────────────────────────────────────┘
                            │
                            │
┌───────────────────────────▼───────────────────────────────────────┐
│                       Database Layer                              │
├───────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌──────────────────────────────────────────────────────┐        │
│  │              models.py (SQLAlchemy)                  │        │
│  │                                                       │        │
│  │  ┌──────────────────┐      ┌──────────────────┐     │        │
│  │  │   User Model     │      │  UserProfile     │     │        │
│  │  │                  │      │     Model        │     │        │
│  │  │ • id             │      │ • id             │     │        │
│  │  │ • username       │      │ • user_id (FK)   │     │        │
│  │  │ • email          │◄─────┤ • language       │     │        │
│  │  │ • password_hash  │      │ • theme          │     │        │
│  │  │ • avatar         │      │ • background_*   │     │        │
│  │  │ • is_active      │      │ • bot_avatar     │     │        │
│  │  │ • created_at     │      │                  │     │        │
│  │  │ • updated_at     │      │                  │     │        │
│  │  │                  │      │                  │     │        │
│  │  │ Methods:         │      │                  │     │        │
│  │  │ • set_password() │      │                  │     │        │
│  │  │ • check_password()│     │                  │     │        │
│  │  │ • to_dict()      │      │                  │     │        │
│  │  └──────────────────┘      └──────────────────┘     │        │
│  └──────────────────────────────────────────────────────┘        │
│                           │                                       │
│  ┌────────────────────────▼──────────────────────────┐           │
│  │              SQLite Database (app.db)             │           │
│  │                                                    │           │
│  │  Tables: users, user_profiles                     │           │
│  └────────────────────────────────────────────────────┘           │
│                                                                   │
└───────────────────────────────────────────────────────────────────┘
```

## Request Flow Diagrams

### 1. User Registration Flow

```
┌──────┐                                                    ┌──────────┐
│Client│                                                    │  Server  │
└───┬──┘                                                    └────┬─────┘
    │                                                            │
    │  1. Fill registration form                                │
    ├──────────────────────────────────────────────────────────►│
    │     POST /auth/signup                                     │
    │     { username, email, password }                         │
    │                                                            │
    │                                     2. Validate input      │
    │                                        ├─────────────────► │
    │                                        │  • Check format   │
    │                                        │  • Check unique   │
    │                                        │  • Min length     │
    │                                        ◄─────────────────┤ │
    │                                                            │
    │                                     3. Hash password       │
    │                                        └─────────────────► │
    │                                                            │
    │                                     4. Create User         │
    │                                        └─────────────────► │
    │                                                    ┌───────▼────┐
    │                                                    │  Database  │
    │                                                    │            │
    │                                     5. Create Profile          │
    │                                        └────────────────►  │    │
    │                                                    └───────┬────┘
    │                                                            │
    │  6. Success response                                      │
    │◄──────────────────────────────────────────────────────────┤
    │     201 Created                                            │
    │     { message, user }                                      │
    │                                                            │
    │  7. Switch to login form                                  │
    │                                                            │
    ▼                                                            ▼
```

### 2. User Login Flow

```
┌──────┐                                                    ┌──────────┐
│Client│                                                    │  Server  │
└───┬──┘                                                    └────┬─────┘
    │                                                            │
    │  1. Fill login form                                       │
    ├──────────────────────────────────────────────────────────►│
    │     POST /auth/login                                      │
    │     { email, password }                                   │
    │                                                            │
    │                                     2. Find user by email │
    │                                        └─────────────────► │
    │                                                    ┌───────▼────┐
    │                                                    │  Database  │
    │                                                    └───────┬────┘
    │                                                            │
    │                                     3. Verify password     │
    │                                        └─────────────────► │
    │                                                            │
    │                                     4. Create session      │
    │                                        └─────────────────► │
    │                                          (Flask-Login)     │
    │                                                            │
    │  5. Success response + session cookie                     │
    │◄──────────────────────────────────────────────────────────┤
    │     200 OK                                                 │
    │     Set-Cookie: session=...                               │
    │     { message, user }                                      │
    │                                                            │
    │  6. Redirect to /                                         │
    ├──────────────────────────────────────────────────────────►│
    │     GET /                                                  │
    │     Cookie: session=...                                    │
    │                                                            │
    │                                     7. Verify session      │
    │                                        └─────────────────► │
    │                                          (Flask-Login)     │
    │                                                            │
    │  8. Return chat page                                      │
    │◄──────────────────────────────────────────────────────────┤
    │     200 OK                                                 │
    │     HTML: index.html                                       │
    │                                                            │
    ▼                                                            ▼
```

### 3. Protected Route Access Flow

```
┌──────┐                                                    ┌──────────┐
│Client│                                                    │  Server  │
└───┬──┘                                                    └────┬─────┘
    │                                                            │
    │  1. Request protected route                               │
    ├──────────────────────────────────────────────────────────►│
    │     GET /                                                  │
    │     Cookie: session=... (or missing)                      │
    │                                                            │
    │                                     2. Check authentication│
    │                                        └─────────────────► │
    │                                        @login_required     │
    │                                          decorator         │
    │                                                            │
    │     ┌─────────────────────────────────────────────────┐   │
    │     │          If NOT authenticated:                  │   │
    │     │                                                 │   │
    │     │  3a. Redirect to login                         │   │
    │     │◄────────────────────────────────────────────────┤   │
    │     │     302 Found                                   │   │
    │     │     Location: /login?next=/                     │   │
    │     │                                                 │   │
    │     └─────────────────────────────────────────────────┘   │
    │                                                            │
    │     ┌─────────────────────────────────────────────────┐   │
    │     │          If authenticated:                      │   │
    │     │                                                 │   │
    │     │  3b. Return requested page                     │   │
    │     │◄────────────────────────────────────────────────┤   │
    │     │     200 OK                                      │   │
    │     │     HTML: index.html                            │   │
    │     │                                                 │   │
    │     └─────────────────────────────────────────────────┘   │
    │                                                            │
    ▼                                                            ▼
```

### 4. Logout Flow

```
┌──────┐                                                    ┌──────────┐
│Client│                                                    │  Server  │
└───┬──┘                                                    └────┬─────┘
    │                                                            │
    │  1. Click logout button                                   │
    ├──────────────────────────────────────────────────────────►│
    │     POST /auth/logout                                     │
    │     Cookie: session=...                                    │
    │                                                            │
    │                                     2. Destroy session     │
    │                                        └─────────────────► │
    │                                          (Flask-Login)     │
    │                                                            │
    │  3. Success response                                      │
    │◄──────────────────────────────────────────────────────────┤
    │     200 OK                                                 │
    │     { message: "Logged out successfully" }                │
    │                                                            │
    │  4. Redirect to login page                                │
    │                                                            │
    │  5. Request login page                                    │
    ├──────────────────────────────────────────────────────────►│
    │     GET /login                                             │
    │     (no session cookie)                                    │
    │                                                            │
    │  6. Return login page                                     │
    │◄──────────────────────────────────────────────────────────┤
    │     200 OK                                                 │
    │     HTML: login_signup.html                               │
    │                                                            │
    ▼                                                            ▼
```

## Security Layers

```
┌─────────────────────────────────────────────────────────────┐
│                        Security Layers                       │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Layer 1: Input Validation                                  │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ • Email format validation (regex)                      │ │
│  │ • Username length check (min 3 chars)                 │ │
│  │ • Password strength check (min 6 chars)               │ │
│  │ • Duplicate email/username detection                  │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                              │
│  Layer 2: Password Security                                 │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ • PBKDF2-SHA256 hashing                               │ │
│  │ • Salted hashes (automatic)                           │ │
│  │ • Never store plain text passwords                    │ │
│  │ • Secure password verification                        │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                              │
│  Layer 3: Session Security                                  │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ • Secure session cookies                              │ │
│  │ • Session-based authentication                        │ │
│  │ • Automatic session cleanup on logout                 │ │
│  │ • CSRF protection (Flask built-in)                    │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                              │
│  Layer 4: Access Control                                    │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ • @login_required decorator on protected routes       │ │
│  │ • Automatic redirect for unauthenticated users        │ │
│  │ • User account enable/disable (is_active flag)        │ │
│  │ • Role-based access (extensible)                      │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                              │
│  Layer 5: Database Security                                 │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ • SQLAlchemy ORM (SQL injection protection)           │ │
│  │ • Parameterized queries                               │ │
│  │ • Input sanitization                                  │ │
│  │ • Database connection security                        │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

## Technology Stack

```
┌─────────────────────────────────────────────────────────────┐
│                      Technology Stack                        │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Backend:                                                    │
│  • Flask 3.1.2 - Web framework                              │
│  • Flask-Login 0.6.3 - Session management                   │
│  • Flask-SQLAlchemy 3.0.3 - Database ORM                    │
│  • Flask-Migrate 4.0.0 - Database migrations                │
│  • Werkzeug - Password hashing                              │
│                                                              │
│  Frontend:                                                   │
│  • HTML5 - Structure                                        │
│  • CSS3 - Styling                                           │
│  • JavaScript (ES6+) - Functionality                        │
│  • Font Awesome 6.0 - Icons                                 │
│  • Fetch API - HTTP requests                                │
│                                                              │
│  Database:                                                   │
│  • SQLite - Development database                            │
│  • (Supports PostgreSQL, MySQL for production)              │
│                                                              │
│  Security:                                                   │
│  • PBKDF2-SHA256 - Password hashing                         │
│  • Secure session cookies                                   │
│  • CSRF protection                                          │
│  • SQL injection protection                                 │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```
