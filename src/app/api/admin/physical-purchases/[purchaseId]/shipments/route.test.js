import { POST } from './route';
import { getServerSession } from 'next-auth/next';
import { createPhysicalShipment } from '@/lib/byeMoneyApi';

jest.mock('next-auth/next', () => ({ getServerSession: jest.fn() }));
jest.mock('@/lib/auth', () => ({ authOptions: {} }));
jest.mock('@/lib/byeMoneyApi', () => ({ createPhysicalShipment: jest.fn() }));
jest.mock('next/server', () => ({
  NextResponse: { json: (body, init) => ({ body, status: init?.status || 200 }) },
}));

const PID = '22222222-2222-2222-2222-222222222222';
const ctx = { params: Promise.resolve({ purchaseId: PID }) };
const req = (body) => ({ json: async () => body });

beforeEach(() => {
  createPhysicalShipment.mockReset();
  global.fetch = jest.fn();
  getServerSession.mockResolvedValue({
    user: { jwt: 'server-admin-jwt', role: { type: 'administrator' } },
  });
});

describe('POST /api/admin/physical-purchases/[purchaseId]/shipments', () => {
  it('collectionType و provider را با JWT سروری به بای‌مانی می‌فرستد', async () => {
    createPhysicalShipment.mockResolvedValue({
      success: true,
      data: {
        purchaseId: PID,
        deliveryStatus: 'Shipped',
        trackingCode: 'IR-POST-100',
        outcome: 'Created',
      },
    });

    const res = await POST(
      req({ provider: 'PostEx', collectionType: 'pick_up' }),
      ctx
    );

    expect(res.status).toBe(200);
    expect(res.body.data.deliveryStatus).toBe('Shipped');
    expect(createPhysicalShipment).toHaveBeenCalledWith({
      jwt: 'server-admin-jwt',
      purchaseId: PID,
      collectionType: 'pick_up',
      provider: 'PostEx',
    });
  });

  it('پاسخ Preparing با warning را بدون نشت توکن برمی‌گرداند', async () => {
    createPhysicalShipment.mockResolvedValue({
      success: true,
      data: {
        purchaseId: PID,
        deliveryStatus: 'Preparing',
        outcome: 'AwaitingTrackingCode',
        warning: 'کد پستی هنوز نیامده.',
      },
    });

    const res = await POST(
      req({ provider: 'PostEx', collectionType: 'courier_drop_off' }),
      ctx
    );

    expect(res.status).toBe(200);
    expect(res.body.data.deliveryStatus).toBe('Preparing');
    expect(res.body.data.warning).toBe('کد پستی هنوز نیامده.');
    expect(JSON.stringify(res.body)).not.toContain('server-admin-jwt');
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('کاربر بدون session رد می‌شود', async () => {
    getServerSession.mockResolvedValue(null);
    const res = await POST(req({ collectionType: 'pick_up' }), ctx);
    expect(res.status).toBe(401);
    expect(createPhysicalShipment).not.toHaveBeenCalled();
  });

  it.each([
    [{ badRequest: true }, 400],
    [{ forbidden: true }, 403],
    [{ notFound: true }, 404],
    [{ unauthorized: true }, 401],
    [{ networkError: true }, 502],
  ])('نگاشت خطا %p به %i', async (flags, code) => {
    createPhysicalShipment.mockResolvedValue({ success: false, error: 'خطا', ...flags });
    expect((await POST(req({ collectionType: 'pick_up' }), ctx)).status).toBe(code);
  });
});
