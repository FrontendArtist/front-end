export async function fetchAdminCourses({ start, limit = 20, page, pageSize } = {}) {
    let url = '/api/admin/courses';
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
        throw new Error(err.error || 'خطا در دریافت لیست دوره‌ها');
    }
    return res.json();
}

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
