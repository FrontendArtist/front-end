/** @jest-environment node */

import { POST } from './route';
import { createMockToken } from '@/lib/sepMock';

describe('local SEP payment page', () => {
    const oldEnv = process.env.NODE_ENV;
    const oldEnabled = process.env.SEP_MOCK_ENABLED;
    const oldSecret = process.env.SEP_MOCK_SECRET;

    beforeEach(() => {
        process.env.NODE_ENV = 'development';
        process.env.SEP_MOCK_ENABLED = 'true';
        process.env.SEP_MOCK_SECRET = 'local-test-secret';
    });

    afterEach(() => {
        process.env.NODE_ENV = oldEnv;
        if (oldEnabled === undefined) delete process.env.SEP_MOCK_ENABLED;
        else process.env.SEP_MOCK_ENABLED = oldEnabled;
        if (oldSecret === undefined) delete process.env.SEP_MOCK_SECRET;
        else process.env.SEP_MOCK_SECRET = oldSecret;
    });

    function request(fields) {
        const form = new FormData();
        Object.entries(fields).forEach(([name, value]) => form.set(name, value));
        return { url: 'http://localhost:3000/api/payment/mock', formData: async () => form };
    }

    it('pauses before and after choosing the mock bank response', async () => {
        const { token } = createMockToken({ amount: 50000, resNum: 'order-123',
            redirectUrl: 'http://localhost:3000/api/payment/verify' });
        const bankPage = await POST(request({ Token: token }));
        expect(bankPage.status).toBe(200);
        const firstHtml = await bankPage.text();
        expect(firstHtml).toContain('پرداخت موفق');
        expect(firstHtml).toContain('این پرداخت جدولی در بای‌مانی تغییر نمی‌دهد');
        expect(firstHtml).toContain('/checkout/light?amount=10');
        expect(firstHtml).not.toContain('ارسال callback به برنامه');

        const callbackPage = await POST(request({ MockToken: token, Scenario: 'success' }));
        expect(callbackPage.status).toBe(200);
        const secondHtml = await callbackPage.text();
        expect(secondHtml).toContain('ارسال callback به برنامه');
        expect(secondHtml).toContain('action="http://localhost:3000/api/payment/verify"');
        expect(secondHtml).toContain('name="RefNum"');
    });

    it('is unavailable when mock mode is disabled', async () => {
        process.env.SEP_MOCK_ENABLED = 'false';
        const response = await POST(request({ Token: 'anything' }));
        expect(response.status).toBe(404);
    });

    it('identifies top-up payments as the ByeMoney flow', async () => {
        const { token } = createMockToken({ amount: 10000, resNum: 'TR-12345678',
            redirectUrl: 'http://localhost:3000/api/payment/verify' });
        const response = await POST(request({ Token: token }));
        expect(await response.text()).toContain('مسیر: شارژ نور در بای‌مانی');
    });
});
