/** @jest-environment node */
import { GET, PUT } from './route';
import { getServerSession } from 'next-auth';

jest.mock('next-auth', () => ({ getServerSession: jest.fn() }));
jest.mock('@/lib/auth', () => ({ lightAuthOptions: {} }));

describe('/api/profile', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    getServerSession.mockResolvedValue({ user: { id: 12 } });
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => JSON.stringify({ id: 12, cartData: { state: { items: [] } } }),
    });
  });

  test('include=cart فقط فیلدهای id و cartData را بدون populate می‌گیرد', async () => {
    const res = await GET(new Request('https://site.test/api/profile?include=cart'));
    expect(res.status).toBe(200);
    const fetchedUrl = String(fetch.mock.calls[0][0]);
    expect(fetchedUrl).toContain('fields%5B0%5D=id');
    expect(fetchedUrl).toContain('fields%5B1%5D=cartData');
    expect(fetchedUrl).not.toContain('populate');
  });

  test('include=basic فقط فیلدهای نام و تلفن را بدون cartData و populate می‌گیرد', async () => {
    const res = await GET(new Request('https://site.test/api/profile?include=basic'));
    expect(res.status).toBe(200);
    const fetchedUrl = String(fetch.mock.calls[0][0]);
    expect(fetchedUrl).toContain('firstName');
    expect(fetchedUrl).toContain('phoneNumber');
    expect(fetchedUrl).not.toContain('cartData');
    expect(fetchedUrl).not.toContain('populate');
  });

  test('include=courses فقط فیلدهای سبک دوره را می‌گیرد', async () => {
    const res = await GET(new Request('https://site.test/api/profile?include=courses'));
    expect(res.status).toBe(200);
    const fetchedUrl = String(fetch.mock.calls[0][0]);
    expect(fetchedUrl).toContain('populate%5Bcourses%5D%5Bfields%5D');
    expect(fetchedUrl).not.toContain('address');
  });

  test('PUT فقط برای cartData پاسخ سبک برمی‌گرداند', async () => {
    const res = await PUT(
      new Request('https://site.test/api/profile', {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ cartData: { state: { items: [{ id: 1 }] } } }),
      })
    );
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      ok: true,
      id: 12,
      cartData: { state: { items: [] } },
    });
  });
});
