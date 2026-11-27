/** @jest-environment node */
import { GET } from './route';

describe('GET /api/courses/catalog-lite', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('فقط فیلدهای سبک دوره و فصل‌ها را بدون دروس و محتوا برمی‌گرداند', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        data: [
          {
            id: 10,
            documentId: 'course-10',
            slug: 'sample-course',
            title: 'دوره نمونه',
            chapters: [{ id: 3, integrationId: 'chap-uuid-3', title: 'فصل اول' }],
          },
        ],
      }),
    });

    const res = await GET();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      data: [
        {
          id: 10,
          documentId: 'course-10',
          slug: 'sample-course',
          title: 'دوره نمونه',
          chapters: [{ id: 3, integrationId: 'chap-uuid-3', title: 'فصل اول' }],
        },
      ],
    });
    const fetchedUrl = String(fetch.mock.calls[0][0]);
    expect(fetchedUrl).not.toContain('lessons');
    expect(fetchedUrl).not.toContain('curriculum');
  });
});
