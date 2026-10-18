import { getCourseCartId, prepareCourseCart, getCourseCart, getExistingCourseCartId } from '../courseCartApi';

beforeEach(() => sessionStorage.clear());

const ready = cartId => ({ cartId, status: 'Ready', expiresAtUtc: '2099-01-01T00:00:00Z' });
const response = data => ({ ok: true, json: async () => data });

test('شناسهٔ پرداخت فقط‌خواندنی فقط پس از آماده‌سازی واقعی قابل بازیابی است', async () => {
    const userId = 'preview-user';
    const ids = ['preview-course'];
    global.fetch = jest.fn();
    expect(getExistingCourseCartId(userId, ids, null)).toBeNull();
    expect(sessionStorage.length).toBe(0);
    const id = getCourseCartId(userId, ids, null, 1);
    expect(getExistingCourseCartId(userId, ids, null, 1)).toBeNull();
    fetch.mockResolvedValueOnce(response(ready(id)));
    await prepareCourseCart({ cartId: id, externalCourseIds: ids, couponCode: null }, 'jwt');
    expect(getExistingCourseCartId(userId, ids, null, 1)).toBe(id);
    expect(getExistingCourseCartId(userId, ids, null, 2)).toBeNull();
    expect(getExistingCourseCartId('other', ids, null, 1)).toBeNull();
    fetch.mockResolvedValueOnce(response({ cartId: id, status: 'AwaitingTopUp' }));
    await getCourseCart(id, 'jwt');
    expect(getExistingCourseCartId(userId, ids, null, 2)).toBe(id);
});

test('لغو مصرف‌کننده درخواست مشترک را قطع نمی‌کند و دو آماده‌سازی یک رزرو دارند', async () => {
    let finish;
    global.fetch = jest.fn(() => new Promise(resolve => { finish = resolve; }));
    const body = { cartId: getCourseCartId(7, ['shared'], null), externalCourseIds: ['shared'], couponCode: null };
    const controller = new AbortController();
    const first = prepareCourseCart(body, 'jwt', controller.signal);
    const second = prepareCourseCart(body, 'jwt');
    const canceled = expect(first).rejects.toMatchObject({ name: 'AbortError' });
    controller.abort();
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(fetch.mock.calls[0][1].signal).toBeUndefined();
    finish(response(ready(body.cartId)));
    await canceled;
    await expect(second).resolves.toMatchObject({ status: 'Ready' });
});

test('حذف و افزودن همان دوره رزرو قبلی را پیش از دریافت قیمت روز آزاد می‌کند', async () => {
    const first = getCourseCartId(7, ['repriced'], 'LAST', 1);
    global.fetch = jest.fn().mockResolvedValueOnce(response(ready(first)));
    await prepareCourseCart({ cartId: first, externalCourseIds: ['repriced'], couponCode: 'LAST' }, 'jwt');
    const next = getCourseCartId(7, ['repriced'], 'LAST', 3);
    expect(next).not.toBe(first);
    fetch.mockResolvedValueOnce(response({ cartId: first, status: 'Failed' }))
        .mockResolvedValueOnce(response({ ...ready(next), priceInNoor: 250 }));
    await expect(prepareCourseCart({ cartId: next, externalCourseIds: ['repriced'], couponCode: 'LAST' }, 'jwt'))
        .resolves.toMatchObject({ priceInNoor: 250 });
    expect(fetch.mock.calls[1][0]).toContain(`/${first}/cancel`);
    expect(fetch.mock.calls[2][0]).toContain('/checkout');
});

test('خطای آزادسازی مانع رزرو تازه می‌شود و تلاش مجدد همان لغو را تکرار می‌کند', async () => {
    const first = getCourseCartId(7, ['before'], 'LAST');
    global.fetch = jest.fn().mockResolvedValueOnce(response(ready(first)));
    await prepareCourseCart({ cartId: first, externalCourseIds: ['before'], couponCode: 'LAST' }, 'jwt');
    const next = getCourseCartId(7, ['after'], 'LAST');
    const body = { cartId: next, externalCourseIds: ['after'], couponCode: 'LAST' };
    fetch.mockResolvedValueOnce({ ok: false, json: async () => ({ code: 'CART_UNAVAILABLE' }) });
    await expect(prepareCourseCart(body, 'jwt')).rejects.toMatchObject({ code: 'CART_UNAVAILABLE' });
    expect(fetch).toHaveBeenCalledTimes(2);
    fetch.mockResolvedValueOnce(response({ cartId: first, status: 'Failed' })).mockResolvedValueOnce(response(ready(next)));
    await prepareCourseCart(body, 'jwt');
    expect(fetch.mock.calls[2][0]).toContain(`/${first}/cancel`);
});

