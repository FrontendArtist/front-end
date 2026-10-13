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

test('سشن عمومی همچنان اطلاعات به‌روز دوره‌ها را دریافت می‌کند', async () => {
    global.fetch = jest.fn().mockResolvedValue({
        ok: true, headers: { get: () => 'application/json' },
        json: async () => ({ courses: [{ id: 9, slug: 'course' }], enrolledChapters: [11] }),
    });
    const session = await authOptions.callbacks.session({ session: { user: {} }, token: { id: 7 } });
    expect(session.user.enrolledCourses).toEqual([9]);
    expect(session.user.enrolledChapters).toEqual([11]);
    expect(fetch).toHaveBeenCalledTimes(1);
});
