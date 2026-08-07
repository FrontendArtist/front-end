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
