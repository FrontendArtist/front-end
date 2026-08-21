import { API_BASE_URL } from '../api';

/**
 * واکشی ایمن از Strapi با Authorization هدر ادمین و پاکسازی آدرس (URL Sanitization)
 *
 * @param {string} endpoint  - مسیر Strapi (مثلاً "/api/articles?status=draft")
 * @param {string} jwt       - توکن JWT ادمین
 * @returns {Promise<object|null>} - پاسخ JSON از Strapi یا null در صورت خطا
 */
export async function adminFetch(endpoint, jwt) {
    try {
        const cleanBase = (API_BASE_URL || 'http://localhost:1337')
            .trim()
            .replace(/\/+$/, '')
            .replace(/\/api\/?$/, '');

        let cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
        if (cleanEndpoint.startsWith('/api/api/')) {
            cleanEndpoint = cleanEndpoint.replace(/^\/api\/api\//, '/api/');
        }

        const url = `${cleanBase}${cleanEndpoint}`;

        const res = await fetch(url, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${jwt}`,
            },
            cache: 'no-store',
        });

        if (!res.ok) {
            if (process.env.NODE_ENV === 'development') {
                console.warn(`[adminApi] Strapi returned ${res.status} for ${cleanEndpoint}`);
            }
            return null;
        }

        return await res.json();
    } catch (error) {
        if (process.env.NODE_ENV === 'development') {
            console.warn(`[adminApi] Fetch failed for ${endpoint}:`, error.message);
        }
        return null;
    }
}
