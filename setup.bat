@echo off
title Alyamama ERP Setup Wizard
echo =========================================================
echo   Alyamama ERP - Automated Local Installation Wizard
echo =========================================================
echo.
echo This script will set up the system to run on local XAMPP.
echo Processing steps:
echo   1. Install packages (npm install)
echo   2. Build the system (npm run build)
echo   3. Copy built files to C:\xampp\htdocs
echo.
echo Press any key to start...
pause >nul

echo.
echo [*] Checking Node.js installation...
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Node.js is not installed!
    echo Please download and install Node.js from https://nodejs.org
    echo then run this setup.bat file again.
    pause
    exit /b 1
)
echo [OK] Node.js is installed.

echo.
echo [*] Installing dependencies (npm install)...
echo Please wait, this may take a moment...
call npm install --no-audit --no-fund
if %errorlevel% neq 0 (
    echo [ERROR] Failed to install npm dependencies!
    pause
    exit /b 1
)
echo [OK] Dependencies installed successfully.

echo.
echo [*] Building production bundle (npm run build)...
call npm run build
if %errorlevel% neq 0 (
    echo [ERROR] Failed to build the application!
    pause
    exit /b 1
)
echo [OK] Build completed successfully.

:: Detect current folder name dynamically
for %%I in ("%~dp0.") do set "FOLDER_NAME=%%~nxI"
if "%FOLDER_NAME%"=="" set "FOLDER_NAME=alyamama-erp"

set "HTDOCS_PATH=C:\xampp\htdocs"
set "TARGET_FOLDER=%HTDOCS_PATH%\%FOLDER_NAME%"

echo.
echo [*] Deploying files to XAMPP htdocs...
echo Target folder: %TARGET_FOLDER%

if not exist "%HTDOCS_PATH%" (
    echo [WARNING] XAMPP htdocs directory not found at %HTDOCS_PATH%
    echo Creating target folder at C:\xampp_htdocs_fallback instead...
    set "TARGET_FOLDER=C:\xampp_htdocs_fallback\%FOLDER_NAME%"
)

echo [*] Creating directory...
mkdir "%TARGET_FOLDER%" >nul 2>nul

echo [*] Copying build contents from "dist" to htdocs...
xcopy "%~dp0dist\*.*" "%TARGET_FOLDER%\" /E /I /H /Y /Q >nul
if %errorlevel% neq 0 (
    echo [ERROR] Failed to copy files to htdocs. 
    echo Please try running this script as Administrator.
    pause
    exit /b 1
)

echo.
echo =========================================================
echo   SUCCESS! Alyamama ERP has been installed on XAMPP!
echo =========================================================
echo.
echo Virtual URL: http://localhost/%FOLDER_NAME%/
echo htdocs path: %TARGET_FOLDER%
echo.
echo To run the system:
echo   1. Open XAMPP Control Panel
echo   2. Start Apache Server
echo   3. The system will now open in your browser.
echo.
echo Press any key to open the application in your browser...
pause >nul

start "" "http://localhost/%FOLDER_NAME%/"
exit
