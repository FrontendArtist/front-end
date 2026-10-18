const previews = new Map();

// درخواست هم‌زمان مشترک است؛ پیش‌نمایش هیچ رزرو یا رکورد پرداختی نمی‌سازد.
export function previewCourseCart(body, jwt, signal) {
    const key = JSON.stringify([jwt, [...body.externalCourseIds].sort(), body.couponCode || null]);
    let pending = previews.get(key);
    if (!pending) {
        pending = fetch('/api/course-carts/preview', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body), cache: 'no-store',
        }).then(async response => {
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'بررسی قیمت سبد ممکن نیست.');
            return data;
        });
        previews.set(key, pending);
        const cleanup = () => { if (previews.get(key) === pending) previews.delete(key); };
        pending.then(cleanup, cleanup);
    }
    return pending.then(data => {
        if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');
        return data;
    });
}

// مقایسهٔ مبلغ کل و ردیف‌ها، حتی اگر جمع ثابت و سهم دوره‌ها عوض شده باشد.
export function sameCourseCartPrice(left, right) {
    const signature = data => JSON.stringify([
        data.couponCode?.trim().toUpperCase() || null,
        data.originalTotalInNoor, data.itemDiscountInNoor, data.couponDiscountInNoor, data.priceInNoor,
        [...(data.courses || [])].sort((a, b) => a.externalCourseId.localeCompare(b.externalCourseId))
            .map(item => [item.externalCourseId, item.basePriceInNoor, item.itemDiscountInNoor, item.couponDiscountInNoor, item.priceInNoor]),
    ]);
    return signature(left) === signature(right);
}
