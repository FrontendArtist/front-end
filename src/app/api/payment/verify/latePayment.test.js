/** @jest-environment node */
jest.mock('next/cache', () => ({ revalidatePath: jest.fn() }));
jest.mock('@/lib/api', () => ({ STRAPI_API_URL: 'http://strapi.test' }));
jest.mock('@/lib/gatewayTopUp', () => ({ findAttempt: jest.fn().mockResolvedValue(null) }));
jest.mock('@/lib/sepMock', () => ({ getSepMockEnvironmentError: () => null, isSepMockEnabled: () => false }));
jest.mock('@/lib/sepPayment', () => ({
    verifySepTransaction: jest.fn().mockResolvedValue({ success: true, transactionDetail: { OrginalAmount: 1000 } }),
    reverseSepTransaction: jest.fn(), getSepErrorMessage: jest.fn(), SEP_TERMINAL_ID: 'test-terminal',
}));

test('نتیجهٔ معتبر بانکی دیرهنگام روی سفارش لغوشده با حذف سبد همچنان پردازش می‌شود', async () => {
    const token = process.env.STRAPI_API_TOKEN;
    const originalFetch = global.fetch;
    process.env.STRAPI_API_TOKEN = 'test-token';
    const log = jest.spyOn(console, 'log').mockImplementation(() => {});
    try {
        let GET;
        jest.isolateModules(() => { GET = require('./route').GET; });
        global.fetch = jest.fn()
            .mockResolvedValueOnce({ ok: true, json: async () => ({ data: [{ id: 1, documentId: 'one', totalPrice: 100,
                orderStatus: 'canceled', paymentStatus: 'pending_payment', items: [] }] }) })
            .mockResolvedValueOnce({ ok: true });
        const response = await GET({ url: 'http://site.test/api/payment/verify?State=OK&ResNum=one&RefNum=bank-one', headers: new Headers({ host: 'site.test' }) });
        expect(new URL(response.headers.get('location')).searchParams.get('status')).toBe('success');
        const update = JSON.parse(fetch.mock.calls[1][1].body).data;
        expect(update).toMatchObject({ orderStatus: 'paid', paymentStatus: 'paid', refNum: 'bank-one' });
    } finally {
        if (token === undefined) delete process.env.STRAPI_API_TOKEN;
        else process.env.STRAPI_API_TOKEN = token;
        global.fetch = originalFetch;
        log.mockRestore();
    }
});
