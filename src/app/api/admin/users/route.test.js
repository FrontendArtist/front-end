/**
 * فهرست و ساخت کاربر ادمین: بدون نشست ۴۰۱، کاربر لاگین‌شدهٔ غیرادمین ۴۰۳،
 * و هر دو نقش administrator و admin مجازند.
 */
import { getServerSession } from 'next-auth/next';
import { getUsers } from '@/lib/admin/adminUsersApi';
import { GET, POST } from './route';

jest.mock('next-auth/next', () => ({ getServerSession: jest.fn() }));
jest.mock('@/lib/admin/adminUsersApi', () => ({ getUsers: jest.fn() }));
jest.mock('next/server', () => ({ NextResponse: { json: (body, init) => ({ body, status: init?.status || 200 }) } }));

const JWT = 'server-admin-jwt';
const listUrl = 'http://localhost/api/admin/users';
const postReq = (body) => ({ json: async () => body });

describe('GET/POST /api/admin/users', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        getUsers.mockResolvedValue({ users: [], meta: {}, error: null });
    });

    test.each([
        ['GET', () => GET({ url: listUrl })],
        ['POST', () => POST(postReq({ phoneNumber: '09120000000' }))],
    ])('%s بدون نشست ۴۰۱ است', async (_name, call) => {
        getServerSession.mockResolvedValue(null);
        const res = await call();
        expect(res.status).toBe(401);
        expect(getUsers).not.toHaveBeenCalled();
    });

    test.each([
        ['GET', () => GET({ url: listUrl })],
        ['POST', () => POST(postReq({ phoneNumber: '09120000000' }))],
    ])('%s برای کاربر لاگین‌شدهٔ غیرادمین ۴۰۳ است', async (_name, call) => {
        getServerSession.mockResolvedValue({ user: { jwt: JWT, role: { type: 'authenticated' } } });
        const res = await call();
        expect(res.status).toBe(403);
        expect(getUsers).not.toHaveBeenCalled();
    });

    test.each(['administrator', 'admin'])('GET با نقش %s فهرست را با JWT نشست می‌خواند', async (type) => {
        getServerSession.mockResolvedValue({ user: { jwt: JWT, role: { type } } });
        const res = await GET({ url: listUrl });
        expect(res.status).toBe(200);
        expect(getUsers).toHaveBeenCalledWith(JWT, expect.objectContaining({ start: 0, limit: 20 }));
    });

    test('POST با نقش admin از دروازهٔ احراز عبور می‌کند', async () => {
        getServerSession.mockResolvedValue({ user: { jwt: JWT, role: { type: 'admin' } } });
        const res = await POST(postReq({ phoneNumber: '12' }));
        expect(res.status).toBe(400);
        expect(res.body.error).toContain('موبایل');
    });
});
