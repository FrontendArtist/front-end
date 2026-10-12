import { act, renderHook } from '@testing-library/react';
import { executeOnlinePayment } from '@/lib/checkoutService';
import { useCartStore } from '@/store/useCartStore';
import { useOrdersStore } from '@/store/useOrdersStore';
import useCartSync from '@/hooks/useCartSync';
import { updateProfileCartData } from '@/lib/client/profileClientApi';

jest.mock('next-auth/react', () => ({
    useSession: () => ({ status: 'authenticated', data: { user: { id: 7 } } }),
}));
jest.mock('@/lib/client/profileClientApi', () => ({
    fetchProfileCartData: jest.fn().mockResolvedValue({ cartData: null }),
    updateProfileCartData: jest.fn().mockResolvedValue({}),
}));

const item = { id: 42, courseId: 42, type: 'course', slug: 'course-one', title: 'دوره', price: 100, quantity: 1 };
const originalFetch = global.fetch;

beforeEach(() => {
    useCartStore.setState({ items: [item], appliedCoupon: null, userId: 7, hydratedUserId: null });
    useOrdersStore.setState({ orders: [] });
    jest.clearAllMocks();
});

afterEach(() => {
    jest.restoreAllMocks();
    jest.useRealTimers();
    global.fetch = originalFetch;
    document.querySelectorAll('form').forEach((form) => form.remove());
});

const mockCheckout = (tokenResponse) => {
    global.fetch = jest.fn()
        .mockResolvedValueOnce({ ok: true, json: async () => ({ success: true, isVpn: false }) })
        .mockResolvedValueOnce({ ok: true, json: async () => ({ data: { documentId: 'order-one' } }) })
        .mockResolvedValueOnce(tokenResponse);
};

test('سفارش رایگان شناسهٔ سفارش را برای پاک‌سازی محدود به نتیجه می‌فرستد', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => ({ data: {
        documentId: 'free-one', paymentMethod: 'free', paymentStatus: 'paid', totalPrice: 0,
    } }) });
    const router = { push: jest.fn() };
    await executeOnlinePayment({ items: [item], finalTotalPrice: 0, router });
    expect(router.push).toHaveBeenCalledWith('/checkout/result?status=success&source=free&orderId=free-one');
    expect(useCartStore.getState().items).toEqual([item]);
});

test('ورود به درگاه بدون دریافت نتیجهٔ پرداخت اقلام سبد را حفظ می‌کند', async () => {
    mockCheckout({ ok: true, json: async () => ({ success: true, token: 'test-token' }) });
    const submit = jest.spyOn(HTMLFormElement.prototype, 'submit').mockImplementation(() => {});
    await executeOnlinePayment({ items: [item], finalTotalPrice: 100 });
    expect(submit).toHaveBeenCalledTimes(1);
    expect(useCartStore.getState().items).toEqual([item]);
    expect(JSON.parse(localStorage.getItem('cart-storage')).state.items).toEqual([item]);
    expect(updateProfileCartData).not.toHaveBeenCalled();
});

test('شکست دریافت توکن، سبد را برای تلاش مجدد نگه می‌دارد', async () => {
    mockCheckout({ ok: false, json: async () => ({ message: 'خطای درگاه' }) });
    await expect(executeOnlinePayment({ items: [item], finalTotalPrice: 100 })).rejects.toThrow('خطای درگاه');
    expect(useCartStore.getState().items).toEqual([item]);
});

test.each([
    ['pending', 'pending_payment'],
    ['canceled', 'failed'],
])('همگام‌سازی سفارش %s با پرداخت %s سبد را پاک نمی‌کند', async (orderStatus, paymentStatus) => {
    useOrdersStore.setState({ orders: [{ orderStatus, paymentStatus, paymentMethod: 'online', items: [item] }] });
    const { unmount } = renderHook(() => useCartSync());
    await act(async () => {});
    expect(useCartStore.getState().items).toEqual([item]);
    expect(updateProfileCartData).not.toHaveBeenCalledWith(null);
    unmount();
});

test('همگام‌سازی پرداخت موفق همچنان دورهٔ خریداری‌شده را حذف می‌کند', async () => {
    jest.useFakeTimers();
    useOrdersStore.setState({ orders: [{ orderStatus: 'paid', paymentStatus: 'paid', items: [item] }] });
    const { unmount } = renderHook(() => useCartSync());
    await act(async () => {});
    expect(useCartStore.getState().items).toEqual([]);
    await act(async () => { jest.advanceTimersByTime(2000); });
    expect(updateProfileCartData).toHaveBeenCalledWith(null);
    unmount();
});
