import { POST, GET } from './route';
import { verifySepTransaction, reverseSepTransaction } from '@/lib/sepPayment';
import {
  findAttempt,
  claimAttempt,
  updateAttempt,
  confirmGatewayTopUp,
  getTopUpConfirmation,
  cancelGatewayTopUp,
} from '@/lib/gatewayTopUp';

jest.mock('next/server', () => ({
  NextResponse: { redirect: jest.fn((url, status) => ({ url, status })) },
}));
jest.mock('next/cache', () => ({ revalidatePath: jest.fn() }));
jest.mock('@/lib/sepPayment', () => ({
  verifySepTransaction: jest.fn(),
  reverseSepTransaction: jest.fn(),
  getSepErrorMessage: jest.fn((code) => `SEP Error ${code}`),
  SEP_TERMINAL_ID: 'test-terminal',
}));
jest.mock('@/lib/gatewayTopUp', () => ({
  findAttempt: jest.fn(),
  claimAttempt: jest.fn(),
  updateAttempt: jest.fn(),
  getTopUpConfirmation: jest.fn(),
  confirmGatewayTopUp: jest.fn(),
  cancelGatewayTopUp: jest.fn(),
  isConfirmedTopUp: jest.fn((topUpOrStatus) => {
    const status = typeof topUpOrStatus === 'object' ? topUpOrStatus?.status : topUpOrStatus;
    return String(status || '').trim().toLowerCase() === 'confirmed';
  }),
}));

const attempt = {
  documentId: 'attempt-doc',
  resNum: 'TR-12345678',
  topUpRequestId: 'topup-id',
  amountRial: 10000,
  status: 'token_issued',
};

function createPostRequest(formDataEntries) {
  const map = new Map(formDataEntries);
  return {
    method: 'POST',
    url: 'https://tarhelahi.ir/api/payment/verify',
    headers: {
      get: (name) =>
        name === 'content-type'
          ? 'application/x-www-form-urlencoded'
          : name === 'host'
          ? 'tarhelahi.ir'
          : null,
    },
    formData: async () => map,
  };
}

function callback(overrides = []) {
  const defaultEntries = [
    ['State', 'OK'],
    ['Status', '2'],
    ['ResNum', attempt.resNum],
    ['RefNum', 'BANK-REF'],
  ];
  const merged = new Map(defaultEntries);
  for (const [k, v] of overrides) {
    if (v === undefined) merged.delete(k);
    else merged.set(k, v);
  }
  return POST(createPostRequest([...merged.entries()]));
}

beforeEach(() => {
  jest.clearAllMocks();
  findAttempt.mockResolvedValue({ ...attempt });
  claimAttempt.mockResolvedValue(true);
  updateAttempt.mockImplementation(async (current, data) => ({ ...current, ...data }));
  confirmGatewayTopUp.mockResolvedValue({ ok: true, status: 200, data: {} });
  cancelGatewayTopUp.mockResolvedValue({ ok: true, status: 200, data: {} });
  getTopUpConfirmation.mockResolvedValue({
    status: 'Pending',
    amountRial: 10000,
    externalTransactionId: null,
  });
});

