import { useCartStore, selectCouponDiscount, selectFinalTotalPrice, selectCouponPending } from '../useCartStore';
import { cancelOrdersAfterRemoval } from '@/lib/client/cartRemovalApi';
jest.mock('@/lib/client/cartRemovalApi', () => ({ cancelOrdersAfterRemoval: jest.fn() }));

const product = { id: 'A', type: 'product', priceNoor: 101, quantity: 1 };
const state = () => useCartStore.getState();
const response = (discount = 10, total = 101) => ({ ok: true, json: async () => ({ valid: true,
    code: 'ONLY-A', discountAmount: discount, originalTotalPrice: total, finalTotalPrice: total - discount }) });
const deferred = () => { let resolve; const promise = new Promise(r => { resolve = r; }); return { promise, resolve }; };
beforeEach(() => {
    useCartStore.setState({ items: [product], userId: 7, appliedCoupon: null, couponError: '', processedOrders: {} });
    global.fetch = jest.fn().mockResolvedValue(response());
    cancelOrdersAfterRemoval.mockResolvedValue(undefined);
});

test('حذف آخرین قلم و افزودن قلم نامرتبط، کد و مبلغ قبلی را برنمی‌گرداند', async () => {
    await state().validateCoupon('ONLY-A');
    expect(selectFinalTotalPrice(state())).toBe(91);
    await state().removeItemManually('A');
    state().addItem({ id: 'B', type: 'product', priceNoor: 3 });
    expect(state().appliedCoupon).toBeNull();
    expect(selectFinalTotalPrice(state())).toBe(3);
});

test.each([
    () => state().addItem({ id: 'B', type: 'product', priceNoor: 23 }),
    () => state().updateQuantity('A', 2),
    () => state().removeItem('A'),
    () => state().removePaidCoursesAndChapters({ courseIds: [42] }),
    () => useCartStore.setState({ items: [{ ...product, priceNoor: 91, price: 91 }] }),
])('تغییر اقلام یا قیمت، مبلغ قبلی را پیش از بررسی مجدد بی‌اعتبار می‌کند (%#)', async change => {
    state().addItem({ id: 42, type: 'course', priceNoor: 10 });
    state().applyCoupon({ code: 'ONLY-A', discountAmount: 100 });
    change();
    expect(selectCouponDiscount(state())).toBe(0);
    expect(selectCouponPending(state())).toBe(true);
});

test('کد معتبر با تعداد جدید حفظ و مبلغ پاسخ جدید استفاده می‌شود', async () => {
    await state().validateCoupon('ONLY-A');
    state().updateQuantity('A', 2);
    expect(state().appliedCoupon.code).toBe('ONLY-A');
    expect(selectCouponDiscount(state())).toBe(0);
    fetch.mockResolvedValue(response(20, 202));
    await state().validateCoupon(state().appliedCoupon.code);
    expect(JSON.parse(fetch.mock.calls[1][1].body)).toMatchObject({ currentTotal: 202, cartItems: [{ quantity: 2 }] });
    expect(selectFinalTotalPrice(state())).toBe(182);
});

test.each(['حداقل مبلغ سفارش رعایت نشده است.', 'کد برای اقلام فعلی معتبر نیست.'])('رد سرور پس از تغییر سبد، کد و تخفیف را حذف می‌کند (%s)', async message => {
    await state().validateCoupon('ONLY-A');
    state().addItem({ id: 'B', type: 'product', priceNoor: 3 });
    fetch.mockResolvedValue({ ok: true, json: async () => ({ valid: false, message }) });
    await state().validateCoupon('ONLY-A');
    expect(state().appliedCoupon).toBeNull();
    expect(state().couponError).toBe(message);
    expect(selectFinalTotalPrice(state())).toBe(104);
});

test('پاسخ دیرهنگام سبد اول روی سبد جدید یا کوپن حذف‌شده اعمال نمی‌شود', async () => {
    const old = deferred(); fetch.mockReturnValueOnce(old.promise);
    const first = state().validateCoupon('ONLY-A');
    state().updateQuantity('A', 2);
    fetch.mockResolvedValue(response(20, 202));
    await state().validateCoupon('ONLY-A');
    old.resolve(response(10)); await first;
    expect(selectCouponDiscount(state())).toBe(20);
    const later = deferred(); fetch.mockReturnValueOnce(later.promise);
    const request = state().validateCoupon('ONLY-A');
    state().removeCoupon(); later.resolve(response(20, 202)); await request;
    expect(state().appliedCoupon).toBeNull();
});

test('تغییر حساب و بازگشت به همان اقلام نیز پاسخ قدیمی را معتبر نمی‌کند', async () => {
    const old = deferred(); fetch.mockReturnValueOnce(old.promise);
    const request = state().validateCoupon('ONLY-A');
    state().setCartUser(8); state().addItem(product);
    old.resolve(response()); await request;
    expect(state().appliedCoupon).toBeNull();
});

test('حافظه قدیمی فقط کد را برای بررسی مجدد برمی‌گرداند', async () => {
    localStorage.setItem('cart-storage', JSON.stringify({ version: 2, state: {
        items: [product], userId: 7, appliedCoupon: { code: 'ONLY-A', discountAmount: 1000 },
    } }));
    await useCartStore.persist.rehydrate();
    expect(state().appliedCoupon).toEqual({ code: 'ONLY-A', pending: true });
    expect(selectCouponDiscount(state())).toBe(0);
    await state().validateCoupon('ONLY-A');
    expect(selectCouponDiscount(state())).toBe(10);
    expect(JSON.parse(localStorage.getItem('cart-storage')).state.appliedCoupon).toEqual({ code: 'ONLY-A', pending: true });
});

test('خطای ارتباط و پاسخ مالی ناسازگار، تخفیف معتبر نمی‌سازند', async () => {
    fetch.mockRejectedValueOnce(new Error('offline'));
    await state().validateCoupon('ONLY-A');
    expect(state().couponError).toBeTruthy(); expect(state().appliedCoupon).toBeNull();
    fetch.mockResolvedValue(response(1000));
    await state().validateCoupon('ONLY-A');
    expect(state().appliedCoupon).toBeNull(); expect(selectFinalTotalPrice(state())).toBe(101);
});

test('قیمت داخلی تخفیف‌خورده با همگام‌سازی هویت از بین نمی‌رود', () => {
    state().clearCart();
    state().addItem({ id: 42, type: 'course', priceNoor: 91, originalPriceNoor: 101, internationalPrice: 200 });
    state().updateUserPricing(false); expect(state().items[0].priceNoor).toBe(91);
    state().updateUserPricing(true); expect(state().items[0].priceNoor).toBe(200);
    state().updateUserPricing(false); expect(state().items[0].priceNoor).toBe(91);
    expect(state().items[0].originalPriceNoor).toBe(101);
});
