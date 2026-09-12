/**
 * @file src/lib/admin/adminTopBannerApi.js
 * @description توابع ارتباط با API ادمین جهت دریافت و بروزرسانی نوار اعلان بالای سایت
 */

import { adminFetch } from './adminFetch';
import { API_BASE_URL } from '../api';

/**
 * دریافت تنظیمات فعلی نوار اعلان بالای سایت با دسترسی ادمین
 * @param {string} jwt 
 * @returns {Promise<object|null>}
 */
export async function getAdminTopBanner(jwt) {
  const data = await adminFetch('/api/top-banner', jwt);
  if (!data?.data) return null;

  const item = data.data.attributes || data.data;
  return {
    id: data.data.id || data.data.documentId || item.id,
    documentId: data.data.documentId || null,
    isActive: typeof item.isActive === 'boolean' ? item.isActive : String(item.isActive) === 'true',
    text: item.text || '',
    buttonText: item.buttonText || '',
    buttonLink: item.buttonLink || '',
    badgeText: item.badgeText || '',
    theme: item.theme || 'gold',
    canDismiss: typeof item.canDismiss === 'boolean' ? item.canDismiss : item.canDismiss !== undefined ? String(item.canDismiss) === 'true' : true,
    updatedAt: item.updatedAt || null,
  };
}

/**
 * بروزرسانی تنظیمات نوار اعلان در Strapi با توکن JWT ادمین
 * @param {string} jwt 
 * @param {object} payload 
 * @returns {Promise<{success: boolean, data?: object, error?: string}>}
 */
export async function updateAdminTopBanner(jwt, payload) {
  try {
    const cleanBase = (API_BASE_URL || 'http://localhost:1337')
      .trim()
      .replace(/\/+$/, '')
      .replace(/\/api\/?$/, '');

    const res = await fetch(`${cleanBase}/api/top-banner`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${jwt}`,
      },
      cache: 'no-store',
      body: JSON.stringify({
        data: {
          isActive: payload.isActive !== false,
          text: payload.text || '',
          buttonText: payload.buttonText || '',
          buttonLink: payload.buttonLink || '',
          badgeText: payload.badgeText || '',
          theme: payload.theme || 'gold',
          canDismiss: payload.canDismiss !== false,
        },
      }),
    });

    const result = await res.json();

    if (!res.ok) {
      return {
        success: false,
        error: result?.error?.message || 'خطا در ذخیره اطلاعات نوار اعلان در Strapi',
      };
    }

    return {
      success: true,
      data: result.data,
    };
  } catch (err) {
    return {
      success: false,
      error: err.message || 'خطای غیرمنتظره در ارتباط با سرور',
    };
  }
}
