/** @jest-environment node */
import { authOptions, paymentAuthOptions } from '../auth';

test('سشن پرداخت هویت امضاشده را بدون واکشی دوره‌ها نگه می‌دارد', async () => {
    global.fetch = jest.fn();
    const token = { id: 7, phoneNumber: '09123456789', role: { type: 'user' }, firstName: 'کاربر' };
    const session = await paymentAuthOptions.callbacks.session({ session: { user: { name: 'نام', email: 'user@test.ir' } }, token });
    expect(session.user).toMatchObject({ id: 7, phoneNumber: token.phoneNumber, name: 'نام', email: 'user@test.ir' });
    expect(fetch).not.toHaveBeenCalled();
    expect(paymentAuthOptions.callbacks.jwt).toBe(authOptions.callbacks.jwt);
    expect(paymentAuthOptions.secret).toBe(authOptions.secret);
});

test('سشن عمومی همچنان اطلاعات به‌روز دوره‌ها را به‌صورت سبک دریافت می‌کند', async () => {
    global.fetch = jest.fn().mockResolvedValue({
        ok: true, headers: { get: () => 'application/json' },
        json: async () => ({
            courses: [{ id: 9, documentId: 'doc-9', slug: 'course', description: 'متن طولانی', chapters: [1, 2] }],
            enrolledChapters: [11],
            role: { id: 1, name: 'Authenticated', type: 'authenticated', description: 'desc' },
        }),
    });
    const session = await authOptions.callbacks.session({ session: { user: {} }, token: { id: 7 } });
    expect(session.user.enrolledCourses).toEqual([9]);
    expect(session.user.enrolledChapters).toEqual([11]);
    expect(session.user.courses).toEqual([{ id: 9, documentId: 'doc-9', slug: 'course' }]);
    expect(session.user.role).toEqual({ id: 1, name: 'Authenticated', type: 'authenticated' });
    expect(fetch).toHaveBeenCalledTimes(1);
});

test('پرووایدر گوگل در authOptions وجود ندارد (M20)', () => {
    const providerIds = authOptions.providers.map((p) => p.id || p.options?.id);
    expect(providerIds).not.toContain('google');
});

test('در production نبود NEXTAUTH_SECRET خطا می‌دهد (M2)', () => {
    const origEnv = process.env.NODE_ENV;
    const origSecret = process.env.NEXTAUTH_SECRET;
    const origPhase = process.env.NEXT_PHASE;
    const origStrapi = process.env.NEXT_PUBLIC_STRAPI_URL;

    try {
        process.env.NODE_ENV = 'production';
        process.env.NEXT_PUBLIC_STRAPI_URL = 'https://api.tarhelahi.ir';
        delete process.env.NEXTAUTH_SECRET;
        delete process.env.NEXT_PHASE;
        jest.resetModules();
        expect(() => require('../auth')).toThrow(/NEXTAUTH_SECRET/);
    } finally {
        process.env.NODE_ENV = origEnv;
        if (origSecret !== undefined) process.env.NEXTAUTH_SECRET = origSecret;
        else delete process.env.NEXTAUTH_SECRET;
        if (origPhase !== undefined) process.env.NEXT_PHASE = origPhase;
        else delete process.env.NEXT_PHASE;
        if (origStrapi !== undefined) process.env.NEXT_PUBLIC_STRAPI_URL = origStrapi;
        else delete process.env.NEXT_PUBLIC_STRAPI_URL;
        jest.resetModules();
    }
});
