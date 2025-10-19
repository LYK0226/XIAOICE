#!/bin/bash
# setup.sh - Automatic setup script for XIAOICE backend

echo "🚀 XIAOICE Flask Backend Setup Script"
echo "===================================="
echo ""

# Check Python installation
echo "📋 Checking Python installation..."
if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 is not installed. Please install Python 3.7 or higher."
    exit 1
fi

PYTHON_VERSION=$(python3 --version 2>&1 | awk '{print $2}')
echo "✅ Python $PYTHON_VERSION found"
echo ""

# Navigate to backend directory
cd backend || exit

# Create virtual environment (optional but recommended)
if [ ! -d "venv" ]; then
    echo "🔧 Creating Python virtual environment..."
    python3 -m venv venv
    echo "✅ Virtual environment created"
    echo ""
    
    # Activate virtual environment
    echo "📌 Activating virtual environment..."
    source venv/bin/activate
    echo "✅ Virtual environment activated"
else
    echo "ℹ️  Virtual environment already exists. Activating..."
    source venv/bin/activate
fi
echo ""

# Install dependencies
echo "📦 Installing dependencies..."
pip install --upgrade pip setuptools wheel > /dev/null 2>&1
pip install -r requirements.txt

if [ $? -eq 0 ]; then
    echo "✅ Dependencies installed successfully"
else
    echo "❌ Failed to install dependencies"
    exit 1
fi
echo ""

# Create .env file if it doesn't exist
if [ ! -f ".env" ]; then
    echo "⚙️  Creating .env file..."
    cat > .env << EOF
FLASK_ENV=development
FLASK_DEBUG=True
SECRET_KEY=dev-secret-key-change-in-production
SQLALCHEMY_DATABASE_URI=sqlite:///xiaoice.db
JWT_SECRET_KEY=jwt-secret-key-change-in-production
EOF
    echo "✅ .env file created"
    echo "⚠️  Remember to change SECRET_KEY and JWT_SECRET_KEY in production!"
else
    echo "ℹ️  .env file already exists"
fi
echo ""

# Remove old database for fresh start (optional)
if [ -f "xiaoice.db" ]; then
    echo "📝 Found existing database (xiaoice.db)"
    read -p "Do you want to reset the database? (y/n) " -n 1 -r
    echo ""
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        rm xiaoice.db
        echo "✅ Database removed. A new one will be created on startup."
    fi
fi
echo ""

# Display next steps
echo "════════════════════════════════════════"
echo "✅ Setup Complete!"
echo "════════════════════════════════════════"
echo ""
echo "📌 Next Steps:"
echo ""
echo "1. Start the Flask server:"
echo "   python run.py"
echo ""
echo "2. Open another terminal and test the API:"
echo "   python test_api.py"
echo ""
echo "3. Start the frontend:"
echo "   # In the parent directory"
echo "   # Use Live Server or any web server"
echo ""
echo "4. Open browser:"
echo "   http://localhost:5500/login.html"
echo ""
echo "📚 Documentation:"
echo "   - API Docs: README-BACKEND.md"
echo "   - Quick Start: ../BACKEND-QUICKSTART.md"
echo ""
echo "💡 Tips:"
echo "   - Use SQLiteBrowser to view database: https://sqlitebrowser.org/"
echo "   - Use Postman to test API: https://www.postman.com/"
echo ""
echo "🆘 Need help?"
echo "   Check the documentation files for troubleshooting"
echo ""
