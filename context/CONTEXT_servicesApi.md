🎯 Purpose

ساخت ماژول servicesApi.js برای مدیریت تمام ارتباطات مرتبط با Content Type Service در Strapi.
این ماژول یک abstraction از لایه API فراهم می‌کند تا صفحات (/services, /services/[slug]) بتوانند به‌صورت تمیز و ایمن داده‌ها را فچ کنند.

📂 File Structure
/src/lib/apiClient.js
/src/lib/servicesApi.js

⚙️ Module Type

server
(تمام توابع async و فقط در سرور قابل اجرا هستند؛ مناسب SSR/ISR در Next.js 15.)

🌐 Data Source

Endpoints:

/api/services?populate=* → دریافت همه خدمات

/api/services/:slug?populate=* → دریافت جزئیات یک خدمت خاص

Content Type Fields:
id, slug, title, description, image, link

🧩 Dependencies

apiClient.js (پایه برای انجام درخواست‌ها)

متغیر محیطی NEXT_PUBLIC_STRAPI_API_URL

ساختار پاسخ Strapi: { data: [...], meta: {...} }

🧠 Logic Overview

servicesApi.js شامل ۲ تابع است:

getAllServices()  →  فچ لیست تمام خدمات
getServiceBySlug(slug)  →  فچ جزئیات یک خدمت خاص


هر دو تابع:

از apiClient() استفاده می‌کنند

داده را پاک‌سازی کرده و فقط response.data را برمی‌گردانند

در صورت خطا، خروجی [] یا null می‌دهند تا صفحه دچار کرش نشود

🎨 Design Notes

(چون ماژول بک‌اند است، فقط منطق و ساختار کد اهمیت دارد، نه UI)

باید کاملاً مستند و دارای کامنت فارسی باشد تا Cursor و توسعه‌دهنده منطق را درک کنند.

تابع‌ها باید async و خطاپذیر باشند (با try/catch).

توابع باید قابل استفاده در هر Context فرانت‌اند باشند (ServicesPage، ServiceSingle و ...).