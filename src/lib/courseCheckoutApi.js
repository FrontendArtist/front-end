import { BYEMONEY_API_URL } from '@/lib/byeMoneySync';

async function readCheckout(path, jwt, signal) {
    const response = await fetch(`${BYEMONEY_API_URL}${path}`, {
        headers: { Authorization: `Bearer ${jwt}` }, cache: 'no-store', signal,
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
        throw new Error(typeof data.errors?.[0] === 'string' ? data.errors[0] : 'دریافت وضعیت خرید ممکن نیست. لطفاً دوباره تلاش کنید.');
    }
    return data;
}

export const getCourseCheckout = (externalCourseId, jwt, signal) =>
    readCheckout(`/api/courses/${encodeURIComponent(externalCourseId)}/checkout`, jwt, signal);

export const getTopUpCheckout = (topUpId, jwt, signal) =>
    readCheckout(`/api/topup/${encodeURIComponent(topUpId)}/checkout`, jwt, signal);

export async function getCurrentCourseAccess(userId, signal) {
    const response = await fetch('/api/profile', { cache: 'no-store', signal });
    if (!response.ok) {
        throw new Error('بررسی دسترسی فعلی دوره‌ها ممکن نیست.');
    }
    const profile = await response.json();
    if (String(profile.id) !== String(userId) || !Array.isArray(profile.courses)) {
        throw new Error('اطلاعات دسترسی دوره‌ها معتبر نیست.');
    }
    const accessSet = new Set(profile.courses.map(course => course.documentId));
    accessSet.enrolledChapters = new Set((profile.enrolledChapters || []).map(String));
    accessSet.enrolledChapterIntegrationIds = new Set((profile.enrolledChapterIntegrationIds || []).map(String));
    accessSet.hasChapterAccess = (chapterExternalId, parentExternalId) => {
        if (parentExternalId && accessSet.has(parentExternalId)) return true;
        if (!chapterExternalId) return false;
        const chapStr = String(chapterExternalId);
        if (accessSet.has(chapStr)) return true;
        if (accessSet.enrolledChapters.has(chapStr)) return true;
        if (accessSet.enrolledChapterIntegrationIds.has(chapStr)) return true;
        return false;
    };
    return accessSet;
}
