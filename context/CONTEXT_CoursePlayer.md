# CONTEXT_CoursePlayer.md (نسخه V2: سیستم پخش ویدیو و صوت با Video.js)

## 🎯 Purpose
مدیریت پخش دوره‌های صوتی و ویدیویی با استفاده از کتابخانه قدرتمند Video.js، کنترل سطح دسترسی کاربران بر اساس وضعیت خرید دوره (رابطه با کاربران در Strapi) و ذخیره‌سازی پیشرفت پخش هر جلسه در LocalStorage.

---

## ⚙️ Component Type
1. `page.js` (Server Component): دریافت داده‌های دوره از لایه API و مدیریت سئو.
2. `CourseContentManager.jsx` (Client Component): مدیریت استیت جلسه فعال و اعمال منطق‌های خرید/دسترسی.
3. `VideoJSPlayer.jsx` (Client Component): پیاده‌سازی و اینیشیالایز پلیر Video.js به همراه تنظیمات داینامیک برای Audio و Video و سیستم Resume Playback.

---

## 🌐 Data Structure (Curriculum Item / Lesson)
ساختار فیلدهای کامپوننت تکرارپذیر جلسات (مثلاً با نام `curriculum` یا `sessions`) در Strapi:
- id: string / number
- title: string (عنوان جلسه)
- videoUrl: string (لینک مستقیم ویدیو در فضای ابری - اختیاری)
- audioUrl: string (لینک مستقیم صوت در فضای ابری - اختیاری)
- isFree: boolean (وضعیت رایگان بودن جلسه)
- duration: string (مدت زمان جلسه مثل "22:15")

---

## 🧠 State & Access Control Logic
1. **قوانین دسترسی (Access Control Guards):**
   - **جلسه رایگان (isFree: true):**
     - کاربر لاگین نکرده باشد ➔ مسدود سازی پخش و نمایش آلرت/پیغام "برای مشاهده جلسات رایگان باید وارد حساب کاربری خود شوید".
     - کاربر لاگین کرده باشد ➔ پخش آزاد است.
   - **جلسه نقدی (isFree: false):**
     - کاربر لاگین نکرده باشد یا دوره را خریداری نکرده باشد (`courseId` در آرایه `session.user.courses` موجود نباشد) ➔ نمایش آیکون قفل 🔒 در لیست و عدم امکان پخش همراه با پیغام "این جلسه مخصوص خریداران دوره است".
     - کاربر خریدار باشد + لاگین ➔ پخش آزاد است.

2. **ذخیره‌سازی پیشرفت (Local Playback Persistence):**
   - کلید ذخیره‌سازی در LocalStorage فرمت کاملاً یکتا دارد: `vjs_progress_c[courseId]_l[lessonId]`
   - با استفاده از رویداد `timeupdate` در Video.js، زمان فعلی (`currentTime()`) ذخیره می‌شود.
   - هنگام لود شدن مجدد جلسه، در صورت وجود تایم قبلی، پلیر باید از همان ثانیه با متد `currentTime(savedTime)` بازیابی (Resume) شود.

---

## 🎨 UI/UX & Styling Rules
- **چیدمان صفحه (Layout):**
  - **بخش هدر (Hero):** سمت راست تصویر دوره، سمت چپ عنوان، توضیحات، قیمت و دکمه خرید دوره (نمایش دکمه خرید فقط در صورت عدم مالکیت دوره).
  - **بخش میانی (Player):** باکس پلیر اختصاصی Video.js. اگر جلسه فقط صوتی بود، تگ `<audio className="video-js">` یا تگ ویدیو با یک Poster پیش‌فرض رندر می‌شود. اگر ویدیویی بود، پلیر ویدیویی عریض رندر می‌شود.
  - **بخش پایینی (Playlist):** لیست جلسات به صورت خطی زیر پلیر. جلسات قفل شده دارای آیکون قفل هستند. جلسه‌ای که در حال پخش است کلاس `.active` به خود می‌گیرد.
- **استایل‌دهی:** استفاده الزامی از SCSS Modules و ابزار `clsx`. تمامی فایل‌های `.module.scss` باید میکسین‌های پاسخ‌گرا (`@import '@/styles/base/mixins';`) را برای هندل کردن ریسپانسیو دسکتاپ و موبایل با `@include respond(md)` رعایت کنند.

---

## 🧩 Dependencies (قوانین سخت‌گیرانه Import)
- `video.js`: کتابخانه اصلی پلیر.
- استایل رسمی: `import 'video.js/dist/video-js.css';`
- `clsx`: برای اعمال استایل‌های داینامیک شرطی (مانند فعال بودن جلسه یا وضعیت قفل).
- `next-auth/react`: هوک `useSession` جهت استخراج وضعیت خرید کاربر (`session.user.courses`).