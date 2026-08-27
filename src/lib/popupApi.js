/**
 * Popup API - لایه API اختصاصی برای پیام‌های پاپ‌آپ (PopupMessage)
 * 
 * @module lib/popupApi
 */

import { apiClient } from './apiClient';
import { API_BASE_URL } from './api';
import { withErrorHandling } from './apiErrorHandler';

/**
 * استخراج و تبدیل آدرس تصویر پاپ‌آپ از ساختار Strapi 4 و Strapi 5
 * @param {object} imgData 
 * @returns {{url: string, alt: string} | null}
 */
export function extractPopupImage(imgData) {
  if (!imgData) return null;

  // Handle Strapi nested or flat media
  const mediaObj = imgData?.data || imgData;
  const target = Array.isArray(mediaObj) ? mediaObj[0] : mediaObj;

  if (!target || !target.url) {
    return null;
  }

  const rawUrl = target.url;
  const imageUrl = rawUrl.startsWith('http') ? rawUrl : `${API_BASE_URL}${rawUrl}`;

  return {
    url: imageUrl,
    alt: target.alternativeText || target.name || 'تصویر پاپ‌آپ',
  };
}

/**
 * فرمت‌بندی شیء پاپ‌آپ دریافت شده از Strapi
 * @param {object} rawItem 
 * @returns {object|null}
 */
export function formatStrapiPopup(rawItem) {
  if (!rawItem) return null;

  const item = rawItem.attributes || rawItem;
  const isShow = typeof item.isShow === 'boolean' ? item.isShow : String(item.isShow) === 'true';

  return {
    id: rawItem.id || rawItem.documentId || item.id,
    documentId: rawItem.documentId || null,
    name: item.name || '',
    slug: item.slug || '',
    text: item.text || '',
    buttonText: item.buttonText || '',
    link: item.link || '',
    isShow,
    image: extractPopupImage(item.image),
    createdAt: item.createdAt || null,
    updatedAt: item.updatedAt || null,
  };
}

/**
 * واکشی پاپ‌آپ فعال از Strapi
 * @returns {Promise<object|null>} پاپ‌آپ فعال یا null
 */
export async function getActivePopupMessage() {
  return withErrorHandling(
    async () => {
      // دریافت تمام پیام‌های فعال با اولویت آخرین به‌روزرسانی
      const response = await apiClient(
        '/api/popup-messages?filters[isShow][$eq]=true&populate=*&sort=updatedAt:desc'
      );

      const items = Array.isArray(response) ? response : response?.data;
      if (!items || items.length === 0) {
        return null;
      }

      // اولین پاپ‌آپ فعال را انتخاب می‌کنیم
      const activePopup = formatStrapiPopup(items[0]);
      if (!activePopup || !activePopup.isShow) {
        return null;
      }

      return activePopup;
    },
    'واکشی پیام پاپ‌آپ',
    null
  );
}
