/**
 * Categories API - لایه API اختصاصی برای دسته‌بندی‌ها
 *
 * نقش:
 * این ماژول یک رابط تمیز و معنادار برای تمام عملیات مرتبط با دسته‌بندی‌ها (Categories) فراهم می‌کند.
 * این لایه بین UI و apiClient قرار دارد و منطق کسب‌وکار مربوط به دسته‌بندی‌ها را مدیریت می‌کند.
 *
 * نقش در معماری:
 * - جزئیات endpoint های Strapi را از کامپوننت‌ها مخفی می‌کند
 * - بازیابی خطا و fallback های مخصوص دسته‌بندی‌ها را مدیریت می‌کند
 * - قرارداد API پایدار برای لایه UI فراهم می‌کند
 * - تست و Mock کردن را آسان‌تر می‌کند
 *
 * الگوی طراحی (Repository Pattern):
 * - کامپوننت‌ها از جزئیات Strapi یا HTTP بی‌اطلاع هستند
 * - تغییرات API را می‌توان بدون دست زدن به کامپوننت‌ها انجام داد
 * - مدیریت خطا متمرکز و یکپارچه است
 *
 * @module lib/categoriesApi
 */

import { apiClient } from './apiClient';
import { formatStrapiCategories } from './strapiUtils';

/**
 * واکشی تمام دسته‌بندی‌ها از Strapi
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
 * @returns {Promise<Array>} آرایه‌ای از اشیاء دسته‌بندی فرمت شده
 *
 * @example
 * // در یک Server Component (page.js):
 * const categories = await getAllCategories();
 * return <ProductCategoriesSection data={categories} />;
 *
 * // ساختار هر شیء دسته‌بندی:
 * {
 *   id: number,
 *   slug: string,
 *   name: string,
 *   icon: { url: string, alt: string }
 * }
 */
export async function getAllCategories() {
  try {
    // واکشی دسته‌بندی‌ها با تمام رابطه‌ها populate شده
    // Strapi به پارامتر "populate" نیاز دارد تا داده‌های مرتبط را شامل شود
    const response = await apiClient('/api/categories?populate=*');

    // فرمت کردن پاسخ خام Strapi به داده‌های تمیز و قابل استفاده
    // strapiUtils مدیریت URL های تصاویر، نگاشت فیلدها و بررسی null را انجام می‌دهد
    const formattedCategories = formatStrapiCategories(response);

    return formattedCategories;

  } catch (error) {
    // ثبت خطا برای دیباگ در لاگ‌های سرور
    console.error('خطا در واکشی دسته‌بندی‌ها:', error.message);

    // برگرداندن آرایه خالی به‌جای پرتاب خطا
    // این به صفحه اجازه می‌دهد با EmptyState رندر شود
    // تجربه کاربری بهتر از نمایش صفحه خطای 500
    return [];
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
 * const res = await fetch('http://localhost:1337/api/categories');
 *
 * // ❌ اشتباه - از apiClient مستقیماً در کامپوننت‌ها استفاده نکنید:
 * const data = await apiClient('/api/categories');
 *
 * // ✅ درست - از API دامنه‌ای استفاده کنید:
 * import { getAllCategories } from '@/lib/categoriesApi';
 * const categories = await getAllCategories();
 */
