import React from 'react';
import { render, screen, waitFor, fireEvent, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import PhysicalCancelFlow from '../PhysicalCancelFlow';

const ID = '22222222-2222-2222-2222-222222222222';
const preview = {
  items: [{ regularRefundInNoor: 70, giftRefundInNoor: 30 }],
  shippingRegularRefundInNoor: 5, shippingGiftRefundInNoor: 0,
  warnings: [{ code: 'COUPON_REMOVED', message: 'کوپن تخفیف و ارسال رایگان حذف می‌شود' }],
};

const ok = (data) => ({ ok: true, status: 200, json: async () => ({ success: true, data }) });
const fail = (status, code) => ({ ok: false, status, json: async () => ({ success: false, code, error: 'متن سرور' }) });

function setup(props) {
  render(<PhysicalCancelFlow mode="user" targetId={ID} {...props} />);
}

async function openAndType(label = 'لغو بخش فیزیکی سفارش') {
  fireEvent.click(screen.getByText(label));
  await screen.findByTestId('cancel-warning');
  fireEvent.change(screen.getByRole('textbox'), { target: { value: 'نیاز ندارم' } });
}

describe('PhysicalCancelFlow', () => {
  beforeEach(() => { global.fetch = jest.fn(); });

  it('هشدار و مبلغ برگشتی سرور را پیش از تأیید نشان می‌دهد و مبلغ نمی‌فرستد', async () => {
    fetch.mockResolvedValueOnce(ok(preview)).mockResolvedValueOnce(ok({ outcome: 'Refunded', items: preview.items, shippingRegularRefundInNoor: 5 }));
    setup();
    await openAndType();
    expect(screen.getByTestId('cancel-warning')).toHaveTextContent('کوپن تخفیف و ارسال رایگان حذف می‌شود');
    expect(screen.getByTestId('cancel-refund')).toHaveTextContent('۷۵');
    expect(screen.getByTestId('cancel-refund')).toHaveTextContent('۳۰');
    fireEvent.click(screen.getByText('تأیید و لغو'));
    await screen.findByTestId('cancel-result');
    const [url, init] = fetch.mock.calls[1];
    expect(url).toBe(`/api/physical-orders/${ID}/cancel`);
    const body = JSON.parse(init.body);
    expect(Object.keys(body).sort()).toEqual(['operationId', 'reason']);
    expect(screen.getByTestId('cancel-result')).toHaveTextContent('لغو شد');
  });

  it('در حین ارسال غیرفعال است و دوبار ارسال نمی‌شود', async () => {
    let resolveCancel;
    fetch.mockResolvedValueOnce(ok(preview)).mockReturnValueOnce(new Promise((r) => { resolveCancel = r; }));
    setup();
    await openAndType();
    const btn = screen.getByText('تأیید و لغو');
    fireEvent.click(btn);
    fireEvent.click(btn);
    expect(screen.getByText('در حال لغو...')).toBeDisabled();
    expect(fetch).toHaveBeenCalledTimes(2);
    await act(async () => { resolveCancel(ok({ outcome: 'Refunded', items: [] })); });
  });

  it('در تلاش مجدد همان operationId را می‌فرستد', async () => {
    fetch.mockResolvedValueOnce(ok(preview))
      .mockResolvedValueOnce(fail(503, 'PHYSICAL_CANCEL_UNAVAILABLE'))
      .mockResolvedValueOnce(ok({ outcome: 'ReservationReleased', items: [] }));
    setup();
    await openAndType();
    fireEvent.click(screen.getByText('تأیید و لغو'));
    await screen.findByTestId('cancel-error');
    expect(screen.getByTestId('cancel-error')).toHaveTextContent('آزادسازی سفارش اکنون ممکن نیست');
    fireEvent.click(screen.getByText('تأیید و لغو'));
    await screen.findByTestId('cancel-result');
    const ids = [1, 2].map((i) => JSON.parse(fetch.mock.calls[i][1].body).operationId);
    expect(ids[0]).toBe(ids[1]);
    expect(ids[0]).toMatch(/^[0-9a-f-]{36}$/);
  });

  it('خطا را از code به پیام فارسی می‌برد، نه از متن سرور', async () => {
    fetch.mockResolvedValueOnce(ok(preview)).mockResolvedValueOnce(fail(409, 'PHYSICAL_CANCEL_CONFLICT'));
    setup();
    await openAndType();
    fireEvent.click(screen.getByText('تأیید و لغو'));
    const err = await screen.findByTestId('cancel-error');
    expect(err).toHaveTextContent('دیگر قابل لغو نیست');
    expect(err).not.toHaveTextContent('متن سرور');
  });

  it('ادمین: تعداد را در پیش‌نمایش و لغو می‌فرستد و خطای رسیدگی دستی را جدا نشان می‌دهد', async () => {
    fetch.mockResolvedValueOnce(ok({ ...preview, warnings: [{ code: 'COUPON_REMOVED', message: 'هشدار' }] }))
      .mockResolvedValueOnce(fail(409, 'PHYSICAL_CANCEL_MANUAL_REVIEW'));
    render(<PhysicalCancelFlow mode="admin" targetId={ID} maxQuantity={5} />);
    fireEvent.change(screen.getByRole('spinbutton'), { target: { value: '2' } });
    await openAndType('لغو قلم / تعداد');
    expect(fetch.mock.calls[0][0]).toBe(`/api/admin/physical-purchases/${ID}/cancellation-preview?quantity=2`);
    fireEvent.click(screen.getByText('تأیید و لغو'));
    const err = await screen.findByTestId('cancel-error');
    expect(err).toHaveAttribute('data-manual', 'true');
    expect(JSON.parse(fetch.mock.calls[1][1].body)).toMatchObject({ quantity: 2, reason: 'نیاز ندارم' });
  });

  it('بدون علت دکمهٔ تأیید غیرفعال است', async () => {
    fetch.mockResolvedValueOnce(ok(preview));
    setup();
    fireEvent.click(screen.getByText('لغو بخش فیزیکی سفارش'));
    await screen.findByTestId('cancel-warning');
    expect(screen.getByText('تأیید و لغو')).toBeDisabled();
  });
});
