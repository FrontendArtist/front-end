import {
    checkPaymentConnection, ensurePaymentConnection, invalidatePaymentConnection,
    CONNECTION_TTL_MS,
} from '../client/paymentConnection';
import { executeOnlinePayment } from '../checkoutService';

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

test('VPN پیش از ایجاد سفارش پرداخت را متوقف می‌کند', async () => {
    fetch.mockResolvedValue(reply(true));
    await expect(executeOnlinePayment({ items: [{ id: 1 }], finalTotalPrice: 100 }))
        .rejects.toThrow('فیلترشکن');
    expect(fetch.mock.calls.every(([url]) => url.startsWith('/api/check-vpn'))).toBe(true);
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

test.each(['http', 'network', 'invalid'])('خطای %s مانع ثبت سفارش و شروع پرداخت نمی‌شود', async failure => {
    const submit = jest.spyOn(HTMLFormElement.prototype, 'submit').mockImplementation(() => {});
    fetch.mockImplementation(async url => {
        if (url === '/api/orders') return { ok: true, json: async () => ({ data: { documentId: 'test-order', totalPrice: 100 } }) };
        if (url === '/api/payment/request') return { ok: true, json: async () => ({ success: true, token: 'test-token' }) };
        if (failure === 'network') throw new Error('offline');
        return { ok: failure !== 'http', json: async () => ({ success: failure !== 'http' }) };
    });
    await executeOnlinePayment({ items: [{ id: 1 }], finalTotalPrice: 100 });
    expect(submit).toHaveBeenCalledTimes(1);
    expect(fetch).toHaveBeenCalledTimes(3);
    document.body.innerHTML = '';
});

test('ثبت سفارش طولانی باعث بررسی دوباره و رهاشدن سفارش نمی‌شود', async () => {
    jest.spyOn(Date, 'now').mockReturnValue(1000);
    jest.spyOn(HTMLFormElement.prototype, 'submit').mockImplementation(() => {});
    fetch.mockImplementation(async url => {
        if (url === '/api/orders') {
            Date.now.mockReturnValue(1000 + CONNECTION_TTL_MS + 1);
            return { ok: true, json: async () => ({ data: { documentId: 'test-order', totalPrice: 100 } }) };
        }
        if (url === '/api/payment/request') return { ok: true, json: async () => ({ success: true, token: 'test-token' }) };
        return reply(false);
    });
    await executeOnlinePayment({ items: [{ id: 1 }], finalTotalPrice: 100 });
    expect(fetch.mock.calls.filter(([url]) => url.startsWith('/api/check-vpn'))).toHaveLength(1);
    document.body.innerHTML = '';
});

test('مبلغ صفر مرورگر با سفارش پولی سرور قبل از توکن بررسی می‌شود', async () => {
    fetch.mockImplementation(async url => url === '/api/orders'
        ? { ok: true, json: async () => ({ data: { documentId: 'test-order', totalPrice: 100 } }) }
        : reply(true));
    await expect(executeOnlinePayment({ items: [{ id: 1 }], finalTotalPrice: 0 })).rejects.toThrow('فیلترشکن');
    expect(fetch.mock.calls.map(([url]) => url)).toEqual(['/api/orders', '/api/check-vpn']);
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
