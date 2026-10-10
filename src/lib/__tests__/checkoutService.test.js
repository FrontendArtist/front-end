import { executeOnlinePayment } from '../checkoutService';

describe('نتیجهٔ رایگان checkout از سرور تعیین می‌شود', () => {
  beforeEach(() => { jest.spyOn(HTMLFormElement.prototype, 'submit').mockImplementation(() => {}); });
  afterEach(() => { jest.restoreAllMocks(); document.body.innerHTML = ''; });
  const server = order => {
    global.fetch = jest.fn(async url => ({ ok: true, json: async () =>
      url === '/api/orders' ? { data: { documentId: 'order-one', ...order } } :
      url === '/api/payment/request' ? { success: true, token: 'bank-token' } : { success: true, isVpn: false } }));
  };
  it('قیمت صفر مرورگر، سفارش پولی سرور را موفق رایگان نشان نمی‌دهد', async () => {
    server({ totalPrice: 101, paymentMethod: 'online', paymentStatus: 'pending_payment' });
    const router = { push: jest.fn() };
    const result = await executeOnlinePayment({ items: [{ id: 7 }], finalTotalPrice: 0, router });
    expect(result.isFree).toBe(false);
    expect(router.push).not.toHaveBeenCalled();
    expect(fetch).toHaveBeenCalledWith('/api/payment/request', expect.anything());
  });
  it('رایگان واقعی سرور را حتی با نمایش قدیمی پولی درست ادامه می‌دهد', async () => {
    server({ totalPrice: 0, paymentMethod: 'free', paymentStatus: 'paid' });
    const router = { push: jest.fn() };
    expect((await executeOnlinePayment({ items: [{ id: 7 }], finalTotalPrice: 101, router })).isFree).toBe(true);
    expect(router.push).toHaveBeenCalledWith('/checkout/result?status=success&source=free&orderId=order-one');
    expect(fetch.mock.calls.some(([url]) => url === '/api/payment/request')).toBe(false);
  });
});
