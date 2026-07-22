# CONTEXT_CourseCurriculum.md

## 🎯 Purpose
مدیریت نمایش سرفصل‌های دوره در دو حالت "فصلی" (قابلیت خرید مجزای هر فصل) و "غیرفصلی" (خرید یکجای کل دوره)، همراه با کنترل دسترسی (Access Control) یکپارچه با ویدیو پلیر.

---

### 📂 File Structure
- `/src/modules/courses/CourseContentManager.jsx`
- `/src/modules/courses/CourseContentManager.module.scss`

---

### ⚙️ Component Type
`use client` 
نیاز به رندرینگ سمت کلاینت دارد زیرا باید وضعیت (State) آکوردئون‌ها، تب‌های فعال، اتصال به استور سبد خرید (`Zustand`) و سشن کاربر (`NextAuth`) را در لحظه مدیریت کند.

---

### 🌐 Data Source
- **منبع داده دوره (از سمت سرور پاس داده می‌شود):**
  - `course.isChaptered`: Boolean (مشخص‌کننده نوع دوره)
  - `course.chapters`: آرایه‌ای از فصل‌ها (در صورت `isChaptered: true`). هر فصل شامل `id`, `title`, `price`, و `lessons` است.
  - `course.curriculum`: آرایه‌ای از قسمت‌ها (در صورت `isChaptered: false`).
- **منبع دسترسی کاربر:**
  - `session.user.enrolledCourses`: آرایه شناسه‌های دوره‌های خریداری شده.
  - `session.user.enrolledChapters`: آرایه شناسه‌های فصل‌های خریداری شده.

---

### 🧩 Dependencies
- `useSession` از `next-auth/react` برای بررسی مالکیت.
- `useCartStore` (مدیریت با Zustand) برای فراخوانی اکشن `addItem` با تایپ `chapter` یا `course`.
- `clsx` برای ترکیب کلاس‌های استایل وضعیت‌های باز/بسته و قفل/باز.
- کامپوننت `Modal` سراسری برای تاییدیه افزودن به سبد خرید.

---

### 🧠 State Logic
1. **`openChapter`**: استیت محلی برای مدیریت باز و بسته بودن آکوردئون فصل‌ها.
2. **`activeLesson`**: استیت محلی برای نگهداری قسمتی که در حال پخش در پلیر است.
3. **گارد دسترسی فصلی (`hasChapters === true`):**
   - اگر `enrolledCourses.includes(course.id)` ➔ دسترسی کامل به تمام فصل‌ها.
   - اگر `enrolledChapters.includes(chapter.id)` ➔ دسترسی فقط به همان فصل، قابلیت باز شدن آکوردئون، بقیه فصل‌ها قفل.
   - هندلر کلیک روی فصل قفل ➔ باز شدن مودال یا اجرای `addItem` برای افزودن `chapter` به سبد خرید.
4. **گارد دسترسی غیرفصلی (`hasChapters === false`):**
   - بررسی مالکیت فقط از طریق `enrolledCourses.includes(course.id)`.
   - در صورت عدم مالکیت، تمام قسمت‌های پولی قفل رندر می‌شوند.

---

### 🎨 Design Notes
- استفاده از توکن‌های رنگی و متغیرهای تعریف شده در `styles.md`[cite: 15].
- لیست قسمت‌ها (چه درون آکوردئون و چه خطی) باید دارای اسکرول داخلی کاستومایز شده با رنگ `--color-primary` باشند.
- فصل‌های قفل شده باید استایل Dimmed (کمرنگ‌تر) داشته باشند و آیکون 🔒 در کنار مبلغ آن‌ها نمایش داده شود.
برای رنگ ها از متغیر های فایل variables.css استفاده کن
اگر یکوقت خواستی Opacity بدی از این روش استفاده کن background: fade(var(--color-bg-primary-overlay), 60%);
