/**
 * API Configuration - تنظیمات مرکزی برای تمام درخواست‌های API
 
 * این فایل تنها منبع حقیقت (Single Source of Truth) برای آدرس‌های API است.
 * تمام فایل‌های دیگر باید از این فایل import کنند تا در صورت تغییر آدرس،
 * فقط در یک جا نیاز به تغییر باشد.
 
 * @module lib/api
 */

/**
 * آدرس اصلی API
 * از متغیر محیطی NEXT_PUBLIC_API_URL یا مقدار پیش‌فرض استفاده می‌کند
 */
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:1337';