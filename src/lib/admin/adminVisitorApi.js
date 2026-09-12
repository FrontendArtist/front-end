import { adminFetch } from './adminFetch';

/**
 * دریافت گزارش کامل آمارهای بازدید و ترافیک سایت
 * @param {string} jwt - توکن احراز هویت ادمین
 * @returns {Promise<object|null>}
 */
export async function getVisitorStats(jwt) {
    try {
        const data = await adminFetch('/api/visitor-stat/stats', jwt);
        return data || null;
    } catch (error) {
        if (process.env.NODE_ENV === 'development') {
            console.warn('[adminVisitorApi] Error fetching visitor stats:', error.message);
        }
        return null;
    }
}
