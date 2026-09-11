/**
 * @file src/lib/topBannerApi.js
 * @description توابع ارتباط با API برای نوار اعلان و تخفیف بالای سایت (Top Banner)
 */

import { apiClient } from './apiClient';
import { API_BASE_URL } from './api';
import { withErrorHandling } from './apiErrorHandler';

/**
 * نرمال‌سازی داده خام دریافت شده از Strapi
 * @param {object} rawItem 
 * @returns {object|null}
 */
export function formatStrapiTopBanner(rawItem) {
  if (!rawItem) return null;

  const item = rawItem.attributes || rawItem;
  if (!item || typeof item !== 'object') return null;

  const isActive = typeof item.isActive === 'boolean' 
    ? item.isActive 
    : String(item.isActive) === 'true';

  const canDismiss = typeof item.canDismiss === 'boolean' 
    ? item.canDismiss 
    : item.canDismiss !== undefined ? String(item.canDismiss) === 'true' : true;

  return {
    id: rawItem.id || rawItem.documentId || item.id || 'banner',
    documentId: rawItem.documentId || null,
    isActive,
    text: item.text || '',
    buttonText: item.buttonText || '',
    buttonLink: item.buttonLink || '',
    badgeText: item.badgeText || '',
    theme: item.theme || 'emerald',
    canDismiss,
    updatedAt: item.updatedAt || null,
  };
}

/**
 * واکشی اطلاعات نوار اعلان بالای هدر از Strapi
 * @returns {Promise<object|null>}
 */
export async function getTopBanner() {
  return withErrorHandling(
    async () => {
      // درخواست مستقیم به Strapi Single Type
      const response = await apiClient('/api/top-banner', {
        cache: 'no-store',
        suppressErrorLog: true,
      });

      if (!response || response.error || !response.data) {
        return null;
      }

      const banner = formatStrapiTopBanner(response.data);
      return banner;
    },
    'واکشی نوار اعلان بالای سایت',
    null
  );
}
