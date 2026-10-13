import { act, fireEvent, render, screen } from '@testing-library/react';
import PaymentConnectionNotice from './PaymentConnectionNotice';
import { invalidatePaymentConnection } from '@/lib/client/paymentConnection';

const response = (isVpn = false) => ({ ok: true, json: async () => ({ success: true, isVpn }) });
beforeEach(() => { invalidatePaymentConnection(); global.fetch = jest.fn().mockResolvedValue(response()); });
afterEach(() => jest.restoreAllMocks());

test('هنگام نمایش صفحه بررسی می‌کند و بعد از خاموش کردن VPN می‌توان دوباره بررسی کرد', async () => {
    fetch.mockResolvedValueOnce(response(true));
    render(<PaymentConnectionNotice />);
    await screen.findByText(/با اینترنت ایران دوباره بررسی کنید/);
    fireEvent.click(screen.getByRole('button', { name: 'بررسی مجدد اتصال' }));
    await screen.findByText(/اتصال بررسی شد/);
    expect(screen.queryByRole('button', { name: 'بررسی مجدد اتصال' })).toBeNull();
    expect(fetch.mock.calls[1][0]).toBe('/api/check-vpn?refresh=1');
});

test('خطای بررسی پیام جداگانه دارد و تغییر فوکوس استعلام جدیدی ایجاد نمی‌کند', async () => {
    fetch.mockRejectedValueOnce(new Error('offline'));
    render(<PaymentConnectionNotice />);
    await screen.findByText(/وضعیت اتصال مشخص نشد/);
    await act(async () => {
        fireEvent(window, new Event('focus'));
        fireEvent(window, new Event('online'));
    });
    expect(fetch).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole('button', { name: 'بررسی مجدد اتصال' }));
    await screen.findByText(/اتصال بررسی شد/);
    expect(fetch).toHaveBeenCalledTimes(2);
});

test('بررسی دستی ناموفق تا پایان فاصلهٔ مجاز دوباره ارسال نمی‌شود', async () => {
    fetch.mockResolvedValue(response(true));
    render(<PaymentConnectionNotice />);
    await screen.findByText(/با اینترنت ایران دوباره بررسی کنید/);
    fireEvent.click(screen.getByRole('button', { name: 'بررسی مجدد اتصال' }));
    await screen.findByText(/با اینترنت ایران دوباره بررسی کنید/);
    expect(screen.getByRole('button', { name: 'چند لحظه صبر کنید' }).disabled).toBe(true);
});
