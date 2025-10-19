@echo off
REM setup.bat - Automatic setup script for XIAOICE backend (Windows)

echo.
echo 🚀 XIAOICE Flask Backend Setup Script (Windows)
echo =============================================
echo.

REM Check Python installation
echo 📋 Checking Python installation...
python --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Python is not installed or not in PATH. Please install Python 3.7 or higher.
    pause
    exit /b 1
)

for /f "tokens=*" %%i in ('python --version 2^>^&1') do set PYTHON_VERSION=%%i
echo ✅ %PYTHON_VERSION% found
echo.

REM Navigate to backend directory
cd backend
if errorlevel 1 (
    echo ❌ Failed to navigate to backend directory
    pause
    exit /b 1
)

REM Create virtual environment (optional but recommended)
if not exist "venv" (
    echo 🔧 Creating Python virtual environment...
    python -m venv venv
    echo ✅ Virtual environment created
    echo.
    
    echo 📌 Activating virtual environment...
    call venv\Scripts\activate.bat
    echo ✅ Virtual environment activated
) else (
    echo ℹ️  Virtual environment already exists. Activating...
    call venv\Scripts\activate.bat
)
echo.

REM Install dependencies
echo 📦 Installing dependencies...
python -m pip install --upgrade pip setuptools wheel >nul 2>&1
pip install -r requirements.txt

if errorlevel 1 (
    echo ❌ Failed to install dependencies
    pause
    exit /b 1
)
echo ✅ Dependencies installed successfully
echo.

REM Create .env file if it doesn't exist
if not exist ".env" (
    echo ⚙️  Creating .env file...
    (
        echo FLASK_ENV=development
        echo FLASK_DEBUG=True
        echo SECRET_KEY=dev-secret-key-change-in-production
        echo SQLALCHEMY_DATABASE_URI=sqlite:///xiaoice.db
        echo JWT_SECRET_KEY=jwt-secret-key-change-in-production
    ) > .env
    echo ✅ .env file created
    echo ⚠️  Remember to change SECRET_KEY and JWT_SECRET_KEY in production!
) else (
    echo ℹ️  .env file already exists
)
echo.

REM Remove old database for fresh start (optional)
if exist "xiaoice.db" (
    echo 📝 Found existing database (xiaoice.db)
    setlocal enabledelayedexpansion
    set /p reset_db="Do you want to reset the database? (y/n): "
    if /i "!reset_db!"=="y" (
        del xiaoice.db
        echo ✅ Database removed. A new one will be created on startup.
    )
)
echo.

REM Display next steps
echo ════════════════════════════════════════
echo ✅ Setup Complete!
echo ════════════════════════════════════════
echo.
echo 📌 Next Steps:
echo.
echo 1. Start the Flask server:
echo    python run.py
echo.
echo 2. Open another command prompt and test the API:
echo    python test_api.py
echo.
echo 3. Start the frontend:
echo    (In the parent directory, use Live Server or any web server^)
echo.
echo 4. Open browser:
echo    http://localhost:5500/login.html
echo.
echo 📚 Documentation:
echo    - API Docs: README-BACKEND.md
echo    - Quick Start: ..\BACKEND-QUICKSTART.md
echo.
echo 💡 Tips:
echo    - Use SQLiteBrowser to view database: https://sqlitebrowser.org/
echo    - Use Postman to test API: https://www.postman.com/
echo.
echo 🆘 Need help?
echo    Check the documentation files for troubleshooting
echo.
pause
