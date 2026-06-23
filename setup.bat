@echo off
:: =====================================================================
:: Alyamama ERP System - XAMPP Automated Installer & Builder Setup Wizard
:: =====================================================================
title Alyamama ERP Setup Wizard

:: Ensure we are starting inside the actual script's directory
cd /d "%~dp0"

:: Set command line encoding to UTF-8 for perfect Arabic support
chcp 65001 >nul

echo =====================================================================
echo    M3ald Al-Tathbeet Al-Talqa'y - Alyamama ERP
echo =====================================================================
echo.
echo يقوم هذا الملف باعداد وتثبيت النظام تلقائيا للعمل تحت سيرفر XAMPP المحلي.
echo سيقوم المعالج بتنفيذ الخطوات التالية:
echo   1. تحميل وتثبيت الحزم والمكتبات المحاسبية الاساسية
echo   2. بناء وترجمة شاشات المنظومة وصيغ الحسابات
echo   3. التعرف على اسم مجلد المشروع لتهيئة الرابط المحلي تلقائيا
echo   4. تثبيت ونقل ملفات التشغيل إلى مسار XAMPP المحلي C:\xampp\htdocs
echo   5. اطلاق وتشغيل النظام في المتصفح تحت خادم الويب اباتشي
echo.
echo ---------------------------------------------------------------------
echo تنبيه: تاكد من تثبيت برنامج XAMPP في جهازك اولا في المسار C:\xampp
echo تاكد ايضا من تشغيل خادم Apache من لوحة تحكم XAMPP لتصفح النظام بنجاح.
echo ---------------------------------------------------------------------
echo.
pause

:: Verify Node.js is installed
echo.
echo جاري التحقق من وجود محرك التشغيل الجوهري...
where node >nul 2>nul
if %errorlevel% equ 0 goto node_installed_ok

echo.
echo تذكر: لم نتمكن من العثور على محرك Node.js في هذا الجهاز!
echo.
echo لتجهيز وبناء النظام، يتطلب الامر بيئة Node.js:
echo   1. يرجى تحميله وتثبيته مجانا من الموقع الرسمي: https://nodejs.org
echo   2. بعد انتهاء التثبيت، اغلق هذه النافذة ثم اعد تشغيل ملف setup.bat مجددا.
echo.
pause
exit /b

:node_installed_ok
echo تم التحقق من وجود بيئة Node.js بنجاح.
echo.

:: Get the current folder name where setup.bat resides dynamically
for %%I in ("%~dp0.") do set "FOLDER_NAME=%%~nxI"
if "%FOLDER_NAME%"=="" set "FOLDER_NAME=erp-system"

echo اسم مجلد المشروع الحالي الذي سيستخدم في الرابط: %FOLDER_NAME%
echo.

:: Create or ensure local configuration file (.env) exists
if not exist "%~dp0.env" (
    if exist "%~dp0.env.example" (
        copy "%~dp0.env.example" "%~dp0.env" >nul
        echo تم تفعيل ملف البيئة تلقائيا.
    )
)

:: Step 1 of 3: Install Core NodeJS dependencies
echo =====================================================================
echo   [1] جاري تثبيت الحزم التبعية والبرمجية للنظام (npm install)...
echo =====================================================================
echo.
echo يرجى الانتظار، قد تستغرق هذه العملية دقيقة او دقيقتين:
echo.

call npm install --no-audit --no-fund
if %errorlevel% neq 0 (
    echo.
    echo خطأ: فشل تثبيت مكتبات النظام التبعية!
    echo يرجى التحقق من اتصالك بالانترنت والتحقق من صلاحيات المجلد، ثم اعد المحاولة.
    pause
    exit /b 1
)
echo تم تركيب مكتبات الواجهة والحسابات بنجاح.
echo.

:: Step 2 of 3: Compile and Build React SPA Code
echo =====================================================================
echo   [2] جاري بناء النسخة المترجمة والمضغوطة للإنتاج (npm run build)...
echo =====================================================================
echo.
echo جاري ترجمة الواجهات وبناء مجلد التوزيع:
echo.

call npm run build
if %errorlevel% neq 0 (
    echo.
    echo حدث خطأ اثناء بناء وتجميع صفحات وتطبيقات الويب.
    echo سنحاول المتابعة، ولكن قد تكون هناك مشاكل في مجلد الاخراج dist.
    pause
) else (
    echo تم بناء وترجمة كود المنظومة البرمجية بنجاح!
)
echo.

:: Validate dist directory is present
if not exist "%~dp0dist" (
    echo.
    echo خطأ: مجلد الاخراج dist غير متوفر! لا يمكن اكمال النقل الى XAMPP.
    echo يرجى التاكد من تشغيل البناء يدويا ومعرفة تفاصيل الخطأ.
    pause
    exit /b 1
)

:: Step 3 of 3: Deploy build output to XAMPP htdocs
echo =====================================================================
echo   [3] جاري نقل وتهيئة ملفات المنظومة على سيرفر XAMPP المحلي...
echo =====================================================================
echo.

set "HTDOCS_PATH=C:\xampp\htdocs"
set "TARGET_FOLDER=%HTDOCS_PATH%\%FOLDER_NAME%"

if not exist "%HTDOCS_PATH%" (
    echo.
    echo تنبيه: لم يتم العثور على مسار XAMPP القياسي في جهازك C:\xampp\htdocs
    echo هل قمت بتثبيت XAMPP في مسار مخصص؟
    echo سيقوم البرنامج الان بمحاولة انشاء المجلد وتحضير الملفات في القرص C تمهيدا لقيامك بنسخها يدويا لاحقا.
    echo.
)

echo جاري انشاء المجلد في مسار خادم الويب المحلي:
echo %TARGET_FOLDER%
mkdir "%TARGET_FOLDER%" 2>nul

echo جاري نسخ محتويات المجلد المترجم dist لتثبيت النظام...
xcopy "%~dp0dist\*.*" "%TARGET_FOLDER%\" /E /I /H /Y /Q >nul

if %errorlevel% neq 0 (
    echo.
    echo خطأ: حدثت مشكلة اثناء محاولة نسخ ملفات النظام إلى مجلد XAMPP.
    echo قد تحتاج لتشغيل هذا الملف كمسؤول (Run as Administrator) لتوفير صلاحية الكتابة لقرص النظام.
    pause
) else (
    echo تم نقل وبناء كامل محتويات النظام الى سيرفر XAMPP بنجاح!
)
echo.

echo =====================================================================
echo     تهانينا! تم تثبيت اليمامة المحاسبي بنجاح على سيرفر XAMPP المحلي
echo =====================================================================
echo.
echo مسار تثبيت النظام الحالي: %TARGET_FOLDER%
echo الرابط المحلي في متصفح الويب: http://localhost/%FOLDER_NAME%/
echo.
echo الخطوة القادمة والاخيرة:
echo   1. افتح تطبيق XAMPP Control Panel في جهازك.
echo   2. تاكد من اطلاق خدمة خادم اباتشي Apache بالضغط على زر Start.
echo   3. سيفتح المتصفح الان تلقائيا على رابط النظام.
echo.
echo اضغط على اي مفتاح لانهاء التثبيت وفتح واجهة المنظومة المحاسبية في متصفحك!
echo =====================================================================
pause

start "" "http://localhost/%FOLDER_NAME%/"
exit
