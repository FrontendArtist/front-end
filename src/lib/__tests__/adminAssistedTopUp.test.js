/** @jest-environment node */
jest.mock('../byeMoneySync.js', () => ({ BYEMONEY_API_URL: 'http://localhost:5000' }));
jest.mock('@/context/DisplayRateContext', () => ({
  invalidateConversionRateCache: jest.fn(),
}));
import {
  createAdminAssistedTopUpWithByeMoney,
  convertRialToTomanExact,
} from '../byeMoneyApi';

describe('convertRialToTomanExact', () => {
  test('divides integer rial values by 10 exactly', () => {
    expect(convertRialToTomanExact(50000000)).toBe('5000000');
    expect(convertRialToTomanExact('50000000')).toBe('5000000');
    expect(convertRialToTomanExact('10000')).toBe('1000');
    expect(convertRialToTomanExact('10')).toBe('1');
  });

  test('preserves exact decimals when rial is not divisible by 10 without rounding or truncating', () => {
    expect(convertRialToTomanExact('10005')).toBe('1000.5');
    expect(convertRialToTomanExact(10005)).toBe('1000.5');
    expect(convertRialToTomanExact('1234567')).toBe('123456.7');
    expect(convertRialToTomanExact('5')).toBe('0.5');
    expect(convertRialToTomanExact('1')).toBe('0.1');
  });

  test('handles fractional rial inputs without floating-point error', () => {
    expect(convertRialToTomanExact('123.4')).toBe('12.34');
    expect(convertRialToTomanExact('0.5')).toBe('0.05');
  });

  test('handles commas and formatting in input', () => {
    expect(convertRialToTomanExact('50,000,000')).toBe('5000000');
    expect(convertRialToTomanExact('10,005')).toBe('1000.5');
  });

  test('returns empty string or 0 for invalid/zero inputs', () => {
    expect(convertRialToTomanExact(0)).toBe('0');
    expect(convertRialToTomanExact('0')).toBe('0');
    expect(convertRialToTomanExact('')).toBe('');
    expect(convertRialToTomanExact(null)).toBe('');
    expect(convertRialToTomanExact(undefined)).toBe('');
  });
});

