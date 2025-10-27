/**
 * Products API - لایه API اختصاصی برای محصولات
 * 
 * نقش:
 * این ماژول یک رابط تمیز و معنادار برای تمام عملیات مرتبط با محصولات (Products) فراهم می‌کند.
 * این لایه بین UI و apiClient قرار دارد و منطق کسب‌وکار مربوط به محصولات را مدیریت می‌کند.
 * 
 * نقش در معماری:
 * - جزئیات endpoint های Strapi را از کامپوننت‌ها مخفی می‌کند
 * - بازیابی خطا و fallback های مخصوص محصولات را مدیریت می‌کند
 * - قرارداد API پایدار برای لایه UI فراهم می‌کند
 * - تست و Mock کردن را آسان‌تر می‌کند
 * 
 * الگوی طراحی (Repository Pattern):
 * - کامپوننت‌ها از جزئیات Strapi یا HTTP بی‌اطلاع هستند
 * - تغییرات API را می‌توان بدون دست زدن به کامپوننت‌ها انجام داد
 * - مدیریت خطا متمرکز و یکپارچه است
 * 
 * @module lib/productsApi
 */

import { apiClient } from './apiClient';
import { formatStrapiProducts } from './strapiUtils';

/**
 * واکشی تمام محصولات از Strapi
 * 
 * جریان داده در SSR:
 * 1. کامپوننت صفحه Next.js این تابع را در هنگام رندر سمت سرور صدا می‌زند
 * 2. این تابع از apiClient برای واکشی از Strapi استفاده می‌کند
 * 3. پاسخ خام Strapi با استفاده از strapiUtils فرمت می‌شود
 * 4. داده‌های تمیز و فرمت شده به صفحه برگردانده می‌شوند
 * 5. صفحه با داده رندر می‌شود و HTML به مرورگر ارسال می‌شود
 * 
 * استراتژی مدیریت خطا:
 * - در صورت خطا آرایه خالی برمی‌گرداند (Graceful Degradation)
 * - خطا را برای دیباگ لاگ می‌کند
 * - به صفحه اجازه می‌دهد با EmptyState رندر شود به‌جای کرش
 * 
 * استراتژی کش:
 * - از cache: 'no-store' در Next.js برای داده‌های همیشه تازه استفاده می‌کند
 * - می‌تواند برای استفاده از revalidation تغییر کند (مثلاً { next: { revalidate: 3600 } })
 * - در صورتی که داده‌ها کم تغییر می‌کنند، کش کردن را در نظر بگیرید
 * 
 * @returns {Promise<Array>} آرایه‌ای از اشیاء محصول فرمت شده
 * 
 * @example
 * // در یک Server Component (page.js):
 * const products = await getAllProducts();
 * return <ProductGrid products={products} />;
 * 
 * // ساختار هر شیء محصول:
 * {
 *   id: number,
 *   slug: string,
 *   title: string,
 *   price: { toman: number },
 *   shortDescription: string,
 *   images: Array<{ url: string, alt: string }>,
 *   image: { url: string, alt: string }
 * }
 */
export async function getAllProducts() {
  try {
    // واکشی محصولات با تمام رابطه‌ها populate شده
    // Strapi به پارامتر "populate" نیاز دارد تا داده‌های مرتبط را شامل شود
    const response = await apiClient('/api/products?populate=*');
    
    // فرمت کردن پاسخ خام Strapi به داده‌های تمیز و قابل استفاده
    // strapiUtils مدیریت URL های تصاویر، نگاشت فیلدها و بررسی null را انجام می‌دهد
    const formattedProducts = formatStrapiProducts(response);
    
    return formattedProducts;
    
  } catch (error) {
    // ثبت خطا برای دیباگ در لاگ‌های سرور
    console.error('خطا در واکشی محصولات:', error.message);
    
    // برگرداندن آرایه خالی به‌جای پرتاب خطا
    // این به صفحه اجازه می‌دهد با EmptyState رندر شود
    // تجربه کاربری بهتر از نمایش صفحه خطای 500
    return [];
  }
}

/**
 * واکشی یک محصول خاص با استفاده از slug
 * 
 * استفاده:
 * این تابع توسط صفحه جزئیات محصول (/products/[slug]) استفاده می‌شود
 * 
 * @param {string} slug - slug محصول از پارامتر URL
 * @returns {Promise<object|null>} شیء محصول یا null در صورت عدم یافتن
 * 
 * @example
 * // در یک صفحه مسیر پویا:
 * const product = await getProductBySlug(params.slug);
 * if (!product) notFound();
 */
export async function getProductBySlug(slug) {
  try {
    // کوئری Strapi با فیلتر slug
    // از سینتکس Strapi v4/v5 برای فیلتر دقیق استفاده می‌کند
    const response = await apiClient(
      `/api/products?filters[slug][$eq]=${slug}&populate=*`
    );
    
    // فرمت کردن و برگرداندن اولین نتیجه
    // اگر نتیجه‌ای یافت نشد، null برمی‌گرداند
    const formattedProducts = formatStrapiProducts(response);
    return formattedProducts[0] || null;
    
  } catch (error) {
    console.error(`خطا در واکشی محصول با slug "${slug}":`, error.message);
    return null;
  }
}

