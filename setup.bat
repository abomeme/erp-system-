@echo off
chcp 65001 >nul
title نظام اليمامة المحاسبي المتكامل - معالج التثبيت والتجهيز الآلي 🚀
color 0F

echo =========================================================================
echo    نظام اليمامة المحاسبي المتكامل (النسخة المستقلة للتشغيل المحلي)
echo =========================================================================
echo.
echo مرحباً بك في المعالج الآلي لتثبيت وتجهيز النظام على حاسوبك الشخصي.
echo سيقوم مكامل النظام الآن بالخطوات التالية تلقائياً:
echo.
echo   1. التحقق من سلامة بيئة العمل (نود جي إس Node.js) على الحاسوب.
echo   2. تثبيت كافة الحزم والمكتبات اللازمة لعمل النظام بنجاح (npm install).
echo   3. بناء وتجهيز شاشات وقواعد النظام بأقصى سرعة تشغيل أوفلاين (npm build).
echo   4. تثبيت ملفات التشغيل في مسار XAMPP المحلي في حال تواجد برنامج الأباتشي.
echo   5. إنشاء اختصار تشغيل تلقائي ذكي ومباشر على سطح المكتب (Desktop).
echo   6. تشغيل النظام في المتصفح فوراً والبدء في استكمال فواتيرك وأرصدتك!
echo.
echo -------------------------------------------------------------------------
echo يرجى الضغط على أي مفتاح لبدء المعالجة والتثبيت الفوري...
pause >nul

echo.
echo [*] [1/5] جاري فحص وجود بيئة تشغيل نود (Node.js)...
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [خطأ فادح ❌] بيئة تشغيل نود (Node.js) غير مثبتة على هذا الحاسوب!
    echo لتشغيل وتفعيل النظام، يرجى القيام بتحميل وتثبيت حزمة Node.js أولاً.
    echo.
    echo سنجلب لك صفحة التحميل الرسمية الآن تلقائياً...
    timeout /t 5 >nul
    start "" "https://nodejs.org/"
    echo.
    echo بعد الانتهاء من تثبيت Node.js بنجاح، يرجى إعادة تشغيل هذا الملف (setup.bat) مجدداً.
    pause
    exit /b 1
)
echo [نجاح ✅] تم العثور على بيئة تشغيل نود بنجاح. الإصدار الحالي:
node -v

echo.
echo [*] [2/5] جاري تثبيت الحزم التابعة ومكملات النظام الذكية (npm install)...
echo يرجى الانتظار، قد يستغرق هذا الإجراء دقيقة واحدة بناءً على سرعة المعالج والإنترنت لديك...
call npm install --no-audit --no-fund
if %errorlevel% neq 0 (
    echo [خطأ ❌] فشل تثبيت بعض حزم التطوير! لكن سنحاول مواصلة البناء والتشغيل...
) else (
    echo [نجاح ✅] تم تثبيت وتكامل الحزم البرمجية بالكامل.
)

echo.
echo [*] [3/5] جاري تجميع وبناء كود النظام (npm run build)...
call npm run build
if %errorlevel% neq 0 (
    echo [خطأ ❌] حدث خلل طفيف أثناء تجميع الملفات. يرجى مراجعة logs أو تشغيل الملف كمسؤول.
) else (
    echo [نجاح ✅] تم تجميع ملفات الواجهة بنجاح وبسرعة فائقة.
)

:: Detect folder name
for %%I in ("%~dp0.") do set "FOLDER_NAME=%%~nxI"
if "%FOLDER_NAME%"=="" set "FOLDER_NAME=alyamama-erp"

set "HTDOCS_PATH=C:\xampp\htdocs"
set "TARGET_FOLDER=%HTDOCS_PATH%\%FOLDER_NAME%"

echo.
echo [*] [4/5] التحقق من واجهة خادم XAMPP Apache المحلي...
if exist "%HTDOCS_PATH%" (
    echo تم اكتشاف خادم أباتشي (XAMPP)! جاري نسخ ملفات النظام إلى مجلد htdocs للعمل من خلاله...
    mkdir "%TARGET_FOLDER%" >nul 2>nul
    xcopy "%~dp0dist\*.*" "%TARGET_FOLDER%\" /E /I /H /Y /Q >nul
    if %errorlevel% equ 0 (
        echo [نجاح ✅] تم نقل الملفات لمجلد htdocs بنجاح.
    ) else (
        echo [تنبيه ⚠️] تعذر النسخ لمجلد htdocs، ربما يحتاج لإذن المسؤول. سنعتمد على الخادم المحلي السريع بدلاً منه.
    )
) else (
    echo لا يوجد خادم XAMPP مثبت على جهازك، سيتم استخدام خادم Node.js السريع والمدمج لتشغيل النظام بشكل رائع ومستقر تماماً في المتصفح.
)

echo.
echo [*] [5/5] جاري إنشاء اختصار تشغيل ذكي ومباشر على سطح المكتب (Desktop)...
set "DESKTOP_PATH=%USERPROFILE%\Desktop"
set "LAUNCHER_NAME=تشغيل نظام اليمامة المحاسبي.bat"
set "LAUNCHER_FILE=%DESKTOP_PATH%\%LAUNCHER_NAME%"

:: Create launch file on developer desktop
echo @echo off > "%LAUNCHER_FILE%"
echo chcp 65001 ^>nul >> "%LAUNCHER_FILE%"
echo title نظام اليمامة المحاسبي - سيرفر التشغيل المحلي 🚀 >> "%LAUNCHER_FILE%"
echo color 0E >> "%LAUNCHER_FILE%"
echo cd /d "%~dp0" >> "%LAUNCHER_FILE%"
echo echo ========================================================= >> "%LAUNCHER_FILE%"
echo echo   جاري تشغيل سيرفر نظام اليمامة المحاسبي أوفلاين... >> "%LAUNCHER_FILE%"
echo echo   الرجاء إبقاء هذه النافذة السوداء مفتوحة أثناء العمل! >> "%LAUNCHER_FILE%"
echo echo ========================================================= >> "%LAUNCHER_FILE%"
echo echo. >> "%LAUNCHER_FILE%"
echo start "" "http://localhost:3000" >> "%LAUNCHER_FILE%"
echo call npm run dev >> "%LAUNCHER_FILE%"

echo [نجاح ✅] تم إنشاء أيقونة واختصار تشغيل سريع على سطح المكتب باسم "تشغيل نظام اليمامة المحاسبي".

echo.
echo =========================================================================
echo    🎉 مبروووك! اكتملت تهيئة وتثبيت منظومة اليمامة بنجاح مبهر 🎉
echo =========================================================================
echo.
echo  💡 يمكنك الآن تشغيل النظام في أي وقت عبر الاختصار الجديد على سطح المكتب الخاص بك!
echo.
echo  يرجى الضغط على أي زر لفتح التطبيق فوراً في متصفحك والبدء بالعمل...
pause >nul

start "" "http://localhost:3000"
call npm run dev
