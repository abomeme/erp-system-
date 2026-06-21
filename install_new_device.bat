@echo off
:: =====================================================================
:: Vendor Ledger System - New Device Automated Installer Setup Wizard
:: نظام مبيعات وحسابات أولاد داؤود - معالج تثبيت وتهيئة الأجهزة الجديدة
:: =====================================================================
title معالج تثبيت وتهيئة نظام أولاد داؤود للأجهزة الجديدة
color 0B

:: Ensure we are starting inside the actual script's directory
cd /d "%~dp0"

:: 1. Verify if the file is being executed directly inside a compressed ZIP without extraction
echo install_check_temp_test > "%~dp0install_write_check.tmp" 2>nul
if exist "%~dp0install_write_check.tmp" goto :write_test_passed

:: If we cannot write, we are running from a read-only zipped directory! Show warning
chcp 65001 >nul
echo.
echo =====================================================================
echo [❌ خطأ فادح] يبدو أنك قمت بتشغيل المعالج من داخل ملف الـ ZIP مباشرة!
echo =====================================================================
echo.
echo نظام الحسابات وإدارة المخازن لا يمكنه تشغيل ملفات السيرفر أو بناء
echo الواجهات وقراءة البيانات من داخل مجلد مضغوط للقراءة فقط.
echo.
echo يرجى اتباع الخطوات البسيطة التالية لإكمال التثبيت بنجاح:
echo.
echo   1. أغلق هذه النافذة فوراً.
echo   2. انقر بزر الماوس الأيمن (Right-Click) على ملف الـ ZIP الذي قمت بتحميله.
echo   3. اختر "استخراج الكل..." (Extract All...) أو "فك الضغط".
echo   4. اختر مجلداً عادياً على قرص صلب نشط (مثال: سطح المكتب أو البارتيشن C:\).
echo   5. افتح المجلد الناتج والمستخرج وشغّل الملف "install_new_device.bat" مجدداً.
echo.
echo -------------------------------------------------------------
echo Please Extract the ZIP File first, then run this installer!
echo -------------------------------------------------------------
pause
exit /b

:write_test_passed
del "%~dp0install_write_check.tmp" 2>nul

:: Switch directory command line encoding to UTF-8 for perfect Arabic support
chcp 65001 >nul

echo =====================================================================
echo      ✨ معالج التثبيت والتهيئة الفوري لنظام أولاد داؤود على جهاز جديد ✨
echo            Awlad Dawood Fruits ERP - Setup Wizard v4.0
echo =====================================================================
echo.
echo يرحب بك هذا المعالج التلقائي ويوجهك خطوة بخطوة لتهيئة النظام وجعله يعمل
echo كلياً على جهاز الكمبيوتر الجديد لديك بدون متطلبات تشغيل معقدة.
echo.

:: 2. Pre-requisite checks (Node.js)
echo [*] جاري التحقق من وجود محرك التشغيل الجوهري (Checking Node.js)...
where node >nul 2>nul
if %errorlevel% equ 0 goto :node_installed_ok

echo.
echo ⚠️ [تنبيه هام] لم نتمكن من العثور على بيئة تشغيل بروتوكول Node.js في هذا الجهاز!
echo.
echo لكي يعمل هذا النظام محلياً كخادم حسابات ومستندات، فهو يحتاج لنسخة Node.js مجانية:
echo 1. يمكنك تحميله بضغطة زر واحدة وآمناً من الموقع الرسمي:
echo    🔗 https://nodejs.org
echo 2. قم دائماً باختيار نسخة الـ (LTS) الموصى بها لأغلب المستخدمين.
echo 3. ثبته بالطريقة المعتادة (Next, Next, Finish) ثم أعد تشغيل هذا الملف مجدداً.
echo.
echo If Node.js is not installed, please download it from: http://nodejs.org
echo After completing install, close this command window and re-run this setup!
echo -------------------------------------------------------------
pause
exit /b

:node_installed_ok
echo [✓] تم العثور على بيئة Node.js بنجاح على هذا الجهاز.
echo.

:: 3. Configure local configuration files (.env)
echo [*] تهيئة الملفات الإدارية وإتلاف الملفات التجريبية...
if not exist "%~dp0.env" (
    if exist "%~dp0.env.example" (
        copy "%~dp0.env.example" "%~dp0.env" >nul
        echo [✓] تم توليد ملف الإعدادات البيئية .env تلقائياً للتشغيل والاتصالات المحمية.
    )
)

