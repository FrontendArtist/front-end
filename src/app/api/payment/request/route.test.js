/** @jest-environment node */
import { getCourseCart, topUpCourseCart, purchaseCourseCart } from '@/lib/courseCartApi';
jest.mock('@/lib/courseCartApi', () => ({ getCourseCart: jest.fn(), topUpCourseCart: jest.fn(), purchaseCourseCart: jest.fn() }));

import { POST } from './route';
import { getServerSession } from 'next-auth';
import { requestSepToken, SEP_GATEWAY_ACTION_URL } from '@/lib/sepPayment';
import { getCourseCheckout } from '@/lib/courseCheckoutApi';
import { purchaseCourseWithByeMoney } from '@/lib/byeMoneyApi';
jest.mock('@/lib/courseCheckoutApi', () => ({ getCourseCheckout: jest.fn() }));
jest.mock('@/lib/byeMoneyApi', () => ({ purchaseCourseWithByeMoney: jest.fn() }));
import {
  createGatewayTopUp,
  createAttempt,
  findAttempt,
  updateAttempt,
  recordGatewayOutcome,
  deliverGatewayOutcome,
} from '@/lib/gatewayTopUp';

jest.mock('next-auth', () => ({
  getServerSession: jest.fn(),
}));

jest.mock('@/lib/auth', () => ({
  authOptions: {},
  paymentAuthOptions: { secret: 'payment-test' },
}));

jest.mock('next/server', () => ({
  NextResponse: {
    json: jest.fn((body, init) => ({
      status: init?.status || 200,
      json: async () => body,
      body,
    })),
  },
}));

jest.mock('@/lib/sepPayment', () => ({
  requestSepToken: jest.fn(),
  SEP_GATEWAY_ACTION_URL: 'https://sep.shaparak.ir/OnlinePG/OnlinePG',
}));

jest.mock('@/lib/gatewayTopUp', () => ({
  createGatewayTopUp: jest.fn(),
  createAttempt: jest.fn(),
  findAttempt: jest.fn(),
  updateAttempt: jest.fn(),
  recordGatewayOutcome: jest.fn(),
  deliverGatewayOutcome: jest.fn(),
}));

jest.mock('@/lib/api', () => ({
  STRAPI_API_URL: 'http://strapi.test',
}));

global.fetch = jest.fn();

