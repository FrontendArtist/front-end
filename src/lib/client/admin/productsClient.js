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