:: 4. Installing NPM software packages
echo.
echo =====================================================================
echo   [خطوة 1 من 2]: جاري سحب وبناء وتثبيت الحزم البرمجية والتبعيات الأساسية
echo      Npm install is downloading and compiling local modules...
echo =====================================================================
echo.
echo يرجى الانتظار، قد يستغرق ذلك حوالي 30 ثانية إلى دقيقة حسب سرعة جهازك والإنترنت:
echo.

call npm install --no-audit --no-fund
if %errorlevel% neq 0 (
    echo.
    echo ❌ [خطأ] فشل تثبيت الحزم الأساسية للنظام!
    echo يرجى التحقق من اتصالك بالإنترنت ثم إغلاق النافذة وإعادة المحاولة.
    pause
    exit /b 1
)
echo.
echo [✓] تم تثبيت وحل كافة المكتبات والحزم البرمجية بنجاح!
echo.

:: 5. Compile & Build Production-Ready distribution
echo =====================================================================
echo   [خطوة 2 من 2]: جاري بناء وترجمة صفحات الواجهة والتقارير المالية (npm run build)
echo      Compiling web interface pages and ledger formulas...
echo =====================================================================
echo.
echo يرجى الانتظار بضع ثوانٍ لإغلاق وبناء نسخة الإنتاج المستقرة بالكامل:
echo.

call npm run build
if %errorlevel% neq 0 (
    echo.
    echo ⚠️ [تنبيه] حدث خطأ أو تحذير أثناء بناء التطبيق.
    echo ومع ذلك، جاري المتابعة وسنحاول التشغيل لك لاستئناف الفاتورة.
) else (
    echo [✓] تمت تعمية وترجمة بنية صفحات المنظومة وقراءتها بامتياز فائق!
)
echo.

:: 6. Create launch shortcut on desktop
echo =====================================================================
echo   [تنشيط]: جاري إنشاء أيقونة واختصار فوري ذكي على سطح المكتب الخاص بك...
echo =====================================================================
echo.

set "VBS_SHORTCUT=%TEMP%\create_system_shortcut.vbs"
if exist "%VBS_SHORTCUT%" del "%VBS_SHORTCUT%" >nul 2>&1

:: Double quotes handles paths with spacing gracefully on Windows OS
echo Set oWS = CreateObject("WScript.Shell") > "%VBS_SHORTCUT%"
echo sLinkFile = oWS.SpecialFolders("Desktop") ^& "\منظومة أولاد داؤود للحسابات.lnk" >> "%VBS_SHORTCUT%"
echo Set oLink = oWS.CreateShortcut(sLinkFile) >> "%VBS_SHORTCUT%"
echo oLink.TargetPath = "%~dp0start.bat" >> "%VBS_SHORTCUT%"
echo oLink.WorkingDirectory = "%~dp0" >> "%VBS_SHORTCUT%"
echo oLink.Description = "نظام حسابات ومبيعات وعهد أولاد داؤود للفواكه" >> "%VBS_SHORTCUT%"
echo oLink.IconLocation = "shell32.dll, 85" >> "%VBS_SHORTCUT%"
echo oLink.Save >> "%VBS_SHORTCUT%"

cscript /nologo "%VBS_SHORTCUT%" >nul 2>&1
if exist "%VBS_SHORTCUT%" del "%VBS_SHORTCUT%" >nul 2>&1

echo.
echo =====================================================================
echo   ✨ تم تثبيت وإعداد تطبيق ومستودع أولاد داؤود على هذا الجهاز بنجاح! 🎉
echo =====================================================================
echo.
echo 💡 تم وضع أيقونة "منظومة أولاد داؤود للحسابات" على سطح المكتب الخاص بك الآن.
echo.
echo كيف تبدأ تشغيل النظام؟
echo 1. اذهب لسطح المكتب وافتح أيقونة الاختصار التي تم توليدها.
echo 2. سيقوم النظام بالإقلاع وفتح الواجهة فوراً عبر المتصفح على العنوان المحلي:
echo    🔗 http://localhost:3000
echo 3. البيانات تُحفظ وتُخزن محلياً كلياً وبشكل حثيث ومنيع ضد فقدان الأرصدة.
echo.
echo اضغط على أي مفتاح لإنهاء معالج التثبيت وبدء العمل مباشرة!
echo =====================================================================
pause
start "" "%~dp0start.bat"
exit
