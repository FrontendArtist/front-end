import {
  getMyCourseOrderReceipt,
  getAdminCourseOrderReceipt,
  updatePhysicalPurchaseDeliveryStatus,
  getPendingPhysicalRestocks,
} from '../byeMoneyApi';
import { mapByeMoneyLineItem } from '../byeMoneyOrderItems';

jest.mock('../byeMoneySync.js', () => ({ BYEMONEY_API_URL: 'https://byemoney.test' }));

const originalFetch = global.fetch;
beforeEach(() => {
  global.fetch = jest.fn();
});
afterAll(() => {
  global.fetch = originalFetch;
});

const ORDER_ID = 'cart:11111111-1111-1111-1111-111111111111';
const PURCHASE_ID = '22222222-2222-2222-2222-222222222222';
const res = (status, body) => ({ status, json: async () => body });

describe('mapByeMoneyLineItem – کالای فیزیکی (I11-O)', () => {
  const product = {
    externalCourseId: 'prod-doc-1',
    itemType: 'Product',
    title: 'کتاب',
    quantity: 3,
    priceInNoor: 10,
    finalAmountInNoor: 27,
    purchaseId: PURCHASE_ID,
    deliveryStatus: 'Pending',
    physicalDeliveryStatus: 'Shipped',
  };

  test('type=product می‌دهد و به دوره/فصل تبدیل نمی‌شود', () => {
    const m = mapByeMoneyLineItem(product);
    expect(m.type).toBe('product');
    expect(m.itemType).toBe('Product');
    expect(m.__component).toBe('order.product-order-item');
    expect(m.physicalDeliveryStatus).toBe('Shipped');
    expect(m.purchaseId).toBe(PURCHASE_ID);
  });

  test('لینک دوره ندارد', () => {
    const m = mapByeMoneyLineItem(product);
    expect(m.courseDocumentId).toBeUndefined();
    expect(m.documentId).toBeUndefined();
    expect(m.courseSlug).toBeUndefined();
    expect(m.slug).toBeUndefined();
    expect(m.externalCourseId).toBeUndefined();
  });

  test('finalAmountInNoor همان مبلغ کل است و در تعداد ضرب نمی‌شود', () => {
    const m = mapByeMoneyLineItem(product);
    expect(m.quantity).toBe(3);
    expect(m.price).toBe(27);
    expect(m.unitPrice).toBe(10);
  });

  test('quantity نامعتبر یا ناموجود به ۱ برمی‌گردد و فیلد null خطا نمی‌دهد', () => {
    const m = mapByeMoneyLineItem({ itemType: 'Product', title: 'x', quantity: null, physicalDeliveryStatus: null });
    expect(m.quantity).toBe(1);
    expect(m.physicalDeliveryStatus).toBeNull();
    expect(m.price).toBeNull();
  });

  test('قلم دوره و فصل بدون تغییر می‌ماند', () => {
    const course = mapByeMoneyLineItem({ externalCourseId: 'c1', itemType: 'Course', title: 'دوره', finalAmountInNoor: 5, quantity: 1 });
    expect(course.type).toBe('course');
    expect(course.__component).toBe('order.course-order-item');
    expect(course.documentId).toBe('c1');
    const chapter = mapByeMoneyLineItem({ externalCourseId: 'ch1', itemType: 'CourseChapter', parentExternalId: 'c1', title: 'فصل' });
    expect(chapter.type).toBe('chapter');
    expect(chapter.parentExternalId).toBe('c1');
  });
});

describe.each([
  ['getMyCourseOrderReceipt', getMyCourseOrderReceipt, 'me'],
  ['getAdminCourseOrderReceipt', getAdminCourseOrderReceipt, 'admin'],
])('%s', (_name, fn, scope) => {
  test('موفق: آدرس و هدر درست و پاسخ بدون تغییر', async () => {
    const data = { orderId: ORDER_ID, items: [{ purchaseId: PURCHASE_ID, quantity: 2, physicalDeliveryStatus: 'Preparing', futureField: 1 }] };
    fetch.mockResolvedValue(res(200, data));
    const r = await fn({ jwt: 'tok', orderId: ORDER_ID });
    expect(r).toEqual({ success: true, data });
    expect(fetch).toHaveBeenCalledWith(
      `https://byemoney.test/api/${scope}/course-orders/${encodeURIComponent(ORDER_ID)}/receipt`,
      expect.objectContaining({ method: 'GET', headers: { Authorization: 'Bearer tok', 'Content-Type': 'application/json' } })
    );
  });

  test('۴۰۰ شناسهٔ نامعتبر', async () => {
    fetch.mockResolvedValue(res(400, {}));
    expect(await fn({ jwt: 'tok', orderId: 'bad' })).toMatchObject({ success: false, badRequest: true });
  });

  test('۴۰۱', async () => {
    fetch.mockResolvedValue(res(401, {}));
    expect(await fn({ jwt: 'tok', orderId: ORDER_ID })).toMatchObject({ success: false, unauthorized: true });
  });

  test('۴۰۴ «خرید پیدا نشد.»', async () => {
    fetch.mockResolvedValue(res(404, {}));
    expect(await fn({ jwt: 'tok', orderId: ORDER_ID })).toEqual({ success: false, notFound: true, error: 'خرید پیدا نشد.' });
  });

  test('۴۰۳', async () => {
    fetch.mockResolvedValue(res(403, {}));
    expect(await fn({ jwt: 'tok', orderId: ORDER_ID })).toMatchObject({ success: false, forbidden: true });
  });

  test('بدون jwt یا شناسه درخواست نمی‌فرستد', async () => {
    expect((await fn({ orderId: ORDER_ID })).success).toBe(false);
    expect(fetch).not.toHaveBeenCalled();
  });

  test('خطای شبکه', async () => {
    fetch.mockRejectedValue(new Error('down'));
    expect(await fn({ jwt: 'tok', orderId: ORDER_ID })).toMatchObject({ success: false, networkError: true });
  });
});

