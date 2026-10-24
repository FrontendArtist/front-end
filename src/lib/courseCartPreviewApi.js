const previews = new Map();

// درخواست هم‌زمان مشترک است؛ پیش‌نمایش هیچ رزرو یا رکورد پرداختی نمی‌سازد.
export function previewCourseCart(body, jwt, signal) {
    const itemsKey = Array.isArray(body.items)
        ? body.items.map(i => `${i.type || 'course'}:${i.externalId}:${i.quantity || 1}`).sort().join(',')
        : ([...(body.externalCourseIds || [])]).sort().join(',');
    const key = JSON.stringify([jwt, itemsKey, body.couponCode || null]);
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

// مقایسهٔ مبلغ کل، هزینه ارسال و ردیف‌ها بین پیش‌نمایش استراپی و سبد بایمانی، بدون هشدار کاذب ناشی از فیلدهای اختیاری
export function sameCourseCartPrice(left, right) {
    if (!left || !right) return false;
    const signature = data => {
        const rawRows = (Array.isArray(data.items) && data.items.length > 0)
            ? data.items
            : (Array.isArray(data.courses) ? data.courses : []);
        const rows = [...rawRows].sort((a, b) => {
            const idA = a.externalCourseId || a.externalId || '';
            const idB = b.externalCourseId || b.externalId || '';
            return idA.localeCompare(idB);
        });
        const originalTotal = Number(data.originalTotalInNoor != null ? data.originalTotalInNoor : 0);
        const itemDiscount = Number(data.itemDiscountInNoor || 0);
        const couponDiscount = Number(data.couponDiscountInNoor || 0);
        const shippingAmount = Number(data.shippingAmountInNoor || 0);
        const price = Number(data.priceInNoor != null ? data.priceInNoor : 0);

        return JSON.stringify([
            data.couponCode?.trim().toUpperCase() || null,
            originalTotal,
            itemDiscount,
            couponDiscount,
            shippingAmount,
            price,
            rows.map(item => {
                const id = item.externalCourseId || item.externalId || '';
                const unitPrice = Number(item.basePriceInNoor != null ? item.basePriceInNoor : item.unitPriceInNoor != null ? item.unitPriceInNoor : item.priceInNoor || 0);
                const quantity = Number(item.quantity != null ? item.quantity : 1);
                const lineTotal = Number(item.lineTotalInNoor != null ? item.lineTotalInNoor : (unitPrice * quantity));
                return [id, unitPrice, quantity, lineTotal];
            }),
        ]);
    };
    return signature(left) === signature(right);
}

/**
 * نگاشت یکدست قلم‌های سبد/پیش‌نمایش برای دوره‌ها و فصل‌ها
 * پیش‌نمایش استرپی: type='course' | 'course_chapter', parentExternalId
 * پاسخ بای‌مانی: itemType='Course' | 'CourseChapter', parentExternalId
 */
export function normalizeCartItemType(item) {
    if (!item) return 'course';
    const rawType = item.itemType || item.type;
    if (!rawType) return 'course';
    const str = String(rawType).toLowerCase().replace(/_/g, '');
    return str === 'coursechapter' || str === 'chapter' ? 'course_chapter' : 'course';
}

export function isCartItemChapter(item) {
    return normalizeCartItemType(item) === 'course_chapter';
}
