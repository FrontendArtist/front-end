/** @jest-environment node */
let GET;

const request = (ip = '8.8.8.8', query = '') => new Request(`http://localhost/api/check-vpn${query}`, {
    headers: ip ? { 'x-forwarded-for': ip } : {},
});
const provider = (countryCode = 'IR', extra = {}) => ({
    ok: true, json: async () => ({ status: 'success', countryCode, isp: 'Mobile ISP', ...extra }),
});
beforeEach(() => {
    jest.resetModules();
    ({ GET } = require('./route'));
    global.fetch = jest.fn().mockResolvedValue(provider());
    jest.spyOn(console, 'warn').mockImplementation(() => {});
});
afterEach(() => jest.restoreAllMocks());

test('IP خارجی حتی با نام ارائه‌دهندهٔ ایرانی مسدود می‌شود', async () => {
    fetch.mockResolvedValue(provider('DE', { isp: 'Iran Internet' }));
    const result = await GET(request('8.8.8.1', '?refresh=1'));
    expect(await result.json()).toMatchObject({ success: true, isVpn: true });
});
test('پروکسی ایرانی هم مسدود می‌شود', async () => {
    fetch.mockResolvedValue(provider('IR', { proxy: true }));
    expect(await (await GET(request('8.8.8.2', '?refresh=1'))).json()).toMatchObject({ isVpn: true });
});
test('کش برای IP جداست و بررسی مجدد آن را دور می‌زند', async () => {
    jest.spyOn(Date, 'now').mockReturnValue(1000);
    await GET(request('8.8.8.3', '?refresh=1'));
    await GET(request('8.8.8.3'));
    expect(fetch).toHaveBeenCalledTimes(1);
    await GET(request('8.8.8.4'));
    Date.now.mockReturnValue(11000);
    await GET(request('8.8.8.3', '?refresh=1'));
    expect(fetch).toHaveBeenCalledTimes(3);
    expect(fetch.mock.calls[0][1].signal).toBeDefined();
});
test.each(['http', 'network', 'country'])('خطای %s نامشخص است و فقط مدت کوتاه ذخیره می‌شود', async failure => {
    jest.spyOn(Date, 'now').mockReturnValue(1000);
    if (failure === 'http') fetch.mockResolvedValueOnce({ ok: false });
    if (failure === 'network') fetch.mockRejectedValueOnce(new Error('timeout'));
    if (failure === 'country') fetch.mockResolvedValueOnce(provider(''));
    jest.spyOn(console, 'error').mockImplementation(() => {});
    const failed = await GET(request('8.8.8.5', '?refresh=1'));
    expect(failed.status).toBe(200);
    expect(await failed.json()).toMatchObject({ success: false, status: 'unknown', isVpn: null });
    await GET(request('8.8.8.5'));
    expect(fetch).toHaveBeenCalledTimes(1);
    Date.now.mockReturnValue(11000);
    const retried = await GET(request('8.8.8.5'));
    expect(retried.status).toBe(200);
    expect(fetch).toHaveBeenCalledTimes(2);
});
test('IP دلخواه در query نمی‌تواند جای IP اتصال را بگیرد', async () => {
    await GET(request('8.8.8.6', '?ip=1.1.1.1&refresh=1'));
    expect(fetch.mock.calls[0][0]).toContain('/8.8.8.6?');
});

test('هشدار قدیمی روی لوکال فقط در محیط توسعه می‌تواند IP عمومی را بررسی کند', async () => {
    const original = process.env.NODE_ENV;
    try {
        process.env.NODE_ENV = 'development';
        await GET(request('127.0.0.1', '?ip=8.8.8.7&refresh=1'));
        expect(fetch.mock.calls[0][0]).toContain('/8.8.8.7?');
        fetch.mockClear();
        process.env.NODE_ENV = 'production';
        const result = await GET(request('127.0.0.1', '?ip=8.8.8.7'));
        expect(result.status).toBe(200);
        expect(await result.json()).toMatchObject({ status: 'unknown', isVpn: null });
        expect(fetch).not.toHaveBeenCalled();
    } finally { process.env.NODE_ENV = original; }
});

