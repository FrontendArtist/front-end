import { CourseOrderId, getMyCourseOrders, getMyCourseOrderDetails } from '../byeMoneyApi';

jest.mock('../byeMoneySync.js', () => ({ BYEMONEY_API_URL: 'https://byemoney.test' }));

const originalFetch = global.fetch;
beforeEach(() => {
  global.fetch = jest.fn();
});
afterAll(() => {
  global.fetch = originalFetch;
});

describe('CourseOrderId helper', () => {
  test('validates correctly formatted compound order IDs', () => {
    const validUuid = '123e4567-e89b-12d3-a456-426614174000';
    expect(CourseOrderId.isValid(`cart:${validUuid}`)).toBe(true);
    expect(CourseOrderId.isValid(`topup:${validUuid}`)).toBe(true);
    expect(CourseOrderId.isValid(`purchase:${validUuid}`)).toBe(true);
  });

  test('rejects invalid prefixes, malformed UUIDs, or non-string inputs', () => {
    expect(CourseOrderId.isValid(null)).toBe(false);
    expect(CourseOrderId.isValid('')).toBe(false);
    expect(CourseOrderId.isValid(123)).toBe(false);
    expect(CourseOrderId.isValid('order:123e4567-e89b-12d3-a456-426614174000')).toBe(false);
    expect(CourseOrderId.isValid('cart:not-a-uuid')).toBe(false);
    expect(CourseOrderId.isValid('cart:123e4567-e89b-12d3-a456')).toBe(false);
    expect(CourseOrderId.isValid('cart:123e4567-e89b-12d3-a456-426614174000:extra')).toBe(false);
  });

  test('formats compound order ID based on source', () => {
    const uuid = '123e4567-e89b-12d3-a456-426614174000';
    expect(CourseOrderId.for('Cart', uuid)).toBe(`cart:${uuid.toLowerCase()}`);
    expect(CourseOrderId.for('TopUpCheckout', uuid)).toBe(`topup:${uuid.toLowerCase()}`);
    expect(CourseOrderId.for('Purchase', uuid)).toBe(`purchase:${uuid.toLowerCase()}`);
    expect(CourseOrderId.for('Other', uuid)).toBe(`purchase:${uuid.toLowerCase()}`);
  });
});

describe('getMyCourseOrders (I11-T)', () => {
  test('requires a valid jwt before sending a request', async () => {
    const result = await getMyCourseOrders({});
    expect(result).toEqual({ success: false, unauthorized: true, error: 'نشست کاربری نامعتبر است.' });
    expect(fetch).not.toHaveBeenCalled();
  });

  test('sends request with default pagination and auth header', async () => {
    const responseData = {
      items: [
        {
          orderId: 'cart:11111111-1111-1111-1111-111111111111',
          sourceType: 'Cart',
          financialStatus: 'Paid',
          deliveryStatus: 'Delivered',
          finalAmountInNoor: 15,
          itemCount: 1,
          createdAtUtc: '2026-10-20T10:00:00Z',
        },
      ],
      page: 1,
      pageSize: 20,
      totalCount: 1,
    };
    fetch.mockResolvedValue({
      status: 200,
      json: async () => responseData,
    });

    const res = await getMyCourseOrders({ jwt: 'user-token' });
    expect(res).toEqual({ success: true, data: responseData });
    expect(fetch).toHaveBeenCalledWith('https://byemoney.test/api/me/course-orders?page=1&pageSize=20', {
      method: 'GET',
      headers: {
        Authorization: 'Bearer user-token',
        'Content-Type': 'application/json',
      },
      cache: 'no-store',
      signal: undefined,
    });
  });

  test('passes filter query parameters correctly', async () => {
    fetch.mockResolvedValue({
      status: 200,
      json: async () => ({ items: [], page: 2, pageSize: 10, totalCount: 0 }),
    });

    await getMyCourseOrders({
      jwt: 'user-token',
      page: 2,
      pageSize: 10,
      fromUtc: '2026-10-01T00:00:00Z',
      toUtc: '2026-10-20T00:00:00Z',
      financialStatus: 'AwaitingPayment',
      deliveryStatus: 'NotStarted',
      sourceType: 'TopUpCheckout',
    });

    const calledUrl = fetch.mock.calls[0][0];
    expect(calledUrl).toContain('page=2');
    expect(calledUrl).toContain('pageSize=10');
    expect(calledUrl).toContain('fromUtc=2026-10-01T00%3A00%3A00Z');
    expect(calledUrl).toContain('toUtc=2026-10-20T00%3A00%3A00Z');
    expect(calledUrl).toContain('financialStatus=AwaitingPayment');
    expect(calledUrl).toContain('deliveryStatus=NotStarted');
    expect(calledUrl).toContain('sourceType=TopUpCheckout');
  });

  test('handles 401 unauthorized and 403 forbidden responses', async () => {
    fetch.mockResolvedValueOnce({ status: 401 });
    const res401 = await getMyCourseOrders({ jwt: 'expired-token' });
    expect(res401).toMatchObject({ success: false, unauthorized: true });

    fetch.mockResolvedValueOnce({ status: 403 });
    const res403 = await getMyCourseOrders({ jwt: 'forbidden-token' });
    expect(res403).toMatchObject({ success: false, forbidden: true });
  });

  test('handles 400 bad request response', async () => {
    fetch.mockResolvedValueOnce({ status: 400 });
    const res400 = await getMyCourseOrders({ jwt: 'valid-token' });
    expect(res400).toMatchObject({ success: false, badRequest: true });
  });

  test('handles network errors gracefully', async () => {
    fetch.mockRejectedValueOnce(new Error('Connection refused'));
    const res = await getMyCourseOrders({ jwt: 'user-token' });
    expect(res).toMatchObject({ success: false, networkError: true });
  });

  test('propagates AbortError when signal is cancelled', async () => {
    const abortErr = new DOMException('Aborted', 'AbortError');
    fetch.mockRejectedValueOnce(abortErr);
    await expect(getMyCourseOrders({ jwt: 'user-token' })).rejects.toBe(abortErr);
  });
});

