/** @jest-environment node */
import { POST } from './route';
import { getServerSession } from 'next-auth';
import { paymentAuthOptions } from '@/lib/auth';
import { requestSepToken, SEP_GATEWAY_ACTION_URL } from '@/lib/sepPayment';
import { getCourseCheckout } from '@/lib/courseCheckoutApi';
import { purchaseCourseWithByeMoney } from '@/lib/byeMoneyApi';
jest.mock('@/lib/courseCheckoutApi', () => ({ getCourseCheckout: jest.fn() }));
jest.mock('@/lib/byeMoneyApi', () => ({ purchaseCourseWithByeMoney: jest.fn() }));
import {
  createGatewayTopUp,
  createAttempt,
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

  test('standard order flow is distinct and does NOT create gateway-payment-attempt', async () => {
    const mockOrder = {
      id: 42,
      documentId: 'order-doc-xyz',
      totalPrice: 25000,
      orderStatus: 'pending',
      paymentStatus: 'pending_payment',
      user: { id: 'user-123' },
    };

    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: [mockOrder] }),
    });

    requestSepToken.mockResolvedValue({
      success: true,
      token: 'order-sep-token-789',
      gatewayUrl: 'https://sep.shaparak.ir/OnlinePG/OnlinePG',
    });

    const req = createJsonRequest({
      orderId: 'order-doc-xyz',
    });

    const response = await POST(req);
    const data = await response.json();

    // Distinct: standard order does NOT call createAttempt or updateAttempt
    expect(createAttempt).not.toHaveBeenCalled();
    expect(updateAttempt).not.toHaveBeenCalled();
    expect(createGatewayTopUp).not.toHaveBeenCalled();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.token).toBe('order-sep-token-789');
    expect(data.resNum).toBe('order-doc-xyz');
    expect(data.amount).toBe(250000); // 25,000 Toman * 10 = 250,000 Rial
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

  test('سشن سبک و استعلام محدود، مبلغ سرور را به بانک می‌فرستند', async () => {
    const order = { id: 1, documentId: 'order-one', totalPrice: 100, orderStatus: 'pending', paymentStatus: 'pending_payment', user: { id: 'user-123' } };
    global.fetch.mockResolvedValueOnce({ ok: true, json: async () => ({ data: [order] }) });
    requestSepToken.mockResolvedValueOnce({ success: true, token: 'bank-token' });

    const req = createJsonRequest({ orderId: 'order-one' });
    const result = await POST(req);
    expect(result.status).toBe(200);
    expect(await result.json()).toMatchObject({ success: true, token: 'bank-token', amount: 1000 });
    expect(getServerSession).toHaveBeenCalledWith(paymentAuthOptions);
    expect(global.fetch.mock.calls[0][0]).not.toContain('populate=*');
    expect(global.fetch.mock.calls[0][0]).toContain('populate[user]');
    expect(requestSepToken).toHaveBeenCalledWith(expect.objectContaining({ amount: 1000, resNum: 'order-one' }));
  });

  test.each([undefined, { id: 999 }])('مالک نامشخص یا متفاوت اجازهٔ توکن ندارد', async user => {
    const order = { id: 1, documentId: 'order-one', totalPrice: 100, orderStatus: 'pending', paymentStatus: 'pending_payment', user };
    global.fetch.mockResolvedValueOnce({ ok: true, json: async () => ({ data: [order] }) });

    const req = createJsonRequest({ orderId: 'order-one' });
    expect((await POST(req)).status).toBe(403);
    expect(requestSepToken).not.toHaveBeenCalled();
  });

  test('سفارش تسویه‌شده دوباره وارد درگاه نمی‌شود', async () => {
    const order = { id: 1, documentId: 'order-one', totalPrice: 100, orderStatus: 'pending', paymentStatus: 'paid', user: { id: 'user-123' } };
    global.fetch.mockResolvedValueOnce({ ok: true, json: async () => ({ data: [order] }) });

    const req = createJsonRequest({ orderId: 'order-one' });
    expect((await POST(req)).status).toBe(400);
    expect(requestSepToken).not.toHaveBeenCalled();
  });
});