describe('POST /api/payment/request - Noor Top-up & SEP Token Flow', () => {
  const mockUserSession = {
    user: {
      id: 'user-123',
      jwt: 'mock-jwt-token',
      phoneNumber: '09123456789',
    },
  };

  const mockTopUp = {
    topUpRequestId: 'topup-req-999',
    clientReferenceId: 'REF-TOPUP-12345',
    amountRial: 500000,
  };

  const mockCreatedAttempt = {
    documentId: 'attempt-doc-001',
    resNum: 'REF-TOPUP-12345',
    topUpRequestId: 'topup-req-999',
    amountRial: 500000,
    gateway: 'SEP',
    status: 'created',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    getServerSession.mockResolvedValue(mockUserSession);
    createGatewayTopUp.mockResolvedValue(mockTopUp);
    createAttempt.mockResolvedValue(mockCreatedAttempt);
    deliverGatewayOutcome.mockResolvedValue({ ok: true });
    recordGatewayOutcome.mockResolvedValue({ eventId: 'event-123' });
  });

  const createJsonRequest = (body) => ({
    headers: {
      get: (header) => (header === 'host' ? 'tarhelahi.ir' : null),
    },
    json: async () => body,
  });

  test('خرید آنلاین قیمت و کسری سرور را همراه دوره به درخواست شارژ وصل می‌کند', async () => {
    getCourseCheckout.mockResolvedValue({ externalCourseId: 'course-1', purchaseStatus: 'NotPurchased', priceInNoor: 150, shortfallInNoor: 30 });
    requestSepToken.mockResolvedValue({ success: true, token: 'bank-token' });
    updateAttempt.mockResolvedValue({ ...mockCreatedAttempt, status: 'token_issued' });
    const response = await POST(createJsonRequest({ paymentType: 'course_purchase', externalCourseId: 'course-1', amountNoor: 1, price: 1, pendingItems: [] }));
    expect(response.status).toBe(200);
    expect(createGatewayTopUp).toHaveBeenCalledWith(30, mockUserSession.user.jwt, [{ itemType: 1, externalId: 'course-1', priceNoorSnapshot: 150 }]);
    expect(requestSepToken).toHaveBeenCalledWith(expect.objectContaining({ amount: mockTopUp.amountRial }));
    expect(purchaseCourseWithByeMoney).not.toHaveBeenCalled();
  });

  test('اگر موجودی در این فاصله کافی شده باشد خرید بدون شارژ اضافه تکمیل می‌شود', async () => {
    getCourseCheckout.mockResolvedValue({ externalCourseId: 'course-1', purchaseStatus: 'NotPurchased', priceInNoor: 150, shortfallInNoor: 0 });
    purchaseCourseWithByeMoney.mockResolvedValue({ success: true, data: { transactionId: 'wallet-tx' } });
    const response = await POST(createJsonRequest({ paymentType: 'course_purchase', externalCourseId: 'course-1' }));
    expect((await response.json()).paidWithWallet).toBe(true);
    expect(createGatewayTopUp).not.toHaveBeenCalled();
    expect(requestSepToken).not.toHaveBeenCalled();
  });

  test('ثبت مالی قبلی به درخواست شارژ مجدد تبدیل نمی‌شود', async () => {
    getCourseCheckout.mockResolvedValue({ purchaseStatus: 'DeliveryPending' });
    const response = await POST(createJsonRequest({ paymentType: 'course_purchase', externalCourseId: 'course-1' }));
    expect(response.status).toBe(409);
    expect(createGatewayTopUp).not.toHaveBeenCalled();
  });

  test('boundary: when SEP token is received successfully but recording token_issued in Strapi fails, NO success response or usable token is returned', async () => {
    // 1. SEP token issuance succeeds
    requestSepToken.mockResolvedValue({
      success: true,
      token: 'sensitive-sep-token-abcdef',
      gatewayUrl: 'https://sep.shaparak.ir/OnlinePG/OnlinePG',
    });

    // 2. Strapi updateAttempt fails (e.g. database error / 500 in Strapi)
    updateAttempt.mockRejectedValue(new Error('Strapi database connection lost'));

    const req = createJsonRequest({
      paymentType: 'light_topup',
      amountNoor: 50,
    });

    const response = await POST(req);
    const data = await response.json();

    // Verify updateAttempt was invoked for token_issued with no browser timing fields
    expect(updateAttempt).toHaveBeenCalledTimes(1);
    expect(updateAttempt).toHaveBeenCalledWith(
      mockCreatedAttempt,
      { status: 'token_issued' }
    );
    const updatePayload = updateAttempt.mock.calls[0][1];
    expect(updatePayload.tokenIssuedAtUtc).toBeUndefined();
    expect(updatePayload.tokenExpiresAtUtc).toBeUndefined();

    // Assert that the client NEVER receives a success response or usable token
    expect(response.status).toBe(500);
    expect(data.success).toBe(false);
    expect(data.token).toBeUndefined();
    expect(data.gatewayUrl).toBeUndefined();
    expect(data.message).toBe('ثبت وضعیت توکن پرداخت در سامانه با خطا مواجه شد.');
  });

  test('boundary: when updateAttempt returns null/invalid status, NO success response or usable token is returned', async () => {
    requestSepToken.mockResolvedValue({
      success: true,
      token: 'sensitive-sep-token-abcdef',
      gatewayUrl: 'https://sep.shaparak.ir/OnlinePG/OnlinePG',
    });

    // Strapi returns null data or non-updated status
    updateAttempt.mockResolvedValue(null);

    const req = createJsonRequest({
      paymentType: 'light_topup',
      amountNoor: 50,
    });

    const response = await POST(req);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.success).toBe(false);
    expect(data.token).toBeUndefined();
    expect(data.gatewayUrl).toBeUndefined();
  });

  test('happy path: Noor top-up creates attempt with status "created", requests SEP token, updates status to "token_issued", and returns token', async () => {
    requestSepToken.mockResolvedValue({
      success: true,
      token: 'valid-sep-token-12345',
      gatewayUrl: 'https://sep.shaparak.ir/OnlinePG/OnlinePG',
    });

    const mockUpdatedAttempt = {
      ...mockCreatedAttempt,
      status: 'token_issued',
    };
    updateAttempt.mockResolvedValue(mockUpdatedAttempt);

    const req = createJsonRequest({
      paymentType: 'light_topup',
      amountNoor: 50,
    });

    const response = await POST(req);
    const data = await response.json();

    // Verify createAttempt is called with status: 'created' and no browser timing fields
    expect(createAttempt).toHaveBeenCalledTimes(1);
    expect(createAttempt).toHaveBeenCalledWith(mockTopUp);

    // Verify requestSepToken does not pass TokenExpiryInMin
    expect(requestSepToken).toHaveBeenCalledTimes(1);
    const sepParams = requestSepToken.mock.calls[0][0];
    expect(sepParams.amount).toBe(mockTopUp.amountRial);
    expect(sepParams.resNum).toBe(mockTopUp.clientReferenceId);
    expect(sepParams.TokenExpiryInMin).toBeUndefined();

    // Verify updateAttempt updates status to 'token_issued' without front-end timing fields
    expect(updateAttempt).toHaveBeenCalledTimes(1);
    expect(updateAttempt).toHaveBeenCalledWith(
      mockCreatedAttempt,
      { status: 'token_issued' }
    );
    const updateData = updateAttempt.mock.calls[0][1];
    expect(updateData.tokenIssuedAtUtc).toBeUndefined();
    expect(updateData.tokenExpiresAtUtc).toBeUndefined();

    // Verify client receives success response with token
    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.token).toBe('valid-sep-token-12345');
    expect(data.gatewayUrl).toBe('https://sep.shaparak.ir/OnlinePG/OnlinePG');
    expect(data.resNum).toBe(mockTopUp.clientReferenceId);
    expect(data.amount).toBe(mockTopUp.amountRial);
  });

  test('front-end ignores browser-injected tokenIssuedAtUtc or tokenExpiresAtUtc', async () => {
    requestSepToken.mockResolvedValue({
      success: true,
      token: 'valid-sep-token-12345',
      gatewayUrl: 'https://sep.shaparak.ir/OnlinePG/OnlinePG',
    });
    updateAttempt.mockResolvedValue({ ...mockCreatedAttempt, status: 'token_issued' });

    // Client attempts to inject forged timestamps
    const req = createJsonRequest({
      paymentType: 'light_topup',
      amountNoor: 50,
      tokenIssuedAtUtc: '2026-10-04T00:00:00Z',
      tokenExpiresAtUtc: '2026-10-04T05:00:00Z',
    });

    await POST(req);

    // Check createAttempt call
    expect(createGatewayTopUp).toHaveBeenCalledWith(50, mockUserSession.user.jwt);

    // Check updateAttempt call
    const updateCallPayload = updateAttempt.mock.calls[0][1];
    expect(updateCallPayload).toEqual({ status: 'token_issued' });
    expect(updateCallPayload.tokenIssuedAtUtc).toBeUndefined();
    expect(updateCallPayload.tokenExpiresAtUtc).toBeUndefined();
  });

  test('failure in SEP token request records outcome and marks attempt failed or pending_sync', async () => {
    requestSepToken.mockResolvedValue({
      success: false,
      errorCode: '-1',
      errorDesc: 'خطا در برقراری ارتباط با بانک',
    });

    const req = createJsonRequest({
      paymentType: 'light_topup',
      amountNoor: 50,
    });

    const response = await POST(req);
    const data = await response.json();

    expect(recordGatewayOutcome).toHaveBeenCalledWith(
      mockCreatedAttempt,
      expect.objectContaining({
        stage: 'callback',
        kind: 'Unpaid',
        bankResultCode: '-1',
      })
    );
    expect(deliverGatewayOutcome).toHaveBeenCalled();
    expect(updateAttempt).toHaveBeenCalledWith(
      mockCreatedAttempt,
      expect.objectContaining({
        status: 'failed',
        lastError: '-1',
      })
    );

    expect(response.status).toBe(502);
    expect(data.success).toBe(false);
    expect(data.token).toBeUndefined();
  });

  test('پرداخت تازه با orderId استرپی رد می‌شود (۴۱۰) و نه سفارش خوانده می‌شود نه توکن صادر می‌شود', async () => {
    const response = await POST(createJsonRequest({ orderId: 'order-doc-xyz' }));
    const data = await response.json();

    expect(response.status).toBe(410);
    expect(data.success).toBe(false);
    expect(data.token).toBeUndefined();
    expect(global.fetch).not.toHaveBeenCalled();
    expect(requestSepToken).not.toHaveBeenCalled();
    expect(createAttempt).not.toHaveBeenCalled();
    expect(createGatewayTopUp).not.toHaveBeenCalled();
  });

  test('unauthenticated request is rejected with 401', async () => {
    getServerSession.mockResolvedValue(null);

    const req = createJsonRequest({
      paymentType: 'light_topup',
      amountNoor: 50,
    });

    const response = await POST(req);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.success).toBe(false);
    expect(createAttempt).not.toHaveBeenCalled();
  });

  test('invalid amountNoor is rejected with 400', async () => {
    const req = createJsonRequest({
      paymentType: 'light_topup',
      amountNoor: -10,
    });

    const response = await POST(req);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.success).toBe(false);
    expect(createAttempt).not.toHaveBeenCalled();
  });
});

