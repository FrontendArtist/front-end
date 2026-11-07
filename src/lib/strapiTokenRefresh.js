import { STRAPI_API_URL } from './api';

// تمدید سروری توکن کوتاه‌عمر استرپی (BND-08). فقط در سرور Next اجرا می‌شود، چون کلید STRAPI_API_TOKEN لازم دارد.
export const SESSION_EXPIRED_ERROR = 'SessionExpired';

/**
 * زمان صدور و انقضای توکن را بدون اعتبارسنجی امضا می‌خواند؛ اعتبارسنجی با خود استرپی و بای‌مانی است.
 * @param {string} jwt
 * @returns {{ iat: number, exp: number } | null} ثانیه از مبدأ یونیکس
 */
export function readJwtTimes(jwt) {
    try {
        // atob در مرورگر و Node هر دو هست؛ claimهای زمان و شناسه ASCII هستند.
        const base64 = String(jwt).split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
        const payload = JSON.parse(atob(base64.padEnd(Math.ceil(base64.length / 4) * 4, '=')));
        if (typeof payload.iat === 'number' && typeof payload.exp === 'number') {
            return { iat: payload.iat, exp: payload.exp };
        }
    } catch {
        // توکن بدشکل: تمدید نمی‌شود و همان رفتار قبلی می‌ماند.
    }
    return null;
}

/** وقتی بیش از نیمی از عمر توکن گذشته باشد، باید تمدید شود. */
export function shouldRefreshJwt(jwt, nowSeconds = Math.floor(Date.now() / 1000)) {
    const times = readJwtTimes(jwt);
    if (!times) return false;
    return nowSeconds >= times.iat + (times.exp - times.iat) / 2;
}

/**
 * @param {string} jwt توکن فعلی کاربر از نشست سروری
 * @returns {Promise<{ jwt?: string, rejected?: boolean }>} rejected یعنی استرپی نشست کاربر را نپذیرفت (۴۰۱).
 */
export async function refreshStrapiJwt(jwt) {
    const apiToken = process.env.STRAPI_API_TOKEN;
    if (!apiToken) {
        console.error('[NextAuth] STRAPI_API_TOKEN is not set; user token cannot be refreshed.');
        return {};
    }
    try {
        const response = await fetch(`${STRAPI_API_URL}/api/auth/token/refresh`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiToken}` },
            body: JSON.stringify({ jwt }),
            cache: 'no-store',
        });
        if (response.ok) {
            const data = await response.json();
            return data?.jwt ? { jwt: data.jwt } : {};
        }
        if (response.status === 401) {
            return { rejected: true };
        }
        // ۴۰۳ یعنی کلید API مجوز این مسیر را ندارد (خطای پیکربندی، نه کاربر)؛ نشست تا انقضای توکن می‌ماند.
        console.error(`[NextAuth] token refresh returned ${response.status}`);
        return {};
    } catch (error) {
        console.error('[NextAuth] token refresh failed:', error.message);
        return {};
    }
}

/**
 * توکن نشست next-auth را در صورت نیاز تمدید می‌کند.
 * قطعی موقت استرپی نشست را نمی‌بندد مگر توکن واقعاً منقضی شده باشد؛ رد صریح استرپی نشست را خطادار می‌کند.
 */
export async function refreshSessionToken(token, nowSeconds = Math.floor(Date.now() / 1000)) {
    if (!token?.jwt || !shouldRefreshJwt(token.jwt, nowSeconds)) return token;

    const result = await refreshStrapiJwt(token.jwt);
    if (result.jwt) {
        token.jwt = result.jwt;
        delete token.error;
        return token;
    }
    const expired = nowSeconds >= (readJwtTimes(token.jwt)?.exp ?? 0);
    if (result.rejected || expired) {
        token.error = SESSION_EXPIRED_ERROR;
        delete token.jwt;
    }
    return token;
}
