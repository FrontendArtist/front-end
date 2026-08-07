/**
 * تنظیمات مرکزی Pagination و ثابت‌های پروژه
 * 
 * این فایل تضمین می‌کند که تمام بخش‌های مختلف از یک مقدار یکسان استفاده کنند
 * برای تغییر تعداد آیتم‌های هر صفحه، فقط کافیست این فایل را ویرایش کنید
 */

// ========================================
// Site Metadata Settings
// ========================================

export const SITE_NAME = 'طرح الهی';
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://tarhelahi.ir';

// ========================================
// Pagination Settings
// ========================================

/**
 * تعداد مقالات در هر صفحه
 * استفاده می‌شود در:
 * - ArticleGrid.jsx (Client Component)
 * - app/articles/page.js (Server Component)
 * - app/api/articles/route.js (API Route Handler)
 */
export const ARTICLES_PAGE_SIZE = 2;

/**
 * تعداد محصولات در هر صفحه
 */
export const PRODUCTS_PAGE_SIZE = 8;

/**
 * تعداد دوره‌ها در هر صفحه
 */
export const COURSES_PAGE_SIZE = 6;

/**
 * تعداد خدمات در هر صفحه
 */
export const SERVICES_PAGE_SIZE = 3;

