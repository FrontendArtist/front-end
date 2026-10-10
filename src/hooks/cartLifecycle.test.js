import { act, renderHook, waitFor } from '@testing-library/react';
import useCartSync from './useCartSync';
import useCompletedOrderCart from './useCompletedOrderCart';
import { useCartStore } from '@/store/useCartStore';
import { useOrdersStore } from '@/store/useOrdersStore';
import { fetchProfileCartData, updateProfileCartData } from '@/lib/client/profileClientApi';

jest.mock('next-auth/react', () => ({ useSession: () => ({ data: { user: { id: 7 } }, status: 'authenticated' }) }));
jest.mock('@/lib/client/profileClientApi', () => ({
    fetchProfileCartData: jest.fn(), updateProfileCartData: jest.fn().mockResolvedValue({}), invalidateProfileCache: jest.fn(),
}));
const course = { id: 8, type: 'course' };
const chapter = { id: 'chapter-2', chapterId: 2, courseId: 8, type: 'chapter' };
const otherChapter = { id: 'chapter-3', chapterId: 3, courseId: 8, type: 'chapter' };

beforeEach(() => {
    jest.clearAllMocks();
    useCartStore.setState({ items: [], hydratedUserId: null, processedOrders: {}, userId: 7 });
    useOrdersStore.setState({ orders: [] });
});
afterEach(() => jest.useRealTimers());

test('شکست بازیابی نیز اجازهٔ نوشتن سبد خالی نمی‌دهد و با اتصال دوباره بازیابی می‌شود', async () => {
    jest.useFakeTimers();
    const log = jest.spyOn(console, 'error').mockImplementation(() => {});
    fetchProfileCartData.mockRejectedValueOnce(new Error('قطع ارتباط'))
        .mockResolvedValueOnce({ cartData: { state: { items: [course] } } });
    const { unmount } = renderHook(() => useCartSync());
    await act(async () => {});
    await act(async () => { jest.advanceTimersByTime(5000); });
    expect(updateProfileCartData).not.toHaveBeenCalled();
    await act(async () => { window.dispatchEvent(new Event('online')); });
    expect(useCartStore.getState().items).toEqual([course]);
    expect(useCartStore.getState().hydratedUserId).toBe(7);
    unmount();
    log.mockRestore();
});

test('پاسخ کند پروفایل باعث ذخیره سبد خالی نمی‌شود', async () => {
    jest.useFakeTimers();
    let resolve;
    fetchProfileCartData.mockReturnValue(new Promise((r) => { resolve = r; }));
    const { unmount } = renderHook(() => useCartSync());
    await act(async () => { jest.advanceTimersByTime(5000); });
    expect(updateProfileCartData).not.toHaveBeenCalled();
    await act(async () => { resolve({ cartData: { state: { items: [course] } } }); });
    expect(useCartStore.getState().items).toEqual([course]);
    await act(async () => { jest.advanceTimersByTime(2000); });
    expect(updateProfileCartData).toHaveBeenCalledWith(expect.objectContaining({ state: expect.objectContaining({ items: [course] }) }));
    unmount();
});

test('پاسخ دیرهنگام اقلامی را که کاربر اضافه کرده بازنویسی نمی‌کند', async () => {
    let resolve;
    fetchProfileCartData.mockReturnValue(new Promise((r) => { resolve = r; }));
    const { unmount } = renderHook(() => useCartSync());
    act(() => useCartStore.setState({ items: [otherChapter] }));
    await act(async () => resolve({ cartData: { state: { items: [course] } } }));
    expect(useCartStore.getState().items).toEqual([otherChapter]);
    unmount();
});

test('خرید فصل، دوره و فصل دیگر را از سبد حذف نمی‌کند', async () => {
    fetchProfileCartData.mockResolvedValue({ cartData: null });
    useCartStore.setState({ items: [course, chapter, otherChapter] });
    useOrdersStore.setState({ orders: [{ paymentStatus: 'paid', items: [{ __component: 'order.course-order-item', courseId: 8, chapterId: 2 }] }] });
    const { unmount } = renderHook(() => useCartSync());
    await waitFor(() => expect(useCartStore.getState().hydratedUserId).toBe(7));
    expect(useCartStore.getState().items).toEqual([course, otherChapter]);
    unmount();
});

test.each(['pending_payment', 'paid'])('پاک‌سازی نتیجه وابسته به تأیید سرور است: %s', async (paymentStatus) => {
    useCartStore.setState({ items: [course, otherChapter], hydratedUserId: 7 });
    global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => ({ data: [{ paymentStatus, items: [{ courseId: 8 }] }] }) });
    const { unmount } = renderHook(() => useCompletedOrderCart('success', 'order-one'));
    await act(async () => {});
    expect(useCartStore.getState().items).toEqual(paymentStatus === 'paid' ? [otherChapter] : [course, otherChapter]);
    unmount();
});

test('نتیجهٔ بدون شناسه سفارش سبد را پاک نمی‌کند', () => {
    useCartStore.setState({ items: [course], hydratedUserId: 7 });
    global.fetch = jest.fn();
    const { unmount } = renderHook(() => useCompletedOrderCart('success', null));
    expect(global.fetch).not.toHaveBeenCalled();
    expect(useCartStore.getState().items).toEqual([course]);
    unmount();
});

test('بازکردن دوبارهٔ رسید موفق محصول تازه‌افزوده‌شده را حذف نمی‌کند', async () => {
    const product = { id: 5, type: 'product', quantity: 1 };
    useCartStore.setState({ items: [product, course], hydratedUserId: 7 });
    global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => ({ data: [{ paymentStatus: 'paid', items: [{ productId: 5, quantity: 1 }] }] }) });
    const first = renderHook(() => useCompletedOrderCart('success', 'paid-one'));
    await act(async () => {});
    expect(useCartStore.getState().items).toEqual([course]);
    first.unmount();
    act(() => useCartStore.setState({ items: [course, product] }));
    const second = renderHook(() => useCompletedOrderCart('success', 'paid-one'));
    await act(async () => {});
    expect(useCartStore.getState().items).toEqual([course, product]);
    expect(fetch).toHaveBeenCalledTimes(1);
    second.unmount();
});

test.each(['cancel', 'failed'])('نتیجهٔ %s هیچ قلمی را پاک نمی‌کند', async (status) => {
    useCartStore.setState({ items: [course, chapter], hydratedUserId: 7 });
    global.fetch = jest.fn();
    const { unmount } = renderHook(() => useCompletedOrderCart(status, 'unpaid-one'));
    await act(async () => {});
    expect(useCartStore.getState().items).toEqual([course, chapter]);
    expect(fetch).not.toHaveBeenCalled();
    unmount();
});

test('اختلال استعلام سفارش باعث حذف سبد یا علامت‌گذاری نتیجه نمی‌شود', async () => {
    useCartStore.setState({ items: [course], hydratedUserId: 7 });
    global.fetch = jest.fn().mockRejectedValue(new Error('قطع ارتباط'));
    const { unmount } = renderHook(() => useCompletedOrderCart('success', 'unknown-one'));
    await act(async () => {});
    expect(useCartStore.getState().items).toEqual([course]);
    expect(useCartStore.getState().processedOrders).toEqual({});
    unmount();
});
