# CONTEXT_HomeAggregationAPI.md

## 🎯 Purpose
ساخت یک API واحد برای صفحه اصلی (`/api/home`)  
که داده‌های HomePage (Categories, FAQ, Testimonials, Products, Articles, Services, Courses) را  
به‌صورت هم‌زمان از Strapi فچ کند و به‌صورت JSON واحد برگرداند.

هدف: کاهش تعداد درخواست‌های مستقیم از Next.js به Strapi  
و بهبود سرعت SSR صفحه اصلی.

---

### 📂 File Structure
- /src/app/api/home/route.js ⬅️ (جدید)
- /src/lib/categoriesApi.js  
- /src/lib/faqApi.js  
- /src/lib/testimonialsApi.js  
- /src/lib/productsApi.js  
- /src/lib/articlesApi.js  
- /src/lib/servicesApi.js  
- /src/lib/coursesApi.js  
- /src/app/page.js ⬅️ (به‌روزرسانی شود تا فقط از /api/home فچ کند)

---

### ⚙️ Implementation Plan

#### 🧱 Step 1 — ساخت route `/api/home/route.js`
```js
// src/app/api/home/route.js
import {
  getAllCategories,
  getAllFaqs,
  getAllTestimonials,
  getProducts,
  getArticles,
  getServices,
  getCourses,
} from '@/lib';

export async function GET() {
  try {
    const [categories, faqs, testimonials, products, articles, services, courses] = await Promise.all([
      getAllCategories(),
      getAllFaqs(),
      getAllTestimonials(),
      getProducts({ limit: 20 }),
      getArticles({ limit: 20 }),
      getServices({ limit: 20 }),
      getCourses({ limit: 20 }),
    ]);

    return Response.json({
      categories,
      faqs,
      testimonials,
      products,
      articles,
      services,
      courses,
    });
  } catch (error) {
    console.error('Error fetching homepage data:', error);
    return Response.json({ error: 'Failed to fetch home data' }, { status: 500 });
  }
}
🧱 Step 2 — اصلاح app/page.js
جایگزین فچ‌های متعدد با یک fetch ساده از API جدید:

js
Copy code
// src/app/page.js
export const revalidate = 300; // ISR – هر ۵ دقیقه به‌روزرسانی

export default async function HomePage() {
  const res = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL}/api/home`, {
    next: { revalidate: 300 },
  });

  if (!res.ok) throw new Error('Failed to fetch home data');
  const { categories, faqs, testimonials, products, articles, services, courses } = await res.json();

  return (
    <>
      <HeroSection />
      <ProductCategoriesSection data={categories} />
      <ProductsSection data={products} />
      <ArticlesSection data={articles} />
      <ServicesSection data={services} />
      <CoursesSection data={courses} />
      <TestimonialsSection data={testimonials} />
      <FAQSection data={faqs} />
    </>
  );
}
🧩 Benefits
✅ فقط ۱ درخواست از Next.js به Strapi زده می‌شود (نه ۷ تا).
✅ SSR سریع‌تر و سبک‌تر.
✅ ساختار صفحه تمیزتر و ساده‌تر.
✅ آمادگی کامل برای استقرار Production.
✅ قابلیت مدیریت مستقل Home API برای caching و logging.

⚠️ Notes
از Response.json() استفاده شود تا با Next.js App Router سازگار بماند.

خطاها باید با وضعیت 500 بازگردانده شوند.

در صورت نیاز، هر فچ درون Route می‌تواند limit مجزا بگیرد.

در آینده می‌توان getAllFaqs و getAllTestimonials را با revalidate بالاتر (مثلاً 3600s) جداگانه کش کرد.