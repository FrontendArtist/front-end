import { POST } from './route';
import { verifySepTransaction, reverseSepTransaction } from '@/lib/sepPayment';
import { findAttempt, claimAttempt, updateAttempt, confirmGatewayTopUp } from '@/lib/gatewayTopUp';

jest.mock('next/server', () => ({
  NextResponse: { redirect: jest.fn((url, status) => ({ url, status })) },
}));
jest.mock('next/cache', () => ({ revalidatePath: jest.fn() }));
jest.mock('@/lib/sepPayment', () => ({
  verifySepTransaction: jest.fn(),
  reverseSepTransaction: jest.fn(),
  getSepErrorMessage: jest.fn(),
  SEP_TERMINAL_ID: 'test-terminal',
}));
jest.mock('@/lib/gatewayTopUp', () => ({
  findAttempt: jest.fn(),
  claimAttempt: jest.fn(),
  updateAttempt: jest.fn(),
  getTopUpConfirmation: jest.fn(),
  confirmGatewayTopUp: jest.fn(),
}));

const attempt = {
  documentId: 'attempt-doc',
  resNum: 'TR-12345678',
  topUpRequestId: 'topup-id',
  amountRial: 10000,
  status: 'token_issued',
};

function callback() {
  return POST({
    method: 'POST',
    url: 'https://tarhelahi.ir/api/payment/verify',
    headers: { get: (name) => name === 'content-type' ? 'application/x-www-form-urlencoded' :
      name === 'host' ? 'tarhelahi.ir' : null },
    formData: async () => new Map([
      ['State', 'OK'], ['Status', '2'], ['ResNum', attempt.resNum], ['RefNum', 'BANK-REF'],
    ]),
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  findAttempt.mockResolvedValue({ ...attempt });
  claimAttempt.mockResolvedValue(true);
  updateAttempt.mockImplementation(async (current, data) => ({ ...current, ...data }));
  confirmGatewayTopUp.mockResolvedValue({ ok: true, status: 200, data: {} });
});

test('verified payment confirms the matching TopUp once', async () => {
  verifySepTransaction.mockResolvedValue({
    success: true, resultCode: 0,
    transactionDetail: { RefNum: 'BANK-REF', RRN: 'BANK-RRN', OrginalAmount: 10000, AffectiveAmount: 10000 },
  });

  const response = await callback();

  expect(new URL(response.url).searchParams.get('status')).toBe('success');
  expect(claimAttempt).toHaveBeenCalledWith(attempt.resNum);
  expect(confirmGatewayTopUp).toHaveBeenCalledWith(expect.objectContaining({
    refNum: 'BANK-REF', rrn: 'BANK-RRN', originalAmountRial: 10000, affectiveAmountRial: 10000,
  }));
  expect(updateAttempt).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ status: 'confirmed' }));
});

test('amount mismatch reverses without confirming TopUp', async () => {
  verifySepTransaction.mockResolvedValue({
    success: true, resultCode: 0,
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
