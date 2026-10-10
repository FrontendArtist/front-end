/** @jest-environment node */
import { POST } from './route';
import { getServerSession } from 'next-auth';
jest.mock('next-auth', () => ({ getServerSession: jest.fn() }));
jest.mock('@/lib/auth', () => ({ authOptions: {} }));
jest.mock('@/lib/api', () => ({ STRAPI_API_URL: 'http://strapi.test' }));
const request = changes => ({ json: async () => ({ removedItemKey: 'course:42', remainingItemKeys: [], ...changes }) });
beforeEach(() => {
    getServerSession.mockResolvedValue({ user: { id: 7 } });
    global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => ({ canceledOrderIds: ['one'] }) });
});
test('هویت از نشست خوانده می‌شود و هویت مرورگر نادیده گرفته می‌شود', async () => {
    expect((await POST(request({ userId: 88 }))).status).toBe(200);
    expect(JSON.parse(fetch.mock.calls[0][1].body).data.userId).toBe(7);
});
test('مهمان اجازهٔ لغو ندارد', async () => {
    getServerSession.mockResolvedValue(null);
    expect((await POST(request())).status).toBe(401);
    expect(fetch).not.toHaveBeenCalled();
});
test('ورودی نامعتبر پیش از ارسال به بک‌اند رد می‌شود', async () => {
    expect((await POST(request({ remainingItemKeys: ['bad'] }))).status).toBe(400);
    expect(fetch).not.toHaveBeenCalled();
});
test('خطای بک‌اند موفق گزارش نمی‌شود', async () => {
    fetch.mockResolvedValue({ ok: false });
    expect((await POST(request())).status).toBe(502);
});
