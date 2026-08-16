@echo off
setlocal EnableExtensions
cd /d "%~dp0"

echo ========================================
echo   Movie Series TV - Windows Package
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

echo [INFO] Creating Windows installer and portable executable...
call npm run package
if errorlevel 1 (
    echo.
    echo [ERROR] Electron packaging failed.
    pause
    exit /b 1
)

echo.
echo [OK] Windows package completed.
echo [INFO] Output directory: dist-electron\
echo.
if exist "dist-electron" (
    echo Generated files:
    dir /b "dist-electron"
)
echo.
pause
exit /b 0