test.each(['AwaitingTopUp', 'Paid'])('سبد %s هنگام تغییر انتخاب و بازگشت، دوباره قیمت‌گذاری نمی‌شود', async status => {
    const first = getCourseCartId(7, ['bank'], null, 1);
    global.fetch = jest.fn().mockResolvedValueOnce(response(ready(first)));
    await prepareCourseCart({ cartId: first, externalCourseIds: ['bank'], couponCode: null }, 'jwt');
    // شارژ در route سرور ساخته شده و مرورگر هنوز وضعیت تازه را دریافت نکرده است.
    const next = getCourseCartId(7, ['bank'], null, 3);
    fetch.mockResolvedValueOnce(response({ cartId: first, status, priceInNoor: 105 }));
    await expect(prepareCourseCart({ cartId: next, externalCourseIds: ['bank'], couponCode: null }, 'jwt'))
        .resolves.toMatchObject({ cartId: first, status, priceInNoor: 105 });
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(getCourseCartId(7, ['bank'], null, 4)).toBe(first);
});

test('شناسه تکرار برای همان کاربر، اقلام و کوپن ثابت می‌ماند', () => {
    const id = getCourseCartId(7, ['one', 'two'], 'ALL10');
    expect(getCourseCartId(7, ['two', 'one'], 'ALL10')).toBe(id);
    expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
});

test('تغییر کوپن، اقلام یا کاربر شناسه جدید می‌سازد', () => {
    const ids = [
        getCourseCartId(7, ['one', 'two'], 'ALL10'),
        getCourseCartId(7, ['one', 'two'], 'OTHER'),
        getCourseCartId(7, ['one'], 'ALL10'),
        getCourseCartId(8, ['one', 'two'], 'ALL10'),
    ];
    expect(new Set(ids).size).toBe(4);
});

test('پس از انقضای قیمت، بررسی مجدد شناسه همان سبد را حفظ می‌کند', () => {
    const oldId = getCourseCartId(7, ['one'], null);
    sessionStorage.setItem(`course-cart-expiry:${oldId}`, '2000-01-01T00:00:00Z');
    expect(getCourseCartId(7, ['one'], null)).toBe(oldId);
});

test('فقط انتخاب دوره و کوپن برای محاسبه معتبر به سرور فرستاده می‌شود', async () => {
    const body = { cartId: 'cart-1', externalCourseIds: ['one', 'two'], couponCode: 'ALL10' };
    global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => ({ status: 'Ready', priceInNoor: 189 }) });
    expect((await prepareCourseCart(body, 'jwt')).priceInNoor).toBe(189);
    expect(JSON.parse(fetch.mock.calls[0][1].body)).toEqual(body);
    expect(fetch.mock.calls[0][1].headers.Authorization).toBe('Bearer jwt');
});

test.each(['Failed', 'Expired'])('سبد %s در بررسی بعدی همان شناسه را دارد', async status => {
    const id = getCourseCartId(7, ['failed-course'], null);
    global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => ({ status }) });
    await prepareCourseCart({ cartId: id, externalCourseIds: ['failed-course'], couponCode: null }, 'jwt');
    expect(getCourseCartId(7, ['failed-course'], null)).toBe(id);
});

test('استعلام شکست قطعی، حفاظت انتظار قدیمی مرورگر را پاک می‌کند', async () => {
    const id = getCourseCartId(7, ['bank-back'], null, 1);
    sessionStorage.setItem(`course-cart-status:${id}`, 'AwaitingTopUp');
    global.fetch = jest.fn().mockResolvedValue(response({ cartId: id, status: 'Failed', topUpStatus: 'Rejected' }));
    await getCourseCart(id, 'jwt');
    expect(sessionStorage.getItem(`course-cart-status:${id}`)).toBe('Failed');
    expect(getCourseCartId(7, ['bank-back'], null, 1)).toBe(id);
});

test('مسدودبودن حافظه مرورگر مانع ساخت و تثبیت سبد نمی‌شود', async () => {
    const get = jest.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('blocked'); });
    const set = jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('blocked'); });
    const remove = jest.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => { throw new Error('blocked'); });
    try {
        const id = getCourseCartId(7, ['storage-denied'], 'COUPON');
        expect(getCourseCartId(7, ['storage-denied'], 'COUPON')).toBe(id);
        global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => ({ status: 'Ready', expiresAtUtc: '2099-01-01T00:00:00Z' }) });
        await expect(prepareCourseCart({ cartId: id, externalCourseIds: ['storage-denied'], couponCode: 'COUPON' }, 'jwt')).resolves.toEqual(expect.objectContaining({ status: 'Ready' }));
    } finally { get.mockRestore(); set.mockRestore(); remove.mockRestore(); }
});
