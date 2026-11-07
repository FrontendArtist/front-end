/** @jest-environment node */
import { GET } from './route';
import { getServerSession } from 'next-auth/next';

jest.mock('next-auth/next', () => ({ getServerSession: jest.fn() }));
jest.mock('@/lib/auth', () => ({ authOptions: {} }));
jest.mock('@/lib/api', () => ({ API_BASE_URL: 'http://strapi.test/api/' }));

const originalFetch = global.fetch;
afterEach(() => { global.fetch = originalFetch; jest.clearAllMocks(); });

test('بدون نشست 401 است و Strapi صدا زده نمی‌شود', async () => {
    getServerSession.mockResolvedValue(null);
    global.fetch = jest.fn();
    expect((await GET()).status).toBe(401);
    expect(global.fetch).not.toHaveBeenCalled();
});

test('عدد آستانه را با JWT سروری می‌خواند و فقط همان را برمی‌گرداند', async () => {
    getServerSession.mockResolvedValue({ user: { jwt: 'tok' } });
    global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => ({ noCallbackMinutes: 45, extra: 1 }) });
    const res = await GET();
    expect(await res.json()).toEqual({ noCallbackMinutes: 45 });
    expect(global.fetch).toHaveBeenCalledWith('http://strapi.test/api/gateway-reviews/threshold',
        expect.objectContaining({ headers: { Authorization: 'Bearer tok' } }));
});

test.each([
    ['پاسخ ناموفق', () => Promise.resolve({ ok: false, json: async () => ({}) })],
    ['شکل نامعتبر', () => Promise.resolve({ ok: true, json: async () => ({ noCallbackMinutes: 'x' }) })],
    ['خطای شبکه', () => Promise.reject(new Error('down'))],
])('%s به 502 تبدیل می‌شود', async (_n, impl) => {
    getServerSession.mockResolvedValue({ user: { jwt: 'tok' } });
    global.fetch = jest.fn().mockImplementation(impl);
    expect((await GET()).status).toBe(502);
});
