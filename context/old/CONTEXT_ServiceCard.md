🎯 Purpose

ایجاد کامپوننت کارت خدمات برای نمایش در صفحات لیست خدمات (/services) و بخش مربوطه در صفحه اصلی.
هر کارت شامل تصویر، عنوان، توضیح کوتاه و لینک به صفحه تکی خدمت است.

📂 File Structure
/src/components/cards/ServiceCard.jsx
/src/components/cards/ServiceCard.module.scss

⚙️ Component Type

server
کامپوننت بدون تعامل کاربر و بدون state داخلی است و فقط برای نمایش داده‌ها استفاده می‌شود.

🌐 Data Source

Endpoint: /api/services

Fields used: id, slug, image, title, description, link

🧩 Dependencies

next/image برای بهینه‌سازی تصاویر

next/link برای ناوبری به /services/[slug]

SCSS Module بر اساس قواعد styles.md

Tokenهای رنگ از --color-card-text و --gradient-card-vertical

🧠 State Logic

ندارد (کامپوننت Server-Only)

🎨 Design Notes

ساختار کارت از BaseSlider یا Grid فراخوانی می‌شود.

از mixin card-container برای ساختار بیرونی استفاده شود.

تایپوگرافی:

عنوان: font-lg, font-weight-bold

توضیح: font-md, line-height-md

Hover: تغییر ملایم در پس‌زمینه با --gradient-card-horizontal-ltr