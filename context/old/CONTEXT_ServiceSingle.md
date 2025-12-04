🎯 Purpose

ساخت صفحه تکی خدمات برای نمایش جزئیات هر خدمت، شامل تصویر، عنوان، توضیح کامل و دکمه‌ی اقدام (CTA).
این صفحه با داده‌های Strapi (/api/services/:slug) رندر شده و از معماری SSR (Server-Side Rendering) استفاده می‌کند.

📂 File Structure
/src/modules/services/ServiceSingle.jsx
/src/modules/services/ServiceSingle.module.scss

⚙️ Component Type

server
(صفحه باید در سطح سرور داده را بر اساس slug واکشی کرده و SSR انجام دهد تا SEO بهینه باشد.)

🌐 Data Source

Endpoint: /api/services/[slug]

Fields used: id, slug, image, title, description, link

🧩 Dependencies

next/image برای تصویر

next/link برای CTA (مثلاً “درخواست خدمت”)

Breadcrumbs از /src/components/layout/Breadcrumbs.jsx

Loader برای حالت در حال بارگذاری (اختیاری)

EmptyState برای زمانی که slug نامعتبر است یا داده‌ای وجود ندارد

🧠 State Logic

ندارد (Server Component)
اما نیاز به مدیریت وضعیت خالی یا خطای fetch دارد:

if (!service?.data) return <EmptyState title="خدمت مورد نظر یافت نشد." />;

🎨 Design Notes

ساختار صفحه:

<section class="service-single">
  <Breadcrumbs />
  <div class="service-single__wrapper">
    <div class="service-single__image"></div>
    <div class="service-single__content">
      <h1 class="service-single__title"></h1>
      <p class="service-single__description"></p>
      <Link class="service-single__cta">درخواست خدمت</Link>
    </div>
  </div>
</section>


طراحی باید از فلسفه‌ی styles.md پیروی کند:

فاصله عمودی: --space-section-top-desktop

عنوان: font-xl, font-weight-bold

توضیح: font-md, line-height-md

رنگ متن: --color-card-text

Hover روی CTA با --color-title-hover

تصویر در سمت راست دسکتاپ، بالای متن در موبایل.
(از mixin respond(md) استفاده شود.)