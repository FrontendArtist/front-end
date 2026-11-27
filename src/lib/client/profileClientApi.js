let userId = null;
let generation = 0;
const sliceStore = new Map();
const CACHE_TTL_MS = 60000;

function getSlice(includeKey) {
    const key = includeKey || 'cart';
    if (!sliceStore.has(key)) {
        sliceStore.set(key, { inFlight: null, cachedData: null, cacheTimestamp: 0 });
    }
    return sliceStore.get(key);
}

export function setProfileUser(nextUserId) {
    const nextId = nextUserId == null ? null : String(nextUserId);
    if (userId === nextId) return;
    userId = nextId;
    invalidateProfileCache();
}

export function invalidateProfileCache() {
    generation++;
    sliceStore.clear();
}

export async function fetchProfileCartData(force = false, expectedUserId = userId, include = 'cart') {
    if (expectedUserId == null || String(expectedUserId) !== userId) return null;
    const sliceKey = include || 'cart';
    const slice = getSlice(sliceKey);

    if (!force && slice.cachedData && Date.now() - slice.cacheTimestamp < CACHE_TTL_MS) {
        return slice.cachedData;
    }
    if (slice.inFlight) return slice.inFlight.promise;

    const request = { generation };
    request.promise = (async () => {
        try {
            const url = `/api/profile?include=${encodeURIComponent(sliceKey)}`;
            const response = await fetch(url);
            if (!response.ok) throw new Error('خطا در دریافت اطلاعات پروفایل');
            const data = await response.json();
            if (request.generation !== generation) return null;
            slice.cachedData = data;
            slice.cacheTimestamp = Date.now();
            return data;
        } finally {
            if (slice.inFlight === request) slice.inFlight = null;
        }
    })();
    slice.inFlight = request;
    return request.promise;
}

export async function updateProfileCartData(cartDataPayload, expectedUserId = userId) {
    if (expectedUserId == null || String(expectedUserId) !== userId) return null;
    const requestGeneration = generation;
    const response = await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cartData: cartDataPayload }),
    });
    if (!response.ok) throw new Error('خطا در همگام‌سازی سبد خرید با سرور');
    const data = await response.json();
    if (requestGeneration !== generation) return null;
    if (data) {
        const cartSlice = getSlice('cart');
        cartSlice.cachedData = data;
        cartSlice.cacheTimestamp = Date.now();
    }
    return data;
}
