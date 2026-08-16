@echo off
setlocal EnableExtensions
cd /d "%~dp0"

echo ========================================
echo   Movie Series TV - Launch Packaged App
echo ========================================
echo.

if not exist "dist-electron" (
    echo [ERROR] dist-electron was not found.
    echo Run package-windows.bat first.
    pause
    exit /b 1
)

set "APP_EXE="
for %%F in ("dist-electron\*.exe") do (
    echo %%~nxF | findstr /I /C:"Setup" >nul
    if errorlevel 1 if not defined APP_EXE set "APP_EXE=%%~fF"
)

if not defined APP_EXE (
    echo [ERROR] No portable Windows executable was found in dist-electron\.
    echo Run package-windows.bat and make sure the portable target was generated.
    pause
    exit /b 1
)

echo [INFO] Launching:
echo %APP_EXE%
echo.
start "Movie Series TV" "%APP_EXE%"
if errorlevel 1 (
    echo [ERROR] Failed to launch the packaged application.
    pause
    exit /b 1
)

echo [OK] Packaged application launched.
exit /b 0