describe('پرداخت سبد چند دوره', () => {
  const cartId = '8e169023-0b44-43fa-80cf-118bfe78fb01';
  const request = () => ({ headers: { get: () => 'localhost' }, json: async () => ({ paymentType: 'course_cart', cartId, amountNoor: 1 }) });
  beforeEach(() => { jest.clearAllMocks(); getServerSession.mockResolvedValue({ user: { id: 7, jwt: 'jwt' } }); });
  test('کسری و شارژ از قرارداد سبد می‌آیند و مبلغ مرورگر استفاده نمی‌شود', async () => {
    getCourseCart.mockResolvedValue({ status: 'Ready', shortfallInNoor: 189 });
    topUpCourseCart.mockResolvedValue({ topUpRequestId: 'topup-cart', clientReferenceId: 'ref-cart', amountRial: 18900 });
    createAttempt.mockResolvedValue({ status: 'created', resNum: 'ref-cart' });
    updateAttempt.mockResolvedValue({ status: 'token_issued', resNum: 'ref-cart' });
    requestSepToken.mockResolvedValue({ success: true, token: 'token' });
    const result = await POST(request());
    expect(result.status).toBe(200);
    expect((await result.json()).topUpRequestId).toBe('topup-cart');
    expect(topUpCourseCart).toHaveBeenCalledWith(cartId, 'jwt');
    expect(createGatewayTopUp).not.toHaveBeenCalled();
    expect(purchaseCourseCart).not.toHaveBeenCalled();
    expect(requestSepToken).toHaveBeenCalledWith(expect.objectContaining({ amount: 18900 }));
  });
  test('سبد رایگان بدون شارژ و درگاه خریداری می‌شود', async () => {
    getCourseCart.mockResolvedValue({ status: 'Ready', shortfallInNoor: 0, priceInNoor: 0 });
    purchaseCourseCart.mockResolvedValue({ status: 'Paid', cartId, courses: [] });
    const result = await POST(request());
    expect((await result.json()).paidWithWallet).toBe(true);
    expect(purchaseCourseCart).toHaveBeenCalledWith(cartId, 'jwt');
    expect(requestSepToken).not.toHaveBeenCalled();
  });
});

