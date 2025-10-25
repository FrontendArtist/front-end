/**
 * =============================================================================
 * لایه انتزاعی API - ماژول مرکزی دریافت داده
 * =============================================================================
 * 
 * هدف:
 * این لایه انتزاعی اصلی API برای کل برنامه است.
 * توابع async ساده و نامگذاری شده برای استفاده در Server Components فراهم می‌کند.
 * تمام ارتباطات با Strapi API باید از طریق این ماژول انجام شود.
 * 
 * معماری:
 * - طبق قانون 2.2 در ARCHITECTURE_RULES.md به عنوان تنها منبع داده تعیین شده است
 * - از fetchStrapiAPI در strapiUtils.js برای درخواست‌های HTTP استفاده می‌کند
 * - پیچیدگی کوئری‌های Strapi v5 را مخفی می‌کند (فیلترها، populate، مرتب‌سازی، صفحه‌بندی)
 * - کامپوننت‌های UI را تمیز و متمرکز بر نمایش نگه می‌دارد
 * 
 * الگوی طراحی:
 * - هر تابع یک نیاز داده خاص را مدیریت می‌کند
 * - همه توابع فرمت { data, error } را برمی‌گردانند
 * - پارامترهای کوئری داخلی ساخته می‌شوند، نه در کامپوننت‌ها
 * 
 * وابستگی‌ها:
 * - fetchStrapiAPI از ./strapiUtils.js
 */

import { fetchStrapiAPI } from './strapiUtils.js';

/**
 * =============================================================================
 * API محصولات
 * =============================================================================
 */

/**
 * دریافت لیست صفحه‌بندی شده و مرتب شده محصولات
 * 
 * هدف:
 * - تابع اصلی برای صفحه لیست محصولات
 * - مدیریت مرتب‌سازی (جدیدترین، قیمت صعودی، قیمت نزولی)
 * - مدیریت صفحه‌بندی برای قابلیت "بارگذاری بیشتر"
 * 
 * جزئیات کوئری Strapi:
 * - نقطه پایانی: /api/products
 * - Populate: * (تمام روابط از جمله تصاویر)
 * - مرتب‌سازی: پویا بر اساس انتخاب کاربر
 * - صفحه‌بندی: بر اساس صفحه با اندازه قابل تنظیم
 * 
 * @param {Object} options - گزینه‌های کوئری
 * @param {string} options.sort - ترتیب مرتب‌سازی (مثلاً 'createdAt:desc', 'price:asc', 'price:desc')
 * @param {number} options.page - شماره صفحه (پیش‌فرض: 1)
 * @param {number} options.pageSize - تعداد آیتم در هر صفحه (پیش‌فرض: 20)
 * @returns {Promise<{data: Object|null, error: Object|null}>} پاسخ با آرایه محصولات و متادیتای صفحه‌بندی
 * 
 * ساختار پاسخ (در صورت موفقیت):
 * {
 *   data: {
 *     data: [...products],
 *     meta: { pagination: { page, pageSize, pageCount, total } }
 *   },
 *   error: null
 * }
 * 
 * مثال استفاده:
 * ```js
 * const { data, error } = await getProducts({ 
 *   sort: 'price:asc', 
 *   page: 1, 
 *   pageSize: 20 
 * });
 * ```
 */
export async function getProducts({ sort = 'createdAt:desc', page = 1, pageSize = 20 } = {}) {
  /**
   * ساخت پارامترهای کوئری با استفاده از سینتکس Strapi v5
   * - populate: '*' تمام فیلدهای مرتبط را دریافت می‌کند (تصاویر، دسته‌بندی‌ها و غیره)
   * - sort: کنترل ترتیب (مثلاً 'createdAt:desc' برای جدیدترین‌ها)
   * - pagination[page]: شماره صفحه فعلی
   * - pagination[pageSize]: تعداد آیتم در هر صفحه
   */
  const params = {
    populate: '*',
    sort: sort,
    'pagination[page]': page,
    'pagination[pageSize]': pageSize,
  };

  /**
   * فراخوانی تابع fetch سطح پایین
   * fetchStrapiAPI ساخت URL، کدگذاری رشته کوئری و مدیریت خطا را انجام می‌دهد
   * فرمت استاندارد { data, error } را برمی‌گرداند
   */
  return await fetchStrapiAPI({
    endpoint: '/api/products',
    params,
  });
}

