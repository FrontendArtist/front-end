export async function uploadMedia(formData) {
    const res = await fetch('/api/media', {
        method: 'POST',
        body: formData,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'خطا در آپلود تصویر');
    return data;
}
