export async function toggleProductStatus(documentId, isActive) {
    const res = await fetch(`/api/admin/products/${documentId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'خطا در تغییر وضعیت محصول');
    return data;
}

export async function deleteProduct(documentId) {
    const res = await fetch(`/api/admin/products/${documentId}`, {
        method: 'DELETE',
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'خطا در حذف محصول');
    return data;
}

export async function createProduct(payload) {
    const res = await fetch('/api/admin/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'خطا در ایجاد محصول');
    return data;
}

export async function updateProduct(documentId, payload) {
    const res = await fetch(`/api/admin/products/${documentId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'خطا در بروزرسانی محصول');
    return data;
}

export async function fetchAdminProducts({ start, limit = 20, page, pageSize } = {}) {
    const params = new URLSearchParams();
    if (start !== undefined) params.set('start', String(start));
    if (limit !== undefined) params.set('limit', String(limit));
    if (page !== undefined && start === undefined) params.set('page', String(page));
    if (pageSize !== undefined && limit === undefined) params.set('pageSize', String(pageSize));

    const res = await fetch(`/api/admin/products?${params.toString()}`);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'خطا در دریافت محصولات');
    return data; // { products, meta }
}
