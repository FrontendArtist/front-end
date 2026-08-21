/**
 * API Client - لایه پایه‌ای برای ارتباط با Strapi CMS
 * 
 * نقش:
 * این ماژول نقش Gateway مرکزی را برای تمام درخواست‌های HTTP به بک‌اند Strapi ایفا می‌کند.
 * تمام ماژول‌های دامنه‌ای (servicesApi.js, productsApi.js, articlesApi.js و...) از این تابع استفاده می‌کنند.
 * 
 * مزایای معماری:
 * - یک منبع واحد برای تمام تنظیمات API (Single Source of Truth)
 * - مدیریت خطا به‌صورت یکپارچه در تمام برنامه
 * - پیشگیری و پاکسازی خودکار از تکرار مسیرها (مانند /api/api/...) و اسلش‌های ناخواسته
 * - قابلیت تست و نگهداری بالاتر
 * - جداسازی منطق HTTP از کامپوننت‌ها و صفحات
 * 
 * قوانین استفاده:
 * ❌ هیچ کامپوننتی نباید مستقیماً fetch() را صدا بزند
 * ❌ هیچ صفحه‌ای نباید مستقیماً apiClient() را import کند
 * ✅ فقط ماژول‌های دامنه‌ای (مثل servicesApi.js) می‌توانند از apiClient استفاده کنند
 * ✅ کامپوننت‌ها فقط از توابع دامنه‌ای (مثل getAllServices) استفاده می‌کنند
 * 
 * @module lib/apiClient
 */

import { API_BASE_URL } from './api';

/**
 * تابع پایه برای ارسال درخواست HTTP به Strapi با اعتبارسنجی و پاکسازی آدرس (URL Sanitization)
 * 
 * جریان داده (Data Flow):
 * 1. کامپوننت/صفحه تابع دامنه‌ای را صدا می‌زند (مثلاً getAllServices)
 * 2. تابع دامنه‌ای apiClient را با endpoint مشخص صدا می‌زند (مانند "/api/services?populate=*")
 * 3. apiClient آدرس پایه و مسیر را پاکسازی کرده و درخواست HTTP را با تنظیمات مناسب ارسال می‌کند
 * 4. پاسخ از طریق لایه‌ها به بالا برمی‌گردد
 * 
 * @param {string} endpoint - مسیر API نسبی (مثلاً "/api/services?populate=image")
 * @param {object} options - تنظیمات fetch (method, headers, body, cache, timeoutMs, suppressErrorLog و...)
 * @returns {Promise<object>} پاسخ JSON پارس شده از Strapi
 * @throws {Error} در صورت شکست درخواست API
 * 
 * @example
 * // استفاده در ماژول‌های دامنه‌ای:
 * const data = await apiClient("/api/services?populate=*");
 */
export async function apiClient(endpoint, options = {}) {
  const { suppressErrorLog, timeoutMs = 15000, ...fetchOptions } = options;

  // ---------------------------------------------------------------------------
  // منطق پاکسازی و ساخت آدرس URL (URL Sanitization & Resolution Logic)
  // ---------------------------------------------------------------------------
  // ۱. حذف اسلش‌ها و پسوند /api از انتهای Base URL جهت اطمینان از خلوص ریشه دامنه
  // 1. Strip trailing slashes and /api suffix from Base URL to ensure clean domain root
  const cleanBase = (API_BASE_URL || 'https://api.tarhelahi.ir')
    .trim()
    .replace(/\/+$/, '')
    .replace(/\/api\/?$/, '');

  // ۲. اطمینان از شروع مسیر با اسلش و حذف هرگونه تکرار ناخواسته /api/api
  // 2. Ensure endpoint starts with '/' and prevent accidental duplicate '/api/api/'
  let cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  if (cleanEndpoint.startsWith('/api/api/')) {
    cleanEndpoint = cleanEndpoint.replace(/^\/api\/api\//, '/api/');
  }

  // ۳. ساخت URL نهایی خالص و اتصال بدون درز
  // 3. Construct unified final absolute URL
  const url = `${cleanBase}${cleanEndpoint}`;

  // تنظیم AbortController برای کنترل مهلت زمانی (Timeout)
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    // ارسال درخواست fetch با ادغام تنظیمات
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...fetchOptions.headers, // امکان افزودن header های سفارشی (مانند Authorization)
      },
      // پیش‌فرض: بدون کش برای داده‌های تازه در SSR مگر اینکه صریحاً override شده باشد
      cache: fetchOptions.cache || (fetchOptions.next ? undefined : 'no-store'),
      signal: controller.signal,
      ...fetchOptions, // سایر تنظیمات (method, body و...)
    });
    
    clearTimeout(timeoutId);

    // بررسی موفقیت پاسخ (status code بین 200-299)
    if (!response.ok) {
      // تلاش برای خواندن پاسخ خطا از Strapi
      if (!suppressErrorLog) {
        let errorDetails = '';
        try {
          const errorBody = await response.json();
          errorDetails = JSON.stringify(errorBody, null, 2);
          console.error(`⚠️ API Error ${response.status}: ${cleanEndpoint}`);
          console.error(`🔴 STRAPI ERROR DETAILS:`, errorDetails);
        } catch (e) {
          console.error(`⚠️ API Error ${response.status}: ${cleanEndpoint}`);
        }
      }
      throw new Error(`API_ERROR_${response.status}`);
    }

    // پارس و بازگرداندن پاسخ JSON
    return await response.json();

  } catch (error) {
    clearTimeout(timeoutId);

    // بررسی اینکه آیا خطا مربوط به عدم دسترسی به سرور یا Timeout است
    const isNetworkError = error.message === 'fetch failed' ||
      error.code === 'ECONNREFUSED' ||
      error.name === 'TypeError' ||
      error.name === 'AbortError';

    if (isNetworkError) {
      if (process.env.NODE_ENV === 'development' && !suppressErrorLog) {
        console.warn(`⚠️ Backend unavailable: ${cleanEndpoint}`);
        console.info('💡 Make sure your Strapi server is running on', cleanBase);
      }
      throw new Error('BACKEND_UNAVAILABLE');
    }

    // سایر خطاها
    if (process.env.NODE_ENV === 'development' && !suppressErrorLog) {
      console.error('❌ API Client Error:', error.message);
    }

    // پرتاب مجدد خطا تا ماژول‌های دامنه‌ای آن را مدیریت کنند
    throw error;
  }
}
