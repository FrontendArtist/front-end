import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import AdminNoorGiftModal from '../AdminNoorGiftModal';
import * as byeMoneyApi from '@/lib/byeMoneyApi';

jest.mock('next-auth/react', () => ({
  useSession: () => ({
    data: {
      user: {
        name: 'Admin User',
        email: 'admin@example.com',
        jwt: 'admin-jwt-token-123',
      },
    },
  }),
}));

jest.mock('@/lib/byeMoneyApi', () => ({
  ...jest.requireActual('@/lib/byeMoneyApi'),
  sendNoorGiftWithByeMoney: jest.fn(),
}));

const mockUsers = [
  { id: 1, documentId: 'doc-user-1', username: 'user1' },
  { id: 2, documentId: 'doc-user-2', username: 'user2' },
];

describe('AdminNoorGiftModal Component', () => {
  let uuidCounter = 0;
  let originalRandomUUID;

  beforeEach(() => {
    jest.clearAllMocks();
    uuidCounter = 0;
    originalRandomUUID = global.crypto?.randomUUID;

    if (!global.crypto) {
      global.crypto = {};
    }
    global.crypto.randomUUID = jest.fn(() => `uuid-${++uuidCounter}`);
  });

  afterEach(() => {
    if (originalRandomUUID) {
      global.crypto.randomUUID = originalRandomUUID;
    }
  });

  test('validates amount and reason: disables "مرحله بعد" button until valid values are entered', () => {
    render(<AdminNoorGiftModal users={mockUsers} onClose={jest.fn()} onSuccess={jest.fn()} />);

    const nextBtn = screen.getByRole('button', { name: /مرحله بعد: بررسی و تأیید/i });
    expect(nextBtn).toBeDisabled();

    const amountInput = screen.getByLabelText(/مقدار نور برای هر کاربر/i);
    const reasonInput = screen.getByLabelText(/علت ثبت هدیه/i);

    // Enter 0 or negative
    fireEvent.change(amountInput, { target: { value: '۰' } });
    fireEvent.change(reasonInput, { target: { value: 'تشویقی' } });
    expect(nextBtn).toBeDisabled();

    // Enter valid Persian digits
    fireEvent.change(amountInput, { target: { value: '۵۰' } });
    expect(amountInput.value).toBe('50'); // normalized to Latin
    expect(nextBtn).not.toBeDisabled();
  });

  test('enforces 100-recipient cap and disables progress with clear warning', () => {
    const hundredAndFiveUsers = Array.from({ length: 105 }, (_, i) => ({
      id: i + 1,
      documentId: `doc-${i + 1}`,
      username: `user_${i + 1}`,
    }));

    render(<AdminNoorGiftModal users={hundredAndFiveUsers} onClose={jest.fn()} onSuccess={jest.fn()} />);

    expect(
      screen.getByText(/بیشتر از سقف مجاز ۱۰۰ نفر است/i)
    ).toBeInTheDocument();

    const nextBtn = screen.getByRole('button', { name: /مرحله بعد: بررسی و تأیید/i });
    expect(nextBtn).toBeDisabled();
  });

  test('shows confirmation summary with total amount before submitting, and disables button during loading', async () => {
    let resolveApi;
    byeMoneyApi.sendNoorGiftWithByeMoney.mockReturnValueOnce(
      new Promise((res) => {
        resolveApi = res;
      })
    );

    render(<AdminNoorGiftModal users={mockUsers} onClose={jest.fn()} onSuccess={jest.fn()} />);

    const amountInput = screen.getByLabelText(/مقدار نور برای هر کاربر/i);
    const reasonInput = screen.getByLabelText(/علت ثبت هدیه/i);

    fireEvent.change(amountInput, { target: { value: '20' } });
    fireEvent.change(reasonInput, { target: { value: 'عید غدیر' } });

    const nextBtn = screen.getByRole('button', { name: /مرحله بعد: بررسی و تأیید/i });
    fireEvent.click(nextBtn);

    // Now in confirm step: 2 users * 20 = 40 total
    expect(screen.getByText('تأیید نهایی هدیه نور')).toBeInTheDocument();
    expect(screen.getByText(/۴۰ نور/i)).toBeInTheDocument();

    const submitBtn = screen.getByRole('button', { name: /تأیید و ارسال نهایی هدیه/i });
    fireEvent.click(submitBtn);

    // Verify submit button is disabled while loading
    expect(submitBtn).toBeDisabled();
    expect(screen.getByText(/در حال ارسال هدیه.../i)).toBeInTheDocument();

    resolveApi({
      success: true,
      status: 200,
      data: {
        batchId: 'batch-123',
        totalRecipients: 2,
        totalAmountNoor: 40,
        recipients: [
          { externalUserId: 'doc-user-1', status: 'Success', newGiftBalance: 20 },
          { externalUserId: 'doc-user-2', status: 'Success', newGiftBalance: 20 },
        ],
      },
    });

    await waitFor(() => {
      expect(screen.getByText(/هدیه نور با موفقیت ثبت شد/i)).toBeInTheDocument();
    });
  });

  test('Idempotency-Key stays the same on retry of exact same request, but changes when parameters change', async () => {
    // 1st call fails with network/server error
    byeMoneyApi.sendNoorGiftWithByeMoney.mockResolvedValueOnce({
      success: false,
      status: 500,
      error: 'خطای سرور',
    });

    render(<AdminNoorGiftModal users={mockUsers} onClose={jest.fn()} onSuccess={jest.fn()} />);

    const amountInput = screen.getByLabelText(/مقدار نور برای هر کاربر/i);
    const reasonInput = screen.getByLabelText(/علت ثبت هدیه/i);

    fireEvent.change(amountInput, { target: { value: '30' } });
    fireEvent.change(reasonInput, { target: { value: 'علت اول' } });

    fireEvent.click(screen.getByRole('button', { name: /مرحله بعد: بررسی و تأیید/i }));
    fireEvent.click(screen.getByRole('button', { name: /تأیید و ارسال نهایی هدیه/i }));

    await waitFor(() => {
      expect(byeMoneyApi.sendNoorGiftWithByeMoney).toHaveBeenCalledTimes(1);
    });

    const firstKey = byeMoneyApi.sendNoorGiftWithByeMoney.mock.calls[0][0].idempotencyKey;
    expect(firstKey).toBeDefined();

    // 2nd call: user retries WITHOUT changing any parameter (exact same payload)
    byeMoneyApi.sendNoorGiftWithByeMoney.mockResolvedValueOnce({
      success: false,
      status: 500,
      error: 'خطای مجدد سرور',
    });

    fireEvent.click(screen.getByRole('button', { name: /مرحله بعد: بررسی و تأیید/i }));
    fireEvent.click(screen.getByRole('button', { name: /تأیید و ارسال نهایی هدیه/i }));

    await waitFor(() => {
      expect(byeMoneyApi.sendNoorGiftWithByeMoney).toHaveBeenCalledTimes(2);
    });

    const secondKey = byeMoneyApi.sendNoorGiftWithByeMoney.mock.calls[1][0].idempotencyKey;
    // Same payload => SAME idempotency key!
    expect(secondKey).toBe(firstKey);

    // 3rd call: user changes reason or amount -> key MUST change
    byeMoneyApi.sendNoorGiftWithByeMoney.mockResolvedValueOnce({
      success: true,
      status: 200,
      data: { batchId: 'batch-999', totalRecipients: 2, totalAmountNoor: 80 },
    });

    const reasonInputAfterError = screen.getByLabelText(/علت ثبت هدیه/i);
    fireEvent.change(reasonInputAfterError, { target: { value: 'علت تغییر یافته' } });

    fireEvent.click(screen.getByRole('button', { name: /مرحله بعد: بررسی و تأیید/i }));
    fireEvent.click(screen.getByRole('button', { name: /تأیید و ارسال نهایی هدیه/i }));

    await waitFor(() => {
      expect(byeMoneyApi.sendNoorGiftWithByeMoney).toHaveBeenCalledTimes(3);
    });

    const thirdKey = byeMoneyApi.sendNoorGiftWithByeMoney.mock.calls[2][0].idempotencyKey;
    expect(thirdKey).not.toBe(firstKey);
  });

  test('handles 400 error with invalidUsers: shows notice, allows removing invalid users, and generates new key for retry', async () => {
    byeMoneyApi.sendNoorGiftWithByeMoney.mockResolvedValueOnce({
      success: false,
      status: 400,
      invalidUsers: [{ externalUserId: 'doc-user-2', reason: 'کاربر مسدود است' }],
      error: 'یک یا چند کاربر نامعتبر هستند.',
    });

    render(<AdminNoorGiftModal users={mockUsers} onClose={jest.fn()} onSuccess={jest.fn()} />);

    const amountInput = screen.getByLabelText(/مقدار نور برای هر کاربر/i);
    const reasonInput = screen.getByLabelText(/علت ثبت هدیه/i);

    fireEvent.change(amountInput, { target: { value: '15' } });
    fireEvent.change(reasonInput, { target: { value: 'تست خطای ۴۰۰' } });

    fireEvent.click(screen.getByRole('button', { name: /مرحله بعد: بررسی و تأیید/i }));
    fireEvent.click(screen.getByRole('button', { name: /تأیید و ارسال نهایی هدیه/i }));

    await waitFor(() => {
      expect(screen.getByText(/هیچ هدیه‌ای ثبت نشد. کاربران زیر دارای اشکال هستند/i)).toBeInTheDocument();
      expect(screen.getByText(/کاربر مسدود است/i)).toBeInTheDocument();
    });

    const firstKey = byeMoneyApi.sendNoorGiftWithByeMoney.mock.calls[0][0].idempotencyKey;

    // Click "حذف کاربران مشکل‌دار (1) از انتخاب و تلاش مجدد"
    const cleanBtn = screen.getByRole('button', { name: /حذف کاربران مشکل‌دار/i });
    fireEvent.click(cleanBtn);

    // Now doc-user-2 is removed, only doc-user-1 remains
    expect(screen.queryByText(/کاربر مسدود است/i)).not.toBeInTheDocument();

    // Prepare success for retry
    byeMoneyApi.sendNoorGiftWithByeMoney.mockResolvedValueOnce({
      success: true,
      status: 200,
      data: {
        batchId: 'batch-success-after-clean',
        totalRecipients: 1,
        totalAmountNoor: 15,
        recipients: [{ externalUserId: 'doc-user-1', status: 'Success', newGiftBalance: 15 }],
      },
    });

    fireEvent.click(screen.getByRole('button', { name: /مرحله بعد: بررسی و تأیید/i }));
    fireEvent.click(screen.getByRole('button', { name: /تأیید و ارسال نهایی هدیه/i }));

    await waitFor(() => {
      expect(byeMoneyApi.sendNoorGiftWithByeMoney).toHaveBeenCalledTimes(2);
    });

    const retryCallArgs = byeMoneyApi.sendNoorGiftWithByeMoney.mock.calls[1][0];
    expect(retryCallArgs.externalUserIds).toEqual(['doc-user-1']);
    // Since user list changed, a NEW idempotency key is generated!
    expect(retryCallArgs.idempotencyKey).not.toBe(firstKey);
  });

  test('displays clear error on 409 conflict and directs user to reopen form', async () => {
    byeMoneyApi.sendNoorGiftWithByeMoney.mockResolvedValueOnce({
      success: false,
      status: 409,
      conflict: true,
      error: 'درخواستی با همین کلید ولی محتوای متفاوت ثبت شده است؛ لطفاً فرم را دوباره باز کنید.',
    });

    render(<AdminNoorGiftModal users={mockUsers} onClose={jest.fn()} onSuccess={jest.fn()} />);

    fireEvent.change(screen.getByLabelText(/مقدار نور برای هر کاربر/i), { target: { value: '10' } });
    fireEvent.change(screen.getByLabelText(/علت ثبت هدیه/i), { target: { value: 'تست ۴۰۹' } });

    fireEvent.click(screen.getByRole('button', { name: /مرحله بعد: بررسی و تأیید/i }));
    fireEvent.click(screen.getByRole('button', { name: /تأیید و ارسال نهایی هدیه/i }));

    await waitFor(() => {
      expect(
        screen.getByText(/درخواستی با همین کلید ولی محتوای متفاوت ثبت شده است/i)
      ).toBeInTheDocument();
    });
  });
});

