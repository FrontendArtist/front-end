import { POST } from './route';
import { getServerSession } from 'next-auth/next';
import { refundAdminClosedParcel } from '@/lib/byeMoneyApi';

jest.mock('next-auth/next', () => ({ getServerSession: jest.fn() }));
jest.mock('@/lib/auth', () => ({ authOptions: {} }));
jest.mock('@/lib/byeMoneyApi', () => ({ refundAdminClosedParcel: jest.fn() }));
jest.mock('next/server', () => ({ NextResponse: { json: (body, init) => ({ body, status: init?.status || 200 }) } }));

const PID = '22222222-2222-2222-2222-222222222222';
const OP = '33333333-3333-3333-3333-333333333333';
const ctx = { params: Promise.resolve({ purchaseId: PID }) };
const req = (body) => ({ json: async () => body });
const admin = { user: { jwt: 'admin-jwt', role: { type: 'administrator' } } };

beforeEach(() => {
    jest.clearAllMocks();
    getServerSession.mockResolvedValue(admin);
});

describe('POST /api/admin/physical-purchases/[purchaseId]/closed-parcel-refund', () => {
    it('JWT نشست ادمین را می‌فرستد و علت را trim می‌کند', async () => {
        refundAdminClosedParcel.mockResolvedValue({ success: true, data: { totalRefundInNoor: 12 } });
        const res = await POST(req({ operationId: OP, reason: '  علت برگشت  ', amount: 90 }), ctx);
        expect(res.status).toBe(200);
        expect(refundAdminClosedParcel).toHaveBeenCalledWith({
            jwt: 'admin-jwt',
            purchaseId: PID,
            operationId: OP,
            reason: 'علت برگشت',
        });
        expect(JSON.stringify(res.body)).not.toContain('admin-jwt');
    });

    it('بدون نشست یا بدون نقش ادمین ۴۰۱ است و بای‌مانی صدا زده نمی‌شود', async () => {
        getServerSession.mockResolvedValue(null);
        expect((await POST(req({ operationId: OP, reason: 'علت' }), ctx)).status).toBe(401);
        getServerSession.mockResolvedValue({ user: { jwt: 'user-jwt', role: { type: 'authenticated' } } });
        expect((await POST(req({ operationId: OP, reason: 'علت' }), ctx)).status).toBe(401);
        expect(refundAdminClosedParcel).not.toHaveBeenCalled();
    });

    it('شناسه یا علت نامعتبر ۴۰۰ است', async () => {
        expect((await POST(req({ operationId: 'bad', reason: 'علت' }), ctx)).status).toBe(400);
        expect((await POST(req({ operationId: OP, reason: '   ' }), ctx)).status).toBe(400);
        expect((await POST(req({ operationId: OP, reason: 'ا'.repeat(501) }), ctx)).status).toBe(400);
        expect((await POST(req({ operationId: OP, reason: 'علت' }), { params: Promise.resolve({ purchaseId: 'x' }) })).status).toBe(400);
        expect(refundAdminClosedParcel).not.toHaveBeenCalled();
    });

    it('۴۰۹ را با کد ساختاریافته برمی‌گرداند و ۵۰۰ را ۵۰۲ می‌کند', async () => {
        refundAdminClosedParcel.mockResolvedValue({
            success: false,
            status: 409,
            code: 'CLOSED_PARCEL_REFUND_CONFLICT',
            error: 'متن سرور',
        });
        const conflict = await POST(req({ operationId: OP, reason: 'علت' }), ctx);
        expect(conflict.status).toBe(409);
        expect(conflict.body.code).toBe('CLOSED_PARCEL_REFUND_CONFLICT');

        refundAdminClosedParcel.mockResolvedValue({ success: false, status: 500, error: 'boom' });
        expect((await POST(req({ operationId: OP, reason: 'علت' }), ctx)).status).toBe(502);
    });
});
