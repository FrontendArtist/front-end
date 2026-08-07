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
