export async function toggleCourseStatus(documentId, isActive) {
    const res = await fetch(`/api/admin/courses/${documentId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'خطا در تغییر وضعیت دوره');
    return data;
}

export async function deleteCourse(documentId) {
    const res = await fetch(`/api/admin/courses/${documentId}`, {
        method: 'DELETE',
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'خطا در حذف دوره');
    return data;
}

export async function createCourse(payload) {
    const res = await fetch('/api/admin/courses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'خطا در ایجاد دوره');
    return data;
}

export async function updateCourse(documentId, payload) {
    const res = await fetch(`/api/admin/courses/${documentId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'خطا در بروزرسانی دوره');
    return data;
}
