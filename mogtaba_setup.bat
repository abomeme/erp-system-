@echo off
:: =====================================================================
:: اولاد داؤود للفواكه - معالج التثبيت والتهيئة التلقائية لـ XAMPP
:: XAMPP Setup & Automated Deployment Script (mogtaba_setup)
:: =====================================================================
title معالج تثبيت وتهيئة أولاد داؤود لـ XAMPP
color 0B

:: الانتقال التلقائي لمجلد السكربت لتجنب أي مشاكل عند التشغيل كمسؤول (Run as Admin)
cd /d "%~dp0"

:: تغيير الترميز لدعم الحروف العربية في موجه الأوامر بالكامل
chcp 65001 >nul
setlocal enabledelayedexpansion

echo =====================================================================
echo    Mogtaba Setup - معالج تثبيت أولاد داؤود للفواكه على سيرفر XAMPP
echo =====================================================================
echo.
echo يقوم هذا الملف المطور بإنتاج نسخة الـ Build المستقرة من المشروع 
echo وتثبيتها ونقلها تلقائياً إلى مجلد سيرفر XAMPP المحلي للعمل فوراً 
echo كأنه خادم متكامل على جهازك.
echo.

:: 1. فحص ما إذا كان المستخدم يقوم بتشغيل الملف مباشرة من داخل أرشيف ZIP دون فك ضغطه
echo test_write_check > "%~dp0test_write_xampp.tmp" 2>nul
if exist "%~dp0test_write_xampp.tmp" goto :write_test_ok

echo [خطأ فادح] يبدو أنك تقوم بتشغيل معالج التثبيت من داخل ملف الـ ZIP مباشرة!
echo =====================================================================
echo لا يمكن بناء المشروع أو تثبيته داخل أرشيف مضغوط للقراءة فقط.
echo.
echo يرجى فك ضغط ملف الـ ZIP أولاً إلى مجلد عادي على الكمبيوتر،
echo ثم إعادة تشغيل الملف "mogtaba_setup.bat" من جديد.
echo.
pause
exit /b

:write_test_ok
del "%~dp0test_write_xampp.tmp" 2>nul

:: 2. الفحص المسبق لبيئة تشغيل نود لتثبيت التبعيات وبناء التوزيع
where node >nul 2>nul
if %errorlevel% equ 0 goto :node_installed

echo [تنبيه] لم يتم العثور على بيئة تشغيل Node.js على هذا الكمبيوتر!
echo.
echo لبناء وتهيئة الملفات التنفيذية للمشروع، يرجى تثبيت نود أولاً:
echo 🔗 https://nodejs.org (شغل ملف التثبيت ثم أعد تشغيل هذا الاسكربت)
echo -------------------------------------------------------------
pause
exit /b

:node_installed

echo.
echo [1/4] جاري التحقق من التبعيات وتثبيتها...
if exist node_modules goto :modules_installed

echo جاري تهيئة حزم التطبيق (قد يستغرق ذلك دقيقة واحدة)...
call npm install --no-audit --no-fund
goto :modules_check_done

:modules_installed
echo التبعيات جاهزة للعمل.

:modules_check_done

echo.
echo [2/4] جاري بناء وتصدير نسخة الـ Build التنفيذية للمشروع (Vite Client)...
call npm run build

if not exist dist (
    echo.
    echo [خطأ] فشلت عملية بناء وتوليد ملفات المشروع. يرجى مراجعة نافذة الأخطاء.
    pause
    exit /b
)
echo تمت عملية البناء للملفات بنجاح في مجلد dist.

echo.
echo [3/4] جاري كشف مسار سيرفر XAMPP htdocs وتثبيت النظام تلقائياً...
:: البحث عن مسار htdocs
set "XAMPP_PATH="
if exist "C:\xampp\htdocs" set "XAMPP_PATH=C:\xampp\htdocs"
if exist "D:\xampp\htdocs" set "XAMPP_PATH=D:\xampp\htdocs"

if "%XAMPP_PATH%"=="" (
    echo.
    echo لم يتم العثور على مسار XAMPP الافتراضي في الأقراص C أو D.
    echo يمكنك إدخال المسار اليدوي لمجلد htdocs (مثال: C:\xampp\htdocs)
    echo أو اضغط Enter مباشرة لإنشاء مجلد التوزيع في نفس مكان الاسكربت:
    set /p "USER_HTDOCS=المسار: "
    
    if not "!USER_HTDOCS!"=="" (
        if exist "!USER_HTDOCS!" (
            set "XAMPP_PATH=!USER_HTDOCS!"
        )
    )
)

