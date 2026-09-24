/**
 * Client-side API wrapper for Profile and Cart Hydration
 * این ماژول برای واکشی و آپدیت داده‌های پروفایل و سبد خرید سمت کاربر استفاده می‌شود
 */

let inFlightProfilePromise = null;
let cachedProfileData = null;
let cacheTimestamp = 0;
const CACHE_TTL_MS = 60000; // کش یک دقیقه‌ای داده‌های پروفایل

export async function fetchProfileCartData(force = false) {
    const now = Date.now();
    if (!force && cachedProfileData && (now - cacheTimestamp < CACHE_TTL_MS)) {
        return cachedProfileData;
    }

    if (inFlightProfilePromise) {
        return inFlightProfilePromise;
    }

    inFlightProfilePromise = (async () => {
        try {
            const response = await fetch('/api/profile');
            if (!response.ok) {
                throw new Error('خطا در دریافت اطلاعات پروفایل');
            }
            const data = await response.json();
            cachedProfileData = data;
            cacheTimestamp = Date.now();
            return data;
        } finally {
            inFlightProfilePromise = null;
        }
    })();

    return inFlightProfilePromise;
}

export function invalidateProfileCache() {
    cachedProfileData = null;
    cacheTimestamp = 0;
}

export async function updateProfileCartData(cartDataPayload) {
    const response = await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cartData: cartDataPayload }),
    });
    
    if (!response.ok) {
        throw new Error('خطا در همگام‌سازی سبد خرید با سرور');
    }
    return response.json();
}
