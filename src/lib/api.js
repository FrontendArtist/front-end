/**
 * API Configuration - تنظیمات مرکزی برای تمام درخواست‌های API
 *
 * این فایل تنها منبع حقیقت (Single Source of Truth) برای آدرس Strapi است.
 * هیچ فایلی نباید مستقیماً `process.env.NEXT_PUBLIC_STRAPI_API_URL` را بخواند.
 * به جای آن از STRAPI_API_URL این فایل import کنید.
 *
 * @module lib/api
 */

/**
 * آدرس اصلی Strapi API
 * متغیر محیطی: NEXT_PUBLIC_STRAPI_API_URL (در .env.local تعریف می‌شود)
 */
export const STRAPI_API_URL =
  process.env.NEXT_PUBLIC_STRAPI_API_URL || 'http://localhost:1337';

/**
 * Alias برای backward compatibility با apiClient.js و strapiUtils.js
 * @alias STRAPI_API_URL
 */
export const API_BASE_URL = STRAPI_API_URL;