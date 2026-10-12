import { useCartStore } from './useCartStore';
import { cancelOrdersAfterRemoval } from '@/lib/client/cartRemovalApi';
jest.mock('@/lib/client/cartRemovalApi', () => ({ cancelOrdersAfterRemoval: jest.fn() }));
const course = { id: 42, type: 'course' };
const other = { id: 43, type: 'course' };
beforeEach(() => {
    jest.clearAllMocks();
    cancelOrdersAfterRemoval.mockResolvedValue(undefined);
    useCartStore.setState({ items: [course, other], userId: 7, removalError: null });
});

test('حذف دستی همان قلم حذف‌شده و اقلام باقی‌مانده را به سرور می‌فرستد', async () => {
    await useCartStore.getState().removeItemManually(42);
    expect(useCartStore.getState().items).toEqual([other]);
    expect(cancelOrdersAfterRemoval).toHaveBeenCalledWith(course, [other]);
    await useCartStore.getState().removeItemManually(43);
    expect(cancelOrdersAfterRemoval).toHaveBeenLastCalledWith(other, []);
});
test('پاک‌سازی خودکار و خروج از حساب درخواست لغو نمی‌فرستند', () => {
    useCartStore.getState().removeItem(42);
    useCartStore.getState().clearCart();
    expect(cancelOrdersAfterRemoval).not.toHaveBeenCalled();
});
test('سبد مهمان بدون درخواست لغو تغییر می‌کند', async () => {
    useCartStore.setState({ userId: null });
    await useCartStore.getState().removeItemManually(42);
    expect(useCartStore.getState().items).toEqual([other]);
    expect(cancelOrdersAfterRemoval).not.toHaveBeenCalled();
});
test('شکست درخواست قلم را برمی‌گرداند و خطای قابل نمایش ثبت می‌کند', async () => {
    cancelOrdersAfterRemoval.mockRejectedValue(new Error('خطای ارتباط'));
    await useCartStore.getState().removeItemManually(42);
    expect(useCartStore.getState().items).toContainEqual(course);
    expect(useCartStore.getState().removalError).toBe('خطای ارتباط');
});
test('کاهش تعداد تا صفر نیز حذف دستی محسوب می‌شود', async () => {
    const product = { id: 4, type: 'product', quantity: 1 };
    useCartStore.setState({ items: [product] });
    useCartStore.getState().updateQuantity(4, 0);
    await Promise.resolve();
    expect(cancelOrdersAfterRemoval).toHaveBeenCalledWith(product, []);
});
