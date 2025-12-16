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
 * - امکان افزودن Authentication، Logging یا Interceptor در آینده
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
 * تابع پایه برای ارسال درخواست HTTP به Strapi
 * 
 * جریان داده (Data Flow):
 * 1. کامپوننت/صفحه تابع دامنه‌ای را صدا می‌زند (مثلاً getAllServices)
 * 2. تابع دامنه‌ای apiClient را با endpoint مشخص صدا می‌زند
 * 3. apiClient درخواست HTTP را با تنظیمات مناسب ارسال می‌کند
 * 4. پاسخ از طریق لایه‌ها به بالا برمی‌گردد
 * 
 * @param {string} endpoint - مسیر API نسبی (مثلاً "/api/services?populate=*")
 * @param {object} options - تنظیمات fetch (method, headers, body, cache و...)
 * @returns {Promise<object>} پاسخ JSON پارس شده از Strapi
 * @throws {Error} در صورت شکست درخواست API
 * 
 * @example
 * // استفاده داخلی در ماژول‌های دامنه‌ای:
 * const data = await apiClient("/api/services?populate=*");
 * 
 * // با تنظیمات سفارشی:
 * const data = await apiClient("/api/services", {
 *   method: "POST",
 *   body: JSON.stringify({ title: "New Service" })
 * });
 */
export async function apiClient(endpoint, options = {}) {
  // ساخت URL کامل با ترکیب Base URL و endpoint
  // endpoint باید با "/" شروع شود (مثلاً "/api/services")
  const url = `${API_BASE_URL}${endpoint}`;

  try {
    // ارسال درخواست fetch با ادغام تنظیمات
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers, // امکان افزودن header های سفارشی
      },
      // پیش‌فرض: بدون کش برای داده‌های تازه در SSR
      // می‌تواند برای هر درخواست override شود (مثلاً { next: { revalidate: 3600 } })
      cache: 'no-store',
      ...options, // سایر تنظیمات (method, body و...)
    });

    // بررسی موفقیت پاسخ (status code بین 200-299)
    if (!response.ok) {
      // تلاش برای خواندن پاسخ خطا از Strapi
      let errorDetails = '';
      try {
        const errorBody = await response.json();
        errorDetails = JSON.stringify(errorBody, null, 2);
        console.warn(`⚠️ API Error ${response.status}: ${endpoint}`);
        if (process.env.NODE_ENV === 'development') {
          console.debug('Response details:', errorDetails);
        }
      } catch (e) {
        console.warn(`⚠️ API Error ${response.status}: ${endpoint}`);
      }
      throw new Error(`API_ERROR_${response.status}`);
    }

    // پارس و بازگرداندن پاسخ JSON
    // Strapi داده را در قالب { data: [...], meta: {...} } برمی‌گرداند
    return await response.json();

  } catch (error) {
    // بررسی اینکه آیا خطا مربوط به عدم دسترسی به سرور است
    const isNetworkError = error.message === 'fetch failed' ||
      error.code === 'ECONNREFUSED' ||
      error.name === 'TypeError';

    if (isNetworkError) {
      // پیام ساده‌تر برای خطای شبکه
      if (process.env.NODE_ENV === 'development') {
        console.warn(`⚠️ Backend unavailable: ${endpoint}`);
        console.info('💡 Make sure your Strapi server is running on', API_BASE_URL);
      }
      throw new Error('BACKEND_UNAVAILABLE');
    }

    // سایر خطاها
    if (process.env.NODE_ENV === 'development') {
      console.error('❌ API Client Error:', error.message);
    }

    // پرتاب مجدد خطا تا ماژول‌های دامنه‌ای آن را مدیریت کنند
    throw error;
  }
}

/**
 * نکات مهم استفاده:
 * 
 * 1. این فایل نباید مستقیماً در کامپوننت‌ها یا صفحات import شود
 * 2. برای هر دامنه (Service, Product, Article و...) یک فایل API جداگانه بسازید
 * 3. ماژول‌های دامنه‌ای منطق کسب‌وکار و بازیابی خطا را اضافه می‌کنند
 * 4. کامپوننت‌ها فقط از ماژول‌های دامنه‌ای استفاده می‌کنند، هرگز مستقیماً از apiClient
 * 
 * مثال جریان کامل:
 * ServicesPage → getAllServices() → apiClient() → Strapi API
 *               ← داده فرمت شده  ← پاسخ خام  ← پاسخ JSON
 * 
 * قابلیت توسعه در آینده:
 * - افزودن JWT Token به header برای Authentication
 * - پیاده‌سازی Retry Logic برای درخواست‌های ناموفق
 * - افزودن Request/Response Interceptor
 * - پیاده‌سازی Rate Limiting
 * - افزودن Logging مرکزی برای تمام درخواست‌ها
 */

