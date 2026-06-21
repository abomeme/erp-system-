@echo off
:: =====================================================================
:: Vendor Ledger System - Standalone Setup & Local Launcher (v4.0)
::  any thing نظام إدارة الحسابات والعهد - ملف التشغيل والتثبيت السريع المستقل
:: =====================================================================
title Vendor Ledger System v4.0 - Standalone Launcher

:: Color slate and blue
color 0B

echo =====================================================================
echo    VENDOR LEDGER SYSTEM v4.0 - نظام إدارة الموردين والعملاء والعمال
echo =====================================================================
echo.
echo [1/4] Checking for Node.js environment...
echo [1/4] جاري التحقق من وجود بيئة تشغيل نود...

where node >nul 2>nul
if %errorlevel% neq 0 (
    echo.
    echo ERROR: Node.js is not installed on this computer!
    echo خطأ: بيئة تشغيل Node.js غير مثبتة على هذا الجهاز!
    echo.
    echo Please download and install Node.js from https://nodejs.org
    echo يرجى تحميل وتثبيت نود من الموقع الإلكتروني الرسمي https://nodejs.org
    echo then run this script again. ثم أعد تشغيل هذا الملف.
    echo.
    pause
    exit /b
)

echo Node.js detected: 
node -v

echo.
echo [2/4] Verifying packages and node_modules...
echo [2/4] جاري التحقق من الحزم التابعة للمشروع...

if not exist node_modules (
    echo node_modules folder is missing. Installing dependencies...
    echo مجلد الحزم غير موجود، جاري التثبيت التلقائي (قد يستغرق دقيقة)...
    call npm install
) else (
    echo Dependencies already installed.
    echo الحزم مثبتة بالفعل مسبقاً.
)

echo.
echo [3/4] Building production assets...
echo [3/4] جاري بناء وتجهيز ملفات النظام للتشغيل السريع...
call npm run build

echo.
echo [4/4] Starting local offline server...
echo [4/4] تشغيل الخادم المحلي الآن...
echo Applet will be accessible at: http://localhost:3000
echo سيتم تشغيل النظام على الرابط: http://localhost:3000
echo.

:: Automatically open default browser
start http://localhost:3000

:: Start the app
call npm run dev

pause
