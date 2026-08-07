/**
 * Courses API - لایه API اختصاصی برای دوره‌ها (سازگار با Strapi v5)
 * 
 * نقش:
 * این ماژول یک رابط تمیز برای تمام عملیات مرتبط با دوره‌ها (Courses) فراهم می‌کند.
 * این لایه بین UI/Server Components و apiClient قرار دارد و منطق کسب‌وکار مربوط به دوره‌ها را مدیریت می‌کند.
 * 
 * ویژگی‌های جدید برای پشتیبانی از معماری سرفصل‌های دوگانه (Dual-Mode Curriculum):
 * 1. پشتیبانی کامل از Strapi v5 Deep Populate برای واکشی عمیق `chapters` و `lessons` داخلی آن‌ها.
 * 2. پشتیبانی از `curriculum` برای دوره‌های غیرفصلی.
 * 3. بازیابی خطا و افت خرامان (Graceful Degradation) با بازگرداندن آرایه‌های خالی امن `[]` جهت جلوگیری از کرش UI.
 * 
 * @module lib/coursesApi
 */

import { apiClient } from './apiClient';
import { formatStrapiCourses } from './strapiUtils';
import { withErrorHandling } from './apiErrorHandler';

/**
 * واکشی تمام دوره‌ها از Strapi با ساختار Deep Populate در Strapi v5
 * 
 * @returns {Promise<Array>} آرایه‌ای از اشیاء دوره فرمت شده
 */
export async function getAllCourses() {
  return withErrorHandling(
    async () => {
      const searchParams = new URLSearchParams({
        'status': 'published',
        'sort': 'createdAt:desc',
        'populate[chapters][populate][lessons]': '*',
        'populate[curriculum]': '*',
        'populate[media]': 'true',
      });

      const response = await apiClient(`/api/courses?${searchParams.toString()}`);
      return formatStrapiCourses(response);
    },
    'واکشی دوره‌ها',
    []
  );
}

/**
 * واکشی یک دوره خاص با استفاده از slug با ساختار Deep Populate در Strapi v5
 * 
 * ----------------------------------------------------------------------------------
 * 🌐 توضیح ساختار کوئری Strapi v5 (Strapi v5 Deep Populate Query Explanation):
 * ----------------------------------------------------------------------------------
 * در نسخه ۵ استراپی، فیلدهای کامپوننت متداخل (Nested Components) و روابط صریحاً باید
 * به‌صورت تفکیک‌شده و دیپ populate شوند.
 * 
 * فیلدهای درخواستی:
 * 1. `isChaptered`: فیلد بولین در سطح ریشه (به‌صورت خودکار در خروجی می‌آید)
 * 2. `chapters`: کامپوننت تکرارشونده فصل‌ها
 * 3. `chapters.lessons`: دروس داخل هر فصل ➔ `populate[chapters][populate][lessons]=*`
 * 4. `curriculum`: کامپوننت سرفصل‌های خطی برای دوره‌های غیرفصلی ➔ `populate[curriculum]=*`
 * 5. `media`: تصاویر و کاور دوره ➔ `populate[media]=true`
 * 
 * ----------------------------------------------------------------------------------
 * 🛡️ افت خرامان (Graceful Degradation):
 * ----------------------------------------------------------------------------------
 * اگر در بک‌اند فیلدهای `chapters` یا `curriculum` نال یا تعریف‌نشده باشند، این تابع
 * تضمین می‌کند که آرایه خالی `[]` برگردانده شود تا کامپوننت `CourseContentManager.jsx`
 * دچار خطای Runtime (مانند TypeError: cannot read properties of undefined) نشود.
 * 
 * @param {string} slug - شناسه متنی (slug) دوره از پارامتر URL
 * @returns {Promise<object|null>} شیء دوره فرمت‌شده یا null در صورت عدم وجود
 */
export async function getCourseBySlug(slug) {
  if (!slug) return null;

  return withErrorHandling(
    async () => {
      const searchParams = new URLSearchParams({
        'status': 'published',
        'filters[slug][$eq]': slug,
        'populate[chapters][populate][lessons]': '*',
        'populate[curriculum]': '*',
        'populate[media]': 'true',
      });

      const endpoint = `/api/courses?${searchParams.toString()}`;
      const response = await apiClient(endpoint);

      const formattedCourses = formatStrapiCourses(response);
      const course = formattedCourses[0] || null;

      if (!course) return null;

      return {
        ...course,
        isChaptered: Boolean(course.isChaptered),
        chapters: Array.isArray(course.chapters) ? course.chapters : [],
        curriculum: Array.isArray(course.curriculum) ? course.curriculum : [],
      };
    },
    `واکشی دوره با slug "${slug}"`,
    null
  );
}

/**
 * واکشی تعداد محدودی دوره برای نمایش در صفحه اصلی یا بخش‌های منتخب
 * 
 * @param {object} options - تنظیمات واکشی
 * @param {number} options.limit - تعداد دوره‌های درخواستی (پیش‌فرض: 4)
 * @returns {Promise<Array>} آرایه‌ای از اشیاء دوره فرمت شده
 */
export async function getCourses({ limit = 4 } = {}) {
  return withErrorHandling(
    async () => {
      const searchParams = new URLSearchParams({
        'status': 'published',
        'sort': 'createdAt:desc',
        'pagination[limit]': String(limit),
        'populate[chapters][populate][lessons]': '*',
        'populate[curriculum]': '*',
        'populate[media]': 'true',
      });

      const response = await apiClient(`/api/courses?${searchParams.toString()}`);
      return formatStrapiCourses(response);
    },
    'واکشی دوره‌ها',
    []
  );
}

/**
 * واکشی دوره‌ها با قابلیت صفحه‌بندی و مرتب‌سازی
 * 
 * @param {number} page - شماره صفحه (پیش‌فرض: 1)
 * @param {number} pageSize - تعداد آیتم در هر صفحه (پیش‌فرض: 6)
 * @param {string} sort - پارامتر مرتب‌سازی Strapi (پیش‌فرض: "createdAt:desc")
 * @returns {Promise<{data: Array, meta: object}>} دوره‌های فرمت شده با metadata صفحه‌بندی
 */
export async function getCoursesPaginated(page = 1, pageSize = 6, sort = 'createdAt:desc') {
  return withErrorHandling(
    async () => {
      const searchParams = new URLSearchParams({
        'status': 'published',
        'pagination[page]': String(page),
        'pagination[pageSize]': String(pageSize),
        'sort': sort,
        'populate[chapters][populate][lessons]': '*',
        'populate[curriculum]': '*',
        'populate[media]': 'true',
      });

      const response = await apiClient(`/api/courses?${searchParams.toString()}`);
      const formattedCourses = formatStrapiCourses(response);

      return {
        data: formattedCourses,
        meta: response.meta || {},
      };
    },
    'واکشی دوره‌های صفحه‌بندی‌شده',
    {
      data: [],
      meta: { pagination: { page: 1, pageSize, pageCount: 0, total: 0 } },
    }
  );
}