test('سبد در انتظار شارژ توکن تازه برای پرداخت مجدد صادر می‌کند', async () => {
    jest.clearAllMocks();
    getServerSession.mockResolvedValue({ user: { id: 7, jwt: 'jwt' } });
    getCourseCart.mockResolvedValue({ cartId: '8e169023-0b44-43fa-80cf-118bfe78fb01', status: 'AwaitingTopUp', shortfallInNoor: 100 });
    topUpCourseCart.mockResolvedValue({ topUpRequestId: 'topup-cart', clientReferenceId: 'ref-cart', amountRial: 100000 });
    findAttempt.mockResolvedValue({ status: 'created', resNum: 'ref-cart' });
    updateAttempt.mockResolvedValue({ status: 'token_issued', resNum: 'ref-cart' });
    requestSepToken.mockResolvedValue({ success: true, token: 'new-token' });
    const result = await POST({ headers: { get: () => 'localhost' }, json: async () => ({ paymentType: 'course_cart', cartId: '8e169023-0b44-43fa-80cf-118bfe78fb01' }) });
    expect(result.status).toBe(200);
    const data = await result.json();
    expect(data.success).toBe(true);
    expect(data.token).toBe('new-token');
    expect(topUpCourseCart).toHaveBeenCalledWith('8e169023-0b44-43fa-80cf-118bfe78fb01', 'jwt');
    expect(requestSepToken).toHaveBeenCalledWith(expect.objectContaining({ amount: 100000 }));
});

