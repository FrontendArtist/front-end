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
import { requestSepToken, verifySepTransaction, reverseSepTransaction } from '@/lib/sepPayment';
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

test.each([
    ['CanceledByUser', 'cancel', false, 0],
    ['Failed', 'failed', false, 0],
    ['OK', 'failed', false, 0],
    ['OK', 'failed', true, 2000],
])('unsuccessful attempt %s keeps order open and permits next payment', async (state, resultStatus, bankSuccess, amount) => {
    process.env.STRAPI_API_TOKEN = 'test-token';
    const { POST: verifyPayment } = require('@/app/api/payment/verify/route');
    const order = { id: 1, documentId: 'same-order', totalPrice: 100, user: { id: 5 },
        orderStatus: 'pending', paymentStatus: 'pending_payment', notes: 'summary', items: [] };
    fetch.mockResolvedValueOnce({ ok: true, json: async () => ({ data: [order] }) })
        .mockImplementationOnce(async (_, options) => {
            const update = JSON.parse(options.body).data;
            expect(update).not.toHaveProperty('orderStatus');
            expect(update).not.toHaveProperty('paymentStatus');
            expect(update).not.toHaveProperty('rejectionReason');
            expect(update.notes).toContain('summary');
            Object.assign(order, update);
            return { ok: true };
        });
    verifySepTransaction.mockResolvedValue({ success: bankSuccess, resultDescription: 'declined',
        transactionDetail: { OrginalAmount: amount } });
    reverseSepTransaction.mockResolvedValue({ success: true });
    const result = await verifyPayment(new Request('http://shop.test/api/payment/verify', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ State: state, ResNum: 'same-order', RefNum: 'bank-reference' }),
    }));
    expect(new URL(result.headers.get('location')).searchParams.get('status')).toBe(resultStatus);
    expect(order.orderStatus).toBe('pending');
    expect(order.paymentStatus).toBe('pending_payment');
    fetch.mockResolvedValueOnce({ ok: true, json: async () => ({ data: [order] }) });
    requestSepToken.mockResolvedValue({ success: true, token: 'next-attempt' });
    const retry = await requestPayment(new Request('http://shop.test/api/payment/request', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ orderId: 'same-order' }),
    }));
    expect(retry.status).toBe(200);
    expect(requestSepToken).toHaveBeenCalledWith(expect.objectContaining({ resNum: 'same-order' }));
});