/**
 * دریافت یک محصول با استفاده از slug آن
 * 
 * هدف:
 * - استفاده در صفحه جزئیات محصول (/products/[slug])
 * - دریافت داده‌های کامل محصول شامل تمام تصاویر برای گالری
 * 
 * جزئیات کوئری Strapi:
 * - نقطه پایانی: /api/products
 * - Populate: * (تمام روابط از جمله آرایه تصاویر)
 * - فیلتر: filters[slug][$eq] برای تطبیق دقیق slug
 * 
 * @param {string} slug - شناسه URL-friendly محصول
 * @returns {Promise<{data: Object|null, error: Object|null}>} پاسخ با یک محصول یا آرایه خالی
 * 
 * ساختار پاسخ (در صورت موفقیت):
 * {
 *   data: {
 *     data: [{ id, title, slug, price, description, images, ... }]
 *   },
 *   error: null
 * }
 * 
 * نکته: Strapi حتی برای فیلترهای تک آیتمی یک آرایه برمی‌گرداند
 * کامپوننت‌ها باید data.data[0] را برای محصول بررسی کنند
 * 
 * مثال استفاده:
 * ```js
 * const { data, error } = await getProductBySlug('my-product');
 * const product = data?.data?.[0];
 * ```
 */
export async function getProductBySlug(slug) {
  /**
   * سینتکس فیلتر Strapi v5 برای تطبیق دقیق:
   * filters[field][$eq] = value
   * 
   * این یک کوئری مانند زیر ایجاد می‌کند:
   * /api/products?filters[slug][$eq]=my-product&populate=*
   */
  const params = {
    'filters[slug][$eq]': slug,
    populate: '*',
  };

  return await fetchStrapiAPI({
    endpoint: '/api/products',
    params,
  });
}

/**
 * =============================================================================
 * API مقالات
 * =============================================================================
 */

/**
 * دریافت لیست صفحه‌بندی شده و مرتب شده مقالات
 * 
 * هدف:
 * - تابع اصلی برای صفحه لیست مقالات
 * - مدیریت مرتب‌سازی (جدیدترین، قدیمی‌ترین)
 * - مدیریت صفحه‌بندی برای قابلیت "بارگذاری بیشتر"
 * 
 * جزئیات کوئری Strapi:
 * - نقطه پایانی: /api/articles
 * - Populate: * (تمام روابط از جمله تصویر کاور)
 * - مرتب‌سازی: پویا بر اساس انتخاب کاربر (معمولاً بر اساس تاریخ انتشار)
 * - صفحه‌بندی: بر اساس صفحه با اندازه قابل تنظیم
 * 
 * @param {Object} options - گزینه‌های کوئری
 * @param {string} options.sort - ترتیب مرتب‌سازی (مثلاً 'publishedAt:desc', 'publishedAt:asc')
 * @param {number} options.page - شماره صفحه (پیش‌فرض: 1)
 * @param {number} options.pageSize - تعداد آیتم در هر صفحه (پیش‌فرض: 6)
 * @returns {Promise<{data: Object|null, error: Object|null}>} پاسخ با آرایه مقالات و متادیتای صفحه‌بندی
 * 
 * مثال استفاده:
 * ```js
 * const { data, error } = await getArticles({ 
 *   sort: 'publishedAt:desc', 
 *   page: 1 
 * });
 * ```
 */