describe('getMyCourseOrderDetails (I11-T)', () => {
  const sampleOrder = {
    orderId: 'cart:11111111-1111-1111-1111-111111111111',
    sourceType: 'Cart',
    financialStatus: 'Paid',
    deliveryStatus: 'Delivered',
    finalAmountInNoor: 20,
    itemCount: 1,
    items: [
      {
        externalCourseId: 'course-doc-1',
        title: 'دوره نمونه',
        purchaseId: '22222222-2222-2222-2222-222222222222',
        financialStatus: 'Paid',
        deliveryStatus: 'Delivered',
      },
    ],
    topUps: [],
  };

  test('requires both jwt and orderId before sending request', async () => {
    for (const params of [undefined, {}, { jwt: 'token' }, { orderId: 'cart:123' }]) {
      const res = await getMyCourseOrderDetails(params);
      expect(res).toMatchObject({ success: false });
    }
    expect(fetch).not.toHaveBeenCalled();
  });

  test('fetches order details using encoded orderId and auth header', async () => {
    fetch.mockResolvedValue({
      status: 200,
      json: async () => sampleOrder,
    });

    const res = await getMyCourseOrderDetails({
      jwt: 'user-token',
      orderId: 'cart:11111111-1111-1111-1111-111111111111',
    });
    expect(res).toEqual({ success: true, data: sampleOrder });
    expect(fetch).toHaveBeenCalledWith(
      'https://byemoney.test/api/me/course-orders/cart%3A11111111-1111-1111-1111-111111111111',
      {
        method: 'GET',
        headers: {
          Authorization: 'Bearer user-token',
          'Content-Type': 'application/json',
        },
        cache: 'no-store',
        signal: undefined,
      }
    );
  });

  test('handles 404 not found (ownership restriction / non-existent order)', async () => {
    fetch.mockResolvedValue({ status: 404 });
    const res = await getMyCourseOrderDetails({
      jwt: 'user-token',
      orderId: 'cart:99999999-9999-9999-9999-999999999999',
    });
    expect(res).toMatchObject({ success: false, notFound: true });
  });

  test('handles 401 unauthorized and 403 forbidden', async () => {
    fetch.mockResolvedValueOnce({ status: 401 });
    const res401 = await getMyCourseOrderDetails({ jwt: 'expired', orderId: 'cart:1111' });
    expect(res401).toMatchObject({ success: false, unauthorized: true });

    fetch.mockResolvedValueOnce({ status: 403 });
    const res403 = await getMyCourseOrderDetails({ jwt: 'forbidden', orderId: 'cart:1111' });
    expect(res403).toMatchObject({ success: false, forbidden: true });
  });

  test('propagates AbortError when signal is cancelled', async () => {
    const abortErr = new DOMException('Aborted', 'AbortError');
    fetch.mockRejectedValueOnce(abortErr);
    await expect(getMyCourseOrderDetails({ jwt: 'user-token', orderId: 'cart:1111' })).rejects.toBe(abortErr);
  });
});
