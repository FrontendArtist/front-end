// c:\Users\soulshunter\Desktop\files for local\front\filesforliara\apiClient.js c:\Users\soulshunter\Desktop\files for local\front\filesforliara\categoriesApi.js c:\Users\soulshunter\Desktop\files for local\front\filesforliara\searchApi.js c:\Users\soulshunter\Desktop\files for local\front\filesforliara\api.js/**
//  * API Configuration - تنظیمات مرکزی برای تمام درخواست‌های API
//  *
//  * این فایل تنها منبع حقیقت (Single Source of Truth) برای آدرس پایه Strapi است.
//  * مقدار Base URL به صورت خودکار از متغیرهای محیطی استخراج شده و با پاکسازی
//  * هرگونه اسلش پایانی یا پسوند '/api' تضمین می‌کند که فقط ریشه دامنه (مانند https://api.tarhelahi.ir) نگهداری شود.
//  *
//  * @module lib/api
//  */

// استخراج آدرس پایه از متغیرهای محیطی با اولویت NEXT_PUBLIC_STRAPI_URL و سپس NEXT_PUBLIC_STRAPI_API_URL
// Resolve raw base URL from environment variables with fallback to production backend
const rawBaseUrl =
  process.env.NEXT_PUBLIC_STRAPI_URL ||
  process.env.NEXT_PUBLIC_STRAPI_API_URL ||
  'https://api.tarhelahi.ir';

/**
 * آدرس خالص دامنه Strapi بدون هیچ‌گونه اسلش انتهایی یا پسوند /api
 * Pure Strapi Domain Base URL stripped of any trailing slashes or trailing '/api'
 * @example "https://api.tarhelahi.ir"
 */
export const API_BASE_URL = rawBaseUrl
  .trim()
  .replace(/\/+$/, '')      // حذف اسلش‌های اضافی در انتهای رشته (Strip trailing slashes)
  .replace(/\/api\/?$/, ''); // حذف /api یا /api/ از انتهای آدرس (Strip trailing /api or /api/)

/**
 * نام مستعار (Alias) برای سازگاری کامل با سایر ماژول‌ها و فایل‌های احراز هویت
 * Alias for backward compatibility across all modules and NextAuth
 * @alias API_BASE_URL
 */
export const STRAPI_API_URL = API_BASE_URL;