export async function toggleArticleStatus(documentId, isActive) {
    const res = await fetch(`/api/admin/articles/${documentId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'خطا در تغییر وضعیت مقاله');
    return data;
}

export async function deleteArticle(documentId) {
    const res = await fetch(`/api/admin/articles/${documentId}`, {
        method: 'DELETE',
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'خطا در حذف مقاله');
    return data;
}

export async function createArticle(payload) {
    const res = await fetch('/api/admin/articles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'خطا در ایجاد مقاله');
    return data;
}

export async function updateArticle(documentId, payload) {
    const res = await fetch(`/api/admin/articles/${documentId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'خطا در بروزرسانی مقاله');
    return data;
}

export async function fetchAdminArticles({ start, limit = 20, page, pageSize } = {}) {
    const params = new URLSearchParams();
    if (start !== undefined) params.set('start', String(start));
    if (limit !== undefined) params.set('limit', String(limit));
    if (page !== undefined && start === undefined) params.set('page', String(page));
    if (pageSize !== undefined && limit === undefined) params.set('pageSize', String(pageSize));

    const res = await fetch(`/api/admin/articles?${params.toString()}`);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'خطا در دریافت مقالات');
    return data; // { articles, meta }
}
