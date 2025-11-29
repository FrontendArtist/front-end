/**
 * Articles API Route Handler
 * 
 * نقش:
 * این Route Handler داخلی Next.js نقش واسط بین Client Components و API دامنه‌ای را ایفا می‌کند
 * 
 * جریان داده (Data Flow):
 * Client Component (ArticleGrid.jsx) 
 *   ↓ fetch('/api/articles?page=2&sort=publishedAt:asc')
 * Next.js Route Handler (این فایل)
 *   ↓ getArticlesPaginated(page, pageSize, sort)
 * Domain API Module (articlesApi.js)
 *   ↓ apiClient()
 * Strapi Backend
 * 
 * مزایای این معماری:
 * - جداسازی کامل Client از Strapi API
 * - امکان افزودن Authentication، Rate Limiting یا Caching در آینده
 * - امنیت بیشتر (API keys در سرور باقی می‌مانند)
 * - تست‌پذیری بالاتر
 * 
 * @module app/api/articles/route
 */

import { getArticlesPaginated } from '@/lib/articlesApi';
import { ARTICLES_PAGE_SIZE } from '@/lib/constants';

/**
 * GET Handler - دریافت لیست مقالات با صفحه‌بندی
 * 
 * Query Parameters پشتیبانی شده:
 * - page: شماره صفحه (پیش‌فرض: 1)
 * - pageSize: تعداد آیتم در هر صفحه (پیش‌فرض: از ARTICLES_PAGE_SIZE)
 * - sort: پارامتر مرتب‌سازی Strapi (پیش‌فرض: "publishedAt:desc")
 *        مقادیر معتبر: "publishedAt:desc", "publishedAt:asc"
 * - categorySlug: فیلتر دسته‌بندی مقالات (اختیاری)
 * 
 * @param {Request} request - شیء Request از Next.js
 * @returns {Response} JSON response حاوی {data: Array, meta: object}
 * 
 * @example
 * // از Client Component:
 * const response = await fetch('/api/articles?page=2&pageSize=6&sort=publishedAt:asc&categorySlug=tech');
 * const result = await response.json();
 * // result = { data: [...], meta: { pagination: {...} } }
 */
export async function GET(request) {
  try {
    // استخراج query parameters از URL
    const { searchParams } = new URL(request.url);
    
    // دریافت پارامترها با مقادیر پیش‌فرض از constants
    const page = parseInt(searchParams.get('page') || '1', 10);
    const pageSize = parseInt(searchParams.get('pageSize') || String(ARTICLES_PAGE_SIZE), 10);
    const sort = searchParams.get('sort') || 'publishedAt:desc';
    const categorySlug = searchParams.get('categorySlug') || null;
    
    // فراخوانی تابع دامنه‌ای برای واکشی مقالات
    // این تابع از apiClient استفاده می‌کند و داده‌ها را فرمت می‌کند
    const result = await getArticlesPaginated(page, pageSize, sort, categorySlug);
    
    // برگرداندن پاسخ JSON
    // Next.js 13+ از Response.json() برای ساخت پاسخ استفاده می‌کند
    return Response.json(result);
    
  } catch (error) {
    // مدیریت خطا و برگرداندن پاسخ 500
    console.error('خطا در Route Handler مقالات:', error.message);
    
    return Response.json(
      { 
        error: 'خطا در دریافت مقالات', 
        message: error.message 
      },
      { status: 500 }
    );
  }
}

