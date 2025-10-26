🎯 Purpose

ایجاد صفحه تکی /services/[slug] برای نمایش جزئیات کامل یک خدمت.
صفحه باید با SSR داده را از Strapi دریافت کند، با استفاده از تابع getServiceBySlug(slug) از servicesApi.js.
بدون هیچ fetch مستقیم در صفحه.

📂 File Structure
/src/modules/services/[slug]/page.jsx
/src/modules/services/ServiceSinglePage.module.scss

⚙️ Component Type

server
(چون SEO حساس است و داده از Strapi بر اساس slug در سرور واکشی می‌شود.)

🌐 Data Source

Function: getServiceBySlug(slug) از /src/lib/servicesApi.js

Endpoint: /api/services/:slug?populate=*
    
Fields used: id, slug, title, description, image, link

🧩 Dependencies

Breadcrumbs برای مسیر ناوبری

EmptyState در صورت slug نامعتبر

next/image و next/link

SCSS از ServiceSinglePage.module.scss

🧠 State Logic

ندارد (Server Component)
اما نیازمند مدیریت حالت خالی و خطا است:

const service = await getServiceBySlug(params.slug);
if (!service) return <EmptyState title="خدمت مورد نظر یافت نشد." />;

🎨 Design Notes

ساختار صفحه:

<section className="service-single">
  <Breadcrumbs />
  <div className="service-single__wrapper">
    <div className="service-single__image">
      <Image src={...} alt={...} />
    </div>
    <div className="service-single__content">
      <h1 className="service-single__title">{title}</h1>
      <p className="service-single__description">{description}</p>
      <Link href={link} className="service-single__cta">درخواست خدمت</Link>
    </div>
  </div>
</section>


رنگ‌ها و فاصله‌ها مطابق styles.md

تصویر در سمت راست دسکتاپ، بالای محتوا در موبایل (@include respond(md))