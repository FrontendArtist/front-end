/**
 * Services API - لایه API اختصاصی برای خدمات
 * 
 * نقش:
 * این ماژول یک رابط تمیز و معنادار برای تمام عملیات مرتبط با خدمات (Services) فراهم می‌کند.
 * این لایه بین UI و apiClient قرار دارد و منطق کسب‌وکار مربوط به خدمات را مدیریت می‌کند.
 * 
 * نقش در معماری:
 * - جزئیات endpoint های Strapi را از کامپوننت‌ها مخفی می‌کند
 * - بازیابی خطا و fallback های مخصوص خدمات را مدیریت می‌کند
 * - قرارداد API پایدار برای لایه UI فراهم می‌کند
 * - تست و Mock کردن را آسان‌تر می‌کند
 * 
 * الگوی طراحی (Repository Pattern):
 * - کامپوننت‌ها از جزئیات Strapi یا HTTP بی‌اطلاع هستند
 * - تغییرات API را می‌توان بدون دست زدن به کامپوننت‌ها انجام داد
 * - مدیریت خطا متمرکز و یکپارچه است
 * 
 * @module lib/servicesApi
 */

import { apiClient } from './apiClient';
import { formatStrapiServices } from './strapiUtils';

/**
 * واکشی تمام خدمات از Strapi
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
 * @returns {Promise<Array>} آرایه‌ای از اشیاء خدمت فرمت شده
 * 
 * @example
 * // در یک Server Component (page.js):
 * const services = await getAllServices();
 * return <ServiceGrid services={services} />;
 * 
 * // ساختار هر شیء خدمت:
 * {
 *   id: number,
 *   slug: string,
 *   title: string,
 *   description: string,
 *   image: { url: string, alt: string },
 *   link: string | null
 * }
 */
export async function getAllServices() {
  try {
    // واکشی خدمات با رابطه تصویر populate شده
    // Strapi به پارامتر "populate" نیاز دارد تا داده‌های مرتبط را شامل شود
    const response = await apiClient('/api/services?populate=image&sort=createdAt:desc');

    // فرمت کردن پاسخ خام Strapi به داده‌های تمیز و قابل استفاده
    // strapiUtils مدیریت URL های تصاویر، نگاشت فیلدها و بررسی null را انجام می‌دهد
    const formattedServices = formatStrapiServices(response);

    return formattedServices;

  } catch (error) {
    if (error.message !== 'BACKEND_UNAVAILABLE' && process.env.NODE_ENV === 'development') {
      console.error('خطا در واکشی خدمات:', error.message);
    }
    return [];
  }
}

/**
 * واکشی یک خدمت خاص با استفاده از slug
 * 
 * پیاده‌سازی آینده:
 * این تابع توسط صفحه جزئیات خدمت (/services/[slug]) استفاده خواهد شد
 * 
 * @param {string} slug - slug خدمت از پارامتر URL
 * @returns {Promise<object|null>} شیء خدمت یا null در صورت عدم یافتن
 * 
 * @example
 * // در یک صفحه مسیر پویا:
 * const service = await getServiceBySlug(params.slug);
 * if (!service) notFound();
 */
export async function getServiceBySlug(slug) {
  try {
    // کوئری Strapi با فیلتر slug
    // از سینتکس Strapi v4/v5 برای فیلتر دقیق استفاده می‌کند
    const response = await apiClient(
      `/api/services?filters[slug][$eq]=${slug}&populate=image`
    );

    // فرمت کردن و برگرداندن اولین نتیجه
    // اگر نتیجه‌ای یافت نشد، null برمی‌گرداند
    const formattedServices = formatStrapiServices(response);
    return formattedServices[0] || null;

  } catch (error) {
    if (error.message !== 'BACKEND_UNAVAILABLE' && process.env.NODE_ENV === 'development') {
      console.error(`خطا در واکشی خدمت با slug "${slug}":`, error.message);
    }
    return null;
  }
}

/**
 * واکشی خدمات با محدودیت تعداد (برای صفحه اصلی)
 * 
 * این تابع برای نمایش تعدادی خدمت در صفحه اصلی طراحی شده است
 * و به‌صورت SSR در کامپوننت‌های سرور استفاده می‌شود
 * 
 * @param {object} options - آپشن‌های کوئری
 * @param {number} options.limit - تعداد خدمات (پیش‌فرض: 3)
 * @param {string} options.sort - پارامتر مرتب‌سازی Strapi (پیش‌فرض: "createdAt:desc")
 * @returns {Promise<Array>} آرایه‌ای از خدمات فرمت شده
 * 
 * @example
 * // در Server Component:
 * const services = await getServices({ limit: 3 });
 */
export async function getServices({ limit = 3, sort = 'createdAt:desc' } = {}) {
  try {
    const response = await apiClient(
      `/api/services?populate=image&pagination[limit]=${limit}&sort=${sort}`
    );

    const formattedServices = formatStrapiServices(response);
    return formattedServices;

  } catch (error) {
    if (error.message !== 'BACKEND_UNAVAILABLE' && process.env.NODE_ENV === 'development') {
      console.error('خطا در واکشی خدمات:', error.message);
    }
    return [];
  }
}

/**
 * واکشی خدمات با قابلیت صفحه‌بندی و مرتب‌سازی
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
 * @returns {Promise<{data: Array, meta: object}>} خدمات فرمت شده با metadata صفحه‌بندی
 * 
 * @example
 * // در Route Handler (/app/api/services/route.js):
 * const result = await getServicesPaginated(2, 6, "createdAt:desc");
 * return Response.json(result);
 */
export async function getServicesPaginated(page = 1, pageSize = 6, sort = 'createdAt:desc') {
  try {
    // ساخت query string با pagination و sort
    // Strapi انتظار دارد: pagination[page]=X&pagination[pageSize]=Y&sort=field:order
    const response = await apiClient(
      `/api/services?populate=image&pagination[page]=${page}&pagination[pageSize]=${pageSize}&sort=${sort}`
    );

    // فرمت کردن داده‌های خدمات
    const formattedServices = formatStrapiServices(response);

    // برگرداندن داده‌ها به همراه metadata صفحه‌بندی
    // metadata شامل: page, pageSize, pageCount, total
    return {
      data: formattedServices,
      meta: response.meta || {}
    };

  } catch (error) {
    if (error.message !== 'BACKEND_UNAVAILABLE' && process.env.NODE_ENV === 'development') {
      console.error('خطا در واکشی خدمات صفحه‌بندی‌شده:', error.message);
    }
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
 * const res = await fetch('http://localhost:1337/api/services');
 * 
 * // ❌ اشتباه - از apiClient مستقیماً در کامپوننت‌ها استفاده نکنید:
 * const data = await apiClient('/api/services');
 * 
 * // ✅ درست - از API دامنه‌ای استفاده کنید:
 * import { getAllServices } from '@/lib/servicesApi';
 * const services = await getAllServices();
 */

