import { POST } from './route';
import { GET } from '../cancellation-preview/route';
import { POST as ADMIN_POST } from '@/app/api/admin/physical-purchases/[purchaseId]/cancel/route';
import { GET as ADMIN_GET } from '@/app/api/admin/physical-purchases/[purchaseId]/cancellation-preview/route';
import { getServerSession } from 'next-auth/next';
import {
  cancelMyPhysicalOrder, getMyPhysicalCancelPreview, cancelAdminPhysicalPurchase, getAdminPhysicalCancelPreview,
} from '@/lib/byeMoneyApi';

jest.mock('next-auth/next', () => ({ getServerSession: jest.fn() }));
jest.mock('@/lib/auth', () => ({ authOptions: {} }));
jest.mock('@/lib/byeMoneyApi', () => ({
  cancelMyPhysicalOrder: jest.fn(), getMyPhysicalCancelPreview: jest.fn(),
  cancelAdminPhysicalPurchase: jest.fn(), getAdminPhysicalCancelPreview: jest.fn(),
}));
jest.mock('next/server', () => ({ NextResponse: { json: (body, init) => ({ body, status: init?.status || 200 }) } }));

const ID = '22222222-2222-2222-2222-222222222222';
const OP = '33333333-3333-3333-3333-333333333333';
const cartCtx = { params: Promise.resolve({ cartId: ID }) };
const purchaseCtx = { params: Promise.resolve({ purchaseId: ID }) };
const req = (body) => ({ json: async () => body });
const user = { user: { jwt: 'server-jwt', role: { type: 'authenticated' } } };
const admin = { user: { jwt: 'admin-jwt', role: { type: 'administrator' } } };

beforeEach(() => {
  jest.clearAllMocks();
  getServerSession.mockResolvedValue(user);
});

describe('POST /api/physical-orders/[cartId]/cancel', () => {
  it('JWT نشست را می‌فرستد و هویت/مبلغ از بدنه نمی‌گیرد', async () => {
    cancelMyPhysicalOrder.mockResolvedValue({ success: true, data: { outcome: 'Refunded' } });
    const res = await POST(req({ operationId: OP, reason: ' بدون نیاز ', userId: 9, amount: 1000 }), cartCtx);
    expect(res.status).toBe(200);
    expect(cancelMyPhysicalOrder).toHaveBeenCalledWith({ jwt: 'server-jwt', cartId: ID, operationId: OP, reason: 'بدون نیاز' });
  });

  it('بدون نشست ۴۰۱ و بدنهٔ نامعتبر ۴۰۰ می‌دهد', async () => {
    getServerSession.mockResolvedValue(null);
    expect((await POST(req({ operationId: OP, reason: 'x' }), cartCtx)).status).toBe(401);
    getServerSession.mockResolvedValue(user);
    expect((await POST(req({ operationId: 'bad', reason: 'x' }), cartCtx)).status).toBe(400);
    expect((await POST(req({ operationId: OP, reason: '' }), cartCtx)).status).toBe(400);
    expect(cancelMyPhysicalOrder).not.toHaveBeenCalled();
  });

  it('code ساختاریافته و وضعیت خطا را بدون توکن برمی‌گرداند', async () => {
    cancelMyPhysicalOrder.mockResolvedValue({ success: false, status: 409, code: 'PHYSICAL_CANCEL_ALREADY_SHIPPED', error: 'ارسال شده' });
    const res = await POST(req({ operationId: OP, reason: 'x' }), cartCtx);
    expect(res.status).toBe(409);
    expect(res.body.code).toBe('PHYSICAL_CANCEL_ALREADY_SHIPPED');
    expect(JSON.stringify(res.body)).not.toContain('server-jwt');
  });

  it('وضعیت ناشناخته ۵۰۲ می‌شود', async () => {
    cancelMyPhysicalOrder.mockResolvedValue({ success: false, status: 500 });
    expect((await POST(req({ operationId: OP, reason: 'x' }), cartCtx)).status).toBe(502);
  });
});

describe('GET /api/physical-orders/[cartId]/cancellation-preview', () => {
  it('پیش‌نمایش را با JWT نشست می‌گیرد', async () => {
    getMyPhysicalCancelPreview.mockResolvedValue({ success: true, data: { warnings: [] } });
    expect((await GET({}, cartCtx)).status).toBe(200);
    expect(getMyPhysicalCancelPreview).toHaveBeenCalledWith({ jwt: 'server-jwt', cartId: ID });
  });
  it('شناسهٔ نامعتبر ۴۰۰ است', async () => {
    expect((await GET({}, { params: Promise.resolve({ cartId: 'x' }) })).status).toBe(400);
  });
});

describe('مسیرهای ادمین', () => {
  it('کاربر عادی رد می‌شود', async () => {
    expect((await ADMIN_POST(req({ operationId: OP, reason: 'x', quantity: 1 }), purchaseCtx)).status).toBe(401);
    expect(cancelAdminPhysicalPurchase).not.toHaveBeenCalled();
  });
  it('لغو قلم با تعداد و علت ارسال می‌شود', async () => {
    getServerSession.mockResolvedValue(admin);
    cancelAdminPhysicalPurchase.mockResolvedValue({ success: true, data: { outcome: 'Refunded' } });
    await ADMIN_POST(req({ operationId: OP, reason: 'x', quantity: 2 }), purchaseCtx);
    expect(cancelAdminPhysicalPurchase).toHaveBeenCalledWith({ jwt: 'admin-jwt', purchaseId: ID, operationId: OP, reason: 'x', quantity: 2 });
  });
  it('تعداد نامعتبر ۴۰۰ است', async () => {
    getServerSession.mockResolvedValue(admin);
    expect((await ADMIN_POST(req({ operationId: OP, reason: 'x', quantity: 0 }), purchaseCtx)).status).toBe(400);
    expect((await ADMIN_GET({ url: 'http://x/y?quantity=abc' }, purchaseCtx)).status).toBe(400);
  });
  it('پیش‌نمایش ادمین تعداد را می‌فرستد', async () => {
    getServerSession.mockResolvedValue(admin);
    getAdminPhysicalCancelPreview.mockResolvedValue({ success: true, data: {} });
    await ADMIN_GET({ url: 'http://x/y?quantity=3' }, purchaseCtx);
    expect(getAdminPhysicalCancelPreview).toHaveBeenCalledWith({ jwt: 'admin-jwt', purchaseId: ID, quantity: 3 });
  });
});