/**
 * واکشی محصولات با محدودیت تعداد (برای صفحه اصلی)
 * 
 * این تابع برای نمایش تعدادی محصول در صفحه اصلی طراحی شده است
 * و به‌صورت SSR در کامپوننت‌های سرور استفاده می‌شود
 * 
 * @param {object} options - آپشن‌های کوئری
 * @param {number} options.limit - تعداد محصولات (پیش‌فرض: 4)
 * @param {string} options.sort - پارامتر مرتب‌سازی Strapi (پیش‌فرض: "createdAt:desc")
 * @returns {Promise<Array>} آرایه‌ای از محصولات فرمت شده
 * 
 * @example
 * // در Server Component:
 * const products = await getProducts({ limit: 4 });
 */
export async function getProducts({ limit = 4, sort = 'createdAt:desc' } = {}) {
  try {
    const response = await apiClient(
      `/api/products?populate=*&pagination[limit]=${limit}&sort=${sort}`
    );
    
    const formattedProducts = formatStrapiProducts(response);
    return formattedProducts;
    
  } catch (error) {
    console.error('خطا در واکشی محصولات:', error.message);
    return [];
  }
}

/**
 * واکشی محصولات با قابلیت صفحه‌بندی و مرتب‌سازی
 * 
 * این تابع برای Route Handler داخلی Next.js طراحی شده است
 * و قابلیت pagination و sorting را پشتیبانی می‌کند
 * 
 * جریان داده:
 * Client Component → Next.js Route Handler → این تابع → apiClient → Strapi
 * 
 * @param {number} page - شماره صفحه (پیش‌فرض: 1)
 * @param {number} pageSize - تعداد آیتم در هر صفحه (پیش‌فرض: 6)
 * @param {string} sort - پارامتر مرتب‌سازی Strapi (پیش‌فرض: "createdAt:desc")
 * @returns {Promise<{data: Array, meta: object}>} محصولات فرمت شده با metadata صفحه‌بندی
 * 
 * @example
 * // در Route Handler (/app/api/products/route.js):
 * const result = await getProductsPaginated(2, 6, "price:asc");
 * return Response.json(result);
 */
export async function getProductsPaginated(page = 1, pageSize = 6, sort = 'createdAt:desc') {
  try {
    // ساخت query string با pagination و sort
    // Strapi انتظار دارد: pagination[page]=X&pagination[pageSize]=Y&sort=field:order
    const response = await apiClient(
      `/api/products?populate=*&pagination[page]=${page}&pagination[pageSize]=${pageSize}&sort=${sort}`
    );
    
    // فرمت کردن داده‌های محصولات
    const formattedProducts = formatStrapiProducts(response);
    
    // برگرداندن داده‌ها به همراه metadata صفحه‌بندی
    // metadata شامل: page, pageSize, pageCount, total
    return {
      data: formattedProducts,
      meta: response.meta || {}
    };
    
  } catch (error) {
    console.error('خطا در واکشی محصولات صفحه‌بندی‌شده:', error.message);
    // برگرداندن ساختار خالی اما معتبر
    return {
      data: [],
      meta: { pagination: { page: 1, pageSize, pageCount: 0, total: 0 } }
    };
  }
}

/**
 * مزایای معماری این الگو:
 * 
 * 1. جداسازی نگرانی‌ها (Separation of Concerns)
 *    - کامپوننت‌ها بر روی UI تمرکز دارند
 *    - این لایه واکشی داده را مدیریت می‌کند
 *    - apiClient جزئیات HTTP را مدیریت می‌کند
 * 
 * 2. قابلیت تست (Testability)
 *    - می‌توان این ماژول را در تست‌های کامپوننت Mock کرد
 *    - می‌توان این ماژول را به‌صورت مستقل تست کرد
 *    - وابستگی‌های Strapi را ایزوله می‌کند
 * 
 * 3. قابلیت نگهداری (Maintainability)
 *    - یک مکان واحد برای به‌روزرسانی کوئری‌های Strapi
 *    - افزودن کش، محدودیت نرخ و... آسان است
 *    - مستندسازی واضح قراردادهای داده
 * 
 * 4. انعطاف‌پذیری (Flexibility)
 *    - می‌توان بدون دست زدن به کامپوننت‌ها، بک‌اند را تغییر داد
 *    - می‌توان به‌راحتی GraphQL، REST API یا داده Mock اضافه کرد
 *    - می‌توان به‌روزرسانی‌های خوش‌بینانه یا پشتیبانی آفلاین پیاده‌سازی کرد
 * 
 * مثال استفاده در کامپوننت‌ها:
 * 
 * // ❌ اشتباه - از fetch مستقیماً در کامپوننت‌ها استفاده نکنید:
 * const res = await fetch('http://localhost:1337/api/products');
 * 
 * // ❌ اشتباه - از apiClient مستقیماً در کامپوننت‌ها استفاده نکنید:
 * const data = await apiClient('/api/products');
 * 
 * // ✅ درست - از API دامنه‌ای استفاده کنید:
 * import { getAllProducts } from '@/lib/productsApi';
 * const products = await getAllProducts();
 */

