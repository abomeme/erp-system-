# دليل التثبيت والتنقل المستقل - كود الموردين والعملاء الطبعة الرابعة
# Standalone Local Installation & Portability Guide (v4.0 ERP)

مرحباً بك! هذا النظام مصمم ليكون بالكامل **مستقلاً ومحملاً ذاتياً (Offline-first / Standalone)**. يمكنك نقله ونسخه وتشغيله على أي كمبيوتر آخر (ويندوز، ماك، ولينكس) دون الحاجة لتهيئة معقدة.

Welcome! This system is designed to be fully **offline-first & standalone**. You can copy, transfer, and boot the entire ledger suite on any other computer (Windows, macOS, Linux) seamlessly.

---

## 🇸🇦 أولاً: طريقة نقل النظام وتشغيله على جهاز كمبيوتر آخر (عربي)

### الخطوة 1: تجهيز الملفات ونقلها عبر الفلاش ميموري (USB)
1. قم بضغط مجلد المشروع بالكامل إلى ملف مضغوط بصيغة ZIP (باستثناء مجلد `node_modules` إذا كان حجمه كبيراً، حيث سيتم إعادة تعميره تلقائياً).
2. انسخ الملف المضغوط أو مجلد المشروع إلى الـ **Flash Drive / USB**.
3. قم بلصق مجلد المشروع على جهاز الكمبيوتر الآخر في المسار المفضل لديك.

