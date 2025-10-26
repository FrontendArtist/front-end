/**
 * Articles API - لایه API اختصاصی برای مقالات
 * 
 * نقش:
 * این ماژول یک رابط تمیز و معنادار برای تمام عملیات مرتبط با مقالات (Articles) فراهم می‌کند.
 * این لایه بین UI و apiClient قرار دارد و منطق کسب‌وکار مربوط به مقالات را مدیریت می‌کند.
 * 
 * نقش در معماری:
 * - جزئیات endpoint های Strapi را از کامپوننت‌ها مخفی می‌کند
 * - بازیابی خطا و fallback های مخصوص مقالات را مدیریت می‌کند
 * - قرارداد API پایدار برای لایه UI فراهم می‌کند
 * - تست و Mock کردن را آسان‌تر می‌کند
 * 
 * الگوی طراحی (Repository Pattern):
 * - کامپوننت‌ها از جزئیات Strapi یا HTTP بی‌اطلاع هستند
 * - تغییرات API را می‌توان بدون دست زدن به کامپوننت‌ها انجام داد
 * - مدیریت خطا متمرکز و یکپارچه است
 * 
 * @module lib/articlesApi
 */

import { apiClient } from './apiClient';
import { formatStrapiArticles } from './strapiUtils';

/**
 * واکشی تمام مقالات از Strapi
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
 * @returns {Promise<Array>} آرایه‌ای از اشیاء مقاله فرمت شده
 * 
 * @example
 * // در یک Server Component (page.js):
 * const articles = await getAllArticles();
 * return <ArticleGrid articles={articles} />;
 * 
 * // ساختار هر شیء مقاله:
 * {
 *   id: number,
 *   slug: string,
 *   title: string,
 *   excerpt: string,
 *   date: string,
 *   cover: { url: string, alt: string }
 * }
 */
export async function getAllArticles() {
  try {
    // واکشی مقالات با تمام رابطه‌ها populate شده
    // Strapi به پارامتر "populate" نیاز دارد تا داده‌های مرتبط را شامل شود
    const response = await apiClient('/api/articles?populate=*&sort=publishedAt:desc');
    
    // فرمت کردن پاسخ خام Strapi به داده‌های تمیز و قابل استفاده
    // strapiUtils مدیریت URL های تصاویر، نگاشت فیلدها و بررسی null را انجام می‌دهد
    const formattedArticles = formatStrapiArticles(response);
    
    return formattedArticles;
    
  } catch (error) {
    // ثبت خطا برای دیباگ در لاگ‌های سرور
    console.error('خطا در واکشی مقالات:', error.message);
    
    // برگرداندن آرایه خالی به‌جای پرتاب خطا
    // این به صفحه اجازه می‌دهد با EmptyState رندر شود
    // تجربه کاربری بهتر از نمایش صفحه خطای 500
    return [];
  }
}

/**
 * واکشی یک مقاله خاص با استفاده از slug
 * 
 * استفاده:
 * این تابع توسط صفحه جزئیات مقاله (/articles/[slug]) استفاده می‌شود
 * 
 * @param {string} slug - slug مقاله از پارامتر URL
 * @returns {Promise<object|null>} شیء مقاله یا null در صورت عدم یافتن
 * 
 * @example
 * // در یک صفحه مسیر پویا:
 * const article = await getArticleBySlug(params.slug);
 * if (!article) notFound();
 */
export async function getArticleBySlug(slug) {
  try {
    // کوئری Strapi با فیلتر slug
    // از سینتکس Strapi v4/v5 برای فیلتر دقیق استفاده می‌کند
    const response = await apiClient(
      `/api/articles?filters[slug][$eq]=${slug}&populate=*`
    );
    
    // فرمت کردن و برگرداندن اولین نتیجه
    // اگر نتیجه‌ای یافت نشد، null برمی‌گرداند
    const formattedArticles = formatStrapiArticles(response);
    return formattedArticles[0] || null;
    
  } catch (error) {
    console.error(`خطا در واکشی مقاله با slug "${slug}":`, error.message);
    return null;
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
 * const res = await fetch('http://localhost:1337/api/articles');
 * 
 * // ❌ اشتباه - از apiClient مستقیماً در کامپوننت‌ها استفاده نکنید:
 * const data = await apiClient('/api/articles');
 * 
 * // ✅ درست - از API دامنه‌ای استفاده کنید:
 * import { getAllArticles } from '@/lib/articlesApi';
 * const articles = await getAllArticles();
 */

