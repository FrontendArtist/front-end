# CONTEXT_DynamicPreChatForm.md

## 🎯 Purpose
داینامیک کردن فرم پیش‌نیاز ارتباط با استاد (`PreChatForm`). سوالات فرم به جای هاردکد شدن در کلاینت، باید از طریق یک Single Type در Strapi خوانده شده و به صورت پویا با `react-hook-form` رندر شوند. جواب‌ها همچنان در فیلد JSON به نام `metaData` در کالکشن `Message` ذخیره می‌شوند.

---

### 📂 File Structure
- `backend/src/components/form/question.json` (کامپوننت جدید در استرپی)
- `backend/src/api/mentor-form-setting/content-types/mentor-form-setting/schema.json` (Single Type جدید)
- `src/components/chat/PreChatForm.jsx` (آپدیت برای رندر داینامیک)
- `src/lib/messagesApi.js` (اضافه شدن تابع فچ تنظیمات فرم)

---

### ⚙️ Component Type
- `src/components/chat/PreChatForm.jsx`: `use client` (نیازمند فچ در کلاینت یا دریافت از طریق Props سرور، مدیریت وضعیت با `react-hook-form`).

---

### 🌐 Data Source
- **Endpoint فرم‌ساز:** `GET /api/mentor-form-setting?populate=questions`
- **ساختار دیتای دریافتی:** آرایه‌ای از آبجکت‌ها شامل `key`, `label`, `fieldType` (text, number, textarea, select), `isRequired`, `options`.
- **Endpoint ارسال فرم:** `POST /api/messages` (ارسال دیتای داینامیک فرم به داخل آبجکت `metaData`).

---

### 🧠 State Logic & Dynamic Form
- استفاده از `useEffect` یا `SWR` برای فچ کردن ساختار فرم.
- لوپ زدن روی آرایه `questions` و رندر فیلدهای متناسب (input, textarea, select) بر اساس `fieldType`.
- استفاده از `register` در `react-hook-form` با کلیدهای داینامیک (`question.key`) و اعمال Validation پویا بر اساس `question.isRequired`.

---

### 🎨 Design Notes
- لودینگ اسکلتون (Skeleton Loader) قبل از دریافت ساختار فرم از API نمایش داده شود.
- استایل‌دهی فیلدهای داینامیک باید کاملاً از کلاس‌های از پیش تعریف شده در `PreChatForm.module.scss` و متغیرهای `styles.md` پیروی کند.

---

### 🧾 Cursor Prompt
```js
// Refactor the PreChatForm component based on @CONTEXT_DynamicPreChatForm.md
// 1. Create the necessary schema files for Strapi backend (Single Type: MentorFormSetting with a repeatable component: Form.Question).
// 2. Update PreChatForm.jsx to fetch this schema dynamically and render inputs based on the fieldType.
// 3. Ensure react-hook-form dynamically registers these fields and submits them as a single JSON object inside the `metaData` field of the /api/messages POST request.
// Adhere to KISS principles and ensure robust error handling if the form schema fails to load.