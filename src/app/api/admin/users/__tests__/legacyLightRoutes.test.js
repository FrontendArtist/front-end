/** @jest-environment node */
import { PATCH } from '../[id]/light/route';
import { POST } from '../bulk-light/route';

describe('مسیرهای قدیمی تغییر نور', () => {
    test.each([PATCH, POST])('بدون درخواست به استرپی خطای صریح می‌دهد', async (handler) => {
        const originalFetch = global.fetch;
        global.fetch = jest.fn();
        try {
            const response = await handler();
            expect(response.status).toBe(410);
            expect(await response.json()).toMatchObject({ success: false, code: 'LEGACY_LIGHT_DISABLED' });
            expect(global.fetch).not.toHaveBeenCalled();
        } finally {
            global.fetch = originalFetch;
        }
    });
});
