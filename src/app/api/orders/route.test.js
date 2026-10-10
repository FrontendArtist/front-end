import { GET, POST } from './route';
import { getServerSession } from 'next-auth';
import { getConversionRateWithByeMoney } from '@/lib/byeMoneyApi';

jest.mock('next-auth', () => ({ getServerSession: jest.fn() }));
jest.mock('@/lib/auth', () => ({ authOptions: {} }));
jest.mock('@/lib/byeMoneyApi', () => ({ getConversionRateWithByeMoney: jest.fn() }));
jest.mock('@/lib/api', () => {
  process.env.STRAPI_API_TOKEN = 'test-service-token';
  return { STRAPI_API_URL: 'http://strapi.test' };
});
jest.mock('next/cache', () => ({ revalidatePath: jest.fn() }));
jest.mock('next/server', () => ({ NextResponse: { json: (body, init) => ({ body, status: init?.status || 200 }) } }));

describe('ثبت سفارش با قیمت معتبر سرور', () => {
  const response = (data, status = 200) => ({ ok: status < 400, status, json: async () => data });
  let saved;
  beforeEach(() => {
    getConversionRateWithByeMoney.mockReset().mockResolvedValue({ success: true, tomanPerNoor: 2500 });
    saved = { data: { id: 1, documentId: 'order-one', totalPrice: 101, paymentMethod: 'online', paymentStatus: 'pending_payment' } };
    getServerSession.mockResolvedValue({ user: { id: 5 } });
    global.fetch = jest.fn(async url => {
      if (url.includes('/api/orders/checkout')) return response(saved);
      if (url.includes('/api/orders?')) return response({ data: [] });
      return response({ firstName: 'کاربر', email: 'user@example.test' });
    });
  });
  const request = overrides => ({ json: async () => ({ cartItems: [{ id: 7, type: 'course', price: 0, title: 'جعلی' }],
    user: 99, totalPrice: 0, paymentMethod: 'free', paymentStatus: 'paid', ...overrides }) });
  it('قیمت، وضعیت پرداخت و هویت ارسالی مرورگر را به Strapi نمی‌فرستد', async () => {
    const result = await POST(request());
    expect(result.status).toBe(201);
    const [, init] = fetch.mock.calls.find(([url]) => url.endsWith('/api/orders/checkout'));
    const { data } = JSON.parse(init.body);
    expect(data).toMatchObject({ user: 5, cartItems: [{ id: 7, type: 'course', quantity: 1 }] });
    expect(data).not.toHaveProperty('totalPrice');
    expect(data).not.toHaveProperty('paymentStatus');
    expect(data.paymentMethod).toBe('online');
    expect(data.pricingContext).toEqual({ isForeign: false });
    expect(getConversionRateWithByeMoney).not.toHaveBeenCalled();
    expect(data.cartItems[0]).not.toHaveProperty('price');
    expect(fetch.mock.calls.some(([, options]) => options?.method === 'PUT')).toBe(false);
  });
  it('برای نتیجهٔ رایگان معتبر سبد را یکجا پاک نمی‌کند و دوره مستقیم اضافه نمی‌کند', async () => {
    saved.data = { ...saved.data, totalPrice: 0, paymentMethod: 'free', paymentStatus: 'paid' };
    await POST(request());
    expect(fetch.mock.calls.some(([, options]) => options?.method === 'PUT')).toBe(false);
  });
  it('خرید فصل موجود را با شناسهٔ والد و فصل می‌فرستد و قیمت جعلی را حذف می‌کند', async () => {
    const result = await POST(request({ cartItems: [{ id: 'chapter-22', type: 'chapter',
      courseId: 7, chapterId: 22, price: 0, slug: 'fake' }] }));
    expect(result.status).toBe(201);
    const [, init] = fetch.mock.calls.find(([url]) => url.endsWith('/api/orders/checkout'));
    expect(JSON.parse(init.body).data.cartItems).toEqual([{ type: 'chapter', id: 'chapter-22', courseId: 7, chapterId: 22, quantity: 1 }]);
  });
  it('خطای کوپن یا قیمت سرور را پیش از تحویل برمی‌گرداند', async () => {
    fetch.mockImplementation(async url => url.includes('/checkout')
      ? response({ error: { message: 'کد تخفیف معتبر نیست.' } }, 400) : response({ email: 'user@example.test' }));
    const result = await POST(request({ couponCode: 'EXPIRED' }));
    expect(result.status).toBe(400);
    expect(fetch.mock.calls.some(([, options]) => options?.method === 'PUT')).toBe(false);
  });
  it('کالای فیزیکی و تعداد آن همچنان پذیرفته می‌شود', async () => {
    expect((await POST(request({ cartItems: [{ type: 'product', id: 8, quantity: 3, price: 0 }] }))).status).toBe(201);
    const [, init] = fetch.mock.calls.find(([url]) => url.endsWith('/api/orders/checkout'));
    expect(JSON.parse(init.body).data.cartItems).toEqual([{ type: 'product', id: 8, quantity: 3 }]);
  });
  it('ثبت شارژ معلق موجودی کاربر را افزایش نمی‌دهد', async () => {
    expect((await POST(request({ orderType: 'light_topup', lightAmount: 999,
      cartItems: [{ type: 'light_topup', lightAmount: 3, price: 0 }] }))).status).toBe(201);
    const [, init] = fetch.mock.calls.find(([url]) => url.endsWith('/api/orders/checkout'));
    expect(JSON.parse(init.body).data.cartItems).toEqual([{ type: 'light_topup', lightAmount: 3, quantity: 1 }]);
    expect(JSON.parse(init.body).data.pricingContext.lightToTomanRate).toBe(2500);
    expect(fetch.mock.calls.some(([, options]) => options?.method === 'PUT')).toBe(false);
  });
  it('بدون نرخ رسمی، شارژ را با نرخ ثابت یا نرخ مرورگر ثبت نمی‌کند', async () => {
    getConversionRateWithByeMoney.mockResolvedValue({ success: false });
    const result = await POST(request({ lightToTomanRate: 1,
      cartItems: [{ type: 'light_topup', lightAmount: 3 }] }));
    expect(result.status).toBe(503);
    expect(fetch).not.toHaveBeenCalled();
  });
  it('روش کارت‌به‌کارت فعلی master همچنان به سرور فرستاده می‌شود', async () => {
    await POST(request({ paymentMethod: 'card_to_card' }));
    const [, init] = fetch.mock.calls.find(([url]) => url.endsWith('/api/orders/checkout'));
    expect(JSON.parse(init.body).data.paymentMethod).toBe('card_to_card');
  });
  it.each([[], [{ id: 7, type: 'chapter' }], [{ id: 7, type: 'course', chapterId: 2 }],
    [{ id: 7, type: 'course', quantity: -1 }], [{ id: 7, type: 'unknown' }]].map(items => [items]))('سبد نامعتبر را رد می‌کند: %j', async cartItems => {
    expect((await POST(request({ cartItems }))).status).toBe(400);
    expect(fetch).not.toHaveBeenCalled();
  });
  it('کاربر واردنشده نمی‌تواند سفارش بسازد', async () => {
    getServerSession.mockResolvedValue(null);
    expect((await POST(request())).status).toBe(401);
    expect(fetch).not.toHaveBeenCalled();
  });
  it.each([
    [{ firstName: 'نام', lastName: 'خریدار', address: { recipientName: 'گیرنده' } }, 'نام خریدار'],
    [{ address: { recipientName: '  گیرنده  ' } }, 'گیرنده'],
    [{ address: { recipientName: '1' }, username: '09123456789', phoneNumber: '09123456789' }, 'کاربر (09123456789)'],
    [{ address: { recipientName: '1' }, username: 'customer' }, 'customer'],
  ])('نام سفارش مطابق رفتار قبلی انتخاب می‌شود: %j', async (profile, expected) => {
    fetch.mockImplementation(async url => url.endsWith('/api/orders/checkout') ? response(saved)
      : url.includes('/api/orders?') ? response({ data: [] }) : response(profile));
    await POST(request());
    const [, init] = fetch.mock.calls.find(([url]) => url.endsWith('/api/orders/checkout'));
    expect(JSON.parse(init.body).data.fullName).toBe(expected);
  });
  it('ثبت هویت خارجی از پروفایل سرور است؛ ادعای مرورگر نادیده گرفته می‌شود', async () => {
    fetch.mockImplementation(async url => url.endsWith('/api/orders/checkout') ? response(saved)
      : url.includes('/api/orders?') ? response({ data: [] }) : response({ is_foreigner: true }));
    await POST(request({ is_foreigner: false }));
    const [, init] = fetch.mock.calls.find(([url]) => url.endsWith('/api/orders/checkout'));
    expect(JSON.parse(init.body).data.pricingContext.isForeign).toBe(true);
  });
  it('جزئیات سفارش همچنان به مالک نشست محدود است', async () => {
    await GET({ url: 'http://site.test/api/orders?documentId=order-one' });
    expect(fetch.mock.calls[0][0]).toContain('filters[documentId][$eq]=order-one');
    expect(fetch.mock.calls[0][0]).toContain('filters[user][id][$eq]=5');
  });
  it('ثبت سفارش جدید هیچ سفارش معلق قبلی را خودکار لغو نمی‌کند', async () => {
    fetch.mockImplementation(async url => url.endsWith('/api/orders/checkout') ? response(saved)
      : url.includes('/api/orders?') ? response({ data: [saved.data, { documentId: 'old-pending' }] }) : response({}));
    await POST(request());
    await new Promise(resolve => setTimeout(resolve, 0));
    const changes = fetch.mock.calls.filter(([, init]) => init?.method === 'PUT');
    expect(changes).toEqual([]);
  });
});
