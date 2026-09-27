# بوت واتساب - تركيا للمفروشات

بوت يرد على الزباين تلقائياً، يعرض كتالوج المنتجات، ياخذ الطلب كامل (منتج + كمية + اسم + عنوان)، ويأكده، وينبهك أنت كصاحب المحل بكل طلب جديد.

## ⚠️ مهم قبل ما تبدأ

هذا البوت يشتغل على رقم واتساب منفصل من رقمك الشخصي. في مرحلة التجربة (مجاني بالكامل)، الرقم التجريبي من ميتا يقدر يرسل بس لـ5 أرقام تسجلها أنت مسبقاً كـ"أرقام مختبِرة".

## الخطوة 1: إنشاء حساب Meta Developer

1. روح لـ developers.facebook.com وسجل دخول بحساب فيسبوك تبعك
2. اضغط "My Apps" ثم "Create App"
3. اختر نوع التطبيق "Business"
4. أعطه اسم مثل "Turkiya Mafroshat Bot"

## الخطوة 2: إضافة منتج واتساب

1. داخل التطبيق، ابحث عن "WhatsApp" واضغط "Set up"
2. انسخ Temporary access token و Phone number ID
3. تحت "To"، اضغط "Manage phone number list" وأضف رقمك

## الخطوة 3: رفع المشروع واستضافته مجاناً (Render.com)

1. سجل حساب مجاني على render.com
2. اضغط "New" ثم "Web Service"
3. اربط حساب GitHub واختر مستودع turkiya-bot
4. Build Command: npm install
5. Start Command: npm start
6. أضف متغيرات البيئة: WHATSAPP_TOKEN, PHONE_NUMBER_ID, VERIFY_TOKEN, OWNER_PHONE

## الخطوة 4: ربط الـ Webhook مع ميتا

1. في صفحة WhatsApp في Meta Developers، اضغط Configuration ثم Edit بجانب Webhook
2. Callback URL: رابط Render تبعك مع /webhook في الآخر
3. Verify Token: نفس القيمة اللي حطيتها
4. فعّل messages تحت Webhook fields

## تعديل الكتالوج

افتح catalog.json وعدّل الأسماء والأسعار حسب منتجاتك الفعلية.
