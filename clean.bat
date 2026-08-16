@echo off
setlocal EnableExtensions
cd /d "%~dp0"

echo ========================================
echo   Movie Series TV - Clean Build Files
echo ========================================
echo.

echo This removes generated dependency/build directories:
echo   node_modules
 echo   dist
 echo   dist-electron
 echo.
choice /C YN /N /M "Continue? [Y/N] "
if errorlevel 2 exit /b 0

echo.
if exist "node_modules" (
    echo [INFO] Removing node_modules...
    rmdir /s /q "node_modules"
)
if exist "dist" (
    echo [INFO] Removing dist...
    rmdir /s /q "dist"
)
if exist "dist-electron" (
    echo [INFO] Removing dist-electron...
    rmdir /s /q "dist-electron"
)

echo.
echo [OK] Generated build files removed.
echo Run setup.bat to reinstall dependencies.
pause
exit /b 0
