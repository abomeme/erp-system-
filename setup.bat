@echo off
:: =====================================================================
:: Alyamama ERP System - XAMPP Automated Installer & Builder Setup Wizard
:: نظام اليمامة المحاسبي - معالج البناء والتثبيت التلقائي لبيئة XAMPP
:: =====================================================================
title معالج تثبيت وبناء النظام على سيرفر XAMPP المحلي
color 0B

:: Ensure we are starting inside the actual script's directory
cd /d "%~dp0"

:: Set command line encoding to UTF-8 for perfect Arabic support
chcp 65001 >nul

echo =====================================================================
echo    ✨ معالج التثبيت والدمج التلقائي لنظام اليمامة المحاسبي على XAMPP ✨
2026 Awlad Dawood Alyamama ERP - XAMPP Setup v1.0
echo =====================================================================
echo.
echo يقوم هذا الملف بإعداد وتثبيت النظام تلقائياً للعمل تحت سيرفر XAMPP المحلي.
echo سيقوم المعالج بتنفيذ الخطوات التالية:
echo   1. تحميل وتثبيت الحزم والمكتبات المحاسبية الأساسية (npm install)
echo   2. بناء وترجمة شاشات المنظومة وصيغ الحسابات (npm run build)
echo   3. التعرف على اسم مجلد المشروع لتهيئة الرابط المحلي تلقائياً
echo   4. تثبيت ونقل ملفات التشغيل (مجلد dist) إلى مسار XAMPP المحلي (C:\xampp\htdocs)
echo   5. إطلاق وتشغيل النظام في المتصفح تحت خادم الويب أباتشي
echo.
echo ---------------------------------------------------------------------
echo تذكر: تأكد من تثبيت برنامج XAMPP في جهازك أولاً (في المسار القياسي C:\xampp)
echo تأكد أيضاً من تشغيل خادم Apache من لوحة تحكم XAMPP لتصفح النظام بنجاح.
echo ---------------------------------------------------------------------
echo.
pause

:: Verify Node.js is installed
echo.
echo [*] جاري التحقق من وجود محرك التشغيل الجوهري (Checking Node.js)...
where node >nul 2>nul
if %errorlevel% equ 0 goto :node_installed_ok

echo.
echo ⚠️ [تنبيه هام] لم نتمكن من العثور على محرك Node.js في هذا الجهاز!
echo.
echo لبناء واجهات النظام وتجهيز ملفات ويب مضغوطة وسريعة، يتطلب الأمر بيئة Node.js:
echo   1. يرجى تحميله فورا مجانا بضغطة زر من الموقع الرسمي:
echo      🔗 https://nodejs.org
echo   2. قم دائماً باختيار نسخة الـ (LTS) الموصى بها لأغلب المستخدمين وثبتها.
echo   3. بعد انتهاء التثبيت، أغلق هذه النافذة ثم أعد تشغيل ملف (setup.bat) مجدداً.
echo.
pause
exit /b

:node_installed_ok
echo [✓] تم التحقق من وجود بيئة Node.js بنجاح.
echo.

:: Get the current folder name where setup.bat resides dynamically
for %%I in ("%~dp0.") do set "FOLDER_NAME=%%~nxI"
if "%FOLDER_NAME%"=="" set "FOLDER_NAME=erp-system"

echo [*] تم التعرف على اسم مجلد المشروع الحالي: %FOLDER_NAME%
echo.

:: Create or ensure local configuration file (.env) exists
if not exist "%~dp0.env" (
    if exist "%~dp0.env.example" (
        copy "%~dp0.env.example" "%~dp0.env" >nul
        echo [✓] تم تفعيل ملف البيئة .env تلقائياً.
    )
)

:: Step 1 of 3: Install Core NodeJS dependencies
echo =====================================================================
echo   [أولاً]: جاري فك وتركيب وتثبيت الحزم التبعية والبرمجية للنظام...
echo      Npm install is pulling core packages...
echo =====================================================================
echo.
echo يرجى الانتظار، قد تستغرق هذه العملية ما بين نصف دقيقة إلى دقيقة بناءً على سرعة جهازك:
echo.

call npm install --no-audit --no-fund
if %errorlevel% neq 0 (
    echo.
    echo ❌ [خطأ فادح] فشل تثبيت مكتبات النظام التبعية!
    echo يرجى التحقق من اتصالك بالإنترنت والتحقق من صلاحيات المجلد، ثم أعد المحاولة.
    pause
    exit /b 1
)
echo.
echo [✓] تم تركيب مكتبات الواجهة والحسابات بنجاح تام!
echo.

