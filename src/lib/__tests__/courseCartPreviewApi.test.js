import { previewCourseCart, sameCourseCartPrice } from '../courseCartPreviewApi';
test('درخواست هم‌زمان مشترک است و لغو مصرف‌کننده پاسخ مشترک را از بین نمی‌برد', async () => {
    let finish;
    global.fetch = jest.fn(() => new Promise(resolve => { finish = resolve; }));
    const controller = new AbortController();
    const body = { externalCourseIds: ['one'], couponCode: null };
    const first = previewCourseCart(body, 'jwt', controller.signal);
    const second = previewCourseCart(body, 'jwt');
    controller.abort();
    finish({ ok: true, json: async () => ({ priceInNoor: 105 }) });
    await expect(first).rejects.toMatchObject({ name: 'AbortError' });
    await expect(second).resolves.toEqual({ priceInNoor: 105 });
    expect(fetch).toHaveBeenCalledTimes(1);
});
test('تغییر سهم ردیف با ثابت‌ماندن جمع نیز به تأیید جدید نیاز دارد', () => {
    const left = { priceInNoor: 100, courses: [{ externalCourseId: 'one', priceInNoor: 40 }, { externalCourseId: 'two', priceInNoor: 60 }] };
    expect(sameCourseCartPrice(left, { ...left, courses: [...left.courses].reverse() })).toBe(true);
    expect(sameCourseCartPrice(left, { ...left, courses: [{ ...left.courses[0], priceInNoor: 50 }, { ...left.courses[1], priceInNoor: 50 }] })).toBe(false);
});

test('دو دورهٔ ۱۰۵ نوری با کوپن ۲۱: پیش‌نمایش استراپی و سبد جدید بای‌مانی بدون هشدار کاذب تطابق دارند', () => {
    const strapiPreview = {
        couponCode: 'ALL10',
        originalTotalInNoor: 210,
        itemDiscountInNoor: 0,
        couponDiscountInNoor: 21,
        priceInNoor: 189,
        courses: [
            { externalCourseId: 'course-1', title: 'دوره ۱', basePriceInNoor: 105, itemDiscountInNoor: 0, couponDiscountInNoor: 11, priceInNoor: 94 },
            { externalCourseId: 'course-2', title: 'دوره ۲', basePriceInNoor: 105, itemDiscountInNoor: 0, couponDiscountInNoor: 10, priceInNoor: 95 },
        ],
    };
    const byeMoneyCart = {
        cartId: 'cart-uuid',
        status: 'Ready',
        couponCode: 'ALL10',
        originalTotalInNoor: 210,
        itemDiscountInNoor: 0,
        couponDiscountInNoor: 21,
        priceInNoor: 189,
        courses: [
            { externalCourseId: 'course-1', title: 'دوره ۱', priceInNoor: 105, purchaseStatus: 'NotPurchased' },
            { externalCourseId: 'course-2', title: 'دوره ۲', priceInNoor: 105, purchaseStatus: 'NotPurchased' },
        ],
    };
    expect(sameCourseCartPrice(strapiPreview, byeMoneyCart)).toBe(true);
});

test('ترکیب تخفیف دوره و کوپن بین پیش‌نمایش و سبد بای‌مانی تطابق دارد', () => {
    const strapiPreview = {
        couponCode: 'DISCOUNT',
        originalTotalInNoor: 300,
        itemDiscountInNoor: 30,
        couponDiscountInNoor: 27,
        priceInNoor: 243,
        courses: [
            { externalCourseId: 'c1', title: 'دوره تخفیف‌دار', basePriceInNoor: 100, itemDiscountInNoor: 30, couponDiscountInNoor: 7, priceInNoor: 63 },
            { externalCourseId: 'c2', title: 'دوره عادی', basePriceInNoor: 200, itemDiscountInNoor: 0, couponDiscountInNoor: 20, priceInNoor: 180 },
        ],
    };
    const byeMoneyCart = {
        cartId: 'cart-uuid',
        status: 'Ready',
        couponCode: 'DISCOUNT',
        originalTotalInNoor: 300,
        itemDiscountInNoor: 30,
        couponDiscountInNoor: 27,
        priceInNoor: 243,
        courses: [
            { externalCourseId: 'c1', title: 'دوره تخفیف‌دار', priceInNoor: 100, purchaseStatus: 'NotPurchased' },
            { externalCourseId: 'c2', title: 'دوره عادی', priceInNoor: 200, purchaseStatus: 'NotPurchased' },
        ],
    };
    expect(sameCourseCartPrice(strapiPreview, byeMoneyCart)).toBe(true);
});

test('تغییر واقعی قیمت پایه یا تخفیف سبد هشدار معتبر می‌سازد', () => {
    const strapiPreview = {
        couponCode: 'ALL10',
        originalTotalInNoor: 210,
        itemDiscountInNoor: 0,
        couponDiscountInNoor: 21,
        priceInNoor: 189,
        courses: [
            { externalCourseId: 'course-1', basePriceInNoor: 105, priceInNoor: 94 },
            { externalCourseId: 'course-2', basePriceInNoor: 105, priceInNoor: 95 },
        ],
    };
    // تغییر قیمت پایه یک دوره
    const repriced = {
        ...strapiPreview,
        originalTotalInNoor: 230,
        priceInNoor: 207,
        courses: [
            { externalCourseId: 'course-1', priceInNoor: 125 },
            { externalCourseId: 'course-2', priceInNoor: 105 },
        ],
    };
    expect(sameCourseCartPrice(strapiPreview, repriced)).toBe(false);

    // تغییر تخفیف کوپن
    const couponChanged = {
        ...strapiPreview,
        couponDiscountInNoor: 0,
        priceInNoor: 210,
        courses: [
            { externalCourseId: 'course-1', priceInNoor: 105 },
            { externalCourseId: 'course-2', priceInNoor: 105 },
        ],
    };
    expect(sameCourseCartPrice(strapiPreview, couponChanged)).toBe(false);
});

test('خرید رایگان و تخفیف کامل بین پیش‌نمایش و بای‌مانی تطابق دارند', () => {
    const strapiPreview = {
        couponCode: 'FREE100',
        originalTotalInNoor: 105,
        itemDiscountInNoor: 0,
        couponDiscountInNoor: 105,
        priceInNoor: 0,
        courses: [
            { externalCourseId: 'free-c', title: 'دوره رایگان‌شده', basePriceInNoor: 105, itemDiscountInNoor: 0, couponDiscountInNoor: 105, priceInNoor: 0 },
        ],
    };
    const byeMoneyCart = {
        cartId: 'free-cart',
        status: 'Ready',
        couponCode: 'FREE100',
        originalTotalInNoor: 105,
        itemDiscountInNoor: 0,
        couponDiscountInNoor: 105,
        priceInNoor: 0,
        courses: [
            { externalCourseId: 'free-c', title: 'دوره رایگان‌شده', priceInNoor: 105, purchaseStatus: 'NotPurchased' },
        ],
    };
    expect(sameCourseCartPrice(strapiPreview, byeMoneyCart)).toBe(true);
});

