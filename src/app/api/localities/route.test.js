/** @jest-environment node */

import { GET } from './route';
import { getServerSession } from 'next-auth';

jest.mock('next-auth', () => ({ getServerSession: jest.fn() }));
jest.mock('@/lib/auth', () => ({ authOptions: {} }));

describe('GET /api/localities', () => {
    const localities = [{ name: 'تهران', cities: ['تهران', 'ری'] }];

    beforeEach(() => {
        jest.clearAllMocks();
        process.env.STRAPI_API_TOKEN = 'service-token';
        process.env.NEXT_PUBLIC_STRAPI_API_URL = 'http://strapi.test/api/';
        getServerSession.mockResolvedValue({ user: { id: 4 } });
        global.fetch = jest.fn().mockResolvedValue({
            ok: true,
            status: 200,
            text: async () => JSON.stringify({
                data: [{ name: 'تهران', cities: ['تهران', 'ری'], id: 9 }],
                meta: { secret: true },
            }),
        });
        jest.spyOn(console, 'error').mockImplementation(() => {});
    });

    afterEach(() => {
        delete process.env.STRAPI_API_TOKEN;
        jest.restoreAllMocks();
    });

    test('بدون نشست ۴۰۱ می‌دهد و به استرپی درخواست نمی‌زند', async () => {
        getServerSession.mockResolvedValue(null);

        const response = await GET();

        expect(response.status).toBe(401);
        expect(await response.json()).toEqual({
            message: 'برای دریافت فهرست استان و شهر باید وارد حساب کاربری شوید.',
        });
        expect(global.fetch).not.toHaveBeenCalled();
    });

    test('فقط نام استان و شهر را برمی‌گرداند و توکن سرویس را می‌فرستد', async () => {
        const response = await GET();

        expect(response.status).toBe(200);
        expect(await response.json()).toEqual({ data: localities });
        expect(global.fetch).toHaveBeenCalledWith('http://strapi.test/api/localities', expect.objectContaining({
            method: 'GET',
            cache: 'no-store',
            headers: expect.objectContaining({
                Authorization: 'Bearer service-token',
            }),
        }));
    });

    test('بدون توکن هم درخواست عمومی را پروکسی می‌کند', async () => {
        delete process.env.STRAPI_API_TOKEN;

        const response = await GET();

        expect(response.status).toBe(200);
        expect(global.fetch.mock.calls[0][1].headers.Authorization).toBeUndefined();
    });

    test('پاسخ نامعتبر استرپی با پیام فارسی ۵۰۲ می‌شود', async () => {
        global.fetch.mockResolvedValueOnce({
            ok: true,
            status: 200,
            text: async () => JSON.stringify({ data: [{ id: 3 }] }),
        });

        const response = await GET();

        expect(response.status).toBe(502);
        expect(await response.json()).toEqual({ message: 'دریافت فهرست استان و شهر ناموفق بود.' });
    });

    test('خطای شبکه پیام فارسی ۵۰۰ می‌دهد', async () => {
        global.fetch.mockRejectedValueOnce(new Error('down'));

        const response = await GET();

        expect(response.status).toBe(500);
        expect(await response.json()).toEqual({ message: 'خطای داخلی در دریافت فهرست استان و شهر.' });
    });
});
