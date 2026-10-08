import { API_BASE_URL } from '../api';

/**
 * پاکسازی آدرس پایه API
 */
function getCleanBaseUrl() {
    return (API_BASE_URL || 'http://localhost:1337')
        .trim()
        .replace(/\/+$/, '')
        .replace(/\/api\/?$/, '');
}

/**
 * دریافت لیست پرونده‌های رسیدگی با صفحه‌بندی و فیلتر
 * GET /api/admin/gateway-reviews?status=&reasonCode=&page=&pageSize=
 *
 * @param {string} jwt - توکن JWT ادمین Strapi
 * @param {object} options - پارامترهای فیلتر و صفحه‌بندی
 * @returns {Promise<{ data: object[], pagination: object }>}
 */
export async function getGatewayReviews(jwt, { page = 1, pageSize = 25, status, reasonCode } = {}) {
    const cleanBase = getCleanBaseUrl();
    const params = new URLSearchParams();

    if (page) params.set('page', String(page));
    if (pageSize) params.set('pageSize', String(pageSize));
    if (status && status !== 'all') params.set('status', status);
    if (reasonCode && reasonCode !== 'all') params.set('reasonCode', reasonCode);

    const url = `${cleanBase}/api/admin/gateway-reviews?${params.toString()}`;

    const res = await fetch(url, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${jwt}`,
        },
        cache: 'no-store',
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
        const error = new Error(data?.error?.message || data?.message || data?.code || 'خطا در دریافت پرونده‌های رسیدگی');
        error.status = res.status;
        error.code = data?.code;
        error.details = data;
        throw error;
    }

    return {
        data: Array.isArray(data?.data) ? data.data : [],
        pagination: data?.pagination || { page: Number(page), pageSize: Number(pageSize), total: 0 },
    };
}

/**
 * دریافت جزئیات یک پرونده رسیدگی بر اساس کد ارجاع مشتری
 * GET /api/admin/gateway-reviews/:clientReferenceCode
 *
 * @param {string} jwt - توکن JWT ادمین
 * @param {string} clientReferenceCode - شناسه ارجاع مشتری
 * @returns {Promise<{ data: object }>}
 */
export async function getGatewayReviewByReference(jwt, clientReferenceCode, historyPage = 1) {
    const cleanBase = getCleanBaseUrl();
    const encoded = encodeURIComponent(String(clientReferenceCode || '').trim());
    const url = `${cleanBase}/api/admin/gateway-reviews/${encoded}?historyPage=${historyPage}`;

    const res = await fetch(url, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${jwt}`,
        },
        cache: 'no-store',
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
        const error = new Error(data?.error?.message || data?.message || data?.code || 'پرونده مورد نظر یافت نشد');
        error.status = res.status;
        error.code = data?.code;
        error.details = data;
        throw error;
    }

    return {
        data: data?.data || null,
    };
}

/**
 * دریافت تنظیمات آستانه کال‌بک
 * GET /api/admin/gateway-reviews/settings
 *
 * @param {string} jwt - توکن JWT ادمین
 * @returns {Promise<{ noCallbackMinutes: number }>}
 */
export async function getGatewayReviewSettings(jwt) {
    const cleanBase = getCleanBaseUrl();
    const url = `${cleanBase}/api/admin/gateway-reviews/settings`;

    const res = await fetch(url, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${jwt}`,
        },
        cache: 'no-store',
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
        const error = new Error(data?.error?.message || data?.code || 'خطا در دریافت تنظیمات');
        error.status = res.status;
        error.code = data?.code;
        throw error;
    }

    return {
        noCallbackMinutes: typeof data?.noCallbackMinutes === 'number' ? data.noCallbackMinutes : 30,
    };
}

/**
 * ذخیره تنظیمات آستانه کال‌بک
 * PUT /api/admin/gateway-reviews/settings
 *
 * @param {string} jwt - توکن JWT ادمین
 * @param {number} noCallbackMinutes - آستانه بر حسب دقیقه (۱ تا ۱۴۴۰)
 * @returns {Promise<{ noCallbackMinutes: number }>}
 */
export async function updateGatewayReviewSettings(jwt, noCallbackMinutes) {
    const num = Number(noCallbackMinutes);
    if (!Number.isInteger(num) || num < 1 || num > 1440) {
        const error = new Error('آستانه زمانی باید یک عدد صحیح بین ۱ تا ۱۴۴۰ دقیقه باشد.');
        error.status = 400;
        error.code = 'REVIEW_INVALID_THRESHOLD';
        throw error;
    }

    const cleanBase = getCleanBaseUrl();
    const url = `${cleanBase}/api/admin/gateway-reviews/settings`;

    const res = await fetch(url, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${jwt}`,
        },
        body: JSON.stringify({ noCallbackMinutes: num }),
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
        const error = new Error(data?.error?.message || data?.code || 'خطا در ذخیره تنظیمات');
        error.status = res.status;
        error.code = data?.code;
        throw error;
    }

    return {
        noCallbackMinutes: typeof data?.noCallbackMinutes === 'number' ? data.noCallbackMinutes : num,
    };
}

/**
 * ارسال نتیجه رسیدگی برای پرونده
 * POST /api/admin/gateway-reviews/:clientReferenceCode/resolve
 *
 * @param {string} jwt - توکن JWT ادمین
 * @param {string} clientReferenceCode - شناسه ارجاع مشتری
 * @param {{ outcomeCode: string, resolutionFinancialReferenceId?: string|null }} payload
 * @returns {Promise<object>}
 */
export async function resolveGatewayReview(jwt, clientReferenceCode, payload) {
    const cleanBase = getCleanBaseUrl();
    const encoded = encodeURIComponent(String(clientReferenceCode || '').trim());
    const url = `${cleanBase}/api/admin/gateway-reviews/${encoded}/resolve`;

    const formattedPayload = payload;

    const res = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${jwt}`,
        },
        body: JSON.stringify(formattedPayload),
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
        const error = new Error(data?.error?.message || data?.message || data?.code || 'خطا در ثبت نتیجه رسیدگی');
        error.status = res.status;
        error.code = data?.code;
        error.details = data;
        throw error;
    }

    return data;
}


export async function reopenGatewayReview(jwt, clientReferenceCode, payload) {
 const url = `${getCleanBaseUrl()}/api/admin/gateway-reviews/${encodeURIComponent(clientReferenceCode)}/reopen`;
 const response = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${jwt}` }, body: JSON.stringify(payload) });
 const data = await response.json().catch(() => ({}));
 if (!response.ok) throw Object.assign(new Error(data.code || "REVIEW_REOPEN_FAILED"), { status: response.status, code: data.code });
 return data;
}
