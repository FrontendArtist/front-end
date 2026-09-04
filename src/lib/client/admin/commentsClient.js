export async function fetchAdminComments({ start, limit = 20, page, pageSize } = {}) {
    let url = '/api/admin/comments';
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
        throw new Error(err.error || 'خطا در دریافت لیست نظرات');
    }
    return res.json();
}

export async function updateCommentStatus(commentId, documentId, isApproved) {
    const res = await fetch(`/api/admin/comments/${commentId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ documentId, isApproved }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'خطا در تغییر وضعیت کامنت');
    return data;
}

export async function deleteComment(documentId) {
    const res = await fetch(`/api/admin/comments/${documentId}`, {
        method: 'DELETE',
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'خطا در حذف کامنت');
    return data;
}

export async function replyToComment(payload) {
    const res = await fetch('/api/admin/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'خطا در ارسال پاسخ');
    return data;
}
