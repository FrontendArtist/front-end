import { POST } from './route';
import { getServerSession } from 'next-auth/next';

jest.mock('next-auth/next', () => ({ getServerSession: jest.fn() }));
jest.mock('@/lib/auth', () => ({ authOptions: {} }));
jest.mock('@/lib/byeMoneySync', () => ({ BYEMONEY_API_URL: 'https://byemoney.test' }));
jest.mock('next/server', () => ({
  NextResponse: { json: (body, init) => ({ body, status: init?.status || 200 }) },
}));

const CART_ID = 'cccccccc-cccc-cccc-cccc-cccccccccccc';
const ctx = { params: Promise.resolve({ cartId: CART_ID }) };
const req = (body) => ({ json: async () => body });

beforeEach(() => {
  global.fetch = jest.fn();
  getServerSession.mockResolvedValue({
    user: { jwt: 'server-admin-jwt', role: { type: 'administrator' } },
  });
});

describe('POST /api/admin/carts/[cartId]/shipments', () => {
  it('درخواست را با JWT سروری و پارامترها به بای‌مانی می‌فرستد و پاسخ ۲۰۰ را بازمی‌گرداند', async () => {
    const mockResponseData = {
      cartId: CART_ID,
      deliveryStatus: 'Shipped',
      trackingCode: 'IR-POST-100',
      trackingProvider: 'PostEx',
      providerParcelId: '1319906676294',
      outcome: 'Created',
      warning: null,
    };

    global.fetch.mockResolvedValueOnce({
      status: 200,
      json: async () => mockResponseData,
    });

    const res = await POST(
      req({ provider: 'PostEx', collectionType: 'pick_up' }),
      ctx
    );

    expect(res.status).toBe(200);
    expect(res.body).toEqual(mockResponseData);
    expect(global.fetch).toHaveBeenCalledWith(
      `https://byemoney.test/api/admin/carts/${CART_ID}/shipments`,
      expect.objectContaining({
        method: 'POST',
        headers: {
          Authorization: 'Bearer server-admin-jwt',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          provider: 'PostEx',
        }),
      })
    );
    expect(JSON.stringify(res.body)).not.toContain('server-admin-jwt');
  });

  it('boxTypeId اختیاری را در صورت ارسال فوروارد می‌کند', async () => {
    global.fetch.mockResolvedValueOnce({
      status: 200,
      json: async () => ({
        cartId: CART_ID,
        deliveryStatus: 'Shipped',
        providerParcelId: '1319906676294',
        outcome: 'Created',
      }),
    });

    const res = await POST(
      req({ provider: 'PostEx', collectionType: 'courier_drop_off', boxTypeId: 5 }),
      ctx
    );

    expect(res.status).toBe(200);
    expect(global.fetch).toHaveBeenCalledWith(
      `https://byemoney.test/api/admin/carts/${CART_ID}/shipments`,
      expect.objectContaining({
        body: JSON.stringify({
          provider: 'PostEx',
          boxTypeId: 5,
        }),
      })
    );
  });

  it('پاسخ Preparing با warning (outcome=AwaitingTrackingCode) را بدون تغییر پاس می‌دهد', async () => {
    const mockResponseData = {
      cartId: CART_ID,
      deliveryStatus: 'Preparing',
      outcome: 'AwaitingTrackingCode',
      warning: 'کد پستی هنوز نیامده.',
      providerParcelId: '1319906676294',
    };

    global.fetch.mockResolvedValueOnce({
      status: 200,
      json: async () => mockResponseData,
    });

    const res = await POST(
      req({ provider: 'PostEx', collectionType: 'courier_drop_off' }),
      ctx
    );

    expect(res.status).toBe(200);
    expect(res.body.deliveryStatus).toBe('Preparing');
    expect(res.body.warning).toBe('کد پستی هنوز نیامده.');
  });

  it('کد وضعیت و بدنهٔ خطای بای‌مانی را بدون تغییر بازتاب می‌دهد', async () => {
    const errorPayload = {
      code: 'NoActivePreparingItems',
      error: 'هیچ قلم فعال در وضعیت در حال آماده‌سازی برای این سبد یافت نشد.',
    };

    global.fetch.mockResolvedValueOnce({
      status: 400,
      json: async () => errorPayload,
    });

    const res = await POST(
      req({ provider: 'PostEx', collectionType: 'pick_up' }),
      ctx
    );

    expect(res.status).toBe(400);
    expect(res.body).toEqual(errorPayload);
  });

  it.each([
    [402, { error: 'هزینه ارسال پرداخت نشده است.' }],
    [403, { error: 'عدم دسترسی.' }],
    [404, { error: 'سبد خرید یافت نشد.' }],
    [500, { error: 'خطای داخلی بای‌مانی.' }],
  ])('خطای %i با بدنه را بدون دستکاری عبور می‌دهد', async (statusCode, payload) => {
    global.fetch.mockResolvedValueOnce({
      status: statusCode,
      json: async () => payload,
    });

    const res = await POST(req({}), ctx);
    expect(res.status).toBe(statusCode);
    expect(res.body).toEqual(payload);
  });

  it('کاربر بدون نشست یا غیر ادمین با خطای ۴۰۱ رد می‌شود', async () => {
    getServerSession.mockResolvedValueOnce(null);
    const res1 = await POST(req({ collectionType: 'pick_up' }), ctx);
    expect(res1.status).toBe(401);
    expect(global.fetch).not.toHaveBeenCalled();

    getServerSession.mockResolvedValueOnce({
      user: { jwt: 'user-jwt', role: { type: 'authenticated' } },
    });
    const res2 = await POST(req({ collectionType: 'pick_up' }), ctx);
    expect(res2.status).toBe(401);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('شناسهٔ سبد نامعتبر با ۴۰۰ رد می‌شود', async () => {
    const res = await POST(req({}), { params: Promise.resolve({ cartId: '   ' }) });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('شناسه سبد نامعتبر است.');
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('خطای شبکه در ارتباط با بای‌مانی منجر به ۵۰۲ می‌شود', async () => {
    global.fetch.mockRejectedValueOnce(new Error('Network error'));
    const res = await POST(req({ collectionType: 'pick_up' }), ctx);
    expect(res.status).toBe(502);
    expect(res.body.error).toBe('خطا در برقراری ارتباط با سامانه مالی.');
  });
});
