export async function fetchAdminUsers({ start, limit = 20, page, pageSize } = {}) {
    let url = '/api/admin/users';
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
        throw new Error(err.error || 'خطا در دریافت لیست کاربران');
    }
    return res.json();
}

export async function fetchUserDetails(userId) {
    const res = await fetch(`/api/admin/users/${userId}`);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'خطا در دریافت اطلاعات کاربر');
    return data;
}
