@echo off
:: =====================================================================
:: Vendor Ledger System - Automated System Updater
:: نظام مبيعات وحسابات أولاد داؤود - سكربت التحديث التلقائي المطور
:: =====================================================================
title تحديث نظام أولاد داؤود للفواكه تلقائياً
color 0A
chcp 65001 >nul

echo ============================================================
echo   تحديث نظام أولاد داؤود للفواكه من مستودع السحابة...
echo ============================================================
echo.

:: 1. Git configurations as requested by the user
echo [*] ضبط وتكوين هوية مستخدم Git...
git config --global user.name "abomeme"
git config --global user.email "mf39343934@gmail.com"

:: 2. Initialize repository if needed
if not exist .git (
    echo [*] جاري تهيئة مستودع Git محلياً...
    git init
)

:: 3. Configure remotes as requested (safe removal first to avoid duplicate error)
git remote remove url >nul 2>&1
git remote add url https://github.com/abomeme/erp-system-.git >nul 2>&1
git remote remove origin >nul 2>&1
git remote add origin https://github.com/abomeme/erp-system-.git >nul 2>&1

:: 4. Get current commit ID before pull to show precise file/line changes
set PREV_COMMIT=
for /f "tokens=*" %%i in ('git rev-parse HEAD 2^>nul') do set PREV_COMMIT=%%i

:: 5. Stash local changes to prevent conflicts
echo.
echo [*] حفظ أي تعديلات محلية مؤقتاً لتجنب أي تعارض حسابي (git stash)...
git stash

:: 6. Pull updates from origin main
echo.
echo [1/3] جاري جلب التحديثات الجديدة من الفرع الرئيسي (main)...
git pull origin main

:: 7. Compare and list updated files & specific lines or if it's a new file
set POST_COMMIT=
for /f "tokens=*" %%i in ('git rev-parse HEAD 2^>nul') do set POST_COMMIT=%%i

echo.
echo ============================================================
echo 📋 تقرير التحديثات والملفات المعدلة والجديدة بالأسطر:
echo ============================================================

if "%PREV_COMMIT%"=="" (
    echo [تنبيه] مستودع Git تم تهيئته للتو، هذا هو السحب الأول للملفات.
) else if "%PREV_COMMIT%"=="%POST_COMMIT%" (
    echo ✨ نظامك محدث بالفعل إلى آخر إصدار، ولا توجد تعديلات برمجية جديدة.
) else (
    :: Loop over modified files and output details in Arabic
    for /f "tokens=1,2" %%A in ('git diff --name-status %PREV_COMMIT% %POST_COMMIT%') do (
        echo.
        if "%%A"=="A" (
            echo  🆕 [ملف جديد مضاف بالكامل] : %%B
            echo   - تم تدوين هذا الملف كإضافة جديدة برمجية بالكامل في هذا التحديث.
        ) else if "%%A"=="M" (
            echo  📝 [ملف معدل ومحدّث] : %%B
            echo   - السطور والرموز المعدلة بالتفصيل مع رقم السطر (@@):
            echo     --------------------------------------------------
            git diff -U0 --no-color %PREV_COMMIT% %POST_COMMIT% -- "%%B" | findstr /v "diff --git" | findstr /v "index" | findstr /v "--- " | findstr /v "+++"
            echo     --------------------------------------------------
        ) else if "%%A"=="D" (
            echo  🗑️ [ملف تم حذفه واستبعاده في هذا التحديث] : %%B
        ) else (
            echo  🔄 [تحديث %%A] : %%B
        )
    )
)
echo ============================================================
echo.

:: 8. Install dependencies
echo [2/3] جاري إعداد وتثبيت كافة الحزم والتبعيات الجديدة (npm install)...
call npm install
if %errorlevel% neq 0 (
    echo [خطأ] فشل تثبيت بعض حزم npm. يرجى التحقق من اتصال الإنترنت.
    pause
    exit /b 1
)

:: 9. Build application
echo.
echo [3/3] جاري تشغيل المترجم وإعادة بناء ملفات الإنتاج النهائية (npm run build)...
call npm run build
if %errorlevel% neq 0 (
    echo [خطأ] فشلت عملية بناء وتطوير الملفات النهائية بنجاح.
    pause
    exit /b 1
)

:: 10. Launch dev server as requested
echo.
echo ============================================================
echo   ✨ تم التحديث الفوري وبناء النظام بامتياز!
echo   جاري تشغيل الخادم المحلي المطور الآن (npm run dev)...
echo ============================================================
echo.
call npm run dev
