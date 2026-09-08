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

export async function fetchAdminOrders({ start, limit = 20, page, pageSize, status, search, statusPriority, period, settlementId } = {}) {
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

    const res = await fetch(`/api/admin/orders?${params.toString()}`);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'خطا در دریافت سفارش‌ها');
    return data; // { orders, meta }
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

export async function createManualOrder(formData) {
    const res = await fetch('/api/admin/orders/manual', {
        method: 'POST',
        body: formData,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
        throw new Error(data.error || 'خطا در ثبت سفارش دستی');
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
