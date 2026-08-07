export async function fetchUserDetails(userId) {
    const res = await fetch(`/api/admin/users/${userId}`);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'خطا در دریافت اطلاعات کاربر');
    return data;
}
