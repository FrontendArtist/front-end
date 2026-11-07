import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import AdminAssistedTopUpModal from '../AdminAssistedTopUpModal';
import * as byeMoneyApi from '@/lib/byeMoneyApi';

jest.mock('@/lib/byeMoneyApi', () => ({
  ...jest.requireActual('@/lib/byeMoneyApi'),
  getConversionRateWithByeMoney: jest.fn(),
}));

jest.mock('@/context/DisplayRateContext', () => ({ invalidateConversionRateCache: jest.fn() }));

// مودال فقط route سروری نسبی را صدا می‌زند (BND-07)؛ createTopUp پاسخ نرمال‌شدهٔ همان route را شبیه‌سازی می‌کند.
const createTopUp = jest.fn();
const fetchCalls = [];
const formArgs = (init) => ({
  beneficiaryExternalUserId: init.body.get('beneficiaryExternalUserId'),
  amountToman: init.body.get('amountToman'),
  receipt: init.body.get('receipt'),
  externalTransactionId: init.body.get('externalTransactionId') ?? undefined,
  idempotencyKey: init.headers['Idempotency-Key'],
});

const mockUser = {
  id: 101,
  documentId: 'user-doc-101',
  fullName: 'کاربر آزمایشی',
  phoneNumber: '09120000000',
  username: 'testuser',
};

