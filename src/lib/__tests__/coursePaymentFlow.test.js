import { executeNoorCoursePurchase } from '../checkoutService';
import { useCartStore } from '@/store/useCartStore';

jest.mock('@/lib/client/paymentConnection', () => ({ ensurePaymentConnection: jest.fn().mockResolvedValue({ isVpn: false }) }));
jest.mock('@/store/useLightStore', () => ({ triggerLightUpdate: jest.fn() }));
jest.mock('@/lib/client/profileClientApi', () => ({ invalidateProfileCache: jest.fn() }));

const course = { id: 42, type: 'course', documentId: 'hurw1wvbvfvgtse1c66s20od', price: 101 };
const insufficientResponse = {
    errorCode: 'INSUFFICIENT_NOOR_BALANCE',
    currentBalanceInNoor: 0,
    priceInNoor: 101,
    shortfallInNoor: 101,
    pendingItems: [{ itemType: 1, externalId: course.documentId, priceNoorSnapshot: 101 }],
};
let submit;

beforeEach(() => {
    useCartStore.setState({ items: [course], appliedCoupon: null });
    submit = jest.spyOn(HTMLFormElement.prototype, 'submit').mockImplementation(() => {});
    global.fetch = jest.fn(async url => {
        if (url.endsWith('/api/courses/purchase')) {
            return { status: 400, ok: false, json: async () => insufficientResponse };
        }
        if (url === '/api/payment/request') {
            return { status: 200, ok: true, json: async () => ({ success: true, token: 'bank-token', gatewayUrl: 'https://bank.test/pay' }) };
        }
        throw new Error('درخواست غیرمنتظره در آزمون');
    });
});
afterEach(() => { jest.restoreAllMocks(); document.body.innerHTML = ''; });

test('دکمه آنلاین با کسری معلوم مستقیماً به درگاه می‌رود و خرید از کیف خالی را امتحان نمی‌کند', async () => {
    const result = await executeNoorCoursePurchase({ items: [course], jwt: 'jwt', payOnline: true });
    expect(result.awaitingPayment).toBe(true);
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(fetch.mock.calls[0][0]).toBe('/api/payment/request');
    expect(JSON.parse(fetch.mock.calls[0][1].body)).toEqual({ paymentType: 'course_purchase', externalCourseId: course.documentId });
    expect(submit).toHaveBeenCalledTimes(1);
    expect(document.querySelector('form').action).toBe('https://bank.test/pay');
    expect(document.querySelector('input[name="Token"]').value).toBe('bank-token');
    expect(useCartStore.getState().items).toEqual([course]);
});

test('پاسخ واقعی ۴۰۰ و کسری ۱۰۱ نور با کلاینت واقعی به هدایت درگاه منجر می‌شود', async () => {
    const result = await executeNoorCoursePurchase({ items: [course], jwt: 'jwt' });
    expect(result.awaitingPayment).toBe(true);
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(fetch.mock.calls[0][0]).toMatch(/\/api\/courses\/purchase$/);
    expect(fetch.mock.calls[1][0]).toBe('/api/payment/request');
    expect(submit).toHaveBeenCalledTimes(1);
    expect(useCartStore.getState().items).toEqual([course]);
});

test('کافی‌شدن موجودی در فاصله کلیک تا درخواست سرور، شارژ اضافه ایجاد نمی‌کند', async () => {
    fetch.mockResolvedValue({ status: 200, ok: true, json: async () => ({ success: true, paidWithWallet: true, data: { transactionId: 'wallet-tx' } }) });
    const router = { push: jest.fn() };
    await executeNoorCoursePurchase({ items: [course], jwt: 'jwt', payOnline: true, router });
    expect(submit).not.toHaveBeenCalled();
    expect(useCartStore.getState().items).toHaveLength(0);
    expect(router.push).toHaveBeenCalledWith(expect.stringContaining('source=noor'));
});

test('خطای اعتبارسنجی غیرمرتبط با کسری به پرداخت بانکی تبدیل نمی‌شود', async () => {
    fetch.mockResolvedValue({ status: 400, ok: false, json: async () => ({ errors: ['دوره قابل خرید نیست.'] }) });
    await expect(executeNoorCoursePurchase({ items: [course], jwt: 'jwt' })).rejects.toThrow('دوره قابل خرید نیست.');
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(submit).not.toHaveBeenCalled();
});
