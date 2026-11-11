import { GET, POST } from './route';
import { getServerSession } from 'next-auth';
import {
  getMyCourseOrders,
  getMyCourseOrderDetails,
  getCoursePurchaseReceipt,
} from '@/lib/byeMoneyApi';

jest.mock('next-auth', () => ({ getServerSession: jest.fn() }));
jest.mock('@/lib/auth', () => ({ authOptions: {}, paymentAuthOptions: {} }));

jest.mock('@/lib/byeMoneyApi', () => {
  const actual = jest.requireActual('@/lib/byeMoneyApi');
  return {
    ...actual,
    getMyCourseOrders: jest.fn(),
    getMyCourseOrderDetails: jest.fn(),
    getCoursePurchaseReceipt: jest.fn(),
  };
});
jest.mock('@/lib/api', () => {
  process.env.STRAPI_API_TOKEN = 'test-service-token';
  return { STRAPI_API_URL: 'http://strapi.test' };
});
jest.mock('next/cache', () => ({ revalidatePath: jest.fn() }));
jest.mock('next/server', () => ({ NextResponse: { json: (body, init) => ({ body, status: init?.status || 200 }) } }));

describe('بستن مسیر سفارش‌سازی قدیمی (P2-LEGACY-ORDER-CLOSE)', () => {
  const response = (data, status = 200) => ({ ok: status < 400, status, json: async () => data });
  beforeEach(() => {
    getServerSession.mockResolvedValue({ user: { id: 5 } });
    global.fetch = jest.fn(async url => (url.includes('/api/orders?') ? response({ data: [] }) : response({})));
  });
  const request = overrides => ({ json: async () => ({ cartItems: [{ id: 7, type: 'course' }], ...overrides }) });
  it.each([
    ['دوره', [{ id: 7, type: 'course' }]],
    ['فصل', [{ id: 'chapter-22', type: 'chapter', courseId: 7, chapterId: 22 }]],
    ['کالا', [{ type: 'product', id: 8, quantity: 3 }]],
    ['سبد مختلط', [{ id: 7, type: 'course' }, { type: 'product', id: 8 }]],
  ])('POST برای %s ۴۱۰ می‌دهد و هیچ درخواستی به Strapi نمی‌زند', async (_name, cartItems) => {
    const result = await POST(request({ cartItems }));
    expect(result.status).toBe(410);
    expect(result.body.message).toContain('سبد خرید');
    expect(fetch).not.toHaveBeenCalled();
  });
  it('POST بدون نشست هم ۴۱۰ می‌دهد و چیزی نمی‌سازد', async () => {
    getServerSession.mockResolvedValue(null);
    expect((await POST(request())).status).toBe(410);
    expect(fetch).not.toHaveBeenCalled();
  });
  it('جزئیات سفارش قدیمی همچنان به مالک نشست محدود و خواندنی است', async () => {
    await GET({ url: 'http://site.test/api/orders?documentId=order-one' });
    expect(fetch.mock.calls[0][0]).toContain('filters[documentId][$eq]=order-one');
    expect(fetch.mock.calls[0][0]).toContain('filters[user][id][$eq]=5');
  });
});

