/**
 * API Configuration - تنظیمات مرکزی برای تمام درخواست‌های API
 *
 * این فایل تنها منبع حقیقت (Single Source of Truth) برای آدرس پایه Strapi است.
 * مقدار Base URL به صورت خودکار از متغیرهای محیطی استخراج شده و با پاکسازی
 * هرگونه اسلش پایانی یا پسوند '/api' تضمین می‌کند که فقط ریشه دامنه نگهداری شود.
 *
 * @module lib/api
 */

let hasWarnedMissingUrl = false;

/**
 * استخراج آدرس پایه Strapi بدون اسلش انتهایی یا پسوند /api.
 * در هنگام بارگذاری ماژول خطا پرتاب نمی‌کند تا کل برنامه به خاطر نبود یک env از کار نیفتد؛
 * اعتبارسنجی صریح در شروع سرور (instrumentation.js) انجام می‌شود.
 */
export function getStrapiBaseUrl() {
  const configuredUrl =
    process.env.NEXT_PUBLIC_STRAPI_URL ||
    process.env.NEXT_PUBLIC_STRAPI_API_URL ||
    process.env.STRAPI_API_URL;

  if (!configuredUrl) {
    if (process.env.NODE_ENV === 'production') {
      if (!hasWarnedMissingUrl && process.env.NEXT_PHASE !== 'phase-production-build') {
        hasWarnedMissingUrl = true;
        console.error(
          '🔴 [API] NEXT_PUBLIC_STRAPI_URL or NEXT_PUBLIC_STRAPI_API_URL is not configured in production.'
        );
      }
      return 'https://api.tarhelahi.ir';
    }
    return 'http://localhost:1337';
  }

  return configuredUrl
    .trim()
    .replace(/\/+$/, '')      // حذف اسلش‌های اضافی در انتهای رشته
    .replace(/\/api\/?$/, ''); // حذف /api یا /api/ از انتهای آدرس
}

/**
 * اعتبارسنجی متغیرهای محیطی ضروری هنگام شروع سرور Next.js (نه در import ماژول‌ها).
 */
export function assertRequiredStrapiEnv() {
  if (
    process.env.NODE_ENV !== 'production' ||
    process.env.NEXT_PHASE === 'phase-production-build'
  ) {
    return;
  }

  const configuredUrl =
    process.env.NEXT_PUBLIC_STRAPI_URL ||
    process.env.NEXT_PUBLIC_STRAPI_API_URL ||
    process.env.STRAPI_API_URL;

  if (!configuredUrl) {
    throw new Error(
      '🔴 [API] NEXT_PUBLIC_STRAPI_URL or NEXT_PUBLIC_STRAPI_API_URL is not configured in production.'
    );
  }
}

/**
 * آدرس خالص دامنه Strapi بدون هیچ‌گونه اسلش انتهایی یا پسوند /api
 * @example "http://localhost:1337" یا "https://api.tarhelahi.ir"
 */
export const API_BASE_URL = getStrapiBaseUrl();

/**
 * نام مستعار (Alias) برای سازگاری کامل با سایر ماژول‌ها و فایل‌های احراز هویت
 * @alias API_BASE_URL
 */
export const STRAPI_API_URL = API_BASE_URL;