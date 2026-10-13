/** @jest-environment node */
jest.mock('next-auth', () => ({ getServerSession: jest.fn() }));
jest.mock('@/lib/auth', () => ({ paymentAuthOptions: {} }));
jest.mock('@/lib/api', () => ({ STRAPI_API_URL: 'http://backend.test' }));
jest.mock('next/cache', () => ({ revalidatePath: jest.fn() }));
jest.mock('@/lib/sepPayment', () => ({
    requestSepToken: jest.fn(), verifySepTransaction: jest.fn(), reverseSepTransaction: jest.fn(),
    getSepErrorMessage: jest.fn(), SEP_TERMINAL_ID: '123', SEP_GATEWAY_ACTION_URL: 'https://gateway.test',
}));

import { getServerSession } from 'next-auth';
import { requestSepToken, verifySepTransaction } from '@/lib/sepPayment';
import { POST as requestPayment } from '@/app/api/payment/request/route';
const originalToken = process.env.STRAPI_API_TOKEN;

afterEach(() => {
    if (originalToken === undefined) delete process.env.STRAPI_API_TOKEN;
    else process.env.STRAPI_API_TOKEN = originalToken;
});

beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn();
    getServerSession.mockResolvedValue({ user: { id: 5 } });
});

test.each(['canceled', 'pending'])('cannot start payment on canceled or failed order (%s)', async orderStatus => {
    fetch.mockResolvedValue({ ok: true, json: async () => ({ data: [{ documentId: 'old-order',
        user: { id: 5 }, totalPrice: 100, orderStatus, paymentStatus: orderStatus === 'pending' ? 'failed' : 'pending_payment' }] }) });
    const result = await requestPayment(new Request('http://shop.test/api/payment/request', {
        method: 'POST', body: JSON.stringify({ orderId: 'old-order' }), headers: { 'Content-Type': 'application/json' },
    }));
    expect(result.status).toBe(400);
    expect(requestSepToken).not.toHaveBeenCalled();
});

test('successful bank verification still accepts superseded order', async () => {
    process.env.STRAPI_API_TOKEN = 'test-token';
    const { POST: verifyPayment } = require('@/app/api/payment/verify/route');
    fetch.mockResolvedValueOnce({ ok: true, json: async () => ({ data: [{ id: 1, documentId: 'old-order',
        totalPrice: 100, orderStatus: 'canceled', paymentStatus: 'pending_payment',
        rejectionReason: 'جایگزین‌شده با سفارش جدید', items: [] }] }) })
        .mockResolvedValueOnce({ ok: true });
    verifySepTransaction.mockResolvedValue({ success: true, transactionDetail: { OrginalAmount: 1000 } });
    const response = await verifyPayment(new Request('http://shop.test/api/payment/verify', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ State: 'OK', ResNum: 'old-order', RefNum: 'bank-reference' }),
    }));
    expect(verifySepTransaction).toHaveBeenCalled();
    const update = JSON.parse(fetch.mock.calls[1][1].body).data;
    expect(update).toMatchObject({ orderStatus: 'paid', paymentStatus: 'paid', refNum: 'bank-reference', rejectionReason: null });
    expect(response.status).toBe(303);
    expect(new URL(response.headers.get('location')).searchParams.get('status')).toBe('success');
});
