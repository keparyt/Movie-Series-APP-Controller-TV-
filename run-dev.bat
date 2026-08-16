@echo off
setlocal EnableExtensions
cd /d "%~dp0"

echo ========================================
echo   Movie Series TV - Development
echo ========================================
echo.

where npm >nul 2>&1
if errorlevel 1 (
    echo [ERROR] npm is not installed or not in PATH.
    pause
    exit /b 1
)

if not exist "node_modules" (
    echo [INFO] node_modules was not found.
    echo [INFO] Installing dependencies first...
    call npm install
    if errorlevel 1 (
        echo [ERROR] Dependency installation failed.
        pause
        exit /b 1
    )
)

echo [INFO] Starting Vite + Electron development application...
echo [INFO] Close the Electron window or press Ctrl+C in this console to stop it.
echo.
call npm run dev
set "EXIT_CODE=%ERRORLEVEL%"

echo.
if not "%EXIT_CODE%"=="0" (
    echo [ERROR] Development application exited with code %EXIT_CODE%.
) else (
    echo [OK] Development application stopped normally.
)
pause
exit /b %EXIT_CODE%
