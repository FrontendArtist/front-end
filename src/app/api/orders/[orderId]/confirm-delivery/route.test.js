import { POST } from './route';
import { getServerSession } from 'next-auth/next';
import { confirmMyCourseOrderDelivery } from '@/lib/byeMoneyApi';

jest.mock('next-auth/next', () => ({ getServerSession: jest.fn() }));
jest.mock('@/lib/auth', () => ({ authOptions: {} }));
jest.mock('@/lib/byeMoneyApi', () => {
    const actual = jest.requireActual('@/lib/byeMoneyApi');
    return {
        ...actual,
        confirmMyCourseOrderDelivery: jest.fn(),
    };
});
jest.mock('next/server', () => ({
    NextResponse: {
        json: (body, init) => ({ body, status: init?.status || 200 }),
    },
}));

const ORDER_ID = 'cart:11111111-1111-1111-1111-111111111111';

describe('POST /api/orders/[orderId]/confirm-delivery', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        getServerSession.mockResolvedValue({ user: { id: 1, jwt: 'jwt-token' } });
    });

    it('بدون jwt وضعیت ۴۰۱ برمی‌گرداند', async () => {
        getServerSession.mockResolvedValue(null);
        const res = await POST({}, { params: Promise.resolve({ orderId: ORDER_ID }) });
        expect(res.status).toBe(401);
    });

    it('شناسه نامعتبر ۴۰۰ برمی‌گرداند', async () => {
        const res = await POST({}, { params: Promise.resolve({ orderId: 'bad-id' }) });
        expect(res.status).toBe(400);
        expect(confirmMyCourseOrderDelivery).not.toHaveBeenCalled();
    });

    it('در حالت موفق ۲۰۰ برمی‌گرداند', async () => {
        confirmMyCourseOrderDelivery.mockResolvedValue({ success: true, data: { confirmedCount: 1 } });
        const res = await POST({}, { params: Promise.resolve({ orderId: encodeURIComponent(ORDER_ID) }) });
        expect(res.status).toBe(200);
        expect(res.body).toEqual({ success: true, data: { confirmedCount: 1 } });
    });

    it.each([
        ['badRequest', { badRequest: true, error: 'نامعتبر' }, 400],
        ['unauthorized', { unauthorized: true, error: 'منقضی' }, 401],
        ['notFound', { notFound: true, error: 'یافت نشد' }, 404],
        ['conflict', { conflict: true, error: 'مرسوله برگشتی' }, 409],
        ['generic', { error: 'خطای داخلی' }, 500],
        ['networkError', { networkError: true, error: 'قطع شبکه' }, 502],
    ])('خطای %s به کد %i نگاشت می‌شود', async (_name, mockRes, expectedStatus) => {
        confirmMyCourseOrderDelivery.mockResolvedValue({ success: false, ...mockRes });
        const res = await POST({}, { params: Promise.resolve({ orderId: ORDER_ID }) });
        expect(res.status).toBe(expectedStatus);
        expect(res.body).toEqual({ success: false, error: mockRes.error });
    });
});
