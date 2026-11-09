export async function updateOrderStatus(orderId, payload) {
    const res = await fetch(`/api/admin/orders/${orderId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'خطا در بروزرسانی وضعیت سفارش');
    return data;
}

export async function fetchAdminOrders({ start, limit = 20, page, pageSize, status, search, statusPriority, period, settlementId, source } = {}) {
    const params = new URLSearchParams();
    if (start !== undefined) params.set('start', String(start));
    if (limit !== undefined) params.set('limit', String(limit));
    if (page !== undefined && start === undefined) params.set('page', String(page));
    if (pageSize !== undefined && limit === undefined) params.set('pageSize', String(pageSize));
    if (status && status !== 'all') params.set('status', status);
    if (statusPriority) params.set('statusPriority', 'true');
    if (search && search.trim()) params.set('search', search.trim());
    if (period) params.set('period', period);
    if (settlementId) params.set('settlementId', String(settlementId));
    if (source && source !== 'all') params.set('source', source);

    const res = await fetch(`/api/admin/orders?${params.toString()}`);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'خطا در دریافت سفارش‌ها');
    return data; // { orders, meta, byemoneyWarning }
}

/** جزئیات و خط زمانی تلاش‌های خرید یک سفارش بای‌مانی (فقط‌مشاهده؛ JWT از session سروری) */
const TRACKING_TTL_MS = 60 * 1000;
const trackingCache = new Map(); // orderId -> { at, promise }

function abortError() {
    const err = new Error('Aborted');
    err.name = 'AbortError';
    return err;
}

/**
 * پاسخ هر سفارش ۶۰ ثانیه کش می‌شود و درخواست‌های هم‌زمان یک promise مشترک دارند؛
 * بنابراین mount دوباره (StrictMode) یا باز و بسته کردن ردیف، بک‌اند را دوباره صدا نمی‌زند.
 * signal فقط انتظار همین فراخواننده را لغو می‌کند، نه درخواست مشترک را. force=true کش را دور می‌زند.
 */
export function fetchOrderTracking(orderId, { signal, force = false } = {}) {
    let entry = trackingCache.get(orderId);
    if (force || !entry || Date.now() - entry.at > TRACKING_TTL_MS) {
        const promise = (async () => {
            const res = await fetch(`/api/admin/orders/${encodeURIComponent(orderId)}/tracking`);
            const data = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(data.error || 'خطا در دریافت جزئیات سفارش');
            return data;
        })();
        entry = { at: Date.now(), promise };
        trackingCache.set(orderId, entry);
        // خطا کش نمی‌شود تا «تلاش مجدد» واقعاً دوباره درخواست بزند
        promise.catch(() => {
            if (trackingCache.get(orderId) === entry) trackingCache.delete(orderId);
        });
    }

    if (!signal) return entry.promise;
    if (signal.aborted) return Promise.reject(abortError());
    return new Promise((resolve, reject) => {
        const onAbort = () => reject(abortError());
        signal.addEventListener('abort', onAbort, { once: true });
        entry.promise.then(resolve, reject).finally(() => signal.removeEventListener('abort', onAbort));
    });
}

export async function fetchAdminSettlements() {
    const res = await fetch('/api/admin/settlements');
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'خطا در دریافت لیست دوره‌های تسویه');
    return data.settlements || [];
}

export async function createAdminSettlement(payload = {}) {
    const res = await fetch('/api/admin/settlements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'خطا در ثبت و بستن دوره مالی');
    return data;
}

export async function createManualOrder(payload) {
    const isFormData = typeof FormData !== 'undefined' && payload instanceof FormData;
    const res = await fetch('/api/admin/orders/manual', {
        method: 'POST',
        headers: isFormData ? undefined : { 'Content-Type': 'application/json' },
        body: isFormData ? payload : JSON.stringify(payload),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
        const err = new Error(data.error || 'خطا در ثبت سفارش دستی');
        err.status = res.status;
        err.code = data.code || null;
        err.insufficientBalance = res.status === 409 && data.code === 'INSUFFICIENT_NOOR_BALANCE';
        throw err;
    }
    return data;
}

export async function searchAdminUsers(query) {
    const params = new URLSearchParams();
    if (query) params.set('q', query);
    const res = await fetch(`/api/admin/orders/manual?${params.toString()}`);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
        throw new Error(data.error || 'خطا در جستجوی کاربران');
    }
    return data.users || [];
}

export async function bulkDeleteOrders(status) {
    const res = await fetch('/api/admin/orders/bulk-delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
        throw new Error(data.error || 'خطا در حذف سفارش‌ها');
    }
    return data;
}

/** پیش‌نمایش قیمت سفارش دستی به‌نام ذینفع؛ قیمت فقط از quote استرپی می‌آید */
export async function previewManualOrder({ userId, items }, { signal } = {}) {
    const res = await fetch('/api/admin/orders/manual/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, items }),
        signal,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
        const err = new Error(data.error || 'پیش‌نمایش قیمت ممکن نیست.');
        err.status = res.status;
        throw err;
    }
    return data;
}
