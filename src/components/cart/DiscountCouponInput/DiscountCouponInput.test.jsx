import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import DiscountCouponInput from './DiscountCouponInput';
import CartSyncProvider from '@/components/providers/CartSyncProvider';
import { useCartStore, selectFinalTotalPrice } from '@/store/useCartStore';
jest.mock('next-auth/react', () => ({ useSession: () => ({ data: null, status: 'unauthenticated' }) }));
jest.mock('@/hooks/useAccountOrders', () => ({ useAccountOrderItems: () => [] }));
jest.mock('@/lib/client/profileClientApi', () => ({ fetchProfileCartData: jest.fn(), updateProfileCartData: jest.fn() }));

beforeEach(() => {
    useCartStore.setState({ items: [{ id: 1, type: 'product', price: 101, priceNoor: 101, quantity: 1 }],
        userId: null, appliedCoupon: null, couponError: '' });
});

test('رابط پس از تغییر سبد مبلغ قدیمی را پنهان و کد را خودکار دوباره بررسی می‌کند', async () => {
    let finish;
    global.fetch = jest.fn().mockResolvedValueOnce({ ok: true, json: async () => ({
        valid: true, code: 'SALE', discountAmount: 10, originalTotalPrice: 101, finalTotalPrice: 91,
    }) }).mockReturnValueOnce(new Promise(resolve => { finish = resolve; }));
    render(<><CartSyncProvider /><DiscountCouponInput /></>);
    fireEvent.click(screen.getByText('کد تخفیف دارید؟ ثبت کد'));
    fireEvent.change(screen.getByPlaceholderText('کد تخفیف دارید؟ وارد کنید...'), { target: { value: 'SALE' } });
    fireEvent.click(screen.getByText('اعمال کد'));
    await waitFor(() => expect(selectFinalTotalPrice(useCartStore.getState())).toBe(91));
    act(() => useCartStore.getState().updateQuantity(1, 2));
    expect(screen.getByText('در حال بررسی کد برای سبد فعلی…')).toBeTruthy();
    expect(selectFinalTotalPrice(useCartStore.getState())).toBe(202);
    await act(async () => finish({ ok: true, json: async () => ({ valid: true, code: 'SALE', discountAmount: 15,
        originalTotalPrice: 202, finalTotalPrice: 187 }) }));
    expect(selectFinalTotalPrice(useCartStore.getState())).toBe(187);
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(screen.queryByText('در حال بررسی کد برای سبد فعلی…')).toBeNull();
});

test('حذف کد در زمان بررسی، پاسخ دیرهنگام را در رابط بی‌اثر می‌کند', async () => {
    let finish;
    global.fetch = jest.fn(() => new Promise(resolve => { finish = resolve; }));
    render(<><CartSyncProvider /><DiscountCouponInput /></>);
    fireEvent.click(screen.getByText('کد تخفیف دارید؟ ثبت کد'));
    fireEvent.change(screen.getByPlaceholderText('کد تخفیف دارید؟ وارد کنید...'), { target: { value: 'SALE' } });
    fireEvent.click(screen.getByText('اعمال کد'));
    fireEvent.click(screen.getByLabelText('حذف کد تخفیف'));
    await act(async () => finish({ ok: true, json: async () => ({ valid: true, code: 'SALE', discountAmount: 101,
        originalTotalPrice: 101, finalTotalPrice: 0 }) }));
    expect(screen.getByText('اعمال کد')).toBeTruthy();
    expect(useCartStore.getState().appliedCoupon).toBeNull();
    expect(selectFinalTotalPrice(useCartStore.getState())).toBe(101);
});
