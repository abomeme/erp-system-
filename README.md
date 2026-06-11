<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://ai.google.dev/static/site-assets/images/share-ais-513315318.png" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/97eefbba-e619-41cb-959b-d38941913990

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`

   لنشر البرنامج محلياً ليعتمد كلياً على سيرفر الـ
    XAMPP:
   هذا النظام مجانا ولكن اطلب منكم دعوة صالحة لي ولوالدي انا مهندس النظام استاذ مجتبي فتح الرحمن العوض احمد سوداني الجنسية . مكان العمل جامعة كرري .السكن تمبول ولاية الجزيرة
1.	نفّذ أمر بناء نسخة الإنتاج عبر كتابة داخل مجلد المشروع افتح cmd  
2.	npm install 
3.	 `npm run build` 
4.	في سطر الأوامر (ينشئ مجلد `dist`).
  2. انسخ محتويات مجلد `dist` بالكامل بالإضافة إلى ملف `db_sync_bridge.php` المرفق وضعهما في مجلد جديد داخل مجلد الويب الخاص بـ XAMPP (مثال
: `C:\xampp\htdocs\erp_version3\`).
  3. توجه بالمتصفح للرابط المحلي: `http://localhost/erp_version3/` وسيفتح معك البرنامج فوراً.


