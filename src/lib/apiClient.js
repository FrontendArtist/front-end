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
 * @module lib/apiClient
 */

import { API_BASE_URL } from './api';

/**
 * تابع پایه برای ارسال درخواست HTTP به Strapi با اعتبارسنجی و پاکسازی آدرس (URL Sanitization)
 * 
 * @param {string} endpoint - مسیر API نسبی (مثلاً "/api/services?populate=image")
 * @param {object} options - تنظیمات fetch (method, headers, body, cache, timeoutMs, suppressErrorLog و...)
 * @returns {Promise<object>} پاسخ JSON پارس شده از Strapi
 * @throws {Error} در صورت شکست درخواست API
 */
export async function apiClient(endpoint, options = {}) {
  const { suppressErrorLog, timeoutMs = 15000, ...fetchOptions } = options;

  // ۱. حذف اسلش‌ها و پسوند /api از انتهای Base URL جهت اطمینان از خلوص ریشه دامنه
  const cleanBase = (API_BASE_URL || 'http://localhost:1337')
    .trim()
    .replace(/\/+$/, '')
    .replace(/\/api\/?$/, '');

  // ۲. اطمینان از شروع مسیر با اسلش و حذف هرگونه تکرار ناخواسته /api/api
  let cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  if (cleanEndpoint.startsWith('/api/api/')) {
    cleanEndpoint = cleanEndpoint.replace(/^\/api\/api\//, '/api/');
  }

  // ۳. ساخت URL نهایی خالص
  const url = `${cleanBase}${cleanEndpoint}`;

  // تنظیم AbortController برای کنترل مهلت زمانی (Timeout)
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...fetchOptions.headers,
      },
      cache: fetchOptions.cache || (fetchOptions.next ? undefined : 'no-store'),
      signal: controller.signal,
      ...fetchOptions,
    });
    
    clearTimeout(timeoutId);

    if (!response.ok) {
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

    return await response.json();

  } catch (error) {
    clearTimeout(timeoutId);

    const isNetworkError =
      error.message === 'fetch failed' ||
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

    if (process.env.NODE_ENV === 'development' && !suppressErrorLog) {
      console.error('❌ API Client Error:', error.message);
    }

    throw error;
  }
}
