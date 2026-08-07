import { STRAPI_API_URL } from '../api';

/**
 * واکشی ایمن از Strapi با Authorization هدر ادمین.
 *
 * @param {string} endpoint  - مسیر Strapi
 * @param {string} jwt       - توکن JWT ادمین
 * @returns {Promise<object|null>} - پاسخ JSON از Strapi یا null در صورت خطا
 */
export async function adminFetch(endpoint, jwt) {
    try {
        const res = await fetch(`${STRAPI_API_URL}${endpoint}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${jwt}`,
            },
            cache: 'no-store',
        });

        if (!res.ok) {
            if (process.env.NODE_ENV === 'development') {
                console.warn(`[adminApi] Strapi returned ${res.status} for ${endpoint}`);
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