describe('AdminAssistedTopUpModal Component', () => {
  let originalRandomUUID;

  beforeEach(() => {
    jest.clearAllMocks();
    createTopUp.mockReset();
    fetchCalls.length = 0;
    global.fetch = jest.fn(async (url, init) => {
      fetchCalls.push({ url, init });
      const result = await createTopUp(formArgs(init));
      return { ok: !!result.success, status: result.status ?? (result.success ? 200 : 500), json: async () => result };
    });
    originalRandomUUID = global.crypto?.randomUUID;
  });

  afterEach(() => {
    if (originalRandomUUID) {
      Object.defineProperty(global.crypto, 'randomUUID', {
        configurable: true,
        value: originalRandomUUID,
      });
    }
  });

  test('renders user identity, rial input, exact toman calculation, and optional receipt label', () => {
    render(
      <AdminAssistedTopUpModal
        user={mockUser}
        conversionRate={10000}
        onClose={jest.fn()}
        onSuccess={jest.fn()}
      />
    );

    expect(screen.getByText('کاربر آزمایشی')).toBeInTheDocument();
    expect(screen.getByText('09120000000')).toBeInTheDocument();
    expect(screen.getByText(/شناسه: user-doc-101/)).toBeInTheDocument();
    expect(screen.getByText(/تصویر رسید \/ فیش واریزی \(اختیاری\)/)).toBeInTheDocument();

    const amountInput = screen.getByPlaceholderText('مثال: 50000000');
    fireEvent.change(amountInput, { target: { value: '10005' } });

    // معادل تومانی دقیق بدون گردکردن یا قطع اعشار
    expect(screen.getByText(/۱٬۰۰۰٫۵ تومان/)).toBeInTheDocument();
    expect(screen.getByText(/۱۰٬۰۰۵ ریال/)).toBeInTheDocument();
  });

  test('allows submission without receipt and sends exact AmountToman', async () => {
    createTopUp.mockResolvedValueOnce({
      success: true,
      data: {
        topUpRequestId: 'topup-req-1',
        clientReferenceId: 'ref-1',
        amountNoor: 5,
        rialPerNoor: 10000,
      },
    });

    const handleSuccess = jest.fn();
    const handleClose = jest.fn();

    render(
      <AdminAssistedTopUpModal
        user={mockUser}
        conversionRate={10000}
        onClose={handleClose}
        onSuccess={handleSuccess}
      />
    );

    const amountInput = screen.getByPlaceholderText('مثال: 50000000');
    fireEvent.change(amountInput, { target: { value: '50000' } });

    const submitBtn = screen.getByRole('button', { name: /ثبت و اعمال شارژ/ });
    expect(submitBtn).not.toBeDisabled();
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(createTopUp).toHaveBeenCalledTimes(1);
    });

    const callArgs = createTopUp.mock.calls[0][0];
    expect(callArgs.beneficiaryExternalUserId).toBe('user-doc-101');
    expect(callArgs.amountToman).toBe('5000');
    expect(callArgs.receipt).toBeNull();
    expect(callArgs.idempotencyKey).toBeDefined();

    expect(handleSuccess).toHaveBeenCalledWith(
      expect.objectContaining({
        topUpRequestId: 'topup-req-1',
        clientReferenceId: 'ref-1',
        amountNoor: 5,
      })
    );
    expect(handleClose).toHaveBeenCalled();
    expect(fetchCalls[0].url).toBe('/api/admin/topups/assisted');
    expect(fetchCalls[0].init.headers.Authorization).toBeUndefined();
  });

  test('validates file type and size when file is provided', () => {
    render(
      <AdminAssistedTopUpModal
        user={mockUser}
        conversionRate={10000}
        onClose={jest.fn()}
        onSuccess={jest.fn()}
      />
    );

    const fileInput = document.querySelector('input[type="file"]');

    // فایل نامعتبر (متنی)
    const textFile = new File(['hello'], 'receipt.txt', { type: 'text/plain' });
    fireEvent.change(fileInput, { target: { files: [textFile] } });
    expect(screen.getByText(/فرمت فایل نامعتبر است/)).toBeInTheDocument();

    // فایل با حجم بیش از ۱۰ مگابایت
    const largeFile = new File([new ArrayBuffer(11 * 1024 * 1024)], 'huge.png', { type: 'image/png' });
    fireEvent.change(fileInput, { target: { files: [largeFile] } });
    expect(screen.getByText(/حجم تصویر فیش نباید بیشتر از ۱۰ مگابایت باشد/)).toBeInTheDocument();
  });

  test('reuses the exact same Idempotency-Key on retry of the same operation, and generates new key for fresh operation', async () => {
    let uuidCounter = 1;
    Object.defineProperty(global.crypto, 'randomUUID', {
      configurable: true,
      value: () => `test-uuid-${uuidCounter++}`,
    });

    // تلاش اول: شبیه‌سازی شکست موقت (خطای سرور یا شبکه)
    createTopUp.mockResolvedValueOnce({
      success: false,
      error: 'خطای موقت در سرور مالی',
    });

    render(
      <AdminAssistedTopUpModal
        user={mockUser}
        conversionRate={10000}
        onClose={jest.fn()}
        onSuccess={jest.fn()}
      />
    );

    const amountInput = screen.getByPlaceholderText('مثال: 50000000');
    fireEvent.change(amountInput, { target: { value: '100000' } });

    const submitBtn = screen.getByRole('button', { name: /ثبت و اعمال شارژ/ });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(createTopUp).toHaveBeenCalledTimes(1);
    });

    const firstCallArgs = createTopUp.mock.calls[0][0];
    const initialKey = firstCallArgs.idempotencyKey;
    expect(initialKey).toBe('test-uuid-1');

    await waitFor(() => {
      expect(screen.getByText('خطای موقت در سرور مالی')).toBeInTheDocument();
    });

    // تلاش دوم (Retry همان عملیات بدون تغییر ورودی‌ها)
    createTopUp.mockResolvedValueOnce({
      success: false,
      error: 'خطای مجدد سرور',
    });

    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(createTopUp).toHaveBeenCalledTimes(2);
    });

    const secondCallArgs = createTopUp.mock.calls[1][0];
    // دقیقاً باید از همان کلید تلاش اول استفاده شده باشد!
    expect(secondCallArgs.idempotencyKey).toBe(initialKey);

    // تغییر ورودی (عملیات تازه): مثلاً تغییر مبلغ
    fireEvent.change(amountInput, { target: { value: '200000' } });

    createTopUp.mockResolvedValueOnce({
      success: true,
      data: { topUpRequestId: 'topup-2', amountNoor: 20 },
    });

    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(createTopUp).toHaveBeenCalledTimes(3);
    });

    const thirdCallArgs = createTopUp.mock.calls[2][0];
    // چون پارامترها تغییر کرده، کلید جدید تولید شده است
    expect(thirdCallArgs.idempotencyKey).toBe('test-uuid-2');
    expect(thirdCallArgs.amountToman).toBe('20000');
  });

  test('displays access permission error banner when server returns 403', async () => {
    createTopUp.mockResolvedValueOnce({
      success: false,
      forbidden: true,
      status: 403,
      error: 'شما مجوز مالی لازم جهت ثبت شارژ برای کاربر را در سامانه مالی بای‌مانی ندارید.',
    });

    render(
      <AdminAssistedTopUpModal
        user={mockUser}
        conversionRate={10000}
        onClose={jest.fn()}
        onSuccess={jest.fn()}
      />
    );

    const amountInput = screen.getByPlaceholderText('مثال: 50000000');
    fireEvent.change(amountInput, { target: { value: '50000' } });

    const submitBtn = screen.getByRole('button', { name: /ثبت و اعمال شارژ/ });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(
        screen.getByText('شما مجوز مالی لازم جهت ثبت شارژ برای کاربر را در سامانه مالی بای‌مانی ندارید.')
      ).toBeInTheDocument();
    });
  });
});

