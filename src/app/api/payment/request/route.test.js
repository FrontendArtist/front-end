/** @jest-environment node */
import { POST } from './route';
import { getServerSession } from 'next-auth';
import { paymentAuthOptions } from '@/lib/auth';
import { requestSepToken } from '@/lib/sepPayment';

jest.mock('next-auth', () => ({ getServerSession: jest.fn() }));
jest.mock('@/lib/auth', () => ({ paymentAuthOptions: { secret: 'payment-test' } }));
jest.mock('@/lib/sepPayment', () => ({ requestSepToken: jest.fn(), SEP_GATEWAY_ACTION_URL: 'https://bank.test' }));
jest.mock('@/lib/api', () => ({ STRAPI_API_URL: 'http://strapi.test' }));

const order = { id: 1, documentId: 'order-one', totalPrice: 100, paymentStatus: 'pending_payment', user: { id: 7 } };
const request = () => new Request('http://localhost/api/payment/request', {
    method: 'POST', body: JSON.stringify({ orderId: 'order-one' }), headers: { host: 'localhost:3000' },
});
beforeEach(() => {
    jest.clearAllMocks();
    getServerSession.mockResolvedValue({ user: { id: 7 } });
    global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => ({ data: [order] }) });
    requestSepToken.mockResolvedValue({ success: true, token: 'bank-token' });
});

test('سشن سبک و استعلام محدود، مبلغ سرور را به بانک می‌فرستند', async () => {
    const result = await POST(request());
    expect(result.status).toBe(200);
    expect(await result.json()).toMatchObject({ success: true, token: 'bank-token', amount: 1000 });
    expect(getServerSession).toHaveBeenCalledWith(paymentAuthOptions);
    expect(fetch.mock.calls[0][0]).not.toContain('populate=*');
    expect(fetch.mock.calls[0][0]).toContain('populate[user]');
    expect(requestSepToken).toHaveBeenCalledWith(expect.objectContaining({ amount: 1000, resNum: 'order-one' }));
});

test.each([undefined, { id: 8 }])('مالک نامشخص یا متفاوت اجازهٔ توکن ندارد', async user => {
    fetch.mockResolvedValue({ ok: true, json: async () => ({ data: [{ ...order, user }] }) });
    expect((await POST(request())).status).toBe(403);
    expect(requestSepToken).not.toHaveBeenCalled();
});

test('سفارش تسویه‌شده دوباره وارد درگاه نمی‌شود', async () => {
    fetch.mockResolvedValue({ ok: true, json: async () => ({ data: [{ ...order, paymentStatus: 'paid' }] }) });
    expect((await POST(request())).status).toBe(400);
    expect(requestSepToken).not.toHaveBeenCalled();
});
