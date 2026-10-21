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

// مقایسهٔ مبلغ کل و ردیف‌ها بین پیش‌نمایش استراپی و سبد بایمانی، بدون هشدار کاذب
export function sameCourseCartPrice(left, right) {
    if (!left || !right) return false;
    const signature = data => {
        const courses = [...(data.courses || [])].sort((a, b) =>
            (a.externalCourseId || '').localeCompare(b.externalCourseId || '')
        );
        const originalTotal = data.originalTotalInNoor != null
            ? Number(data.originalTotalInNoor)
            : (courses.length > 0
                ? courses.reduce((sum, item) => sum + Number(item.basePriceInNoor != null ? item.basePriceInNoor : item.priceInNoor || 0), 0)
                : Number(data.priceInNoor || 0));
        const itemDiscount = Number(data.itemDiscountInNoor || 0);
        const couponDiscount = Number(data.couponDiscountInNoor || 0);
        const price = data.priceInNoor != null
            ? Number(data.priceInNoor)
            : (originalTotal - itemDiscount - couponDiscount);

        return JSON.stringify([
            data.couponCode?.trim().toUpperCase() || null,
            originalTotal,
            itemDiscount,
            couponDiscount,
            price,
            courses.map(item => [
                item.externalCourseId,
                Number(item.basePriceInNoor != null ? item.basePriceInNoor : item.priceInNoor || 0),
            ]),
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
