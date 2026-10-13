let userId = null;
let generation = 0;
let inFlight = null;
let cachedProfileData = null;
let cacheTimestamp = 0;
const CACHE_TTL_MS = 60000;

export function setProfileUser(nextUserId) {
    const nextId = nextUserId == null ? null : String(nextUserId);
    if (userId === nextId) return;
    userId = nextId;
    invalidateProfileCache();
}
export function invalidateProfileCache() {
    generation++;
    inFlight = null;
    cachedProfileData = null;
    cacheTimestamp = 0;
}
export async function fetchProfileCartData(force = false, expectedUserId = userId) {
    if (expectedUserId == null || String(expectedUserId) !== userId) return null;
    if (!force && cachedProfileData && Date.now() - cacheTimestamp < CACHE_TTL_MS) return cachedProfileData;
    if (inFlight) return inFlight.promise;
    const request = { generation };
    request.promise = (async () => {
        try {
            const response = await fetch('/api/profile');
            if (!response.ok) throw new Error('خطا در دریافت اطلاعات پروفایل');
            const data = await response.json();
            if (request.generation !== generation) return null;
            cachedProfileData = data;
            cacheTimestamp = Date.now();
            return data;
        } finally {
            if (inFlight === request) inFlight = null;
        }
    })();
    inFlight = request;
    return request.promise;
}
export async function updateProfileCartData(cartDataPayload, expectedUserId = userId) {
    if (expectedUserId == null || String(expectedUserId) !== userId) return null;
    const requestGeneration = generation;
    const response = await fetch('/api/profile', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cartData: cartDataPayload }),
    });
    if (!response.ok) throw new Error('خطا در همگام‌سازی سبد خرید با سرور');
    const data = await response.json();
    if (requestGeneration !== generation) return null;
    if (data) {
        cachedProfileData = data;
        cacheTimestamp = Date.now();
    }
    return data;
}
