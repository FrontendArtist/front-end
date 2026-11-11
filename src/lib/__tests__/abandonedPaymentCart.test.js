import { act, renderHook } from '@testing-library/react';
import { invalidatePaymentConnection } from '@/lib/client/paymentConnection';
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
    invalidatePaymentConnection();
    useCartStore.setState({ items: [item], appliedCoupon: null, userId: 7, hydratedUserId: null });
    useOrdersStore.setState({ userId: '7', hasFetched: true, orders: [] });
    jest.clearAllMocks();
});

afterEach(() => {
    jest.restoreAllMocks();
    jest.useRealTimers();
    global.fetch = originalFetch;
    document.querySelectorAll('form').forEach((form) => form.remove());
});

test.each([
    ['pending', 'pending_payment'],
    ['canceled', 'failed'],
])('همگام‌سازی سفارش %s با پرداخت %s سبد را پاک نمی‌کند', async (orderStatus, paymentStatus) => {
    useOrdersStore.setState({ userId: '7', hasFetched: true, orders: [{ orderStatus, paymentStatus, paymentMethod: 'online', items: [item] }] });
    const { unmount } = renderHook(() => useCartSync());
    await act(async () => {});
    expect(useCartStore.getState().items).toEqual([item]);
    expect(updateProfileCartData).not.toHaveBeenCalledWith(null, 7);
    unmount();
});

test('همگام‌سازی پرداخت موفق همچنان دورهٔ خریداری‌شده را حذف می‌کند', async () => {
    jest.useFakeTimers();
    useOrdersStore.setState({ userId: '7', hasFetched: true, orders: [{ orderStatus: 'paid', paymentStatus: 'paid', items: [item] }] });
    const { unmount } = renderHook(() => useCartSync());
    await act(async () => {});
    expect(useCartStore.getState().items).toEqual([]);
    await act(async () => { jest.advanceTimersByTime(2000); });
    expect(updateProfileCartData).toHaveBeenCalledWith(null, 7);
    unmount();
});
