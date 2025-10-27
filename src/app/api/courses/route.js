/**
 * Courses API Route Handler
 * 
 * نقش:
 * این Route Handler داخلی Next.js نقش واسط بین Client Components و API دامنه‌ای را ایفا می‌کند
 * 
 * جریان داده (Data Flow):
 * Client Component (CourseGrid.jsx) 
 *   ↓ fetch('/api/courses?page=2&sort=price:asc')
 * Next.js Route Handler (این فایل)
 *   ↓ getCoursesPaginated(page, pageSize, sort)
 * Domain API Module (coursesApi.js)
 *   ↓ apiClient()
 * Strapi Backend
 * 
 * مزایای این معماری:
 * - جداسازی کامل Client از Strapi API
 * - امکان افزودن Authentication، Rate Limiting یا Caching در آینده
 * - امنیت بیشتر (API keys در سرور باقی می‌مانند)
 * - تست‌پذیری بالاتر
 * 
 * @module app/api/courses/route
 */

import { getCoursesPaginated } from '@/lib/coursesApi';

/**
 * GET Handler - دریافت لیست دوره‌ها با صفحه‌بندی
 * 
 * Query Parameters پشتیبانی شده:
 * - page: شماره صفحه (پیش‌فرض: 1)
 * - pageSize: تعداد آیتم در هر صفحه (پیش‌فرض: 6)
 * - sort: پارامتر مرتب‌سازی Strapi (پیش‌فرض: "createdAt:desc")
 *        مقادیر معتبر: "createdAt:desc", "price:asc", "price:desc"
 * 
 * @param {Request} request - شیء Request از Next.js
 * @returns {Response} JSON response حاوی {data: Array, meta: object}
 * 
 * @example
 * // از Client Component:
 * const response = await fetch('/api/courses?page=2&pageSize=6&sort=price:asc');
 * const result = await response.json();
 * // result = { data: [...], meta: { pagination: {...} } }
 */
export async function GET(request) {
  try {
    // استخراج query parameters از URL
    const { searchParams } = new URL(request.url);
    
    // دریافت پارامترها با مقادیر پیش‌فرض
    const page = parseInt(searchParams.get('page') || '1', 10);
    const pageSize = parseInt(searchParams.get('pageSize') || '6', 10);
    const sort = searchParams.get('sort') || 'createdAt:desc';
    
    // فراخوانی تابع دامنه‌ای برای واکشی دوره‌ها
    // این تابع از apiClient استفاده می‌کند و داده‌ها را فرمت می‌کند
    const result = await getCoursesPaginated(page, pageSize, sort);
    
    // برگرداندن پاسخ JSON
    // Next.js 13+ از Response.json() برای ساخت پاسخ استفاده می‌کند
    return Response.json(result);
    
  } catch (error) {
    // مدیریت خطا و برگرداندن پاسخ 500
    console.error('خطا در Route Handler دوره‌ها:', error.message);
    
    return Response.json(
      { 
        error: 'خطا در دریافت دوره‌ها', 
        message: error.message 
      },
      { status: 500 }
    );
  }
}

