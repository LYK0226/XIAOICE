# Quick Start - Authentication System

## Setup Instructions

### 1. Install Dependencies

```bash
pip install -r requirements.txt
```

### 2. Set Environment Variables

Create a `.env` file in the project root:

```bash
SECRET_KEY=your-secret-key-here
GOOGLE_API_KEY=your-google-api-key
DATABASE_URL=sqlite:///app.db
CREATE_DB_ON_STARTUP=true
```

### 3. Run the Application

```bash
python run.py
```

The application will be available at: http://127.0.0.1:5000

## Usage

### First Time Setup

1. **Navigate to Login Page**: http://127.0.0.1:5000/login
   - If you try to access the main page without logging in, you'll be automatically redirected to the login page

2. **Create an Account**:
   - Click the "Sign Up" button on the right panel
   - Fill in:
     - Username (min 3 characters)
     - Email (valid email format)
     - Password (min 6 characters)
   - Click "Sign Up"
   - You'll see a success message

3. **Sign In**:
   - After successful registration, the form will switch back to the login panel
   - Enter your email and password
   - Click "Sign In"
   - You'll be redirected to the main chat interface

4. **Use the Chat**:
   - You're now logged in and can use all features of the application

5. **Logout**:
   - Click the "退出登录" (Logout) button in the sidebar footer
   - You'll be logged out and redirected to the login page

## Testing

Run the automated test script:

```bash
python test_auth.py
```

This will test:
- User registration
- User login
- Authentication check
- Accessing protected routes
- User logout
- Access control after logout

## API Endpoints

### Public Endpoints
- `GET /login` - Login/Signup page
- `POST /auth/signup` - Register new user
- `POST /auth/login` - Login user
- `GET /auth/check` - Check authentication status

### Protected Endpoints (require login)
- `GET /` - Main chat interface
- `GET /demo` - Demo page
- `POST /chat` - Chat API
- `GET /test-api` - API testing page
- `GET /auth/me` - Get current user info
- `POST /auth/logout` - Logout

## File Structure

```
app/
├── __init__.py          # App initialization with Flask-Login
├── auth.py              # Authentication blueprint with login/signup routes
├── models.py            # Database models (User, UserProfile)
├── routes.py            # Main application routes (protected)
├── templates/
│   ├── login_signup.html   # Login/signup page
│   └── index.html          # Main chat interface
└── static/
    └── js/
        └── login_signup.js  # Login/signup form handling
```

## Troubleshooting

### "Invalid email or password"
- Make sure you're using the correct credentials
- Passwords are case-sensitive

### Redirected to login repeatedly
- Clear your browser cookies
- Check that SECRET_KEY is set in .env file
- Make sure cookies are enabled in your browser

### Database errors
- Make sure DATABASE_URL is set correctly
- Check file permissions on the database file
- Run migrations if needed: `flask db upgrade`

## Security Notes

- Passwords are hashed using Werkzeug's secure hash
- Sessions are managed by Flask-Login
- All main routes require authentication
- Email addresses are stored in lowercase
- User accounts can be disabled by setting `is_active=False`

## Next Features (Potential Enhancements)

- [ ] Email verification
- [ ] Password reset via email
- [ ] Remember me checkbox
- [ ] Two-factor authentication
- [ ] OAuth login (Google, GitHub)
- [ ] User profile management
- [ ] Admin panel

For more detailed documentation, see: `docs/AUTHENTICATION-GUIDE.md`
