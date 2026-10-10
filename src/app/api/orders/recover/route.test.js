/** @jest-environment node */
import { POST } from './route';
import { getServerSession } from 'next-auth';
jest.mock('next-auth', () => ({ getServerSession: jest.fn() }));
jest.mock('@/lib/auth', () => ({ authOptions: {} }));
jest.mock('@/lib/api', () => ({ STRAPI_API_URL: 'http://strapi.test' }));
const request = (orderId = 'one') => ({ json: async () => ({ orderId }) });
beforeEach(() => {
    getServerSession.mockResolvedValue({ user: { id: 7 } });
    global.fetch = jest.fn();
});

test('بدون ورود بازیابی انجام نمی‌شود', async () => {
    getServerSession.mockResolvedValue(null);
    expect((await POST(request())).status).toBe(401);
    expect(fetch).not.toHaveBeenCalled();
});
test('مالکیت سفارش در درخواست سرور محدود می‌شود', async () => {
    fetch.mockResolvedValue({ ok: true, json: async () => ({ data: [] }) });
    expect((await POST(request())).status).toBe(404);
    const url = new URL(fetch.mock.calls[0][0]);
    expect(url.searchParams.get('filters[user][id][$eq]')).toBe('7');
    expect(url.searchParams.get('filters[documentId][$eq]')).toBe('one');
});
test('سفارش پرداخت‌شده دوباره منتقل نمی‌شود', async () => {
    fetch.mockResolvedValue({ ok: true, json: async () => ({ data: [{ paymentMethod: 'online', paymentStatus: 'paid' }] }) });
    expect((await POST(request())).status).toBe(409);
    expect(fetch).toHaveBeenCalledTimes(1);
});
test('خطای کاتالوگ به عنوان انتقال موفق گزارش نمی‌شود', async () => {
    fetch.mockResolvedValueOnce({ ok: true, json: async () => ({ data: [{ paymentMethod: 'online', paymentStatus: 'pending_payment', items: [{ productId: 4 }] }] }) })
        .mockResolvedValueOnce({ ok: false });
    expect((await POST(request())).status).toBe(502);
});
