/**
 * API Configuration - تنظیمات مرکزی برای تمام درخواست‌های API
 *
 * این فایل تنها منبع حقیقت (Single Source of Truth) برای آدرس پایه Strapi است.
 * مقدار Base URL به صورت خودکار از متغیرهای محیطی استخراج شده و با پاکسازی
 * هرگونه اسلش پایانی یا پسوند '/api' تضمین می‌کند که فقط ریشه دامنه نگهداری شود.
 *
 * @module lib/api
 */

// استخراج آدرس پایه از متغیرهای محیطی با اولویت NEXT_PUBLIC_STRAPI_URL و سپس NEXT_PUBLIC_STRAPI_API_URL
const rawBaseUrl =
  process.env.NEXT_PUBLIC_STRAPI_URL ||
  process.env.NEXT_PUBLIC_STRAPI_API_URL ||
  (process.env.NODE_ENV === 'production' ? 'https://api.tarhelahi.ir' : 'http://localhost:1337');

/**
 * آدرس خالص دامنه Strapi بدون هیچ‌گونه اسلش انتهایی یا پسوند /api
 * @example "http://localhost:1337" یا "https://api.tarhelahi.ir"
 */
export const API_BASE_URL = rawBaseUrl
  .trim()
  .replace(/\/+$/, '')      // حذف اسلش‌های اضافی در انتهای رشته
  .replace(/\/api\/?$/, ''); // حذف /api یا /api/ از انتهای آدرس

/**
 * نام مستعار (Alias) برای سازگاری کامل با سایر ماژول‌ها و فایل‌های احراز هویت
 * @alias API_BASE_URL
 */
export const STRAPI_API_URL = API_BASE_URL;