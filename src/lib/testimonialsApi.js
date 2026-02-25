/**
 * Testimonials API - لایه API اختصاصی برای نظرات
 * 
 * نقش:
 * این ماژول یک رابط تمیز و معنادار برای تمام عملیات مرتبط با نظرات (Testimonials) فراهم می‌کند.
 * این لایه بین UI و apiClient قرار دارد و منطق کسب‌وکار مربوط به نظرات را مدیریت می‌کند.
 * 
 * @module lib/testimonialsApi
 */

import { apiClient } from './apiClient';
import { formatStrapiTestimonials } from './strapiUtils';

/**
 * واکشی تمام نظرات از Strapi
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
 * @returns {Promise<Array>} آرایه‌ای از اشیاء نظر فرمت شده
 * 
 * @example
 * // در یک Server Component (page.js):
 * const testimonials = await getAllTestimonials();
 * return <TestimonialsSection testimonials={testimonials} />;
 * 
 * // ساختار هر شیء نظر:
 * {
 *   id: number,
 *   name: string,
 *   title: string | null,
 *   comment: string,
 *   createdAt: string
 * }
 */
export async function getAllTestimonials() {
  try {
    // واکشی نظرات با مرتب‌سازی بر اساس تاریخ ایجاد
    // Strapi از پارامتر "sort" برای مرتب‌سازی استفاده می‌کند
    const response = await apiClient('/api/testimontials?sort=createdAt:desc');

    // فرمت کردن پاسخ خام Strapi به داده‌های تمیز و قابل استفاده
    // strapiUtils مدیریت نگاشت فیلدها و بررسی null را انجام می‌دهد
    const formattedTestimonials = formatStrapiTestimonials(response);

    return formattedTestimonials;

  } catch (error) {
    if (error.message !== 'BACKEND_UNAVAILABLE' && process.env.NODE_ENV === 'development') {
      console.error('خطا در واکشی نظرات:', error.message);
    }
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
 */

