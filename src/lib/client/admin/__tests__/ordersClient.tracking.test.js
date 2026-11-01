import { fetchOrderTracking } from '../ordersClient';

const ok = (body) => Promise.resolve({ ok: true, json: () => Promise.resolve(body) });

beforeEach(() => {
    global.fetch = jest.fn();
});

describe('fetchOrderTracking cache', () => {
    test('درخواست‌های هم‌زمان و تکراری یک فراخوانی شبکه دارند و force کش را دور می‌زند', async () => {
        global.fetch.mockImplementation(() => ok({ n: 1 }));
        const [a, b] = await Promise.all([fetchOrderTracking('cart:a'), fetchOrderTracking('cart:a')]);
        await fetchOrderTracking('cart:a');
        expect(a).toEqual(b);
        expect(global.fetch).toHaveBeenCalledTimes(1);
        await fetchOrderTracking('cart:a', { force: true });
        expect(global.fetch).toHaveBeenCalledTimes(2);
    });

    test('خطا کش نمی‌شود و abort فقط انتظار همان فراخواننده را لغو می‌کند', async () => {
        global.fetch.mockImplementationOnce(() => Promise.resolve({ ok: false, json: () => Promise.resolve({ error: 'x' }) }));
        await expect(fetchOrderTracking('cart:b')).rejects.toThrow('x');
        global.fetch.mockImplementation(() => ok({ n: 2 }));
        const controller = new AbortController();
        const p = fetchOrderTracking('cart:b', { signal: controller.signal });
        controller.abort();
        await expect(p).rejects.toMatchObject({ name: 'AbortError' });
        await expect(fetchOrderTracking('cart:b')).resolves.toEqual({ n: 2 });
        expect(global.fetch).toHaveBeenCalledTimes(2);
    });
});
