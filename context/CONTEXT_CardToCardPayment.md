# CONTEXT_CardToCardPayment.md

## 🎯 Purpose
بسترسازی و پیاده‌سازی کامل سیستم پرداخت کارت‌به‌کارت. این ویژگی به کاربر اجازه می‌دهد پس از ثبت سفارش، اطلاعات حساب بانکی فروشگاه (ذخیره شده در Strapi) را در صفحه جزئیات سفارش مشاهده کرده، تصویر فیش واریزی و کُد پیگیری را آپلود کند. سفارش سپس به وضعیت "در انتظار تأیید" منتقل می‌شود.

---

### 📂 File Structure
#### Backend (Strapi v5):
- `/src/api/bank-setting/content-types/bank-setting/schema.json` (Single Type برای اطلاعات کارت)
- `/src/api/order/content-types/order/schema.json` (اضافه کردن فیلدهای جدید فیش به اینماد سفارش)

#### Frontend (Next.js 15 - App Router):
- `/src/app/api/orders/upload-receipt/route.js` (API Proxy برای آپلود امن فایل و متاداده به استرپی)
- `/src/components/profile/OrderReceiptUpload.jsx` (کامپوننت کلاینت فرم آپلود)
- `/src/components/profile/OrderReceiptUpload.module.scss` (استایل‌های اختصاصی فرم)

---

### ⚙️ Component Type
`use client` برای کامپوننت `OrderReceiptUpload` به دلیل نیاز به مدیریت حالت‌های انتخاب فایل، ولیدیشن فرم، کنترل وضعیت بارگذاری (Loading) و ثبت رویداد onSubmit.

---

### 🌐 Data Source
1. **Strapi Single Type (`bank-setting`):** شامل فیلدهای `bankName` (String)، `cardNumber` (String)، `accountHolder` (String).
2. **Strapi Collection Type (`order`):** اضافه شدن فیلدهای `paymentMethod` (Enum: online, card_to_card)، `paymentStatus` (Enum: pending_payment, pending_verification, paid, failed)، `receiptImage` (Media - Single)، `trackingNumber` (String)، `cardHolderName` (String).
3. **API Proxy Route:** کلاینت به Endpoint داخلی `/api/orders/upload-receipt` درخواست POST از نوع `Multipart/FormData` ارسال می‌کند.

---

### 🧩 Dependencies
- `axios` یا `fetch` برای ارسال فرم دیتا
- سیستم Notification/Toast پروژه برای نمایش پیام‌های موفقیت یا خطا
- سازگاری کامل با سیستم `documentId` در Strapi v5

---

### 🧠 State Logic
در کامپوننت فرم:
- `file` (File | null): ذخیره فایل تصویر انتخاب شده توسط کاربر (محدود به فرمت‌های عکس و حجم زیر ۵ مگابایت).
- `trackingNumber` (string): شماره پیگیری یا کُد ارجاع بانکی.
- `cardHolderName` (string): نام صاحب کارت واریز کننده.
- `isSubmitting` (boolean): مدیریت وضعیت لودینگ دکمه ثبت فرم.
- `errorMessage` (string | null): ذخیره و نمایش خطاهای اعتبارسنجی سمت کلاینت یا سرور.

---

### 🎨 Design Notes

- باکس نمایش اطلاعات کارت بانکی باید دارای Border ظریف، پدینگ استاندارد و دکمه کپی سریع (Copy to Clipboard) برای شماره کارت باشد.
- بخش Drag & Drop یا کلیک برای انتخاب فایل فیش با پس‌زمینه کم‌رنگ و خط‌چین (Dashed border) طراحی شود.
- کاملاً ریسپانسیو و بهینه‌سازی شده برای موبایل با استفاده از Mixinهای `@include respond(md)`.

---

### 🧾 Cursor Prompt Reference
این بخش در فازهای اجرایی به صورت پرامپت مستقیم به کامنت تبدیل و فراخوانی می‌شود.