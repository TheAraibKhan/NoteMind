@echo off
echo.
echo ╔════════════════════════════════════════╗
echo ║    NoteMind SaaS - Setup Script        ║
echo ╚════════════════════════════════════════╝
echo.

REM Check if Node.js is installed
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo ❌ Node.js is not installed. Please install Node.js 16+ first.
    pause
    exit /b 1
)

for /f "tokens=*" %%i in ('node -v') do set NODE_VERSION=%%i
echo ✓ Node.js %NODE_VERSION% found
echo.

REM Install Frontend Dependencies
echo 📦 Installing Frontend Dependencies...
cd frontend
call npm install --legacy-peer-deps
if %errorlevel% neq 0 (
    echo ❌ Failed to install frontend dependencies
    cd ..
    pause
    exit /b 1
)
echo ✓ Frontend dependencies installed
echo.

REM Install Backend Dependencies
echo 📦 Installing Backend Dependencies...
cd ..\backend
call npm install
if %errorlevel% neq 0 (
    echo ❌ Failed to install backend dependencies
    cd ..
    pause
    exit /b 1
)
echo ✓ Backend dependencies installed
echo.

REM Setup Environment Variables
echo ⚙️  Setting up environment variables...

if not exist ".env" (
    (
        echo # Backend Configuration
        echo NODE_ENV=development
        echo PORT=5000
        echo MONGODB_URI=mongodb://localhost:27017/notemind
        echo JWT_SECRET=your-secret-key-change-in-production
        echo GEMINI_API_KEY=AIzaSy...
        echo CORS_ORIGIN=http://localhost:3000
    ) > .env
    echo ✓ Created backend\.env (please update with real values)
) else (
    echo ⚠️  backend\.env already exists, skipping...
)

if not exist "..\frontend\.env.local" (
    (
        echo NEXT_PUBLIC_API_URL=http://localhost:5000/api
    ) > ..\frontend\.env.local
    echo ✓ Created frontend\.env.local
) else (
    echo ⚠️  frontend\.env.local already exists, skipping...
)

cd ..

echo.
echo ╔════════════════════════════════════════╗
echo ║     ✓ Setup Complete!               ║
echo ╠════════════════════════════════════════╣
echo ║  📖 Next Steps:                        ║
echo ║  1. Update backend\.env variables      ║
echo ║  2. npm run dev (from root)            ║
echo ║  3. Visit http://localhost:3000        ║
echo ╚════════════════════════════════════════╝
echo.
pause