if not "%XAMPP_PATH%"=="" (
    set "TARGET_DIR=%XAMPP_PATH%\olad-dawood"
    echo تم تحديد مسار سيرفر XAMPP: %XAMPP_PATH%
    echo جاري تثبيت ونسخ النظام إلى المجلد: !TARGET_DIR!
) else (
    set "TARGET_DIR=%~dp0olad-dawood-xampp-build"
    echo سيتم حفظ مجلد التثبيت والتوزيع محلياً في: !TARGET_DIR!
)

:: إنشاء المجلد المستهدف
if not exist "%TARGET_DIR%" mkdir "%TARGET_DIR%"

:: نسخ ملفات الـ build
echo جاري نقل ملفات واجهة المستخدم التفاعلية...
xcopy /E /Y /I "%~dp0dist" "%TARGET_DIR%" >nul

:: نسخ ملفات قاعدة البيانات وجسر المزامنة MySQL
echo جاري وضع جسر المزامنة وملفات قاعدة البيانات...
if exist "%~dp0db_sync_bridge.php" copy /Y "%~dp0db_sync_bridge.php" "%TARGET_DIR%\" >nul
if exist "%~dp0alyamama_erp_system.sql" copy /Y "%~dp0alyamama_erp_system.sql" "%TARGET_DIR%\" >nul
if exist "%~dp0public\alyamama_erp_system.sql" copy /Y "%~dp0public\alyamama_erp_system.sql" "%TARGET_DIR%\" >nul

echo.
echo [4/4] جاري إنشاء اختصار التشغيل الفوري على سطح المكتب كبرنامج مستقل...
:: إنشاء كود توليد الاختصار بالفيجوال بيسك لفتح التطبيق من خلال سيرفر XAMPP مباشرة
set "VBS_FILE=%TEMP%\create_shortcut_dawood_xampp.vbs"
if exist "%VBS_FILE%" del "%VBS_FILE%" >nul 2>&1

echo Set oWS = CreateObject("WScript.Shell") > "%VBS_FILE%"
echo sLinkFile = oWS.SpecialFolders("Desktop") ^& "\أولاد داؤود للفواكه (سيرفر محلي).lnk" >> "%VBS_FILE%"
echo Set oLink = oWS.CreateShortcut(sLinkFile) >> "%VBS_FILE%"

:: تحديد مسار متصفح جوجل كروم لتشغيله كـ App مستقل بدون أشرطة
set "CHROME_PATH=C:\Program Files\Google\Chrome\Application\chrome.exe"
if not exist "%CHROME_PATH%" set "CHROME_PATH=C:\Program Files (x86)\Google\Chrome\Application\chrome.exe"

if exist "%CHROME_PATH%" (
    echo oLink.TargetPath = "%CHROME_PATH%" >> "%VBS_FILE%"
    echo oLink.Arguments = "--app=http://localhost/olad-dawood" >> "%VBS_FILE%"
) else (
    echo oLink.TargetPath = "http://localhost/olad-dawood" >> "%VBS_FILE%"
)

echo oLink.WorkingDirectory = "%TARGET_DIR%" >> "%VBS_FILE%"
echo oLink.Description = "نظام حسابات أولاد داؤود للفواكه - تشغيل عبر سيرفر XAMPP المحلي" >> "%VBS_FILE%"
echo oLink.IconLocation = "shell32.dll, 85" >> "%VBS_FILE%"
echo oLink.Save >> "%VBS_FILE%"

:: تنفيذ التوليد
cscript /nologo "%VBS_FILE%" >nul 2>&1
if exist "%VBS_FILE%" del "%VBS_FILE%" >nul 2>&1

echo.
echo =====================================================================
echo تم تجهيز ونشر ملفات "أولاد داؤود للفواكه" بنجاح للمزامنة مع XAMPP! 🎉
echo =====================================================================
echo تم وضع الملفات في المجلد: %TARGET_DIR%
echo.
echo خطوتان فقط لتشغيل النظام للمرة الأولى:
echo 1. افتح لوحة تحكم XAMPP وشغّل خدمتي (Apache) و (MySQL).
echo 2. ادخل لـ phpMyAdmin (http://localhost/phpmyadmin) وأنشئ قاعدة بيانات 
echo    جديدة باسم: alyamama_erp_system 
echo    ثم استورد (Import) ملف "alyamama_erp_system.sql" الموجود داخل مجلد التثبيت.
echo.
echo تمت إضافة أيقونة "أولاد داؤود للفواكه (سيرفر محلي)" على سطح المكتب!
echo انقر عليها لتشغيل النظام صامتاً كبرنامج مستقل وسريع بدون إطار متصفح.
echo =====================================================================
pause