export async function getArticles({ sort = 'publishedAt:desc', page = 1, pageSize = 6 } = {}) {
  const params = {
    populate: '*',
    sort: sort,
    'pagination[page]': page,
    'pagination[pageSize]': pageSize,
  };

  return await fetchStrapiAPI({
    endpoint: '/api/articles',
    params,
  });
}

/**
 * دریافت یک مقاله با استفاده از slug آن
 * 
 * هدف:
 * - استفاده در صفحه جزئیات مقاله (/articles/[slug])
 * - دریافت داده‌های کامل مقاله شامل تصویر کاور و محتوا
 * 
 * جزئیات کوئری Strapi:
 * - نقطه پایانی: /api/articles
 * - Populate: * (تمام روابط از جمله کاور)
 * - فیلتر: filters[slug][$eq] برای تطبیق دقیق slug
 * 
 * @param {string} slug - شناسه URL-friendly مقاله
 * @returns {Promise<{data: Object|null, error: Object|null}>} پاسخ با یک مقاله یا آرایه خالی
 * 
 * مثال استفاده:
 * ```js
 * const { data, error } = await getArticleBySlug('my-article');
 * const article = data?.data?.[0];
 * ```
 */
export async function getArticleBySlug(slug) {
  const params = {
    'filters[slug][$eq]': slug,
    populate: '*',
  };

  return await fetchStrapiAPI({
    endpoint: '/api/articles',
    params,
  });
}

/**
 * =============================================================================
 * API دوره‌ها
 * =============================================================================
 */

/**
 * دریافت لیست صفحه‌بندی شده و مرتب شده دوره‌ها
 * 
 * هدف:
 * - تابع اصلی برای صفحه لیست دوره‌ها
 * - مدیریت مرتب‌سازی (جدیدترین، قیمت صعودی، قیمت نزولی)
 * - مدیریت صفحه‌بندی برای قابلیت "بارگذاری بیشتر"
 * 
 * جزئیات کوئری Strapi:
 * - نقطه پایانی: /api/courses
 * - Populate: * (تمام روابط از جمله رسانه/تصاویر)
 * - مرتب‌سازی: پویا بر اساس انتخاب کاربر
 * - صفحه‌بندی: بر اساس صفحه با اندازه قابل تنظیم
 * 
 * @param {Object} options - گزینه‌های کوئری
 * @param {string} options.sort - ترتیب مرتب‌سازی (مثلاً 'createdAt:desc', 'price:asc', 'price:desc')
 * @param {number} options.page - شماره صفحه (پیش‌فرض: 1)
 * @param {number} options.pageSize - تعداد آیتم در هر صفحه (پیش‌فرض: 6)
 * @returns {Promise<{data: Object|null, error: Object|null}>} پاسخ با آرایه دوره‌ها و متادیتای صفحه‌بندی
 * 
 * مثال استفاده:
 * ```js
 * const { data, error } = await getCourses({ 
 *   sort: 'price:asc', 
 *   page: 1 
 * });
 * ```
 */
export async function getCourses({ sort = 'createdAt:desc', page = 1, pageSize = 6 } = {}) {
  const params = {
    populate: '*',
    sort: sort,
    'pagination[page]': page,
    'pagination[pageSize]': pageSize,
  };

  return await fetchStrapiAPI({
    endpoint: '/api/courses',
    params,
  });
}

/**
 * دریافت یک دوره با استفاده از slug آن
 * 
 * هدف:
 * - استفاده در صفحه جزئیات دوره (/courses/[slug])
 * - دریافت داده‌های کامل دوره شامل رسانه، برنامه درسی و جزئیات
 * 
 * جزئیات کوئری Strapi:
 * - نقطه پایانی: /api/courses
 * - Populate: * (تمام روابط از جمله رسانه و برنامه درسی)
 * - فیلتر: filters[slug][$eq] برای تطبیق دقیق slug
 * 
 * @param {string} slug - شناسه URL-friendly دوره
 * @returns {Promise<{data: Object|null, error: Object|null}>} پاسخ با یک دوره یا آرایه خالی
 * 
 * مثال استفاده:
 * ```js
 * const { data, error } = await getCourseBySlug('my-course');
 * const course = data?.data?.[0];
 * ```
 */
