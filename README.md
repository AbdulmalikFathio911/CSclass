# مسار

تطبيق ويب مثبّت (PWA) لمتابعة التقدّم في كورس واحد: MIT 6.100L، *Introduction to CS and Programming using Python* (Fall 2022).
ملفات ثابتة فقط: لا إطار عمل، لا أدوات بناء، لا سيرفر خلفي.

الرابط: https://abdulmalikfathio911.github.io/CSclass/

## الملفات

| الملف | الوظيفة |
|---|---|
| `index.html` | الهيكل: أربع شاشات، شريط تنقل، ورقة سفلية، الأيقونات المضمّنة |
| `styles.css` | التنسيق. كل التباعد والألوان في متغيرات أول الملف |
| `data.js` | 26 محاضرة و6 واجبات (عناوين إنجليزية وروابط من موقع الكورس) |
| `app.js` | العرض، الحفظ، الفلتر، الورقة السفلية، النسخة الاحتياطية |
| `sw.js` | عامل الخدمة: يخزّن الملفات حتى يخدم التطبيق بدون نت |
| `manifest.webmanifest` | تعريف التطبيق المثبّت |
| `icons/`، `fonts/` | الأيقونات والخط |
| `tests/` | سكربتات القياس الثمانية |

## بعد أي تعديل

1. ارفع رقم النسخة في أول سطر من `sw.js`.
2. أي ملف جديد يستعمله التطبيق لازم ينضاف لقائمة `ASSETS` في `sw.js`.

## البيانات المحفوظة

كل شي محفوظ على الجهاز في `localStorage` تحت المفتاح `masar-v1`، بهذا الشكل:

```json
{ "v": 1, "lectures": { "1": true }, "psets": { "ps1": "doing" } }
```

حالات الواجب: `todo` أو `doing` أو `done`. لا تغيّر المفتاح ولا الشكل.

## التشغيل والاختبار محلياً

```bash
python3 -m http.server 8765
```

```bash
node tests/all.js
```

الاختبارات تحتاج Node و Playwright مع Chromium. كل اختبار يشتغل بروحه كذلك، مثلاً `node tests/t1-touch.js`.
لتصوير الشاشات: `node tests/shots.js <مجلد>`.

## المصدر والتراخيص

- محتوى الكورس (العناوين، الترتيب، الروابط): [MIT OpenCourseWare 6.100L](https://ocw.mit.edu/courses/6-100l-introduction-to-cs-and-programming-using-python-fall-2022/)، Dr. Ana Bell، برخصة [CC BY-NC-SA 4.0](https://creativecommons.org/licenses/by-nc-sa/4.0/). مسار غير تابع لـ MIT.
- الخط: IBM Plex Sans Arabic، رخصة SIL OFL 1.1 (النص في `fonts/LICENSE.txt`).
- الأيقونات: [Lucide](https://lucide.dev)، رخصة ISC.