describe('updatePhysicalPurchaseDeliveryStatus', () => {
  const url = `https://byemoney.test/api/admin/physical-purchases/${PURCHASE_ID}/delivery-status`;

  test('موفق: PUT با بدنهٔ status', async () => {
    const data = { purchaseId: PURCHASE_ID, deliveryStatus: 'Shipped', shippedAtUtc: '2026-11-01T10:00:00Z', deliveredAtUtc: null };
    fetch.mockResolvedValue(res(200, data));
    const r = await updatePhysicalPurchaseDeliveryStatus({ jwt: 'adm', purchaseId: PURCHASE_ID, status: 'Shipped' });
    expect(r).toEqual({ success: true, data });
    expect(fetch).toHaveBeenCalledWith(url, expect.objectContaining({
      method: 'PUT',
      body: JSON.stringify({ status: 'Shipped' }),
      headers: { Authorization: 'Bearer adm', 'Content-Type': 'application/json' },
    }));
  });

  test('۴۰۰ پیام فارسی دامنه را از errors[] برمی‌گرداند', async () => {
    fetch.mockResolvedValue(res(400, { title: 'نقض قانون کسب‌وکار', status: 400, errors: ['بازگشت به وضعیت قبلی مجاز نیست.'] }));
    const r = await updatePhysicalPurchaseDeliveryStatus({ jwt: 'adm', purchaseId: PURCHASE_ID, status: 'Delivered' });
    expect(r).toEqual({ success: false, badRequest: true, error: 'بازگشت به وضعیت قبلی مجاز نیست.' });
  });

  test('۴۰۳ بدون Courses.Manage', async () => {
    fetch.mockResolvedValue(res(403, {}));
    const r = await updatePhysicalPurchaseDeliveryStatus({ jwt: 'adm', purchaseId: PURCHASE_ID, status: 'Shipped' });
    expect(r).toMatchObject({ success: false, forbidden: true });
    expect(r.error).toContain('Courses.Manage');
  });

  test('۴۰۴ پیام دامنه', async () => {
    fetch.mockResolvedValue(res(404, { title: 'یافت نشد', status: 404, errors: ['خرید کالای فیزیکی یافت نشد.'] }));
    const r = await updatePhysicalPurchaseDeliveryStatus({ jwt: 'adm', purchaseId: PURCHASE_ID, status: 'Shipped' });
    expect(r).toEqual({ success: false, notFound: true, error: 'خرید کالای فیزیکی یافت نشد.' });
  });

  test('۴۰۱', async () => {
    fetch.mockResolvedValue(res(401, {}));
    expect(await updatePhysicalPurchaseDeliveryStatus({ jwt: 'adm', purchaseId: PURCHASE_ID, status: 'Shipped' }))
      .toMatchObject({ unauthorized: true });
  });

  test.each(['Preparing', 'shipped', '', undefined])('وضعیت نامعتبر %p ارسال نمی‌شود', async (status) => {
    const r = await updatePhysicalPurchaseDeliveryStatus({ jwt: 'adm', purchaseId: PURCHASE_ID, status });
    expect(r).toMatchObject({ success: false, badRequest: true });
    expect(fetch).not.toHaveBeenCalled();
  });

  test('بدون jwt ارسال نمی‌شود', async () => {
    const r = await updatePhysicalPurchaseDeliveryStatus({ purchaseId: PURCHASE_ID, status: 'Shipped' });
    expect(r).toMatchObject({ success: false, unauthorized: true });
    expect(fetch).not.toHaveBeenCalled();
  });

  test('بدنهٔ خطای غیر JSON خطا نمی‌دهد', async () => {
    fetch.mockResolvedValue({ status: 500, json: async () => { throw new Error('not json'); } });
    const r = await updatePhysicalPurchaseDeliveryStatus({ jwt: 'adm', purchaseId: PURCHASE_ID, status: 'Shipped' });
    expect(r.success).toBe(false);
    expect(typeof r.error).toBe('string');
  });
});

describe('getPendingPhysicalRestocks (BND-05)', () => {
  test('بدون jwt درخواست نمی‌فرستد', async () => {
    const r = await getPendingPhysicalRestocks({});
    expect(r.unauthorized).toBe(true);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  test('۲۰۰ فهرست را برمی‌گرداند و توکن را در هدر می‌فرستد', async () => {
    global.fetch.mockResolvedValue(res(200, [{ operationId: 'op', abandoned: true }]));
    const r = await getPendingPhysicalRestocks({ jwt: 'jwt' });
    expect(r).toEqual({ success: true, data: [{ operationId: 'op', abandoned: true }] });
    const [url, init] = global.fetch.mock.calls[0];
    expect(url).toBe('https://byemoney.test/api/admin/physical-purchases/pending-restocks');
    expect(init.headers.Authorization).toBe('Bearer jwt');
  });

  test('۴۰۳ به forbidden نگاشت می‌شود', async () => {
    global.fetch.mockResolvedValue(res(403, {}));
    const r = await getPendingPhysicalRestocks({ jwt: 'jwt' });
    expect(r.success).toBe(false);
    expect(r.forbidden).toBe(true);
  });

  test('قطع شبکه networkError می‌دهد', async () => {
    global.fetch.mockRejectedValue(new Error('down'));
    const r = await getPendingPhysicalRestocks({ jwt: 'jwt' });
    expect(r.networkError).toBe(true);
  });
});
