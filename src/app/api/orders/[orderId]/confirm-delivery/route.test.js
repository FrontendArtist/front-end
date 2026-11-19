/**
 * @file src/app/api/orders/[orderId]/confirm-delivery/route.test.js
 * عبور ۴۰۹ تعارض تأیید دریافت برای مرسولهٔ برگشتی (SHIP-FIX-2).
 */

import { POST } from './route';
import { getServerSession } from 'next-auth/next';
import { CourseOrderId, confirmMyCourseOrderDelivery } from '@/lib/byeMoneyApi';

jest.mock('next-auth/next', () => ({ getServerSession: jest.fn() }));
jest.mock('@/lib/auth', () => ({ authOptions: {} }));
jest.mock('@/lib/byeMoneyApi', () => ({
    CourseOrderId: { isValid: jest.fn() },
    confirmMyCourseOrderDelivery: jest.fn(),
}));
jest.mock('next/server', () => ({
    NextResponse: { json: (body, init) => ({ body, status: init?.status ?? 200 }) },
}));

const ORDER_ID = 'cart:11111111-1111-1111-1111-111111111111';
const context = { params: Promise.resolve({ orderId: encodeURIComponent(ORDER_ID) }) };

beforeEach(() => {
    jest.clearAllMocks();
    getServerSession.mockResolvedValue({ user: { jwt: 'server-jwt' } });
    CourseOrderId.isValid.mockReturnValue(true);
});

describe('POST /api/orders/[orderId]/confirm-delivery', () => {
    it('۴۰۹ بای‌مانی را با پیام دامنه برمی‌گرداند', async () => {
        confirmMyCourseOrderDelivery.mockResolvedValue({
            success: false,
            conflict: true,
            error: 'مرسولهٔ این سفارش برگشتی اعلام شده است.',
        });

        const res = await POST({}, context);

        expect(res.status).toBe(409);
        expect(res.body).toEqual({
            success: false,
            error: 'مرسولهٔ این سفارش برگشتی اعلام شده است.',
        });
        expect(confirmMyCourseOrderDelivery).toHaveBeenCalledWith({
            jwt: 'server-jwt',
            orderId: ORDER_ID,
        });
    });
});
