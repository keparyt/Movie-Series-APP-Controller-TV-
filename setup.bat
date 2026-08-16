@echo off
setlocal EnableExtensions
cd /d "%~dp0"

echo ========================================
echo   Movie Series TV - Setup
echo ========================================
echo.

where node >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Node.js is not installed or not in PATH.
    echo Install Node.js 20+ and run this script again.
    pause
    exit /b 1
)

where npm >nul 2>&1
if errorlevel 1 (
    echo [ERROR] npm is not installed or not in PATH.
    pause
    exit /b 1
)

for /f "tokens=1" %%V in ('node -p "process.versions.node.split('.')[0]"') do set "NODE_MAJOR=%%V"
if %NODE_MAJOR% LSS 20 (
    echo [ERROR] Node.js 20+ is required. Detected Node.js %NODE_MAJOR%.
    pause
    exit /b 1
)

echo [INFO] Node.js detected:
node --version
echo [INFO] npm detected:
npm --version
echo.

echo [INFO] Installing project dependencies...
npm install
if errorlevel 1 (
    echo.
    echo [ERROR] npm install failed.
    pause
    exit /b 1
)

echo.
echo [OK] Dependencies installed successfully.
echo.
echo Next steps:
echo   1. Configure .env using .env.example
necho   2. Run run-dev.bat for development
necho   3. Run build.bat for the production frontend
necho   4. Run package-windows.bat to create the Windows installer/portable app
pause
exit /b 0
