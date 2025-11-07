/**
 * Products API Route Handler
 * 
 * نقش:
 * این Route Handler داخلی Next.js نقش واسط بین Client Components و API دامنه‌ای را ایفا می‌کند
 * 
 * جریان داده (Data Flow):
 * Client Component (ProductGrid.jsx) 
 *   ↓ fetch('/api/products?page=2&sort=price:asc')
 * Next.js Route Handler (این فایل)
 *   ↓ getProductsPaginated(page, pageSize, sort)
 * Domain API Module (productsApi.js)
 *   ↓ apiClient()
 * Strapi Backend
 * 
 * مزایای این معماری:
 * - جداسازی کامل Client از Strapi API
 * - امکان افزودن Authentication، Rate Limiting یا Caching در آینده
 * - امنیت بیشتر (API keys در سرور باقی می‌مانند)
 * - تست‌پذیری بالاتر
 * 
 * @module app/api/products/route
 */

import { getProductsPaginated } from '@/lib/productsApi';
import { getCategoryTree } from '@/lib/categoriesApi';

/**
 * GET Handler - دریافت لیست محصولات با صفحه‌بندی
 * 
 * Query Parameters پشتیبانی شده:
 * - page: شماره صفحه (پیش‌فرض: 1)
 * - pageSize: تعداد آیتم در هر صفحه (پیش‌فرض: 3)
 * - sort: پارامتر مرتب‌سازی Strapi (پیش‌فرض: "createdAt:desc")
 *        مقادیر معتبر: "createdAt:desc", "price:asc", "price:desc"
 * 
 * @param {Request} request - شیء Request از Next.js
 * @returns {Response} JSON response حاوی {data: Array, meta: object}
 * 
 * @example
 * // از Client Component:
 * const response = await fetch('/api/products?page=2&pageSize=6&sort=price:asc');
 * const result = await response.json();
 * // result = { data: [...], meta: { pagination: {...} } }
 */
export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const page = Number(searchParams.get('page') || 1);
    const pageSize = Number(searchParams.get('pageSize') || 6);
    const sort = searchParams.get('sort') || 'createdAt:desc';
    const category = searchParams.get('category') || '';
    const sub = searchParams.get('sub') || '';

    let subSlugs = [];
    if (category && !sub) {
      // اگر فقط دسته انتخاب شده، زیر‌دسته‌هاش رو بگیر
      const tree = await getCategoryTree();
      const cat = tree.find(c => c.slug === category);
      if (cat?.subCategories?.length) {
        subSlugs = cat.subCategories.map(s => s.slug);
      }
    }

    const result = await getProductsPaginated(page, pageSize, sort, {
      categorySlug: category || undefined,
      subCategorySlug: sub || undefined,
      subSlugs,
    });

    return Response.json(result);
  } catch (e) {
    console.error('API /products error:', e?.message);
    return Response.json(
      { data: [], meta: { pagination: { page: 1, pageSize: 6, pageCount: 0, total: 0 } } },
      { status: 200 }
    );
  }
}

