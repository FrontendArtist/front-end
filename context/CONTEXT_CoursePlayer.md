# CONTEXT_CoursePage.md

## 🎯 Purpose
طراحی و پیاده‌سازی کامل صفحه تکی دوره آموزشی (`app/courses/[slug]/page.js`) بر پایه SSR جهت ارتقای سئو (JSON-LD)، زیباسازی بصری سرفصل‌ها (Curriculum Accordion)، رندر محتوای غنی توضیحات (ArticleReader)، نمایش رسانه هدر (`teaserUrl` یا `cover`) و افزایش نرخ ثبت‌نام.

---

### 📂 File Structure
- `app/courses/[slug]/page.js` (صفحه اصلی Server Component)
- `app/courses/[slug]/page.module.scss` (استایل‌های SCSS صفحه دوره)
- `src/modules/courses/CourseConsultationCTA.jsx` (ماژول مشاوره قبل از خرید)
- `src/modules/courses/CourseConsultationCTA.module.scss`

---

### ⚙️ Component Type
- `page.js`: Server Component (SSR)
- `CourseConsultationCTA`: Server Component
- `Curriculum Accordion`: Client Component (برای تعامل آکاردئون)

---

### 🌐 Data Source & APIs
- **Course Data:** واکشی از متد `getCourseBySlug(slug)` در `src/lib/coursesApi.js` با پاپولیت کامل فیلدهای `cover`, `teaserUrl`, `curriculum`, `category`.

---

### 🧩 Dependencies
- `marked` (تبدیل امن مارک‌داون به HTML در سرور)
- `ArticleReader` (رندر توضیحات کامل دوره و فهرست مطالب داینامیک)
- `CommentsSection` (بخش نظرات کاربران)
- `Lucide Icons` (`Lock`, `PlayCircle`, `Clock`, `CheckCircle`, `Video`, `PhoneCall`)

---

### 🧠 Logic & Rules

۱. **Course JSON-LD (SEO):**
   - اسکیمای `@type: "Course"`.
   - فیلدهای `name`, `description`, `provider: { @type: "Organization", name: "طرح الهی" }`.
   - بخش `offers` شامل قیمت اصلی، قیمت با تخفیف، واحد پول و وضعیت موجودی.

۲. **Hero & Media Section (منطق هوشمند نمایش تیزر / عکس):**
   - **بررسی فیلد `teaserUrl`:**
     - اگر فیلد `course.teaserUrl` وجود داشت و خالی نبود (`Boolean(course.teaserUrl)`): آدرس `teaserUrl` را درون کامپوننت/تگ ویدیو پلیر پروژه (با امکانات play/pause/controls) رندر کن.
     - اگر فیلد `course.teaserUrl` خالی، `null` یا `undefined` بود: تصویر کاور دوره (`course.cover`) را به عنوان بنر اصلی رندر کن.
   - **متادیتای سریع:** نمایش مدت زمان کل دوره، تعداد جلسات، سطح دوره.
   - **کارت خرید:** نمایش قیمت اصلی (خط‌خورده در صورت تخفیف)، قیمت نهایی و دکمنه‌ی برجسته‌ی «ثبت‌نام در دوره».

۳. **Curriculum Accordion (سرفصل‌ها و دروس):**
   - ساختار آکاردئونی برای فصل‌ها و لیست دروس زیرمجموعه.
   - نمایش زمان هر جلسه و آیکون وضعیت: `Lock` برای جلسات اختصاصی و `Play` برای جلسات رایگان/پیش‌نمایش.

۴. **محتوای اصلی (Rich Text & ArticleReader):**
   - متن توضیحات کامل دوره باید با `marked.parse` پارس شده و به کامپوننت `<ArticleReader content={parsedContent} />` پاس داده شود.

۵. **Consultation CTA (مشاوره قبل از خرید):**
   - بنر شکیل با آیکون مشاوره، متن "نیاز به مشاوره قبل از خرید دوره دارید؟" و دکمه لینک به `/contact`.

۶. **بخش نظرات (`CommentsSection`):**
   - فراخوانی کامپوننت نظرات موجود پروژه در انتهای صفحه.