describe('آدرس بازگشت درگاه', () => {
  const env = process.env;
  const req = { headers: { get: (h) => (h === 'host' ? 'evil.example' : null) }, json: async () => ({ paymentType: 'light_topup', amountNoor: 50 }) };
  beforeEach(() => {
    jest.clearAllMocks();
    getServerSession.mockResolvedValue({ user: { id: 'u', jwt: 'j' } });
    createGatewayTopUp.mockResolvedValue({ clientReferenceId: 'R1', amountRial: 1000 });
    createAttempt.mockResolvedValue({ resNum: 'R1', status: 'created' });
    updateAttempt.mockResolvedValue({ resNum: 'R1', status: 'token_issued' });
    requestSepToken.mockResolvedValue({ success: true, token: 't' });
  });
  afterEach(() => { process.env = env; });
  const withEnv = (vars) => { process.env = { ...env, ...vars }; };

  test('متغیر تنظیم‌شده بدون توجه به هدر میزبان استفاده می‌شود', async () => {
    withEnv({ NODE_ENV: 'production', SEP_REDIRECT_URL: 'https://tarhelahi.ir/api/payment/verify' });
    expect((await POST(req)).status).toBe(200);
    expect(requestSepToken.mock.calls[0][0].redirectUrl).toBe('https://tarhelahi.ir/api/payment/verify');
  });

  test.each([undefined, 'https://yourdomain.com/api/payment/verify'])('در پروداکشن نبود یا نمونه‌بودن متغیر (%s) خطا می‌دهد و اثر جانبی ندارد', async (value) => {
    withEnv({ NODE_ENV: 'production' });
    if (value) process.env.SEP_REDIRECT_URL = value; else delete process.env.SEP_REDIRECT_URL;
    expect((await POST(req)).status).toBe(500);
    expect(createGatewayTopUp).not.toHaveBeenCalled();
    expect(requestSepToken).not.toHaveBeenCalled();
  });

  test('در توسعه نبود متغیر به هدر میزبان برمی‌گردد', async () => {
    withEnv({ NODE_ENV: 'development' });
    delete process.env.SEP_REDIRECT_URL;
    expect((await POST(req)).status).toBe(200);
    expect(requestSepToken.mock.calls[0][0].redirectUrl).toBe('https://evil.example/api/payment/verify');
  });
});
