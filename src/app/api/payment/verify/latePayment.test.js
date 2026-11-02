/** @jest-environment node */
jest.mock('next/cache', () => ({ revalidatePath: jest.fn() }));
jest.mock('@/lib/api', () => ({ STRAPI_API_URL: 'http://strapi.test' }));
jest.mock('@/lib/gatewayTopUp', () => ({ findAttempt: jest.fn().mockResolvedValue(null) }));
jest.mock('@/lib/sepMock', () => ({ getSepMockEnvironmentError: () => null, isSepMockEnabled: () => false }));
jest.mock('@/lib/sepPayment', () => ({
    verifySepTransaction: jest.fn().mockResolvedValue({ success: true, transactionDetail: { OrginalAmount: 1000 } }),
    reverseSepTransaction: jest.fn(), getSepErrorMessage: jest.fn(), SEP_TERMINAL_ID: 'test-terminal',
}));

test('verify موفق روی سفارش لغوشده که بک آن را paid نکرده، به بررسی مالی می‌رود و دسترسی/کوپن نمی‌دهد', async () => {
    const token = process.env.STRAPI_API_TOKEN;
    const originalFetch = global.fetch;
    process.env.STRAPI_API_TOKEN = 'test-token';
    const log = jest.spyOn(console, 'log').mockImplementation(() => {});
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    try {
        let GET;
        jest.isolateModules(() => { GET = require('./route').GET; });
        const order = { id: 1, documentId: 'one', totalPrice: 100, orderStatus: 'canceled',
            paymentStatus: 'pending_payment', couponCode: 'OFF', user: { id: 7 }, items: [] };
        global.fetch = jest.fn()
            .mockResolvedValueOnce({ ok: true, json: async () => ({ data: [order] }) })
            .mockResolvedValueOnce({ ok: true, json: async () => ({ data: { ...order, paymentStatus: 'pending_verification' } }) });
        const response = await GET({ url: 'http://site.test/api/payment/verify?State=OK&ResNum=one&RefNum=bank-one', headers: new Headers({ host: 'site.test' }) });
        const query = new URL(response.headers.get('location')).searchParams;
        expect(query.get('status')).toBe('financial_review');
        expect(query.get('message')).toContain('بررسی مالی');
        expect(fetch).toHaveBeenCalledTimes(2); // فقط خواندن و یک PUT؛ بدون اعطای دسترسی یا مصرف کوپن
    } finally {
        if (token === undefined) delete process.env.STRAPI_API_TOKEN;
        else process.env.STRAPI_API_TOKEN = token;
        global.fetch = originalFetch;
        log.mockRestore();
        warn.mockRestore();
    }
});
