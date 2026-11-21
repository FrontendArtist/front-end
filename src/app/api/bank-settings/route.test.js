import { GET } from './route';

jest.mock('@/lib/api', () => ({ STRAPI_API_URL: 'http://strapi.test' }));
jest.mock('next/server', () => ({
    NextResponse: {
        json: (body, init) => ({ body, status: init?.status || 200 }),
    },
}));

describe('GET /api/bank-settings', () => {
    const originalFetch = global.fetch;

    beforeEach(() => {
        process.env.STRAPI_API_TOKEN = 'test-token';
        global.fetch = jest.fn();
    });

    afterAll(() => {
        global.fetch = originalFetch;
    });

    it('اطلاعات بانکی پاکسازی‌شده را با ۲۰۰ برمی‌گرداند', async () => {
        global.fetch.mockResolvedValue({
            ok: true,
            status: 200,
            json: async () => ({
                data: {
                    id: 1,
                    bankName: 'بانک ملی',
                    cardNumber: '6037-9977-0000-1111',
                    accountHolder: 'موسسه طرح الهی',
                    internalField: 'secret',
                },
            }),
        });

        const res = await GET();
        expect(res.status).toBe(200);
        expect(res.body).toEqual({
            data: {
                bankName: 'بانک ملی',
                cardNumber: '6037-9977-0000-1111',
                accountHolder: 'موسسه طرح الهی',
            },
        });
        expect(global.fetch).toHaveBeenCalledWith('http://strapi.test/api/bank-setting', {
            headers: { Authorization: 'Bearer test-token' },
            cache: 'no-store',
        });
    });

    it('اگر data وجود نداشته باشد ۴۰۴ برمی‌گرداند', async () => {
        global.fetch.mockResolvedValue({
            ok: true,
            status: 200,
            json: async () => ({ data: null }),
        });

        const res = await GET();
        expect(res.status).toBe(404);
    });

    it('در خطای استراپی ۵۰۲ برمی‌گرداند', async () => {
        global.fetch.mockResolvedValue({ ok: false, status: 500 });
        const res = await GET();
        expect(res.status).toBe(502);
    });

    it('در خطای شبکه ۵۰۳ برمی‌گرداند', async () => {
        global.fetch.mockRejectedValue(new Error('network error'));
        const res = await GET();
        expect(res.status).toBe(503);
    });
});
