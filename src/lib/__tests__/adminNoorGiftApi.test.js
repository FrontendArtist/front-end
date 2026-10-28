/** @jest-environment node */
jest.mock('../byeMoneySync.js', () => ({ BYEMONEY_API_URL: 'http://localhost:5000' }));
jest.mock('@/context/DisplayRateContext', () => ({
  invalidateConversionRateCache: jest.fn(),
}));

import {
  sendNoorGiftWithByeMoney,
  getBatchBalancesWithByeMoney,
} from '../byeMoneyApi';

describe('sendNoorGiftWithByeMoney', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    global.fetch = jest.fn();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  test('fails if jwt is missing', async () => {
    const res = await sendNoorGiftWithByeMoney({
      externalUserIds: ['user-1'],
      amountNoor: 10,
      reason: 'پاداش',
      jwt: null,
    });

    expect(res.success).toBe(false);
    expect(res.unauthorized).toBe(true);
    expect(res.status).toBe(401);
  });

  test('fails if externalUserIds is empty', async () => {
    const res = await sendNoorGiftWithByeMoney({
      externalUserIds: [],
      amountNoor: 10,
      reason: 'پاداش',
      jwt: 'valid-jwt',
    });

    expect(res.success).toBe(false);
    expect(res.status).toBe(400);
    expect(res.error).toContain('حداقل یک کاربر');
  });

  test('fails if externalUserIds exceeds 100 users', async () => {
    const hundredAndOneUsers = Array.from({ length: 101 }, (_, i) => `user-${i + 1}`);
    const res = await sendNoorGiftWithByeMoney({
      externalUserIds: hundredAndOneUsers,
      amountNoor: 10,
      reason: 'پاداش',
      jwt: 'valid-jwt',
    });

    expect(res.success).toBe(false);
    expect(res.status).toBe(400);
    expect(res.error).toContain('حداکثر ۱۰۰ کاربر');
    expect(global.fetch).not.toHaveBeenCalled();
  });

  test('fails if amountNoor is not a positive integer (0, negative, float, invalid)', async () => {
    const invalidAmounts = [0, -5, 12.5, '0', '-10', 'abc', '', null];

    for (const amt of invalidAmounts) {
      const res = await sendNoorGiftWithByeMoney({
        externalUserIds: ['user-1'],
        amountNoor: amt,
        reason: 'پاداش',
        jwt: 'valid-jwt',
      });

      expect(res.success).toBe(false);
      expect(res.status).toBe(400);
      expect(res.error).toContain('عدد صحیح مثبت');
    }
  });

  test('fails if reason is missing or empty string', async () => {
    const res = await sendNoorGiftWithByeMoney({
      externalUserIds: ['user-1'],
      amountNoor: 10,
      reason: '   ',
      jwt: 'valid-jwt',
    });

    expect(res.success).toBe(false);
    expect(res.status).toBe(400);
    expect(res.error).toContain('علت ثبت هدیه اجباری است');
  });

  test('converts Persian/Arabic digits in amountNoor to Latin and sends request successfully', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        batchId: 'batch-abc-123',
        amountNoorPerUser: 25,
        totalRecipients: 2,
        totalAmountNoor: 50,
        reason: 'عید غدیر',
        grantedAtUtc: '2026-10-28T10:00:00Z',
        recipients: [
          { externalUserId: 'doc-1', userId: '1', status: 'Success', newGiftBalance: 25 },
          { externalUserId: 'doc-2', userId: '2', status: 'Success', newGiftBalance: 25 },
        ],
      }),
    });

    const res = await sendNoorGiftWithByeMoney({
      externalUserIds: ['doc-1', 'doc-2'],
      amountNoor: '۲۵', // Persian digits
      reason: 'عید غدیر',
      idempotencyKey: 'custom-idemp-key-1',
      jwt: 'admin-jwt',
    });

    expect(res.success).toBe(true);
    expect(res.status).toBe(200);
    expect(res.data.batchId).toBe('batch-abc-123');
    expect(res.data.totalAmountNoor).toBe(50);

    expect(global.fetch).toHaveBeenCalledWith(
      'http://localhost:5000/api/admin/noor-gifts',
      expect.objectContaining({
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer admin-jwt',
          'Idempotency-Key': 'custom-idemp-key-1',
        },
        body: JSON.stringify({
          externalUserIds: ['doc-1', 'doc-2'],
          amountNoor: 25,
          reason: 'عید غدیر',
        }),
      })
    );
  });

  test('handles 400 error with invalidUsers list and clear notice that nothing was registered', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: false,
      status: 400,
      json: async () => ({
        error: 'یک یا چند کاربر نامعتبر هستند.',
        invalidUsers: [
          { externalUserId: 'bad-doc-1', reason: 'کاربر در سامانه یافت نشد' },
        ],
      }),
    });

    const res = await sendNoorGiftWithByeMoney({
      externalUserIds: ['doc-1', 'bad-doc-1'],
      amountNoor: 10,
      reason: 'تست خطا',
      idempotencyKey: 'key-400',
      jwt: 'admin-jwt',
    });

    expect(res.success).toBe(false);
    expect(res.status).toBe(400);
    expect(res.invalidUsers).toEqual([
      { externalUserId: 'bad-doc-1', reason: 'کاربر در سامانه یافت نشد' },
    ]);
    expect(res.error).toBe('یک یا چند کاربر نامعتبر هستند.');
  });

  test('handles 403 forbidden when Noor.Gift permission is missing', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: false,
      status: 403,
      json: async () => ({}),
    });

    const res = await sendNoorGiftWithByeMoney({
      externalUserIds: ['doc-1'],
      amountNoor: 10,
      reason: 'تست دسترسی',
      jwt: 'admin-jwt',
    });

    expect(res.success).toBe(false);
    expect(res.forbidden).toBe(true);
    expect(res.status).toBe(403);
    expect(res.error).toContain('Noor.Gift');
  });

  test('handles 409 conflict when idempotency key conflict occurs', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: false,
      status: 409,
      json: async () => ({}),
    });

    const res = await sendNoorGiftWithByeMoney({
      externalUserIds: ['doc-1'],
      amountNoor: 10,
      reason: 'تست تعارض',
      jwt: 'admin-jwt',
    });

    expect(res.success).toBe(false);
    expect(res.conflict).toBe(true);
    expect(res.status).toBe(409);
    expect(res.error).toContain('درخواستی با همین کلید ولی محتوای متفاوت ثبت شده است');
  });
});

describe('getBatchBalancesWithByeMoney giftBalances support', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    global.fetch = jest.fn();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  test('normalizes giftBalances alongside balances when returned from backend', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        balances: {
          'doc-1': 150,
          'doc-2': 0,
        },
        giftBalances: {
          'doc-1': 30,
          'doc-2': 100,
        },
      }),
    });

    const res = await getBatchBalancesWithByeMoney({
      userIds: ['doc-1', 'doc-2'],
      jwt: 'admin-jwt',
    });

    expect(res.success).toBe(true);
    expect(res.balances).toEqual({
      'doc-1': 150,
      'doc-2': 0,
    });
    expect(res.giftBalances).toEqual({
      'doc-1': 30,
      'doc-2': 100,
    });
  });

  test('returns giftBalances as null when absent in backend response without breaking', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        balances: {
          'doc-1': 200,
        },
      }),
    });

    const res = await getBatchBalancesWithByeMoney({
      userIds: ['doc-1'],
      jwt: 'admin-jwt',
    });

    expect(res.success).toBe(true);
    expect(res.balances).toEqual({ 'doc-1': 200 });
    expect(res.giftBalances).toBeNull();
  });
});

