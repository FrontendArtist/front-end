🎯 Purpose

ایجاد صفحه‌ی کامل Services Page در مسیر /services برای نمایش فهرست همه‌ی خدمات سایت.
این صفحه شامل هدر (Hero)، توضیح کوتاه، و گرید کارت‌های خدمات است.
داده‌ها از Strapi واکشی شده و SSR برای بهینه‌سازی سئو استفاده می‌شود.

📂 File Structure
/src/modules/services/page.jsx
/src/modules/services/ServicePage.module.scss

⚙️ Component Type

server
(صفحه فقط نمایش داده دارد و نیاز به تعامل کاربری مستقیم ندارد. داده‌ها باید در سطح سرور واکشی شوند.)

🌐 Data Source

Endpoint: /api/services

Fields used: id, slug, image, title, description, link

داده‌ها با استفاده از fetch(${process.env.NEXT_PUBLIC_STRAPI_API_URL}/api/services) دریافت می‌شوند.

🧩 Dependencies

ServiceGrid → برای نمایش لیست خدمات

Breadcrumbs → برای ناوبری بالا

Loader → برای نمایش وضعیت در حال بارگذاری

EmptyState → برای زمانی که هیچ داده‌ای وجود ندارد

🧠 State Logic

ندارد (Server Component)
اما باید:

هنگام واکشی داده، خطا یا پاسخ خالی را مدیریت کند.

در صورت خالی بودن لیست خدمات، EmptyState را با پیام:
"هیچ خدمتی در حال حاضر فعال نیست." نمایش دهد.

🎨 Design Notes

Layout کلی:

<section className="services-page">
  <Breadcrumbs />
  <header className="services-page__hero">
    <h1 className="services-page__title">خدمات ما</h1>
    <p className="services-page__subtitle">
      در این بخش می‌توانید با خدمات ما آشنا شوید و بر اساس نیاز خود انتخاب کنید.
    </p>
  </header>
  <ServiceGrid />
</section>


رنگ‌ها و spacing مطابق با styles.md:

رنگ عنوان: --color-text-primary

رنگ زیرعنوان: --color-card-text

فاصله بالا: --space-section-top-desktop

فاصله پایین: --space-section-bottom-desktop

در حالت موبایل، عنوان وسط‌چین و spacing کمتر شود (با @include respond(md)).