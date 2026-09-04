export async function fetchAdminMessages({ start, limit = 20, page, pageSize } = {}) {
    let url = '/api/admin/contact-messages';
    const params = new URLSearchParams();
    if (start !== undefined && start !== null) {
        params.set('start', String(start));
        params.set('limit', String(limit));
    } else if (page !== undefined && page !== null) {
        params.set('page', String(page));
        params.set('pageSize', String(pageSize || 50));
    } else {
        params.set('start', '0');
        params.set('limit', String(limit));
    }
    url += `?${params.toString()}`;

    const res = await fetch(url);
    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'خطا در دریافت لیست پیام‌ها');
    }
    return res.json();
}

export async function updateMessage(documentId, payload) {
    const res = await fetch(`/api/admin/contact-messages/${documentId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'خطا در بروزرسانی پیام');
    return data;
}

export async function deleteMessage(documentId) {
    const res = await fetch(`/api/admin/contact-messages/${documentId}`, {
        method: 'DELETE',
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'خطا در حذف پیام');
    return data;
}
