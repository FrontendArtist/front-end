/** @jest-environment node */
import { POST } from './route';
import { revalidateTag } from 'next/cache';

jest.mock('next/cache', () => ({ revalidateTag: jest.fn() }));

const makeRequest = (body, headers = {}) =>
  new Request('https://site.test/api/revalidate', {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...headers },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });

describe('POST /api/revalidate', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...originalEnv, REVALIDATE_SECRET: 'super-secret-token' };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  test('بدون پیکربندی راز سرور 503 برمی‌گرداند', async () => {
    delete process.env.REVALIDATE_SECRET;
    delete process.env.STRAPI_WEBHOOK_SECRET;
    const res = await POST(makeRequest({ model: 'article' }, { 'x-revalidate-secret': 'x' }));
    expect(res.status).toBe(503);
    expect(revalidateTag).not.toHaveBeenCalled();
  });

  test('با راز نامعتبر 401 برمی‌گرداند', async () => {
    const res = await POST(makeRequest({ model: 'article' }, { 'x-revalidate-secret': 'wrong' }));
    expect(res.status).toBe(401);
    expect(revalidateTag).not.toHaveBeenCalled();
  });

  test('مدل Strapi را به تگ‌های کش تبدیل و با پروفایل max بازسازی می‌کند', async () => {
    const res = await POST(
      makeRequest({ model: 'articles-category' }, { authorization: 'Bearer super-secret-token' })
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toEqual({ revalidated: true, tags: ['article-categories', 'articles'] });
    expect(revalidateTag).toHaveBeenCalledWith('article-categories', 'max');
    expect(revalidateTag).toHaveBeenCalledWith('articles', 'max');
  });

  test('از uid وب‌هوک استراپی هم مدل را استخراج می‌کند', async () => {
    const res = await POST(
      makeRequest({ uid: 'api::course.course' }, { 'x-revalidate-secret': 'super-secret-token' })
    );
    expect(res.status).toBe(200);
    expect(revalidateTag).toHaveBeenCalledWith('courses', 'max');
  });
});
