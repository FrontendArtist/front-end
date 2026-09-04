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

export async function fetchAdminOrders({ start, limit = 20, page, pageSize } = {}) {
    const params = new URLSearchParams();
    if (start !== undefined) params.set('start', String(start));
    if (limit !== undefined) params.set('limit', String(limit));
    if (page !== undefined && start === undefined) params.set('page', String(page));
    if (pageSize !== undefined && limit === undefined) params.set('pageSize', String(pageSize));

    const res = await fetch(`/api/admin/orders?${params.toString()}`);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'خطا در دریافت سفارش‌ها');
    return data; // { orders, meta }
}
