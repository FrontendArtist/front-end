import {
    checkPaymentConnection, ensurePaymentConnection, invalidatePaymentConnection,
    CONNECTION_TTL_MS,
} from '../client/paymentConnection';

const reply = (isVpn = false) => ({ ok: true, json: async () => ({ success: true, isVpn }) });

beforeEach(() => {
    invalidatePaymentConnection();
    global.fetch = jest.fn().mockResolvedValue(reply());
});
afterEach(() => { jest.restoreAllMocks(); jest.useRealTimers(); });

test('بررسی اولیهٔ تازه در لحظهٔ پرداخت درخواست جدیدی ایجاد نمی‌کند', async () => {
    await checkPaymentConnection();
    await ensurePaymentConnection();
    expect(fetch).toHaveBeenCalledTimes(1);
});

test('نتیجهٔ قدیمی دوباره بررسی می‌شود', async () => {
    jest.spyOn(Date, 'now').mockReturnValue(1000);
    await checkPaymentConnection();
    Date.now.mockReturnValue(1000 + CONNECTION_TTL_MS);
    await ensurePaymentConnection();
    expect(fetch).toHaveBeenCalledTimes(2);
});

test('بررسی مجدد بعد از خاموش کردن VPN کش مرورگر و سرور را کنار می‌گذارد', async () => {
    fetch.mockResolvedValueOnce(reply(true)).mockResolvedValueOnce(reply(false));
    await expect(ensurePaymentConnection()).rejects.toThrow('فیلترشکن');
    await checkPaymentConnection({ refresh: true });
    await ensurePaymentConnection();
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(fetch.mock.calls[1][0]).toBe('/api/check-vpn?refresh=1');
});

test('درخواست‌های هم‌زمان یک بررسی مشترک دارند', async () => {
    await Promise.all([checkPaymentConnection(), ensurePaymentConnection()]);
    expect(fetch).toHaveBeenCalledTimes(1);
});

test('خطای بررسی وضعیت نامشخص است و فقط مدت کوتاه ذخیره می‌شود', async () => {
    jest.spyOn(Date, 'now').mockReturnValue(1000);
    fetch.mockRejectedValueOnce(new Error('offline'));
    expect(await ensurePaymentConnection()).toMatchObject({ status: 'unknown', isVpn: null });
    expect(await ensurePaymentConnection()).toMatchObject({ status: 'unknown' });
    expect(fetch).toHaveBeenCalledTimes(1);
    Date.now.mockReturnValue(11000);
    expect(await ensurePaymentConnection()).toMatchObject({ status: 'allowed' });
    expect(fetch).toHaveBeenCalledTimes(2);
});

test('مهلت مرورگر شامل دریافت بدنهٔ پاسخ هم هست', async () => {
    jest.useFakeTimers();
    fetch.mockImplementation(async (_url, { signal }) => ({
        ok: true,
        json: () => new Promise((_resolve, reject) => {
            signal.addEventListener('abort', () => reject(new Error('aborted')));
        }),
    }));
    const result = expect(ensurePaymentConnection()).resolves.toMatchObject({ status: 'unknown', isVpn: null });
    await jest.advanceTimersByTimeAsync(2000);
    await result;
    expect(jest.getTimerCount()).toBe(0);
});

test('کلیک‌های مکرر بررسی مجدد در مرورگر محدود می‌شوند', async () => {
    jest.spyOn(Date, 'now').mockReturnValue(1000);
    await checkPaymentConnection({ refresh: true });
    await checkPaymentConnection({ refresh: true });
    expect(fetch).toHaveBeenCalledTimes(1);
    Date.now.mockReturnValue(11000);
    await checkPaymentConnection({ refresh: true });
    expect(fetch).toHaveBeenCalledTimes(2);
});