export async function getCourseBySlug(slug) {
  const params = {
    'filters[slug][$eq]': slug,
    populate: '*',
  };

  return await fetchStrapiAPI({
    endpoint: '/api/courses',
    params,
  });
}

/**
 * =============================================================================
 * API خدمات
 * =============================================================================
 */

/**
 * دریافت تمام خدمات (بدون صفحه‌بندی یا مرتب‌سازی)
 * 
 * هدف:
 * - تابع اصلی برای صفحه لیست خدمات
 * - خدمات باید یکجا نمایش داده شوند (بدون بارگذاری بیشتر)
 * - بدون کنترل‌های مرتب‌سازی طبق مشخصات پروژه
 * 
 * جزئیات کوئری Strapi:
 * - نقطه پایانی: /api/services
 * - Populate: * (تمام روابط از جمله تصویر)
 * - مرتب‌سازی: createdAt:desc (جدیدترین اول، ثابت)
 * - بدون پارامترهای صفحه‌بندی
 * 
 * @returns {Promise<{data: Object|null, error: Object|null}>} پاسخ با تمام خدمات
 * 
 * ساختار پاسخ (در صورت موفقیت):
 * {
 *   data: {
 *     data: [...all services]
 *   },
 *   error: null
 * }
 * 
 * مثال استفاده:
 * ```js
 * const { data, error } = await getServices();
 * const services = data?.data || [];
 * ```
 */
export async function getServices() {
  /**
   * دریافت تمام خدمات یکجا طبق مشخصات
   * بدون پارامترهای pagination[page] یا pagination[pageSize]
   * مرتب‌سازی بر اساس createdAt:desc برای نمایش جدیدترین خدمات اول
   */
  const params = {
    populate: '*',
    sort: 'createdAt:desc',
  };

  return await fetchStrapiAPI({
    endpoint: '/api/services',
    params,
  });
}

/**
 * دریافت یک خدمت با استفاده از slug آن
 * 
 * هدف:
 * - استفاده در صفحه جزئیات خدمت (/services/[slug])
 * - دریافت داده‌های کامل خدمت شامل تصویر و لینک
 * 
 * جزئیات کوئری Strapi:
 * - نقطه پایانی: /api/services
 * - Populate: * (تمام روابط از جمله تصویر)
 * - فیلتر: filters[slug][$eq] برای تطبیق دقیق slug
 * 
 * @param {string} slug - شناسه URL-friendly خدمت
 * @returns {Promise<{data: Object|null, error: Object|null}>} پاسخ با یک خدمت یا آرایه خالی
 * 
 * مثال استفاده:
 * ```js
 * const { data, error } = await getServiceBySlug('my-service');
 * const service = data?.data?.[0];
 * ```
 */
export async function getServiceBySlug(slug) {
  const params = {
    'filters[slug][$eq]': slug,
    populate: '*',
  };

  return await fetchStrapiAPI({
    endpoint: '/api/services',
    params,
  });
}

/**
 * =============================================================================
 * API دسته‌بندی‌ها (اختیاری - برای استفاده آینده)
 * =============================================================================
 */

/**
 * دریافت تمام دسته‌بندی‌ها
 * 
 * هدف:
 * - استفاده برای لیست دسته‌بندی‌ها یا ناوبری
 * - دسته‌بندی‌ها معمولاً تعداد کمی دارند، پس نیازی به صفحه‌بندی نیست
 * 
 * @returns {Promise<{data: Object|null, error: Object|null}>} پاسخ با تمام دسته‌بندی‌ها
 */
export async function getCategories() {
  const params = {
    populate: '*',
    sort: 'name:asc',
  };

  return await fetchStrapiAPI({
    endpoint: '/api/categories',
    params,
  });
}
