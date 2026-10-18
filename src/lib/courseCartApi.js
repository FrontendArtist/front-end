import { BYEMONEY_API_URL } from '@/lib/byeMoneySync';

const volatileStorage = new Map();
const cartKeys = new Map();
const cartOwners = new Map();
const preparations = new Map();
const preparationQueues = new Map();
function readStored(key) {
    try { return sessionStorage.getItem(key); } catch { return volatileStorage.get(key) || null; }
}
function writeStored(key, value) {
    if (value === null) volatileStorage.delete(key);
    else volatileStorage.set(key, value);
    try {
        if (value === null) sessionStorage.removeItem(key);
        else sessionStorage.setItem(key, value);
    } catch { /* در صورت مسدودبودن حافظه مرورگر، شناسه در همین صفحه حفظ می‌شود. */ }
}

async function requestCart(path, jwt, { body, method = 'GET', signal } = {}) {
    const response = await fetch(`${BYEMONEY_API_URL}/api/course-carts${path}`, {
        method, headers: { Authorization: `Bearer ${jwt}`, 'Content-Type': 'application/json' },
        ...(body ? { body: JSON.stringify(body) } : {}), cache: 'no-store', signal,
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
        const error = new Error(data.error || data.message || (typeof data.errors?.[0] === 'string' ? data.errors[0] : 'دریافت وضعیت سبد ممکن نیست. دوباره تلاش کنید.'));
        error.code = data.code;
        throw error;
    }
    return data;
}

// شناسه برای تکرار همان درخواست ثابت می‌ماند؛ مبلغ تنها از سرور خوانده می‌شود.
export function getExistingCourseCartId(userId, externalCourseIds, couponCode, revision = 0) {
    const key = `course-cart:${JSON.stringify([userId, [...externalCourseIds].sort(), couponCode || null])}`;
    const id = readStored(key);
    if (!id) return null;
    const status = readStored('course-cart-status:' + id);
    const sameRevision = (readStored('course-cart-revision:' + id) || '0') === String(revision);
    return ['AwaitingTopUp', 'Paid'].includes(status) || (sameRevision && status === 'Ready') ? id : null;
}

export function getCourseCartId(userId, externalCourseIds, couponCode, revision = 0) {
    const key = `course-cart:${JSON.stringify([userId, [...externalCourseIds].sort(), couponCode || null])}`;
    const previous = readStored(key);
    const protectedCart = previous && ['AwaitingTopUp', 'Paid'].includes(readStored('course-cart-status:' + previous));
    const sameRevision = !previous || (readStored('course-cart-revision:' + previous) || '0') === String(revision);
    if (previous && (protectedCart || sameRevision)) {
        cartKeys.set(previous, key);
        cartOwners.set(previous, String(userId));
        return previous;
    }
    const bytes = crypto.getRandomValues(new Uint8Array(16));
    bytes[6] = (bytes[6] & 15) | 64;
    bytes[8] = (bytes[8] & 63) | 128;
    const hex = Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
    const id = `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
    writeStored(key, id);
    cartKeys.set(id, key);
    cartOwners.set(id, String(userId));
    writeStored('course-cart-revision:' + id, String(revision));
    return id;
}

function rememberCart(body, data) {
    const key = 'course-cart-expiry:' + body.cartId;
    if (data.status === 'Ready' && data.expiresAtUtc) writeStored(key, data.expiresAtUtc);
    else writeStored(key, null);
    writeStored('course-cart-status:' + body.cartId, data.status);
}

// لغو مصرف‌کننده فقط پاسخ همان صفحه را کنار می‌گذارد؛ درخواست مشترک رزرو قطع نمی‌شود.
export function prepareCourseCart(body, jwt, signal) {
    const requestKey = JSON.stringify([jwt, body.cartId, [...body.externalCourseIds].sort(), body.couponCode]);
    let pending = preparations.get(requestKey);
    if (!pending) {
        const userId = cartOwners.get(body.cartId);
        const queueKey = userId === undefined ? jwt : userId;
        pending = (preparationQueues.get(queueKey) || Promise.resolve()).catch(() => {}).then(async () => {
            const activeKey = userId === undefined ? null : `course-cart-active:${userId}`;
            let previous;
            try { previous = JSON.parse(activeKey && readStored(activeKey)); } catch { /* داده قدیمی معتبر نیست. */ }
            if (previous && previous.cartId !== body.cartId) {
                try {
                    const closed = await requestCart(`/${encodeURIComponent(previous.cartId)}/cancel`, jwt, { method: 'POST' });
                    if (previous.key) cartKeys.set(previous.cartId, previous.key);
                    rememberCart({ cartId: previous.cartId }, closed);
                    if (['AwaitingTopUp', 'Paid'].includes(closed.status) && previous.key) {
                        writeStored(previous.key, previous.cartId);
                        if (previous.key === cartKeys.get(body.cartId)) return closed;
                    }
                } catch (error) {
                    if (error.code !== 'CART_NOT_FOUND') throw error;
                }
            }
            if (activeKey) writeStored(activeKey, JSON.stringify({ cartId: body.cartId, key: cartKeys.get(body.cartId) }));
            const data = await requestCart('/checkout', jwt, { method: 'POST', body });
            rememberCart(body, data);
            return data;
        });
        preparations.set(requestKey, pending);
        preparationQueues.set(queueKey, pending);
        const cleanup = () => {
            if (preparations.get(requestKey) === pending) preparations.delete(requestKey);
            if (preparationQueues.get(queueKey) === pending) preparationQueues.delete(queueKey);
        };
        pending.then(cleanup, cleanup);
    }
    return pending.then(data => {
        if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');
        return data;
    });
}
export async function getCourseCart(cartId, jwt, signal) {
    const data = await requestCart(`/${encodeURIComponent(cartId)}`, jwt, { signal });
    rememberCart({ cartId }, data);
    return data;
}
export const purchaseCourseCart = (cartId, jwt) => requestCart(`/${encodeURIComponent(cartId)}/purchase`, jwt, { method: 'POST' });
export async function topUpCourseCart(cartId, jwt) {
    const data = await requestCart(`/${encodeURIComponent(cartId)}/topup`, jwt, { method: 'POST' });
    writeStored('course-cart-status:' + cartId, 'AwaitingTopUp');
    return data;
}
