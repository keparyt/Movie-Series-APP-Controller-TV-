@echo off
setlocal EnableExtensions
cd /d "%~dp0"

echo ========================================
echo   Movie Series TV - Build Windows EXE
 echo ========================================
echo.

where npm >nul 2>&1
if errorlevel 1 (
    echo [ERROR] npm is not installed or not in PATH.
    pause
    exit /b 1
)

if not exist "node_modules" (
    echo [INFO] Installing dependencies...
    call npm install
    if errorlevel 1 goto :fail
)

echo [INFO] Building Vite production files...
call npm run build
if errorlevel 1 goto :fail

echo [INFO] Packaging Windows x64 installer + portable EXE...
if exist "dist-electron" rmdir /s /q "dist-electron"
call npx electron-builder --win --x64
if errorlevel 1 goto :fail

echo.
echo [OK] Windows EXE build completed.
echo [INFO] Files are in:
echo        %CD%\dist-electron\
echo.
dir /b "dist-electron"
echo.
pause
exit /b 0

:fail
echo.
echo [ERROR] Build failed. See the error above.
pause
exit /b 1
