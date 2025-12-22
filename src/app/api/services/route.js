/**
 * Services API Route Handler
 * 
 * نقش:
 * این Route Handler داخلی Next.js نقش واسط بین Client Components و API دامنه‌ای را ایفا می‌کند
 * 
 * جریان داده (Data Flow):
 * Client Component (ServiceGrid.jsx) 
 *   ↓ fetch('/api/services?page=2&pageSize=6')
 * Next.js Route Handler (این فایل)
 *   ↓ getServicesPaginated(page, pageSize, sort)
 * Domain API Module (servicesApi.js)
 *   ↓ apiClient()
 * Strapi Backend
 * 
 * مزایای این معماری:
 * - جداسازی کامل Client از Strapi API
 * - امکان افزودن Authentication، Rate Limiting یا Caching در آینده
 * - امنیت بیشتر (API keys در سرور باقی می‌مانند)
 * - تست‌پذیری بالاتر
 * 
 * @module app/api/services/route
 */

import { getServicesPaginated } from '@/lib/servicesApi';

/**
 * GET Handler - دریافت لیست خدمات با صفحه‌بندی
 * 
 * Query Parameters پشتیبانی شده:
 * - page: شماره صفحه (پیش‌فرض: 1)
 * - pageSize: تعداد آیتم در هر صفحه (پیش‌فرض: 6)
 * - sort: پارامتر مرتب‌سازی Strapi (پیش‌فرض: "createdAt:desc")
 * 
 * @param {Request} request - شیء Request از Next.js
 * @returns {Response} JSON response حاوی {data: Array, meta: object}
 * 
 * @example
 * // از Client Component:
 * const response = await fetch('/api/services?page=2&pageSize=6');
 * const result = await response.json();
 * // result = { data: [...], meta: { pagination: {...} } }
 */
export async function GET(request) {
  try {
    // استخراج query parameters از URL
    const { searchParams } = new URL(request.url);

    // دریافت پارامترها با مقادیر پیش‌فرض
    const page = parseInt(searchParams.get('page') || '1', 10);
    const pageSize = parseInt(searchParams.get('pageSize') || '3', 10);
    const sort = searchParams.get('sort') || 'createdAt:desc';

    // فراخوانی تابع دامنه‌ای برای واکشی خدمات
    // این تابع از apiClient استفاده می‌کند و داده‌ها را فرمت می‌کند
    const result = await getServicesPaginated(page, pageSize, sort);

    // برگرداندن پاسخ JSON
    // Next.js 13+ از Response.json() برای ساخت پاسخ استفاده می‌کند
    return Response.json(result);

  } catch (error) {
    // مدیریت خطا و برگرداندن پاسخ 500
    console.error('خطا در Route Handler خدمات:', error.message);

    return Response.json(
      {
        error: 'خطا در دریافت خدمات',
        message: error.message
      },
      { status: 500 }
    );
  }
}

