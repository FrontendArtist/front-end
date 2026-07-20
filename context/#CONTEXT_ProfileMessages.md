# CONTEXT_ProfileMessages.md

## 🎯 Purpose
این ویژگی یک سیستم مدیریت پیام‌ها (تیکتینگ) در داشبورد کاربری (Profile) است. کاربر می‌تواند لیست پیام‌های ارسالی خود (از طریق فرم تماس با ما) را با وضعیت آن‌ها (Open/Closed) ببیند. با کلیک روی هر پیام، جزئیات پیام و پاسخ‌های ادمین (Thread) در یک Modal یا بخش توسعه‌یافته (Accordion/Expanded) نمایش داده می‌شود.

---

### 📂 File Structure
- `src/app/profile/messages/page.jsx` (Entry Page)
- `src/modules/profile/MessagesList.jsx` (List Component)
- `src/modules/profile/MessagesList.module.scss` (Styles)
- `src/modules/profile/MessageDetailModal.jsx` (Detail & Chat View Component)
اگر فایل بندی  بالا با ساختار کلی پروژه هماهنگ نیست در چت به من اعلام کن 
---

### ⚙️ Component Type
`use client`
دلیل: این کامپوننت‌ها نیازمند تعامل کاربر (باز کردن مودال/آکاردئون)، مدیریت State برای پیام انتخاب‌شده و واکشی داده‌ها در سمت کلاینت (CSR) بر اساس استراتژی پروژه هستند.

---

### 🌐 Data Source
- Endpoints: 
  - `GET /api/messages` (لیست پیام‌های کاربر فعلی)
  - `GET /api/messages/:id` (دریافت جزئیات و رشته پیام‌های یک تیکت)
- Fields used: `id`, `subject`, `body`, `status`, `replies`, `createdAt`, `updatedAt`.
- Fetching Logic: استفاده از توابع موجود در `src/lib/api.js` (ممنوعیت استفاده مستقیم از `fetch`).

---

### 🧩 Dependencies
- `src/components/ui/Modal.jsx` (برای نمایش جزئیات پیام)
- `src/components/ui/Loader.jsx` (برای حالت Loading کلاینت)
- `src/components/ui/EmptyState.jsx` (برای زمانی که کاربر پیامی ندارد)
- هوک‌های واکشی داده (مانند `useFetch` یا متدهای `SWR`/`React Query` در صورت وجود در معماری).

---

### 🧠 State Logic
- `messages`: آرایه‌ای از پیام‌ها (Local State یا Zustand در صورت نیاز به کش).
- `selectedMessage`: آبجکت پیام انتخاب شده برای نمایش در Modal (Local State).
- `isModalOpen`: بولین برای مدیریت وضعیت نمایش Modal.
- `isLoading` و `error`: برای مدیریت وضعیت API.

---

### 🎨 Design Notes
- لیست پیام‌ها: یک باکس شامل عنوان (Subject)، خلاصه‌ای از پیام (Excerpt - حداکثر یک خط)، تاریخ و یک Badge برای وضعیت (مثلاً سبز برای پاسخ‌داده‌شده، خاکستری برای درانتظار).
- تایپوگرافی: صرفاً از متغیرهای CSS سیستم طراحی استفاده شود. به هیچ‌وجه فونت‌فمیلی خاصی (به عنوان مثال در فایل‌های SCSS) هاردکد نشود.
برای رنگ ها از متغیر های فایل variables.css استفاده کن
اگر یکوقت خواستی Opacity بدی از این روش استفاده کن background: fade(var(--color-bg-primary-overlay), 60%);
---

### 🧾 Cursor Prompt
```js
// Create the Profile Messages components based on @CONTEXT_ProfileMessages.md
// Ensure SCSS modules are used and BEM naming convention is applied.
// All API calls must route through src/lib/api.js.