/** @jest-environment node */
import { POST } from './route';
import { getServerSession } from 'next-auth';
jest.mock('next-auth', () => ({ getServerSession: jest.fn() }));
jest.mock('@/lib/auth', () => ({ paymentAuthOptions: {} }));
jest.mock('@/lib/api', () => ({ STRAPI_API_URL: 'http://strapi' }));
beforeEach(() => {
    getServerSession.mockResolvedValue({ user: { jwt: 'signed-user-jwt' } });
    global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => ({ priceInNoor: 189 }) });
});
const request = body => new Request('http://site/api/course-carts/preview', { method: 'POST', body: JSON.stringify(body) });
test('فقط انتخاب و کوپن با توکن نشست به استرپی ارسال می‌شود', async () => {
    const result = await POST(request({ externalCourseIds: ['one'], couponCode: 'ALL10', buyerExternalUserId: 'other', priceInNoor: 1 }));
    expect(await result.json()).toEqual({ priceInNoor: 189 });
    const [url, options] = fetch.mock.calls[0];
    expect(url).toBe('http://strapi/api/course-carts/preview');
    expect(options.headers.Authorization).toBe('Bearer signed-user-jwt');
    expect(JSON.parse(options.body)).toEqual({ externalCourseIds: ['one'], couponCode: 'ALL10' });
    expect(result.headers.get('Cache-Control')).toBe('no-store');
});
test('نشست نامعتبر پیش از ارتباط با استرپی رد می‌شود', async () => {
    getServerSession.mockResolvedValue(null);
    expect((await POST(request({}))).status).toBe(401);
    expect(fetch).not.toHaveBeenCalled();
});
test('خطای قرارداد و قطع سرویس به موفقیت تبدیل نمی‌شوند', async () => {
    fetch.mockResolvedValueOnce({ ok: false, status: 400, json: async () => ({ error: 'کوپن معتبر نیست.' }) });
    expect((await POST(request({ externalCourseIds: ['one'] }))).status).toBe(400);
    fetch.mockRejectedValueOnce(new Error('offline'));
    expect((await POST(request({ externalCourseIds: ['one'] }))).status).toBe(503);
});
