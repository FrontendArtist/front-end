import { POST } from './route';
import { getServerSession } from 'next-auth/next';

jest.mock('next-auth/next', () => ({ getServerSession: jest.fn() }));
jest.mock('@/lib/auth', () => ({ authOptions: {} }));
jest.mock('@/lib/byeMoneySync', () => ({ BYEMONEY_API_URL: 'https://byemoney.test' }));
jest.mock('next/server', () => ({
    NextResponse: { json: (body, init) => ({ body, status: init?.status || 200 }) },
}));

const PID = '22222222-2222-2222-2222-222222222222';
const ctx = { params: Promise.resolve({ purchaseId: PID }) };

beforeEach(() => {
    global.fetch = jest.fn();
    getServerSession.mockResolvedValue({
        user: { jwt: 'server-admin-jwt', role: { type: 'administrator' } },
    });
});

describe('POST /api/admin/physical-purchases/[purchaseId]/shipments/refresh', () => {
    it('JWT نشست ادمین را به مسیر بررسی وضعیت بای‌مانی می‌فرستد', async () => {
        const payload = {
            purchaseId: PID,
            deliveryStatus: 'Preparing',
            outcome: 'PaymentPending',
            carrierPaymentPendingSinceUtc: '2026-11-19T10:00:00Z',
        };
        global.fetch.mockResolvedValueOnce({ status: 200, json: async () => payload });

        const res = await POST({}, ctx);

        expect(res.status).toBe(200);
        expect(res.body).toEqual(payload);
        expect(global.fetch).toHaveBeenCalledWith(
            `https://byemoney.test/api/admin/physical-purchases/${PID}/shipments/refresh`,
            expect.objectContaining({
                method: 'POST',
                headers: { Authorization: 'Bearer server-admin-jwt' },
            }),
        );
        expect(JSON.stringify(res.body)).not.toContain('server-admin-jwt');
    });

    it('بدون نشست ادمین بای‌مانی صدا زده نمی‌شود', async () => {
        getServerSession.mockResolvedValue(null);
        const res = await POST({}, ctx);
        expect(res.status).toBe(401);
        expect(global.fetch).not.toHaveBeenCalled();
    });

    it('وضعیت خطای بای‌مانی را عوض نمی‌کند', async () => {
        global.fetch.mockResolvedValueOnce({
            status: 400,
            json: async () => ({ title: 'rule', status: 400, errors: ['مجاز نیست.'] }),
        });
        const res = await POST({}, ctx);
        expect(res.status).toBe(400);
        expect(res.body.errors).toEqual(['مجاز نیست.']);
    });
});
