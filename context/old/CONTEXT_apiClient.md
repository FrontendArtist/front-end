🎯 Purpose

ایجاد ماژول پایه‌ای apiClient.js برای مدیریت تمام درخواست‌های HTTP به Strapi CMS.
این ماژول نقش Gateway مرکزی را دارد و همه‌ی فایل‌های دامنه‌ای (مثل servicesApi.js, productsApi.js) از آن برای واکشی داده استفاده می‌کنند.

📂 File Structure
/src/lib/apiClient.js

⚙️ Module Type

server
(فقط در محیط سرور Next.js اجرا می‌شود، چون به متغیرهای محیطی و درخواست‌های SSR دسترسی دارد.)

🌐 Data Source

Base URL: process.env.NEXT_PUBLIC_STRAPI_API_URL

Headers:

{
  "Content-Type": "application/json"
}


Default options:
cache: "no-store" برای جلوگیری از کش در SSR

🧩 Dependencies

Node Fetch (در محیط Next.js به‌صورت built-in)

متغیر محیطی NEXT_PUBLIC_STRAPI_API_URL

لایه‌های بالا: servicesApi.js, productsApi.js, articlesApi.js, …

🧠 Logic Overview

apiClient.js باید شامل یک تابع export شده باشد:

export async function apiClient(endpoint, options = {})


وظایف:

دریافت endpoint نسبی (مثلاً /services).

ترکیب آن با Base URL از .env.

ارسال درخواست fetch با تنظیمات مناسب.

بررسی response.ok.

بازگرداندن response.json() یا پرتاب خطا با message دقیق.

هندل خطا (try/catch) برای جلوگیری از کرش صفحه.

🧩 Error Handling Rules

اگر پاسخ از سرور Strapi با خطا بازگردد (!res.ok):

پیام خطا باید شامل status code و endpoint باشد.

در صورت خطای شبکه یا محیط:

باید throw new Error("Network error while fetching: " + endpoint) برگردانده شود.

🎨 Design Notes

(چون این فایل بدون UI است، فقط منطق اهمیت دارد.)

باید دارای کامنت‌های فارسی واضح باشد.

کد باید ماژولار و ساده (KISS Principle) بماند.

در آینده برای افزودن Authorization Header (توکن JWT) قابل گسترش باشد.