test('هدر خصوصی، IP عمومی موجود در هدر دیگر را پنهان نمی‌کند', async () => {
    await GET(new Request('http://localhost/api/check-vpn', {
        headers: { 'x-real-ip': '172.18.0.2', 'x-forwarded-for': '8.8.8.8, 10.0.0.1' },
    }));
    expect(fetch.mock.calls[0][0]).toContain('/8.8.8.8?');
});

test.each(['', '10.0.0.1', 'fc00::1', 'fe80::1', '::1', 'not-an-ip'])('IP غیرعمومی %s نامشخص است', async ip => {
    expect(await (await GET(request(ip))).json()).toMatchObject({ status: 'unknown', isVpn: null });
    expect(fetch).not.toHaveBeenCalled();
});

test.each([429, 200])('وضعیت %s با اتمام سهمیه استعلام جدید را تا X-Ttl متوقف می‌کند', async status => {
    jest.spyOn(Date, 'now').mockReturnValue(1000);
    fetch.mockResolvedValueOnce({ ...provider(), status, ok: status === 200,
        headers: new Headers({ 'X-Rl': '0', 'X-Ttl': '30' }) });
    await GET(request('8.8.8.1'));
    const stopped = await GET(request('8.8.8.2', '?refresh=1'));
    expect(await stopped.json()).toMatchObject({ status: 'unknown', reason: 'rate_limited' });
    expect(fetch).toHaveBeenCalledTimes(1);
    Date.now.mockReturnValue(31000);
    await GET(request('8.8.8.2', '?refresh=1'));
    expect(fetch).toHaveBeenCalledTimes(2);
});

test('۴۲۹ بدون هدر معتبر یک دقیقه توقف ایجاد می‌کند', async () => {
    jest.spyOn(Date, 'now').mockReturnValue(1000);
    fetch.mockResolvedValueOnce({ status: 429, ok: false, headers: new Headers() });
    await GET(request('8.8.8.1'));
    Date.now.mockReturnValue(60000);
    await GET(request('8.8.8.2', '?refresh=1'));
    expect(fetch).toHaveBeenCalledTimes(1);
    Date.now.mockReturnValue(61000);
    await GET(request('8.8.8.2', '?refresh=1'));
    expect(fetch).toHaveBeenCalledTimes(2);
});

test('بودجهٔ محلی در نبود هدر سهمیه هم جلوی استعلام بیش از حد را می‌گیرد', async () => {
    jest.spyOn(Date, 'now').mockReturnValue(1000);
    for (let i = 1; i <= 40; i++) await GET(request(`8.8.8.${i}`));
    expect(await (await GET(request('8.8.8.41'))).json()).toMatchObject({ reason: 'rate_limited' });
    expect(fetch).toHaveBeenCalledTimes(40);
    Date.now.mockReturnValue(61000);
    await GET(request('8.8.8.41'));
    expect(fetch).toHaveBeenCalledTimes(41);
});

test('استعلام‌های هم‌زمان یک IP مشترک‌اند و IP دیگر در صف پرداخت نمی‌ماند', async () => {
    let resolveProvider;
    fetch.mockImplementationOnce(() => new Promise(resolve => { resolveProvider = resolve; }));
    const first = GET(request('8.8.8.1'));
    const same = GET(request('8.8.8.1', '?refresh=1'));
    const different = await GET(request('8.8.8.2'));
    expect(await different.json()).toMatchObject({ status: 'unknown', reason: 'provider_busy' });
    resolveProvider(provider());
    expect(await (await first).json()).toMatchObject({ success: true });
    expect(await (await same).json()).toMatchObject({ success: true });
    expect(fetch).toHaveBeenCalledTimes(1);
});

test('بررسی مجدد دستی در سرور هم حداقل فاصله دارد', async () => {
    jest.spyOn(Date, 'now').mockReturnValue(1000);
    await GET(request('8.8.8.1', '?refresh=1'));
    await GET(request('8.8.8.1', '?refresh=1'));
    expect(fetch).toHaveBeenCalledTimes(1);
    Date.now.mockReturnValue(11000);
    await GET(request('8.8.8.1', '?refresh=1'));
    expect(fetch).toHaveBeenCalledTimes(2);
});
