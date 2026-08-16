@echo off
setlocal EnableExtensions
cd /d "%~dp0"

echo ========================================
echo   Movie Series TV - Windows EXE Build
echo ========================================
echo.

where npm >nul 2>&1
if errorlevel 1 (
    echo [ERROR] npm is not installed or not in PATH.
    pause
    exit /b 1
)

if not exist "node_modules" (
    echo [INFO] node_modules not found. Installing dependencies...
    call npm install
    if errorlevel 1 goto :fail
)

if not exist "node_modules\electron-builder" (
    echo [INFO] electron-builder not found. Installing dependencies...
    call npm install
    if errorlevel 1 goto :fail
)

echo [1/2] Building production frontend...
call npm run build
if errorlevel 1 goto :fail

echo.
echo [2/2] Packaging Windows installer and portable EXE...
if exist "dist-electron" rmdir /s /q "dist-electron"
call npx electron-builder --win --x64
if errorlevel 1 goto :fail

echo.
echo ========================================
echo   BUILD COMPLETE
necho ========================================
echo.
echo Output directory:
echo   %CD%\dist-electron\
echo.
echo The portable EXE and Windows installer should be above.
echo.
if exist "dist-electron" dir /b "dist-electron"
echo.
pause
exit /b 0

:fail
echo.
echo [ERROR] Build/package failed.
echo Check the error above and try again.
echo.
pause
exit /b 1