describe('دریافت سفارشات و رسیدها (I11-T و I11-P)', () => {
  const jsonResponse = (data, status = 200) => ({
    ok: status < 400,
    status,
    json: async () => data,
    text: async () => JSON.stringify(data),
  });

  beforeEach(() => {
    getMyCourseOrders.mockReset();
    getMyCourseOrderDetails.mockReset();
    getCoursePurchaseReceipt.mockReset();
    getServerSession.mockResolvedValue({
      user: { id: 5, jwt: 'valid-jwt-token' },
    });
    global.fetch = jest.fn(async url => {
      if (url.includes('/api/orders?')) {
        return jsonResponse({
          data: [
            {
              id: 10,
              documentId: 'strapi-order-10',
              createdAt: '2026-10-10T12:00:00.000Z',
              totalPrice: 500000,
              paymentStatus: 'paid',
            },
          ],
        });
      }
      return jsonResponse({});
    });
  });

  it('کاربر واردنشده برای مشاهده سفارشات ۴۰۱ می‌گیرد', async () => {
    getServerSession.mockResolvedValue(null);
    const res = await GET({ url: 'http://site.test/api/orders' });
    expect(res.status).toBe(401);
  });

  it('فهرست سفارش‌ها استراپی قدیمی و بای‌مانی را ادغام و بر اساس تاریخ نزولی مرتب می‌کند', async () => {
    getMyCourseOrders.mockResolvedValue({
      success: true,
      data: {
        items: [
          {
            orderId: 'cart:11111111-1111-1111-1111-111111111111',
            sourceType: 'Cart',
            financialStatus: 'Paid',
            deliveryStatus: 'Delivered',
            finalAmountInNoor: 15,
            itemCount: 1,
            createdAtUtc: '2026-10-20T10:00:00.000Z',
            updatedAtUtc: '2026-10-20T10:05:00.000Z',
          },
        ],
        page: 1,
        pageSize: 100,
        totalCount: 1,
      },
    });

    const res = await GET({ url: 'http://site.test/api/orders' });
    expect(res.status).toBe(200);
    expect(res.body.byemoneyWarning).toBe(false);
    expect(res.body.data).toHaveLength(2);

    // Newest first (ByeMoney from 2026-10-20 before Strapi from 2026-10-10)
    expect(res.body.data[0].source).toBe('byemoney');
    expect(res.body.data[0].financialStatus).toBe('Paid');
    expect(res.body.data[0].deliveryStatus).toBe('Delivered');
    expect(res.body.data[1].source).toBe('strapi');
    expect(res.body.data[1].documentId).toBe('strapi-order-10');
  });

  it('سفارش‌های پرداخت‌نشده و ناموفق بای‌مانی را با وضعیت مستقل مالی و تحویل نمایش می‌دهد', async () => {
    getMyCourseOrders.mockResolvedValue({
      success: true,
      data: {
        items: [
          {
            orderId: 'topup:22222222-2222-2222-2222-222222222222',
            sourceType: 'TopUpCheckout',
            financialStatus: 'AwaitingPayment',
            deliveryStatus: 'NotStarted',
            finalAmountInNoor: 30,
            itemCount: 1,
            createdAtUtc: '2026-10-20T12:00:00.000Z',
          },
          {
            orderId: 'cart:33333333-3333-3333-3333-333333333333',
            sourceType: 'Cart',
            financialStatus: 'Failed',
            deliveryStatus: 'NotStarted',
            finalAmountInNoor: 20,
            itemCount: 1,
            createdAtUtc: '2026-10-19T12:00:00.000Z',
          },
        ],
        totalCount: 2,
      },
    });

    const res = await GET({ url: 'http://site.test/api/orders' });
    expect(res.status).toBe(200);
    const awaitingOrder = res.body.data.find(o => o.orderId === 'topup:22222222-2222-2222-2222-222222222222');
    expect(awaitingOrder.financialStatus).toBe('AwaitingPayment');
    expect(awaitingOrder.deliveryStatus).toBe('NotStarted');
    expect(awaitingOrder.paymentStatus).toBe('pending_payment');

    const failedOrder = res.body.data.find(o => o.orderId === 'cart:33333333-3333-3333-3333-333333333333');
    expect(failedOrder.financialStatus).toBe('Failed');
    expect(failedOrder.paymentStatus).toBe('failed');
  });

  it('خطای دریافت بای‌مانی باعث ناپدیدشدن سفارش‌های قدیمی استراپی نمی‌شود', async () => {
    getMyCourseOrders.mockResolvedValue({
      success: false,
      networkError: true,
      error: 'Connection timeout',
    });

    const res = await GET({ url: 'http://site.test/api/orders' });
    expect(res.status).toBe(200);
    expect(res.body.byemoneyWarning).toBe(true);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].documentId).toBe('strapi-order-10');
  });

  it('دریافت جزئیات سفارش با قالب I11-T متصل به getMyCourseOrderDetails می‌شود', async () => {
    const bmOrderDetail = {
      orderId: 'cart:11111111-1111-1111-1111-111111111111',
      sourceType: 'Cart',
      financialStatus: 'Paid',
      deliveryStatus: 'Delivered',
      finalAmountInNoor: 25,
      itemCount: 1,
      createdAtUtc: '2026-10-20T10:00:00Z',
      updatedAtUtc: '2026-10-20T10:05:00Z',
      items: [
        {
          externalCourseId: 'course-doc-5',
          title: 'دوره جامع',
          priceInNoor: 25,
          finalAmountInNoor: 25,
          purchaseId: '44444444-4444-4444-4444-444444444444',
          financialStatus: 'Paid',
          deliveryStatus: 'Delivered',
        },
      ],
      topUps: [
        {
          topUpRequestId: 'topup-req-1',
          status: 'Confirmed',
          amountNoor: 25,
          clientReferenceCode: 'REF-1234',
        },
      ],
    };
    getMyCourseOrderDetails.mockResolvedValue({
      success: true,
      data: bmOrderDetail,
    });

    const res = await GET({
      url: 'http://site.test/api/orders?documentId=cart:11111111-1111-1111-1111-111111111111',
    });
    expect(res.status).toBe(200);
    expect(getMyCourseOrderDetails).toHaveBeenCalledWith({
      jwt: 'valid-jwt-token',
      orderId: 'cart:11111111-1111-1111-1111-111111111111',
    });
    expect(res.body.data[0].id).toBe('cart:11111111-1111-1111-1111-111111111111');
    expect(res.body.data[0].items[0].purchaseId).toBe('44444444-4444-4444-4444-444444444444');
    expect(res.body.data[0].topUps).toHaveLength(1);
    expect(res.body.data[0].topUps[0].status).toBe('Confirmed');
  });

  it('آدرس تحویل فقط با فیلدهای نمایشی از پاسخ بای‌مانی می‌آید و از استرپی خوانده نمی‌شود', async () => {
    const cartId = '11111111-1111-1111-1111-111111111111';
    getMyCourseOrderDetails.mockResolvedValue({ success: true, data: {
      orderId: 'cart:' + cartId, sourceType: 'Cart', cartId, reservationId: '22222222-2222-2222-2222-222222222222',
      shippingAddress: { recipientName: 'علی', recipientPhone: '09120000000', province: 'تهران', city: 'تهران', fullAddress: 'خیابان ۱', postalCode: null, version: 'hash-1', extra: 'x' },
      financialStatus: 'Paid', deliveryStatus: 'Pending', finalAmountInNoor: 9, itemCount: 1, createdAtUtc: '2026-10-20T10:00:00Z',
      items: [{ externalCourseId: 'p1', itemType: 'Product', title: 'کتاب', quantity: 1, finalAmountInNoor: 9, physicalDeliveryStatus: 'Preparing' }],
      topUps: [],
    } });
    global.fetch = jest.fn(async () => jsonResponse({}));
    const res = await GET({ url: 'http://site.test/api/orders?documentId=cart:' + cartId });
    expect(res.status).toBe(200);
    expect(global.fetch.mock.calls.some(([url]) => url.includes('/address'))).toBe(false);
    expect(res.body.data[0].shippingAddress).toEqual({
      recipientName: 'علی', recipientPhone: '09120000000', province: 'تهران', city: 'تهران', fullAddress: 'خیابان ۱', postalCode: null,
    });
    expect(res.body.data[0]).not.toHaveProperty('reservationId');
  });

  it('دریافت رسید خرید شخصی از پارامتر purchaseId فقط با توکن نشست انجام می‌شود', async () => {
    const receiptData = {
      purchaseId: '55555555-5555-5555-5555-555555555555',
      courseTitle: 'دوره رسید',
      finalAmountInNoor: 15,
      financialStatus: 'Paid',
      deliveryStatus: 'Delivered',
    };
    getCoursePurchaseReceipt.mockResolvedValue({
      success: true,
      data: receiptData,
    });

    const res = await GET({
      url: 'http://site.test/api/orders?purchaseId=55555555-5555-5555-5555-555555555555',
    });
    expect(res.status).toBe(200);
    expect(getCoursePurchaseReceipt).toHaveBeenCalledWith({
      jwt: 'valid-jwt-token',
      purchaseId: '55555555-5555-5555-5555-555555555555',
    });
    expect(res.body.data).toEqual(receiptData);
  });

  it('پاسخ ۴۰۴ رسید شخصی نشان‌دهنده عدم تعلق به کاربر یا ناموجود بودن است', async () => {
    getCoursePurchaseReceipt.mockResolvedValue({
      success: false,
      notFound: true,
      error: 'خرید پیدا نشد.',
    });

    const res = await GET({
      url: 'http://site.test/api/orders?purchaseId=other-users-purchase',
    });
    expect(res.status).toBe(404);
    expect(res.body.notFound).toBe(true);
  });
});
