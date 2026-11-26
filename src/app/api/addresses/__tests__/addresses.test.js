/** @jest-environment node */
import { POST as createAddress } from '../route';
import { PUT as updateAddress } from '../[id]/route';
import { getServerSession } from 'next-auth';

jest.mock('next-auth', () => ({
    getServerSession: jest.fn(),
}));

jest.mock('@/lib/auth', () => ({
    authOptions: {},
}));

describe('API /api/addresses (HF17)', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        global.fetch = jest.fn();
    });

    test('POST بدون نشست یا بدون jwt باید 401 برگرداند', async () => {
        getServerSession.mockResolvedValue({ user: { id: 42 } });
        const req = new Request('http://localhost/api/addresses', {
            method: 'POST',
            body: JSON.stringify({ data: { fullAddress: 'تهران' } }),
        });

        const res = await createAddress(req);
        expect(res.status).toBe(401);
        expect(global.fetch).not.toHaveBeenCalled();
    });

    test('POST باید با JWT کاربر ارسال شود و user ارسالی کلاینت را نادیده بگیرد', async () => {
        getServerSession.mockResolvedValue({ user: { id: 42, jwt: 'user-jwt-42' } });
        global.fetch.mockResolvedValue({
            ok: true,
            json: async () => ({ data: { id: 10 } }),
        });

        const req = new Request('http://localhost/api/addresses', {
            method: 'POST',
            body: JSON.stringify({
                data: {
                    title: 'خانه',
                    fullAddress: 'تهران، خیابان ولیعصر',
                    user: 999,
                    role: 'admin',
                },
            }),
        });

        const res = await createAddress(req);
        expect(res.status).toBe(200);
        const [, fetchOpts] = global.fetch.mock.calls[0];
        expect(fetchOpts.headers.Authorization).toBe('Bearer user-jwt-42');
        const sentBody = JSON.parse(fetchOpts.body);
        expect(sentBody.data.user).toBe(42);
        expect(sentBody.data.role).toBeUndefined();
    });

    test('PUT برای آدرس کاربر دیگر باید 403 برگرداند', async () => {
        getServerSession.mockResolvedValue({ user: { id: 42, jwt: 'user-jwt-42' } });
        global.fetch.mockResolvedValue({
            ok: true,
            status: 200,
            json: async () => ({ data: { id: 5, user: { id: 999 } } }),
        });

        const req = new Request('http://localhost/api/addresses/doc-5', {
            method: 'PUT',
            body: JSON.stringify({ data: { fullAddress: 'تغییر غیرمجاز' } }),
        });

        const res = await updateAddress(req, { params: Promise.resolve({ id: 'doc-5' }) });
        expect(res.status).toBe(403);
        expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    test('PUT برای آدرس متعلق به خود کاربر باید با JWT کاربر ارسال شود و فیلد user را نفرستد', async () => {
        getServerSession.mockResolvedValue({ user: { id: 42, jwt: 'user-jwt-42' } });
        global.fetch
            .mockResolvedValueOnce({
                ok: true,
                status: 200,
                json: async () => ({ data: { id: 5, user: { id: 42 } } }),
            })
            .mockResolvedValueOnce({
                ok: true,
                status: 200,
                json: async () => ({ data: { id: 5 } }),
            });

        const req = new Request('http://localhost/api/addresses/doc-5', {
            method: 'PUT',
            body: JSON.stringify({
                data: {
                    fullAddress: 'تهران، خیابان آزادی',
                    user: 999,
                },
            }),
        });

        const res = await updateAddress(req, { params: Promise.resolve({ id: 'doc-5' }) });
        expect(res.status).toBe(200);
        expect(global.fetch).toHaveBeenCalledTimes(2);
        const [, getOpts] = global.fetch.mock.calls[0];
        const [, putOpts] = global.fetch.mock.calls[1];
        expect(getOpts.headers.Authorization).toBe('Bearer user-jwt-42');
        expect(putOpts.headers.Authorization).toBe('Bearer user-jwt-42');
        const putBody = JSON.parse(putOpts.body);
        expect(putBody.data.fullAddress).toBe('تهران، خیابان آزادی');
        expect(putBody.data.user).toBeUndefined();
    });
});
