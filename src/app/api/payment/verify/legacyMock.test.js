import { createMockCallback, createMockToken } from '@/lib/sepMock';

jest.mock('next/server', () => ({
    NextResponse: { redirect: jest.fn((url, status) => ({ url, status })) },
}));
jest.mock('next/cache', () => ({ revalidatePath: jest.fn() }));
jest.mock('@/lib/gatewayTopUp', () => ({
    findAttempt: jest.fn(), claimAttempt: jest.fn(), updateAttempt: jest.fn(),
    getTopUpConfirmation: jest.fn(), confirmGatewayTopUp: jest.fn(),
}));

describe('legacy order callback with the local bank mock', () => {
    const oldEnv = process.env.NODE_ENV;
    const oldEnabled = process.env.SEP_MOCK_ENABLED;
    const oldSecret = process.env.SEP_MOCK_SECRET;
    const oldToken = process.env.STRAPI_API_TOKEN;
    const oldStrapiUrl = process.env.NEXT_PUBLIC_STRAPI_URL;
    const updates = [];
    let POST;
    let findAttempt;

    beforeEach(() => {
        process.env.NODE_ENV = 'development';
        process.env.SEP_MOCK_ENABLED = 'true';
        process.env.SEP_MOCK_SECRET = 'local-test-secret';
        process.env.STRAPI_API_TOKEN = 'local-test-token';
        process.env.NEXT_PUBLIC_STRAPI_URL = 'http://localhost:1337';
        jest.resetModules();
        ({ POST } = require('./route'));
        ({ findAttempt } = require('@/lib/gatewayTopUp'));
        updates.length = 0;
        findAttempt.mockResolvedValue(null);
        global.fetch = jest.fn(async (_url, options) => {
            if (options?.method === 'PUT') {
                updates.push(JSON.parse(options.body).data);
                return { ok: true };
            }
            return { ok: true, json: async () => ({ data: [{ id: 1, documentId: 'order-123',
                totalPrice: 5000, paymentStatus: 'pending_payment', orderStatus: 'pending' }] }) };
        });
    });

    afterEach(() => {
        process.env.NODE_ENV = oldEnv;
        if (oldEnabled === undefined) delete process.env.SEP_MOCK_ENABLED;
        else process.env.SEP_MOCK_ENABLED = oldEnabled;
        if (oldSecret === undefined) delete process.env.SEP_MOCK_SECRET;
        else process.env.SEP_MOCK_SECRET = oldSecret;
        if (oldToken === undefined) delete process.env.STRAPI_API_TOKEN;
        else process.env.STRAPI_API_TOKEN = oldToken;
        if (oldStrapiUrl === undefined) delete process.env.NEXT_PUBLIC_STRAPI_URL;
        else process.env.NEXT_PUBLIC_STRAPI_URL = oldStrapiUrl;
        jest.clearAllMocks();
    });

    async function sendCallback(scenario) {
        const { token } = createMockToken({ amount: 50000, resNum: 'order-123',
            redirectUrl: 'http://localhost:3000/api/payment/verify' });
        const { fields } = createMockCallback(token, scenario);
        return POST({ method: 'POST', url: 'http://localhost:3000/api/payment/verify',
            headers: { get: (name) => name === 'content-type' ? 'application/x-www-form-urlencoded' :
                name === 'host' ? 'localhost:3000' : null },
            formData: async () => new Map(Object.entries(fields)) });
    }

    it('verifies the mock payment and marks the local order paid', async () => {
        const response = await sendCallback('success');
        expect(new URL(response.url).searchParams.get('status')).toBe('success');
        expect(updates).toHaveLength(1);
        expect(updates[0]).toEqual(expect.objectContaining({
            paymentStatus: 'paid', orderStatus: 'paid',
            rrn: expect.any(String), refNum: expect.stringMatching(/^mock\./),
        }));
        expect(global.fetch.mock.calls.every(([url]) => String(url).startsWith('http://localhost:1337'))).toBe(true);
    });

    it('rejects a mismatched mock amount without marking the order paid', async () => {
        const response = await sendCallback('amount_mismatch');
        expect(new URL(response.url).searchParams.get('status')).toBe('failed');
        expect(updates).toHaveLength(1);
        expect(updates[0]).toEqual(expect.objectContaining({ paymentStatus: 'failed', orderStatus: 'canceled' }));
    });
});
