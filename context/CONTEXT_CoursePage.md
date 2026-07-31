# CONTEXT_CoursePage.md

## 🎯 Purpose
بازسازی و بهینه‌سازی کامل صفحه تکی دوره آموزشی (`app/courses/[slug]/page.js`) جهت ارتقای سئو، زیباسازی بصری سرفصل‌ها و افزایش نرخ ثبت‌نام.

---

### 📂 File Structure
- `app/courses/[slug]/page.js`
- `app/courses/[slug]/page.module.scss`
- `/src/modules/courses/CourseFaq.jsx` (بازاستفاده از کامپوننت FAQ)
- `/src/modules/courses/CourseConsultationCTA.jsx` (باکس دعوت به مشاوره)
- `/src/modules/courses/RelatedCourses.jsx` (اسلایدر دوره‌های مرتبط)

---

### ⚙️ Component Type
اکثراً `Server Component` جهت بهینه‌سازی سرعت و سئو. بخش‌های اکاردئون و اسلایدر دارای تعامل کلاینتی هستند.

---

### 🌐 Data Source & APIs
- Endpoint: `/api/courses/[slug]` با populate کامل فصل‌ها (`curriculum`), تصویر (`cover`), سوالات متداول (`faqs`)
- Related Courses: دریافت دوره‌های هم‌دسته از `getCourses({ categoryId })`

---

### 🧩 Dependencies
- `marked` و `ArticleReader` (برای توضیحات کامل دوره)
- `BaseSlider` و `CourseCard` (برای دوره‌های مرتبط)
- `CommentsSection` (بخش نظرات)
- `Lucide Icons` (`HelpCircle`, `MessageCircle`, `CheckCircle`, `Clock`, `BookOpen`)

---

### 🧠 Logic & Rules

۱. **Course JSON-LD (SEO):**
   - اسکیما از نوع `@type: "Course"`.
   - شامل `name`, `description`, `provider: { @type: "Organization", name: "طرح الهی" }`, و بخش `offers` (قیمت و موجودی).

۲. **Hero & Registration Box:**
   - نمایش تصویر کاور اصلی (بدون ویدیو).
   - استایل‌دهی مجدد باکس ثبت‌نام (قیمت اصلی، قیمت با تخفیف، دکمه ثبت‌نام قاطع و برجسته).

۳. **Curriculum Accordion (سرفصل‌ها):**
   - ساختار تمیز آکاردئونی فصل‌ها و لیست ویدیوها/دروس.
   - نمایش زمان هر جلسه و آیکون وضعیت (قفل / پیش‌نمایش رایگان).

۴. **Course FAQ Accordion:**
   - اگر دوره دارای فیلد `faqs` باشد، از کامپوننت FAQ استفاده کرده و آکاردئون سوالات متداول دوره را رندر کند.

۵. **Consultation CTA (مشاوره قبل از خرید):**
   - یک بنر/کارت شکیل با متن "نیاز به مشاوره قبل از خرید دوره دارید؟" و دکمه هدایت به مسیر `/contact`.

۶. **Related Courses Slider:**
   - نمایش دوره‌های هم‌گروه با استثنا کردن دوره فعلی در اسلایدر `BaseSlider`.