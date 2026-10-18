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