:: Step 2 of 3: Compile and Build React SPA Code
echo =====================================================================
echo   [ثانياً]: جاري بناء النسخة المترجمة والمضغوطة للإنتاج (npm run build)
echo      Compiling and building highly-optimized Web application...
echo =====================================================================
echo.
echo جاري ترجمة الواجهات وبناء مجلد التوزيع (dist) بأعلى كفاءة وسرعة ممكنة:
echo.

call npm run build
if %errorlevel% neq 0 (
    echo.
    echo ❌ [خطأ] حدث خطأ أثناء بناء وتجميع صفحات وتطبيقات الويب.
    echo سنحاول المتابعة، ولكن قد تكون هناك مشاكل في مجلد الإخراج dist.
    pause
) else (
    echo.
    echo [✓] تم بناء وترجمة كود المنظومة البرمجية الفعالة بنجاح تام!
)
echo.

:: Validate dist directory is present
if not exist "%~dp0dist" (
    echo.
    echo ❌ [خطأ] مجلد الإخراج (dist) غير متوفر! لا يمكن إكمال النقل إلى XAMPP.
    echo يرجى التأكد من تشغيل البناء يدوياً ومعرفة تفاصيل الخطأ في سطر الأوامر.
    pause
    exit /b 1
)

:: Step 3 of 3: Deploy build output to XAMPP htdocs
echo =====================================================================
echo   [ثالثاً]: جاري نقل وتهيئة ملفات المنظومة على سيرفر XAMPP المحلي...
echo      Transferring built static files to XAMPP server...
echo =====================================================================
echo.

:: Check paths or generate target directories
set "HTDOCS_PATH=C:\xampp\htdocs"
set "TARGET_FOLDER=%HTDOCS_PATH%\%FOLDER_NAME%"

if not exist "%HTDOCS_PATH%" (
    echo.
    echo ⚠️ [تحذير هام] لم يتم العثور على مسار XAMPP القياسي في جهازك (%HTDOCS_PATH%)!
    echo هل قمت بتثبيت XAMPP في مسار مخصص؟ 
    echo سيقوم البرنامج الآن بمحاولة إنشاء المجلد وتحضير الملفات في القرص C تمهيداً لقيامك بنسخها يدوياً لاحقاً.
    echo.
)

echo [*] جاري إنشاء المجلد وتنسيقه في مسار خادم الويب المحلي:
echo     📂 %TARGET_FOLDER%
mkdir "%TARGET_FOLDER%" 2>nul

echo [*] جاري نسخ محتويات المجلد المترجم (dist) لتثبيت النظام...
xcopy "%~dp0dist\*.*" "%TARGET_FOLDER%\" /E /I /H /Y /Q >nul

if %errorlevel% neq 0 (
    echo.
    echo ❌ [خطأ] حدثت مشكلة أثناء محاولة نسخ ملفات النظام إلى مجلد XAMPP.
    echo قد تحتاج لتشغيل هذا الملف كمسؤول (Run as Administrator) لتوفير صلاحية الكتابة لقرص النظام.
    echo أو تأكد من إغلاق المجلد إذا كان مفتوحاً أو قيد الاستخدام.
    pause
) else (
    echo [✓] تم نقل وبناء كامل محتويات النظام إلى سيرفر XAMPP بنجاح فائق!
)
echo.

echo =====================================================================
echo     🎉 تهانينا! تم تثبيت اليمامة المحاسبي بنجاح على سيرفر XAMPP المحلي 🚀
echo =====================================================================
echo.
echo 📊 مسار تثبيت النظام الحالي: %TARGET_FOLDER%
echo 🔗 الرابط المحلي في متصفح الويب: http://localhost/%FOLDER_NAME%/
echo.
echo الخطوة القادمة والأخيرة:
echo   1. افتح تطبيق XAMPP Control Panel في جهازك.
echo   2. تأكد من إطلاق وتشغيل خدمة خادم أباتشي (Apache) بالضغط على الزر Start أمامها.
echo   3. سيقوم المتصفح الآن بالفتح التلقائي على رابط النظام.
echo.
echo اضغط على أي مفتاح لإنهاء التثبيت وفتح واجهة المنظومة المحاسبية في متصفحك!
echo =====================================================================
pause

:: Launch standard web browser with the XAMPP virtual server web site
start "" "http://localhost/%FOLDER_NAME%/"
exit
