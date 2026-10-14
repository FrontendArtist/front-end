export const CONNECTION_TTL_MS = 2 * 60 * 1000;
export const CONNECTION_RETRY_MS = 10000;
const UNKNOWN_TTL_MS = 10000;
export const CONNECTION_BLOCKED_MESSAGE = 'فیلترشکن شما روشن است';
export const CONNECTION_ERROR_MESSAGE = 'وضعیت اتصال مشخص نشد؛ می‌توانید پرداخت را ادامه دهید یا دوباره بررسی کنید.';

let cached = null;
let pending = null;
let lastRefreshAt = null;

export function checkPaymentConnection({ refresh = false } = {}) {
    const now = Date.now();
    const ttl = cached?.status === 'unknown' ? UNKNOWN_TTL_MS : CONNECTION_TTL_MS;
    const retryLimited = refresh && lastRefreshAt !== null && now - lastRefreshAt < CONNECTION_RETRY_MS;
    if ((!refresh || retryLimited) && cached && now - cached.checkedAt < ttl) {
        return Promise.resolve(cached);
    }
    if (pending) return pending;
    if (refresh) lastRefreshAt = now;
    cached = null;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2000);
    pending = (async () => {
        try {
            const response = await fetch(`/api/check-vpn${refresh ? '?refresh=1' : ''}`, {
                cache: 'no-store', signal: controller.signal,
            });
            const data = await response.json();
            if (!response.ok || !data.success || typeof data.isVpn !== 'boolean') {
                throw new Error(CONNECTION_ERROR_MESSAGE);
            }
            cached = { status: data.isVpn ? 'blocked' : 'allowed', isVpn: data.isVpn, checkedAt: Date.now() };
            return cached;
        } catch {
            // خطای سرویس تشخیص هرگز به معنی روشن یا خاموش بودن VPN نیست.
            cached = { status: 'unknown', isVpn: null, checkedAt: Date.now() };
            return cached;
        } finally {
            clearTimeout(timeout);
            pending = null;
        }
    })();
    return pending;
}

export async function ensurePaymentConnection() {
    const result = await checkPaymentConnection();
    if (result.isVpn === true) throw new Error(CONNECTION_BLOCKED_MESSAGE);
    return result;
}

export function invalidatePaymentConnection() {
    cached = null;
    lastRefreshAt = null;
}
