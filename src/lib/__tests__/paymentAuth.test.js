/** @jest-environment node */
import { authOptions, paymentAuthOptions, lightAuthOptions } from '../auth';

test('سشن پرداخت هویت امضاشده را بدون واکشی دوره‌ها نگه می‌دارد', async () => {
    global.fetch = jest.fn();
    const token = { id: 7, phoneNumber: '09123456789', role: { type: 'user' }, firstName: 'کاربر' };
    const session = await paymentAuthOptions.callbacks.session({ session: { user: { name: 'نام', email: 'user@test.ir' } }, token });
    expect(session.user).toMatchObject({ id: 7, phoneNumber: token.phoneNumber, name: 'نام', email: 'user@test.ir' });
    expect(fetch).not.toHaveBeenCalled();
    expect(paymentAuthOptions.callbacks.jwt).toBe(authOptions.callbacks.jwt);
    expect(paymentAuthOptions.secret).toBe(authOptions.secret);
    expect(lightAuthOptions).toBe(paymentAuthOptions);
});

test('سشن عمومی فقط فیلدهای ضروری را واکشی می‌کند و courses خام را در سشن نمی‌گذارد', async () => {
    global.fetch = jest.fn().mockResolvedValue({
        ok: true, headers: { get: () => 'application/json' },
        json: async () => ({ courses: [{ id: 9, slug: 'course', documentId: 'doc-9' }], enrolledChapters: [11] }),
    });
    const session = await authOptions.callbacks.session({ session: { user: {} }, token: { id: 7 } });
    expect(session.user.enrolledCourses).toEqual([9]);
    expect(session.user.enrolledSlugs).toEqual(['course']);
    expect(session.user.enrolledChapters).toEqual([11]);
    expect(session.user.courses).toBeUndefined();
    expect(fetch).toHaveBeenCalledTimes(1);
    const fetchedUrl = String(fetch.mock.calls[0][0]);
    expect(fetchedUrl).toContain('populate%5Bcourses%5D%5Bfields%5D%5B0%5D=id');
    expect(fetchedUrl).toContain('fields%5B0%5D=id');
});
