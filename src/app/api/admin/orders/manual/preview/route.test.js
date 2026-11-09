/**
 * D2: پیش‌نمایش قیمت سفارش دستی؛ فقط quote ذینفع در استرپی، با JWT نشست سروری.
 */
import { getServerSession } from 'next-auth/next';
import { POST } from './route';

jest.mock('next-auth/next', () => ({ getServerSession: jest.fn() }));
jest.mock('@/lib/auth', () => ({ authOptions: {} }));
jest.mock('@/lib/api', () => ({ STRAPI_API_URL: 'http://strapi.test' }));
jest.mock('next/server', () => ({ NextResponse: { json: (body, init) => ({ body, status: init?.status || 200 }) } }));

const JWT = 'server-admin-jwt';
const req = (body) => ({ json: async () => body });
const items = [{ externalId: 'chapter-int', type: 'course_chapter' }];

describe('POST /api/admin/orders/manual/preview', () => {
    beforeEach(() => {
        getServerSession.mockResolvedValue({ user: { jwt: JWT, role: { type: 'administrator' } } });
        global.fetch = jest.fn(async (url) => String(url).includes('/api/users/')
            ? { ok: true, json: async () => ({ id: 7, documentId: 'user-doc' }) }
            : { ok: true, json: async () => ({ priceInNoor: 40, originalTotalInNoor: 50, itemDiscountInNoor: 10 }) });
    });

    test('quotes for the beneficiary documentId with the server JWT and returns the Strapi price', async () => {
        const res = await POST(req({ userId: '7', items }));
        expect(res.status).toBe(200);
        expect(res.body.priceInNoor).toBe(40);
        const [url, init] = global.fetch.mock.calls.find(([u]) => String(u).includes('admin-preview'));
        expect(url).toBe('http://strapi.test/api/course-carts/admin-preview');
        expect(init.headers.Authorization).toBe(`Bearer ${JWT}`);
        expect(JSON.parse(init.body)).toEqual({
            beneficiaryExternalUserId: 'user-doc',
            items: [{ externalId: 'chapter-int', type: 'course_chapter', quantity: 1 }],
        });
    });

    test('passes the line error and status through', async () => {
        global.fetch = jest.fn(async (url) => String(url).includes('/api/users/')
            ? { ok: true, json: async () => ({ documentId: 'user-doc' }) }
            : { ok: false, status: 409, json: async () => ({ code: 'CART_INVALID', error: 'قبلاً خریده شده', lineError: { externalId: 'chapter-int' } }) });
        const res = await POST(req({ userId: '7', items }));
        expect(res.status).toBe(409);
        expect(res.body).toMatchObject({ error: 'قبلاً خریده شده', lineError: { externalId: 'chapter-int' } });
    });

    test('rejects product items and missing session without calling Strapi', async () => {
        const bad = await POST(req({ userId: '7', items: [{ externalId: 'p', type: 'product' }] }));
        expect(bad.status).toBe(400);
        getServerSession.mockResolvedValue(null);
        const anon = await POST(req({ userId: '7', items }));
        expect(anon.status).toBe(401);
        expect(global.fetch).not.toHaveBeenCalled();
    });
});
