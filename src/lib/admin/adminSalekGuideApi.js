/**
 * @file src/lib/admin/adminSalekGuideApi.js
 * @description توابع ارتباط با API ادمین جهت دریافت و بروزرسانی راهنمای سالک در Strapi
 */

import { adminFetch } from './adminFetch';
import { API_BASE_URL } from '../api';

export async function getAdminSalekGuide(jwt) {
  const data = await adminFetch('/api/salek-guide', jwt);
  if (!data?.data) return null;

  const item = data.data.attributes || data.data;
  return {
    id: data.data.id || data.data.documentId || item.id,
    documentId: data.data.documentId || null,
    isActive: typeof item.isActive === 'boolean' ? item.isActive : String(item.isActive) === 'true',
    message: item.message || '',
    subText: item.subText !== undefined ? item.subText : '',
    buttonText: item.buttonText || '',
    buttonLink: item.buttonLink || '',
    updatedAt: item.updatedAt || null,
  };
}

export async function updateAdminSalekGuide(jwt, payload) {
  try {
    const cleanBase = (API_BASE_URL || 'http://localhost:1337')
      .trim()
      .replace(/\/+$/, '')
      .replace(/\/api\/?$/, '');

    const res = await fetch(`${cleanBase}/api/salek-guide`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${jwt}`,
      },
      cache: 'no-store',
      body: JSON.stringify({
        data: {
          isActive: payload.isActive !== false,
          message: payload.message || '',
          subText: payload.subText || '',
          buttonText: payload.buttonText || '',
          buttonLink: payload.buttonLink || '',
        },
      }),
    });

    const result = await res.json();

    if (!res.ok) {
      return {
        success: false,
        error: result?.error?.message || 'خطا در ذخیره اطلاعات راهنمای سالک در Strapi',
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
