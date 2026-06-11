@echo off
:: =====================================================================
:: اولاد داؤود للفواكه - معالج تثبيت التطبيق على سطح المكتب كبرنامج مستقل
:: Awlad Dawood Fruits - Desktop Installer & Standalone Setup Utility
:: =====================================================================
title معالج تثبيت اولاد داؤود للفواكه
color 0A

:: الانتقال التلقائي لمجلد السكربت لتجنب أي مشاكل عند التشغيل كمسؤول (Run as Admin)
cd /d "%~dp0"

:: فحص ما إذا كان المستخدم يقوم بتشغيل الملف مباشرة من داخل أرشيف ZIP دون فك ضغطه
echo test_write_check > "%~dp0test_write.tmp" 2>nul
if exist "%~dp0test_write.tmp" goto :write_test_ok

chcp 65001 >nul
echo =====================================================================
echo [خطأ فادح] يبدو أنك تقوم بتشغيل معالج التثبيت من داخل ملف الـ ZIP مباشرة!
echo =====================================================================
echo.
echo لا يمكن تشغيل سيرفر الحسابات أو تثبيت التبعيات داخل ملف مضغوط للقراءة فقط.
echo.
echo يرجى اتباع الخطوات البسيطة التالية أولاً:
echo 1. قم بإنهاء هذه النافذة بالضغط على أي زر.
echo 2. اذهب إلى ملف الـ ZIP الذي قمت بتحميله واضغط عليه بزر الماوس الأيمن (Right-click).
echo 3. اختر "استخراج الكل..." (Extract All...) أو "فك الضغط باستخدام WinRAR".
echo 4. حدد مكاناً مناسباً (مثل سطح المكتب أو قرص C).
echo 5. بعد الانتهاء، افتح المجلد الناتج والمستخرج وشغل "Desktop-Setup.bat" مجدداً.
echo.
echo -------------------------------------------------------------
pause
exit /b

:write_test_ok
del "%~dp0test_write.tmp" 2>nul

:: تغيير الترميز لدعم الحروف العربية في موجه الأوامر بالكامل
chcp 65001 >nul

echo =====================================================================
echo          معالج تثبيت تطبيق اولاد داؤود للفواكه كبرنامج سطح مكتب
echo =====================================================================
echo.
echo يقوم هذا الملف بتهيئة بيئة التشغيل المستقلة وإنشاء اختصار مباشر 
echo على سطح المكتب لفتح النظام كنافذة مستقلة (Desktop App) أنيقة 
echo وبدون إطار المتصفح أو أشرطة الأدوات.
echo.

:: الفحص المسبق لبيئة تشغيل نود
where node >nul 2>nul
if %errorlevel% equ 0 goto :node_installed

echo [تنبيه] لم يتم العثور على بيئة تشغيل Node.js على هذا الكمبيوتر!
echo.
echo يرجى تحميله وتثبيته أولاً في أقل من دقيقة من الموقع الرسمي:
echo 🔗 https://nodejs.org (اختر النسخة الموصى بها LTS)
echo.
echo بعد تثبيت Node.js، قم بفتح هذا الملف "Desktop-Setup.bat" مرة أخرى.
echo -------------------------------------------------------------
pause
exit /b

:node_installed

echo [1/3] جاري فحص الحزم والتبعيات وتجهيز بيئة التشغيل...
if exist node_modules goto :modules_installed

echo جاري تثبيت الحزم اللازمة تلقائياً (قد يستغرق ذلك دقيقة واحدة)...
call npm install --no-audit --no-fund
goto :modules_check_done

:modules_installed
echo التبعيات مثبتة مسبقاً بنجاح.

:modules_check_done

echo.
echo [2/3] جاري تهيئة خادم التشغيل الخلفي الصامت...
:: توليد ملف بدء خادم فيت المحلي
echo @echo off > start-local-server.bat
echo cd /d "%%~dp0" >> start-local-server.bat
echo call npm run dev >> start-local-server.bat

echo.
echo [3/3] جاري إنشاء اختصار التطبيق على سطح المكتب الخاص بك...
:: إنشاء كود توليد الاختصار بالفيجوال بيسك
set "VBS_FILE=%TEMP%\create_shortcut_dawood.vbs"
if exist "%VBS_FILE%" del "%VBS_FILE%" >nul 2>&1

echo Set oWS = CreateObject("WScript.Shell") > "%VBS_FILE%"
echo sLinkFile = oWS.SpecialFolders("Desktop") ^& "\اولاد داؤود لبيع الفواكه.lnk" >> "%VBS_FILE%"
echo Set oLink = oWS.CreateShortcut(sLinkFile) >> "%VBS_FILE%"
echo oLink.TargetPath = "%~dp0launch-app.vbs" >> "%VBS_FILE%"
echo oLink.WorkingDirectory = "%~dp0" >> "%VBS_FILE%"
echo oLink.Description = "نظام حسابات وعهد أولاد داؤود للفواكه - تطبيق ديسكتوب مستقل" >> "%VBS_FILE%"
echo oLink.IconLocation = "shell32.dll, 85" >> "%VBS_FILE%"
echo oLink.Save >> "%VBS_FILE%"

:: تنفيذ السكربت لتوليد الاختصار على سطح المكتب
cscript /nologo "%VBS_FILE%" >nul 2>&1
if exist "%VBS_FILE%" del "%VBS_FILE%" >nul 2>&1

echo.
echo =====================================================================
echo تم تثبيت تطبيق اولاد داؤود للفواكه بنجاح! 🎉
echo =====================================================================
echo تم وضع أيقونة واختصار باسم "اولاد داؤود لبيع الفواكه" على سطح المكتب.
echo.
echo ميزات هذا التثبيت:
echo 1. يعمل خادم الحسابات صامتاً تماماً في الخلفية (بدون شاشة سوداء منبثقة).
echo 2. يفتح النظام في نافذة مستقلة أنيقة وبسيطة (كالبرامج التقليدية تماماً).
echo 3. البيانات تُحفظ تلقائياً في مخزن جهازك المحلي دون الحاجة للإنترنت.
echo.
echo اضغط على أي زر لإغلاق هذا المعالج والاستمتاع بالتطبيق من سطح المكتب مباشرة!
echo =====================================================================
pause