describe('createAdminAssistedTopUpWithByeMoney', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    global.fetch = jest.fn();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  test('submits successfully without receipt file (receipt is optional)', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        topUpRequestId: 'req-123',
        clientReferenceId: 'ref-456',
        amountNoor: 50,
        rialPerNoor: 10000,
      }),
    });

    const result = await createAdminAssistedTopUpWithByeMoney({
      beneficiaryExternalUserId: 'beneficiary-doc-id',
      amountRial: 500000,
      jwt: 'admin-jwt-token',
    });

    expect(result.success).toBe(true);
    expect(result.data).toEqual({
      topUpRequestId: 'req-123',
      clientReferenceId: 'ref-456',
      amountNoor: 50,
      rialPerNoor: 10000,
    });

    expect(global.fetch).toHaveBeenCalledTimes(1);
    const [endpoint, options] = global.fetch.mock.calls[0];
    expect(endpoint).toBe('http://localhost:5000/api/admin/topups/assisted');
    expect(options.method).toBe('POST');
    expect(options.headers['Authorization']).toBe('Bearer admin-jwt-token');
    expect(options.headers['Idempotency-Key']).toBeDefined();

    const formData = options.body;
    expect(formData.get('BeneficiaryExternalUserId')).toBe('beneficiary-doc-id');
    expect(formData.get('AmountToman')).toBe('50000');
    expect(formData.get('Receipt')).toBeNull();
  });

  test('submits successfully with receipt file and externalTransactionId', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        TopUpRequestId: 'req-789',
        ClientReferenceId: 'ref-789',
        AmountNoor: 100,
        RialPerNoor: 10000,
      }),
    });

    const fakeReceipt = new Blob(['fake image content'], { type: 'image/png' });
    const result = await createAdminAssistedTopUpWithByeMoney({
      beneficiaryExternalUserId: 'beneficiary-doc-id',
      amountToman: '1000.5',
      receipt: fakeReceipt,
      externalTransactionId: 'TRX-12345',
      idempotencyKey: 'custom-idem-key-99',
      jwt: 'admin-jwt-token',
    });

    expect(result.success).toBe(true);
    const [, options] = global.fetch.mock.calls[0];
    expect(options.headers['Idempotency-Key']).toBe('custom-idem-key-99');

    const formData = options.body;
    expect(formData.get('BeneficiaryExternalUserId')).toBe('beneficiary-doc-id');
    expect(formData.get('AmountToman')).toBe('1000.5');
    expect(formData.get('Receipt')).toBeDefined();
    expect(formData.get('ExternalTransactionId')).toBe('TRX-12345');
  });

  test('preserves exact fractional AmountToman from amountRial input without rounding', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ topUpRequestId: 'req-1' }),
    });

    await createAdminAssistedTopUpWithByeMoney({
      beneficiaryExternalUserId: 'beneficiary-doc-id',
      amountRial: '10005',
      jwt: 'admin-jwt-token',
    });

    const [, options] = global.fetch.mock.calls[0];
    const formData = options.body;
    expect(formData.get('AmountToman')).toBe('1000.5');
  });

  test('returns 403 forbidden error when user lacks required permissions in ByeMoney', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: false,
      status: 403,
      json: async () => ({}),
    });

    const result = await createAdminAssistedTopUpWithByeMoney({
      beneficiaryExternalUserId: 'beneficiary-doc-id',
      amountToman: 1000,
      jwt: 'admin-jwt-token',
    });

    expect(result.success).toBe(false);
    expect(result.forbidden).toBe(true);
    expect(result.status).toBe(403);
    expect(result.error).toContain('مجوز مالی لازم');
  });

  test('returns 401 unauthorized when jwt is expired or missing', async () => {
    const missingJwtResult = await createAdminAssistedTopUpWithByeMoney({
      beneficiaryExternalUserId: 'beneficiary-doc-id',
      amountToman: 1000,
      jwt: null,
    });
    expect(missingJwtResult.success).toBe(false);
    expect(missingJwtResult.unauthorized).toBe(true);

    global.fetch.mockResolvedValueOnce({
      ok: false,
      status: 401,
      json: async () => ({}),
    });
    const expiredJwtResult = await createAdminAssistedTopUpWithByeMoney({
      beneficiaryExternalUserId: 'beneficiary-doc-id',
      amountToman: 1000,
      jwt: 'expired-jwt',
    });
    expect(expiredJwtResult.success).toBe(false);
    expect(expiredJwtResult.unauthorized).toBe(true);
    expect(expiredJwtResult.status).toBe(401);
  });

  test('returns 409 conflict when idempotency key conflicts with different payload', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: false,
      status: 409,
      json: async () => ({ error: 'Idempotency conflict' }),
    });

    const result = await createAdminAssistedTopUpWithByeMoney({
      beneficiaryExternalUserId: 'beneficiary-doc-id',
      amountToman: 1000,
      idempotencyKey: 'same-key',
      jwt: 'admin-jwt-token',
    });

    expect(result.success).toBe(false);
    expect(result.conflict).toBe(true);
    expect(result.status).toBe(409);
    expect(result.error).toBe('Idempotency conflict');
  });

  test('validates positive amount', async () => {
    const zeroResult = await createAdminAssistedTopUpWithByeMoney({
      beneficiaryExternalUserId: 'user-1',
      amountToman: 0,
      jwt: 'jwt',
    });
    expect(zeroResult.success).toBe(false);
    expect(zeroResult.error).toContain('بزرگتر از صفر');

    const negativeResult = await createAdminAssistedTopUpWithByeMoney({
      beneficiaryExternalUserId: 'user-1',
      amountRial: -500,
      jwt: 'jwt',
    });
    expect(negativeResult.success).toBe(false);
    expect(negativeResult.error).toContain('بزرگتر از صفر');
  });
});
