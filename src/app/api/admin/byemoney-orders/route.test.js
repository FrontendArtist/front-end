/**
 * فهرست سفارش‌های ادمین: بدون نشست ۴۰۱، کاربر لاگین‌شدهٔ غیرادمین ۴۰۳،
 * و هر دو نقش administrator و admin مجازند.
 */
import { getServerSession } from 'next-auth/next';
import { getByeMoneyAdminOrders } from '@/lib/admin/byeMoneyAdminOrders';
import { GET } from './route';

jest.mock('next-auth/next', () => ({ getServerSession: jest.fn() }));
jest.mock('@/lib/admin/byeMoneyAdminOrders', () => ({
    getByeMoneyAdminOrders: jest.fn(),
    getByeMoneyOrderCounts: jest.fn(),
    readOrderFilters: () => ({ tab: 'action', q: '', view: null }),
}));
jest.mock('next/server', () => ({ NextResponse: { json: (body, init) => ({ body, status: init?.status || 200 }) } }));

const JWT = 'server-admin-jwt';
const listUrl = 'http://localhost/api/admin/byemoney-orders';

describe('GET /api/admin/byemoney-orders', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        getByeMoneyAdminOrders.mockResolvedValue({ orders: [], total: 0 });
    });

    test('بدون نشست ۴۰۱ است و فهرست خوانده نمی‌شود', async () => {
        getServerSession.mockResolvedValue(null);
        const res = await GET({ url: listUrl });
        expect(res.status).toBe(401);
        expect(getByeMoneyAdminOrders).not.toHaveBeenCalled();
    });

    test('کاربر لاگین‌شدهٔ غیرادمین ۴۰۳ است', async () => {
        getServerSession.mockResolvedValue({ user: { jwt: JWT, role: { type: 'authenticated' } } });
        const res = await GET({ url: listUrl });
        expect(res.status).toBe(403);
        expect(getByeMoneyAdminOrders).not.toHaveBeenCalled();
    });

    test.each(['administrator', 'admin'])('نقش %s با JWT نشست پذیرفته می‌شود', async (type) => {
        getServerSession.mockResolvedValue({ user: { jwt: JWT, role: { type } } });
        const res = await GET({ url: listUrl });
        expect(res.status).toBe(200);
        expect(getByeMoneyAdminOrders).toHaveBeenCalledWith(JWT, expect.objectContaining({ tab: 'action' }));
    });
});