describe('SEP TopUp Verification Flow', () => {
  test('verified payment confirms the matching TopUp once', async () => {
    verifySepTransaction.mockResolvedValue({
      success: true,
      resultCode: 0,
      transactionDetail: { RefNum: 'BANK-REF', RRN: 'BANK-RRN', OrginalAmount: 10000, AffectiveAmount: 10000 },
    });

    const response = await callback();

    expect(new URL(response.url).searchParams.get('status')).toBe('success');
    expect(claimAttempt).toHaveBeenCalledWith(attempt.resNum);
    expect(confirmGatewayTopUp).toHaveBeenCalledWith(
      expect.objectContaining({
        refNum: 'BANK-REF',
        rrn: 'BANK-RRN',
        originalAmountRial: 10000,
        affectiveAmountRial: 10000,
      })
    );
    expect(updateAttempt).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ status: 'confirmed' }));
  });

  test('amount mismatch reverses without confirming TopUp', async () => {
    verifySepTransaction.mockResolvedValue({
      success: true,
      resultCode: 0,
      transactionDetail: { RefNum: 'BANK-REF', RRN: 'BANK-RRN', OrginalAmount: 9999, AffectiveAmount: 9999 },
    });
    reverseSepTransaction.mockResolvedValue({ success: true, resultCode: 0 });

    const response = await callback();

    expect(new URL(response.url).searchParams.get('status')).toBe('failed');
    expect(confirmGatewayTopUp).not.toHaveBeenCalled();
    expect(reverseSepTransaction).toHaveBeenCalledWith({ refNum: 'BANK-REF', terminalNumber: 'test-terminal' });
    expect(updateAttempt).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ status: 'reversed' }));
  });

  test('confirmed callback does not verify or settle again', async () => {
    findAttempt.mockResolvedValue({ ...attempt, status: 'confirmed', refNum: 'BANK-REF' });

    const response = await callback();

    expect(new URL(response.url).searchParams.get('status')).toBe('success');
    expect(verifySepTransaction).not.toHaveBeenCalled();
    expect(confirmGatewayTopUp).not.toHaveBeenCalled();
  });

  test('direct GET request does not mutate attempt or cancel or verify', async () => {
    const getReq = {
      method: 'GET',
      url: `https://tarhelahi.ir/api/payment/verify?ResNum=${attempt.resNum}&State=CanceledByUser`,
      headers: { get: (name) => (name === 'host' ? 'tarhelahi.ir' : null) },
    };

    const response = await GET(getReq);

    expect(new URL(response.url).searchParams.get('status')).toBe('failed');
    expect(updateAttempt).not.toHaveBeenCalled();
    expect(cancelGatewayTopUp).not.toHaveBeenCalled();
    expect(verifySepTransaction).not.toHaveBeenCalled();
  });

  test('direct GET request for confirmed attempt returns success without mutation', async () => {
    findAttempt.mockResolvedValue({ ...attempt, status: 'confirmed', refNum: 'BANK-REF' });
    const getReq = {
      method: 'GET',
      url: `https://tarhelahi.ir/api/payment/verify?ResNum=${attempt.resNum}`,
      headers: { get: (name) => (name === 'host' ? 'tarhelahi.ir' : null) },
    };

    const response = await GET(getReq);

    expect(new URL(response.url).searchParams.get('status')).toBe('success');
    expect(updateAttempt).not.toHaveBeenCalled();
  });

  test('legitimate user cancellation reports to ByeMoney and updates status to cancelled', async () => {
    const response = await callback([
      ['State', 'CanceledByUser'],
      ['Status', '-1'],
      ['RefNum', undefined],
    ]);

    expect(new URL(response.url).searchParams.get('status')).toBe('cancel');
    expect(cancelGatewayTopUp).toHaveBeenCalledWith(attempt.resNum);
    expect(updateAttempt).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ status: 'cancelled', lastError: 'CANCELED_BY_USER' })
    );
    expect(verifySepTransaction).not.toHaveBeenCalled();
  });

  test('user cancellation does NOT cancel if already Confirmed in ByeMoney', async () => {
    getTopUpConfirmation.mockResolvedValue({
      status: 'Confirmed',
      amountRial: 10000,
      externalTransactionId: 'BANK-REF-PREV',
    });

    const response = await callback([
      ['State', 'CanceledByUser'],
      ['Status', '-1'],
      ['RefNum', undefined],
    ]);

    expect(new URL(response.url).searchParams.get('status')).toBe('success');
    expect(cancelGatewayTopUp).not.toHaveBeenCalled();
    expect(reverseSepTransaction).not.toHaveBeenCalled();
    expect(updateAttempt).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ status: 'confirmed', refNum: 'BANK-REF-PREV' })
    );
  });

  test('user cancellation with RefNum present is treated as anomalous and moved to review', async () => {
    const response = await callback([
      ['State', 'CanceledByUser'],
      ['Status', '-1'],
      ['RefNum', 'SUSPICIOUS-REF'],
    ]);

    expect(new URL(response.url).searchParams.get('status')).toBe('failed');
    expect(cancelGatewayTopUp).not.toHaveBeenCalled();
    expect(updateAttempt).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ status: 'review', refNum: 'SUSPICIOUS-REF', lastError: 'CANCEL_WITH_REFNUM' })
    );
  });

  test('negative verify result code moves attempt to review without reverse', async () => {
    verifySepTransaction.mockResolvedValue({
      success: false,
      resultCode: -2,
      resultDescription: 'Transaction not found',
    });

    const response = await callback();

    expect(new URL(response.url).searchParams.get('status')).toBe('failed');
    expect(updateAttempt).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ status: 'review', lastError: 'VERIFY_-2' })
    );
    expect(reverseSepTransaction).not.toHaveBeenCalled();
    expect(confirmGatewayTopUp).not.toHaveBeenCalled();
  });

  test('bank resultCode 2 (already verified) marks confirmed when ByeMoney is confirmed', async () => {
    verifySepTransaction.mockResolvedValue({
      success: false,
      resultCode: 2,
      resultDescription: 'Duplicate verification',
    });
    getTopUpConfirmation.mockResolvedValue({
      status: 'Confirmed',
      amountRial: 10000,
      externalTransactionId: 'BANK-REF',
    });

    const response = await callback();

    expect(new URL(response.url).searchParams.get('status')).toBe('success');
    expect(updateAttempt).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ status: 'confirmed', refNum: 'BANK-REF' })
    );
    expect(confirmGatewayTopUp).not.toHaveBeenCalled();
  });

  test('bank resultCode 2 moves to review when ByeMoney is NOT confirmed', async () => {
    verifySepTransaction.mockResolvedValue({
      success: false,
      resultCode: 2,
      resultDescription: 'Duplicate verification',
    });
    getTopUpConfirmation.mockResolvedValue({
      status: 'Pending',
      amountRial: 10000,
      externalTransactionId: null,
    });

    const response = await callback();

    expect(new URL(response.url).searchParams.get('status')).toBe('failed');
    expect(updateAttempt).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ status: 'review', lastError: 'VERIFY_DUPLICATE_UNCONFIRMED' })
    );
    expect(confirmGatewayTopUp).not.toHaveBeenCalled();
  });

  test('amount mismatch from ByeMoney triggers automatic reverse', async () => {
    verifySepTransaction.mockResolvedValue({
      success: true,
      resultCode: 0,
      transactionDetail: { RefNum: 'BANK-REF', RRN: 'BANK-RRN', OrginalAmount: 10000, AffectiveAmount: 10000 },
    });
    confirmGatewayTopUp.mockResolvedValue({
      ok: false,
      status: 422,
      data: { code: 'TOPUP_AMOUNT_MISMATCH' },
    });
    reverseSepTransaction.mockResolvedValue({ success: true, resultCode: 0 });

    const response = await callback();

    expect(new URL(response.url).searchParams.get('status')).toBe('failed');
    expect(reverseSepTransaction).toHaveBeenCalledWith({ refNum: 'BANK-REF', terminalNumber: 'test-terminal' });
    expect(updateAttempt).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ status: 'reversed' })
    );
  });

  test('lost ByeMoney confirmation response is recovered on callback replay', async () => {
    verifySepTransaction.mockResolvedValue({
      success: true,
      resultCode: 0,
      transactionDetail: { RefNum: 'BANK-REF', RRN: 'BANK-RRN', OrginalAmount: 10000, AffectiveAmount: 10000 },
    });
    confirmGatewayTopUp.mockResolvedValue({
      ok: false,
      status: 500,
      data: { code: 'SERVICE_UNAVAILABLE' },
    });
    // ByeMoney actually received and confirmed it
    getTopUpConfirmation.mockResolvedValue({
      status: 'Confirmed',
      amountRial: 10000,
      externalTransactionId: 'BANK-REF',
    });

    const response = await callback();

    expect(new URL(response.url).searchParams.get('status')).toBe('success');
    expect(updateAttempt).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ status: 'confirmed' })
    );
  });

  test('concurrent callback blocked by claimAttempt returns in-progress message', async () => {
    claimAttempt.mockResolvedValue(false);

    const response = await callback();

    expect(new URL(response.url).searchParams.get('status')).toBe('failed');
    expect(verifySepTransaction).not.toHaveBeenCalled();
    expect(confirmGatewayTopUp).not.toHaveBeenCalled();
  });
});

