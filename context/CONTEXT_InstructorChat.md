# CONTEXT_InstructorChat.md

## 🎯 Purpose
پیاده‌سازی سیستم چت با استاد (Instructor Chat) شامل فرم پیش‌نیاز کاربری و داشبورد اختصاصی استاد در مسیر `/mentor`. این سیستم از کالکشن `Message` استفاده می‌کند و دیتای فرم پیش‌نیاز را در فیلد `metaData` به صورت JSON ذخیره می‌کند.

---

### 📂 File Structure
- `src/app/mentor/page.jsx` (صفحه اختصاصی استاد)
- `src/app/mentor/layout.jsx` (محافظت از روت فقط برای Admin)
- `src/components/chat/InstructorChatPanel.jsx` (رابط کاربری چت استاد)
- `src/components/chat/InstructorChatPanel.module.scss`
- `src/components/chat/PreChatForm.jsx` (فرم پیش‌نیاز اطلاعات سالک)
- `src/components/chat/PreChatForm.module.scss`

---

### ⚙️ Component Type
- `src/app/mentor/page.jsx`: `server` (واکشی اولیه لیست پیام‌های استاد)
- `src/components/chat/*`: `use client` (مدیریت استیت چت، فرم و ارسال پیام)

---

### 🌐 Data Source
- **Endpoint:** `/api/messages`
- **Query Params:** `?filters[type][$eq]=instructor&populate=*`
- **Fields used:** `id`, `subject`, `body`, `replies`, `status`, `metaData` (حاوی سن، تاهل، شغل، و سوالات معنوی)، `createdAt`.

---

### 🧠 State Logic & Auth
- **Auth Guard:** مسیر `/mentor` باید با استفاده از سشن NextAuth محافظت شود. اگر `session.user.role !== 'Admin'` بود، کاربر به `/` ریدایرکت شود.
- **Form State:** استفاده از `react-hook-form` برای مدیریت `PreChatForm`.
- **Chat State:** مدیریت پیام‌های فعال و Threadها در `InstructorChatPanel` با `useState` یا `Zustand`.

---

### 🎨 Design Notes
- از css variables  برای رنگ ها و سایز ها و استایل استفاده کن و از نوشتن رنگ ها به صورت هاردکد جدا خودداری کن 
- طراحی `/mentor` باید مینیمال، مدرن و شامل دو ستون باشد (سایدبار لیست کاربران/چتها در راست، پنجره چت و اطلاعات `metaData` کاربر در چپ).
- ریسپانسیو کامل: در موبایل، سایدبار لیست چتها کل صفحه را میگیرد و با کلیک روی هر چت، پنجره چت روی آن باز میشود.

---