### الخطوة 2: تثبيت بيئة التشغيل الأساسية (لمرة واحدة فقط)
يحتاج النظام فقط إلى مثبت نود لكي يعمل محلياً كخادم أعمال:
1. قم بتحميل بيئة التشغيل من الموقع الرسمي: [https://nodejs.org](https://nodejs.org) (اختر نسخة الـ **LTS** المستقرة).
2. قم بتثبيت ملف نود على الكمبيوتر الجديد بالضغط التقليدي (Next -> Next -> Finish).

### الخطوة 3: تثبيت التطبيق كبرنامج مستقل بالكامل (Desktop App) ونقرة واحدة
1. افتح مجلد المشروع على الكمبيوتر الجديد.
2. **لمستخدمي ويندوز (Windows):** انقر نقراً مزدوجاً على الملف المساعد الذكي المرفق: **`Desktop-Setup.bat`**
   - سيقوم معالج التثبيت بفحص وتحميل التبعيات تلقائياً.
   - سيقوم بإنشاء اختصار رسمي على سطح المكتب الخاص بك يحمل الاسم **"اولاد داؤود لبيع الفواكه"**.
   - **الميزة الكبرى لسطح المكتب:** عند النقر المزدوج على أيقونة البرنامج من سطح المكتب، سيتم تشغيل خادم النظام صامتاً تماماً في الخلفية (دون ظهور نوافذ الـ CMD السوداء المزعجة!) وسيفتح التطبيق فوراً في نافذة مستقلة مصقولة بالكامل وخالية من شريط المتصفح والأشرطة العلوية (مثل برامج الكمبيوتر العادية تماماً كـ Electron!).

3. **للتشغيل التقليدي عن طريق المتصفح:** انقر نقراً مزدوجاً على`start.bat` الذي سيفتح متصفح الإنترنت تلقائياً على الرابط المستقل `http://localhost:3000`.
4. **لمستخدمي ماك أو لينكس (macOS/Linux):** قم بتشغيل ملف السكربت المخصص `start.sh` من خلال الطرفية:
   ```bash
   chmod +x start.sh
   ./start.sh
   ```
4. مبروك! يعمل لديك الآن نظام متكامل للحسابات دون أي تبعيات خارجية أو إنترنت.

---

## 🇬🇧 Second: Standard Steps to Move the System to Another PC (English)

### Step 1: Exporting files on USB
1. Pack the template folder into a ZIP compress files (excluding the heavy `node_modules` folder to preserve USB space, it gets auto-constructed later).
2. Paste the pack to your **USB Flash Memory**.
3. Extract the folder into any location inside the secondary computer.

### Step 2: Runtime dependencies (Pre-requisite, One-time only)
The application runs on thin server technology using simple Node.js host rules:
1. Obtain the stable package directly from [https://nodejs.org](https://nodejs.org) (Recommended **LTS** branch).
2. Double-click setup to deploy Node.js engine resources to the server computer.

### Step 3: Fast-click Booting up
1. Open the extracted directory in the desktop workspace of the target PC.
2. **For Windows Users**: Double click `start.bat`. 
   - It will boot structural tasks, run automatic updates, pre-compile local modules, and automatically open your default browser at `http://localhost:3000`.
3. **For macOS/Linux Users**: Execute the terminal script helper:
   ```bash
   chmod +x start.sh
   ./start.sh
   ```
4. Excellent! The complete accounts system, metrics panels, and analytical statements operate completely offline!

---

## 💾 حفظ الحسابات والبيانات والنسخ الاحتياطي / Data Database Backup
* يتم تدوين وحفظ الموردين، العملاء، العمال والفواتير المدخلة بالكامل تلقائياً بمخزن المتصفح المحلي المقاوم للإغلاق (**Local Storage**).
* لأخذ نسخة احتياطية من معاملاتك، يمكنك ببساطة استخدام زر **تصدير كشف حساب CSV** الموجود بكل شاشة للعمليات، أو نسخ بيانات المتصفح المحلي لاسترجاعها بأي وقت.

* The entire database of suppliers, customers, and active workers is safely kept client-side inside standard browser **LocalStorage**.
* To backup your data logs, utilize the inline **Export CSV** tool, which builds standardized account statement spreadsheets of your entire accounting workspace anytime offline!

---

## 🗄️ ربط التطبيق بقاعدة بيانات XAMPP MySQL (المزامنة الثنائية والتشغيل الكامل)

البرنامج مدمج به **جسر مزامنة متكامل وقوي** تكتشفونه بتبويب **النسخ الاحتياطي وXAMPP**، ولربطه بقاعدة بياناتك المحلية على XAMPP اتبع الخطوات التالية:

### 1. استيراد قاعدة البيانات في XAMPP phpMyAdmin
1. تأكد من تشغيل **MySQL Server** و **Apache Server** من لوحة تحكم `XAMPP Control Panel`.
2. افتح المتصفح وتوجه إلى الرابط: `http://localhost/phpmyadmin/`
3. قم بإنشاء قاعدة بيانات فارغة جديدة باسم: `alyamama_erp_system` بتشفير `utf8mb4_unicode_ci`.
4. اضغط على خيار **Import (استيراد)** بالأعلى، واختر ملف قاعدة البيانات المرفق مع المشروع المسمى: `alyamama_erp_system.sql`.
5. انزل للأسفل واضغط برفق على زر **Go (تنفيذ)**. مبروك! سيقوم السيرفر بإنشاء الـ 10 جداول وبنود الفواتير وحشوها فوراً.

### 2. تفعيل جسر المزامنة الفوري (XAMPP Sync Bridge)
* قمنا ببرمجة ملف ذكي يحمل الاسم `db_sync_bridge.php` موجود بجذر المشروع.
* عند رغبتكم بنشر البرنامج محلياً ليعتمد كلياً على سيرفر الـ XAMPP:
  1. نفّذ أمر بناء نسخة الإنتاج عبر كتابة `npm run build` في سطر الأوامر (ينشئ مجلد `dist`).
  2. انسخ محتويات مجلد `dist` بالكامل بالإضافة إلى ملف `db_sync_bridge.php` المرفق وضعهما في مجلد جديد داخل مجلد الويب الخاص بـ XAMPP (مثال: `C:\xampp\htdocs\olad-dawood\`).
  3. توجه بالمتصفح للرابط المحلي: `http://localhost/olad-dawood/` وسيفتح معك البرنامج فوراً.
  4. لرفع كامل بيانات فواتيرك وعملياتك فورياً وجعلها تعتمد بالكامل على قاعدة بيانات MySQL، اذهب لتبويب **النسخ الاحتياطي والـ XAMPP** واضغط على زر:
     - **"رفع الحسابات والمخزن كلياً لـ XAMPP MySQL"** ليتم توليد وترحيل كافة القيود محلياً.
     - كما يمكنك في أي وقت سحب البيانات المخزنة من السيرفر لأي متصفح آخر بالضغط على **"سحب الحسابات والمخزن من XAMPP MySQL للمتصفح"**!

