import { PUT } from './route';
import { getServerSession } from 'next-auth/next';
import { updatePhysicalPurchaseDeliveryStatus } from '@/lib/byeMoneyApi';

jest.mock('next-auth/next', () => ({ getServerSession: jest.fn() }));
jest.mock('@/lib/auth', () => ({ authOptions: {} }));
jest.mock('@/lib/byeMoneyApi', () => ({ updatePhysicalPurchaseDeliveryStatus: jest.fn() }));
jest.mock('next/server', () => ({ NextResponse: { json: (body, init) => ({ body, status: init?.status || 200 }) } }));

const PID = '22222222-2222-2222-2222-222222222222';
const ctx = { params: Promise.resolve({ purchaseId: PID }) };
const req = (body) => ({ json: async () => body });

beforeEach(() => {
  updatePhysicalPurchaseDeliveryStatus.mockReset();
  global.fetch = jest.fn();
  getServerSession.mockResolvedValue({ user: { jwt: 'server-admin-jwt', role: { type: 'administrator' } } });
});

describe('PUT /api/admin/physical-purchases/[purchaseId]/delivery-status', () => {
  it('JWT را از session سروری برمی‌دارد و به بای‌مانی می‌فرستد', async () => {
    updatePhysicalPurchaseDeliveryStatus.mockResolvedValue({
      success: true,
      data: { purchaseId: PID, deliveryStatus: 'Shipped', shippedAtUtc: 'x', deliveredAtUtc: null },
    });
    const res = await PUT(req({ status: 'Shipped' }), ctx);
    expect(res.status).toBe(200);
    expect(res.body.data.deliveryStatus).toBe('Shipped');
    expect(updatePhysicalPurchaseDeliveryStatus).toHaveBeenCalledWith({ jwt: 'server-admin-jwt', purchaseId: PID, status: 'Shipped' });
  });

  it('توکن در پاسخ نشت نمی‌کند و به استراپی درخواست نمی‌رود', async () => {
    updatePhysicalPurchaseDeliveryStatus.mockResolvedValue({ success: true, data: { purchaseId: PID, deliveryStatus: 'Delivered' } });
    const ok = await PUT(req({ status: 'Delivered' }), ctx);
    updatePhysicalPurchaseDeliveryStatus.mockResolvedValue({ success: false, forbidden: true, error: 'ادمین مجوز ندارد.' });
    const bad = await PUT(req({ status: 'Delivered' }), ctx);
    expect(JSON.stringify(ok.body)).not.toContain('server-admin-jwt');
    expect(JSON.stringify(bad.body)).not.toContain('server-admin-jwt');
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('کاربر بدون session رد می‌شود و تابع بای‌مانی صدا زده نمی‌شود', async () => {
    getServerSession.mockResolvedValue(null);
    const res = await PUT(req({ status: 'Shipped' }), ctx);
    expect(res.status).toBe(401);
    expect(updatePhysicalPurchaseDeliveryStatus).not.toHaveBeenCalled();
  });

  it('کاربر عادی (غیر ادمین) رد می‌شود', async () => {
    getServerSession.mockResolvedValue({ user: { jwt: 'user-jwt', role: { type: 'authenticated' } } });
    const res = await PUT(req({ status: 'Shipped' }), ctx);
    expect(res.status).toBe(401);
    expect(updatePhysicalPurchaseDeliveryStatus).not.toHaveBeenCalled();
  });

  it('پیام دامنهٔ ۴۰۰ را با همان وضعیت به ادمین برمی‌گرداند', async () => {
    updatePhysicalPurchaseDeliveryStatus.mockResolvedValue({ success: false, badRequest: true, error: 'پرش از آماده‌سازی به تحویل مجاز نیست.' });
    const res = await PUT(req({ status: 'Delivered' }), ctx);
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('پرش از آماده‌سازی به تحویل مجاز نیست.');
  });

  it.each([
    [{ forbidden: true }, 403],
    [{ notFound: true }, 404],
    [{ unauthorized: true }, 401],
    [{ networkError: true }, 502],
  ])('نگاشت خطا %p به %i', async (flags, code) => {
    updatePhysicalPurchaseDeliveryStatus.mockResolvedValue({ success: false, error: 'خطا', ...flags });
    expect((await PUT(req({ status: 'Shipped' }), ctx)).status).toBe(code);
  });

  it('بدنهٔ JSON نامعتبر ۴۰۰ می‌دهد', async () => {
    const res = await PUT({ json: async () => { throw new Error('bad'); } }, ctx);
    expect(res.status).toBe(400);
    expect(updatePhysicalPurchaseDeliveryStatus).not.toHaveBeenCalled();
  });
});
