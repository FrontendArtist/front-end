/**
 * @file src/lib/salekGuideApi.js
 * @description توابع ارتباط با API برای راهنمای سالک (Salek Guide Mascot)
 */

import { apiClient } from './apiClient';
import { withErrorHandling } from './apiErrorHandler';

// مقادیر پیش‌فرض در صورت عدم تنظیم در پنل بک‌اند یا بروز خطا
export const DEFAULT_SALEK_GUIDE = {
  isActive: true,
  message: 'آیا نقشه راه سالک رو دیدی؟',
  subText: 'مسیر گام‌به‌گام دوره‌ها و خودشناسی در طرح الهی',
  buttonText: 'مشاهده نقشه راه',
  buttonLink: '/roadmap',
};

/**
 * نرمال‌سازی داده خام دریافت شده از Strapi
 * @param {object} rawItem
 * @returns {object|null}
 */
export function formatStrapiSalekGuide(rawItem) {
  if (!rawItem) return null;

  const item = rawItem.attributes || rawItem;
  if (!item || typeof item !== 'object') return null;

  const isActive = typeof item.isActive === 'boolean'
    ? item.isActive
    : item.isActive !== undefined ? String(item.isActive) === 'true' : true;

  return {
    id: rawItem.id || rawItem.documentId || item.id || 'salek-guide',
    documentId: rawItem.documentId || null,
    isActive,
    message: item.message || DEFAULT_SALEK_GUIDE.message,
    subText: item.subText !== undefined ? item.subText : DEFAULT_SALEK_GUIDE.subText,
    buttonText: item.buttonText || DEFAULT_SALEK_GUIDE.buttonText,
    buttonLink: item.buttonLink || DEFAULT_SALEK_GUIDE.buttonLink,
    updatedAt: item.updatedAt || null,
  };
}

/**
 * واکشی تنظیمات راهنمای سالک از Strapi
 * @returns {Promise<object>}
 */
export async function getSalekGuide() {
  return withErrorHandling(
    async () => {
      const response = await apiClient('/api/salek-guide', {
        cache: 'no-store',
        suppressErrorLog: true,
      });

      if (!response || response.error || !response.data) {
        return DEFAULT_SALEK_GUIDE;
      }

      const guide = formatStrapiSalekGuide(response.data);
      return guide || DEFAULT_SALEK_GUIDE;
    },
    'واکشی تنظیمات راهنمای سالک',
    DEFAULT_SALEK_GUIDE
  );
}
