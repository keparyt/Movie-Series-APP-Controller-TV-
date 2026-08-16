@echo off
setlocal EnableExtensions
cd /d "%~dp0"

echo ========================================
echo   Movie Series TV - Production Build
echo ========================================
echo.

where npm >nul 2>&1
if errorlevel 1 (
    echo [ERROR] npm is not installed or not in PATH.
    pause
    exit /b 1
)

if not exist "node_modules" (
    echo [INFO] node_modules was not found. Installing dependencies...
    call npm install
    if errorlevel 1 (
        echo [ERROR] Dependency installation failed.
        pause
        exit /b 1
    )
)

echo [INFO] Building the production frontend...
call npm run build
if errorlevel 1 (
    echo.
    echo [ERROR] Production frontend build failed.
    pause
    exit /b 1
)

echo.
echo [OK] Production frontend built successfully.
echo [INFO] Output: dist\
echo.
pause
exit /b 0
