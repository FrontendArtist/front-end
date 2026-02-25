/**
 * API Error Handler Utility
 * مدیریت یکپارچه خطاهای API در تمام ماژول‌ها
 */

/**
 * بررسی اینکه آیا خطا مربوط به عدم دسترسی به backend است
 * @param {Error} error - خطای دریافت شده
 * @returns {boolean}
 */
export function isBackendUnavailable(error) {
    return error?.message === 'BACKEND_UNAVAILABLE' ||
        error?.message === 'fetch failed' ||
        error?.code === 'ECONNREFUSED';
}

/**
 * لاگ خطا با توجه به نوع خطا و محیط
 * @param {string} context - کانتکست خطا (مثلاً "واکشی محصولات")
 * @param {Error} error - خطای دریافت شده
 * @param {boolean} silent - آیا در حالت silent باشد (برای backend unavailable)
 */
export function logApiError(context, error, silent = false) {
    // اگر backend در دسترس نیست و silent mode فعال است
    if (isBackendUnavailable(error) && silent) {
        return; // هیچ لاگی نزن
    }

    // فقط در development mode لاگ کن
    if (process.env.NODE_ENV === 'development') {
        if (isBackendUnavailable(error)) {
            console.warn(`⚠️ Backend unavailable for: ${context}`);
        } else {
            console.error(`❌ ${context}:`, error.message || error);
        }
    }
}

/**
 * Wrapper برای توابع API که خطاها را مدیریت می‌کند
 * @param {Function} apiFunction - تابع API که باید اجرا شود
 * @param {string} context - کانتکست برای لاگ
 * @param {any} fallbackValue - مقدار پیش‌فرض در صورت خطا
 * @param {boolean} silentOnUnavailable - آیا در صورت unavailable بودن backend سایلنت باشد
 * @returns {Promise<any>}
 */
export async function withErrorHandling(
    apiFunction,
    context,
    fallbackValue = [],
    silentOnUnavailable = true
) {
    try {
        return await apiFunction();
    } catch (error) {
        logApiError(context, error, silentOnUnavailable);
        return fallbackValue;
    }
}
