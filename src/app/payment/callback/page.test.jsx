import { act, render } from '@testing-library/react';
import PaymentCallbackPage from './page';
import { useCartStore } from '@/store/useCartStore';
import { triggerLightUpdate } from '@/store/useLightStore';

let mockParams;
jest.mock('next/navigation', () => ({ useSearchParams: () => mockParams }));
jest.mock('next-auth/react', () => ({ useSession: () => ({ data: { user: { id: 7 } } }) }));
jest.mock('@/store/useLightStore', () => ({ triggerLightUpdate: jest.fn() }));
jest.mock('@/lib/client/profileClientApi', () => ({ invalidateProfileCache: jest.fn() }));

const purchased = { id: 42, type: 'course', quantity: 1 };
const addedLater = { id: 43, type: 'course', quantity: 1 };

beforeEach(() => {
    jest.clearAllMocks();
    useCartStore.setState({ items: [purchased, addedLater], hydratedUserId: 7, userId: 7, processedOrders: {} });
});

test('بازگشت موفق پرداخت، موجودی نور را بازخوانی و فقط اقلام تأییدشده را حذف می‌کند', async () => {
    mockParams = new URLSearchParams('status=success&orderId=paid-order');
    global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => ({
        data: [{ paymentStatus: 'paid', items: [{ courseId: 42 }] }],
    }) });
    const view = render(<PaymentCallbackPage />);
    await act(async () => {});
    expect(triggerLightUpdate).toHaveBeenCalledTimes(1);
    expect(useCartStore.getState().items).toEqual([addedLater]);
    view.unmount();
});

test('نتیجهٔ شارژ نور بدون سفارش، سبد خرید را حفظ و موجودی را بازخوانی می‌کند', async () => {
    mockParams = new URLSearchParams('status=success&source=light_topup');
    global.fetch = jest.fn();
    const view = render(<PaymentCallbackPage />);
    await act(async () => {});
    expect(triggerLightUpdate).toHaveBeenCalledTimes(1);
    expect(useCartStore.getState().items).toEqual([purchased, addedLater]);
    expect(fetch).not.toHaveBeenCalled();
    view.unmount();
});

test('پارامتر موفقیت بدون تأیید پرداخت در سرور، سبد را حذف نمی‌کند', async () => {
    mockParams = new URLSearchParams('status=success&orderId=pending-order');
    global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => ({
        data: [{ paymentStatus: 'pending_payment', items: [{ courseId: 42 }] }],
    }) });
    const view = render(<PaymentCallbackPage />);
    await act(async () => {});
    expect(useCartStore.getState().items).toEqual([purchased, addedLater]);
    view.unmount();
});
