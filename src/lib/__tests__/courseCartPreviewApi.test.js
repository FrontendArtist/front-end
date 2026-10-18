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
