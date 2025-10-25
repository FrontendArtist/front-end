urpose

ایجاد کامپوننت گرید خدمات برای نمایش مجموعه‌ای از کارت‌های ServiceCard در صفحه لیست خدمات (/services)
این گرید داده‌ها را از API استرپی گرفته و با ساختار ریسپانسیو در سه حالت موبایل، تبلت و دسکتاپ نمایش می‌دهد.

📂 File Structure
/src/modules/services/ServiceGrid.jsx
/src/modules/services/ServiceGrid.module.scss

⚙️ Component Type

server
(چون فقط برای واکشی و نمایش داده‌ها استفاده می‌شود و تعامل کاربری مستقیم ندارد.)

🌐 Data Source

Endpoint: /api/services

Fields used: id, slug, image, title, description, link

🧩 Dependencies

ServiceCard → /src/components/cards/ServiceCard.jsx

Grid → /src/components/layout/Grid.jsx

Loader → /src/components/ui/Loader.jsx (در صورت تأخیر واکشی)

SCSS mixins از styles/md مخصوص grid

🧠 State Logic

ندارد (کامپوننت Server-Only)
اما باید:

در صورت خالی بودن داده‌ها، EmptyState نمایش دهد.

🎨 Design Notes

از Grid برای ساختار پایه استفاده شود (۲ ستون موبایل، ۳ تبلت، ۴ دسکتاپ).

Spacing بین کارت‌ها بر اساس --space-gap-desktop: 48px

کارت‌ها در وسط تراز شوند اگر داده کمتر از تعداد ستون باشد.

حالت Empty باید از EmptyState با متن:
"در حال حاضر هیچ خدمتی ثبت نشده است." استفاده کند.

Hover کارت‌ها بر اساس گرادیان تعریف‌شده در styles.md.