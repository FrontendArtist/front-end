/** @jest-environment node */
import { POST as createComment } from '../route';
import { getServerSession } from 'next-auth';

jest.mock('next-auth', () => ({
    getServerSession: jest.fn(),
}));

jest.mock('@/lib/auth', () => ({
    authOptions: {},
}));

describe('API /api/comments (M8)', () => {
    const originalToken = process.env.STRAPI_API_TOKEN;

    beforeEach(() => {
        jest.clearAllMocks();
        process.env.STRAPI_API_TOKEN = 'test-strapi-token';
        global.fetch = jest.fn();
    });

    afterAll(() => {
        process.env.STRAPI_API_TOKEN = originalToken;
    });

    test('POST بدون نشست باید 401 برگرداند', async () => {
        getServerSession.mockResolvedValue(null);
        const req = new Request('http://localhost/api/comments', {
            method: 'POST',
            body: JSON.stringify({ data: { content: 'سلام' } }),
        });

        const res = await createComment(req);
        expect(res.status).toBe(401);
        expect(global.fetch).not.toHaveBeenCalled();
    });

    test('POST باید isApproved را به false اجبار کند و فیلدهای غیرمجاز را حذف کند', async () => {
        getServerSession.mockResolvedValue({ user: { id: 15 } });
        global.fetch.mockResolvedValue({
            ok: true,
            json: async () => ({ data: { id: 1 } }),
        });

        const req = new Request('http://localhost/api/comments', {
            method: 'POST',
            body: JSON.stringify({
                data: {
                    name: 'علی',
                    content: 'دوره بسیار عالی بود',
                    rating: 5,
                    course: 3,
                    isApproved: true,
                    comment_replies: [99],
                    user: 999,
                },
            }),
        });

        const res = await createComment(req);
        expect(res.status).toBe(200);
        const [, fetchOpts] = global.fetch.mock.calls[0];
        const sentBody = JSON.parse(fetchOpts.body);
        expect(sentBody.data).toEqual({
            name: 'علی',
            content: 'دوره بسیار عالی بود',
            rating: 5,
            course: 3,
            isApproved: false,
            user: 15,
        });
        expect(sentBody.data.comment_replies).toBeUndefined();
    });

    test('POST با comment_parent متعلق به همان دوره باید موفق شود', async () => {
        getServerSession.mockResolvedValue({ user: { id: 15 } });
        global.fetch
            .mockResolvedValueOnce({
                ok: true,
                status: 200,
                json: async () => ({
                    data: { id: 77, documentId: 'parent-77', course: { id: 3, documentId: 'course-doc-3' } },
                }),
            })
            .mockResolvedValueOnce({
                ok: true,
                status: 200,
                json: async () => ({ data: { id: 100 } }),
            });

        const req = new Request('http://localhost/api/comments', {
            method: 'POST',
            body: JSON.stringify({
                data: {
                    content: 'پاسخ به نظر',
                    course: 3,
                    comment_parent: { connect: ['parent-77'] },
                },
            }),
        });

        const res = await createComment(req);
        expect(res.status).toBe(200);
        expect(global.fetch).toHaveBeenCalledTimes(2);
    });

    test('POST با comment_parent متعلق به دورهٔ دیگر باید 400 برگرداند', async () => {
        getServerSession.mockResolvedValue({ user: { id: 15 } });
        global.fetch.mockResolvedValueOnce({
            ok: true,
            status: 200,
            json: async () => ({
                data: { id: 77, documentId: 'parent-77', course: { id: 99, documentId: 'course-doc-99' } },
            }),
        });

        const req = new Request('http://localhost/api/comments', {
            method: 'POST',
            body: JSON.stringify({
                data: {
                    content: 'پاسخ جعلی',
                    course: 3,
                    comment_parent: { connect: ['parent-77'] },
                },
            }),
        });

        const res = await createComment(req);
        expect(res.status).toBe(400);
        expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    test('POST با comment_parent متعلق به نوع محتوای دیگر (مثلاً article به‌جای course) باید 400 برگرداند', async () => {
        getServerSession.mockResolvedValue({ user: { id: 15 } });
        global.fetch.mockResolvedValueOnce({
            ok: true,
            status: 200,
            json: async () => ({
                data: { id: 77, documentId: 'parent-77', article: { id: 3, documentId: 'art-3' } },
            }),
        });

        const req = new Request('http://localhost/api/comments', {
            method: 'POST',
            body: JSON.stringify({
                data: {
                    content: 'پاسخ نامرتبط',
                    course: 3,
                    comment_parent: 'parent-77',
                },
            }),
        });

        const res = await createComment(req);
        expect(res.status).toBe(400);
        expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    test('POST با comment_parent ناموجود باید 400 برگرداند', async () => {
        getServerSession.mockResolvedValue({ user: { id: 15 } });
        global.fetch.mockResolvedValueOnce({
            ok: false,
            status: 404,
        });

        const req = new Request('http://localhost/api/comments', {
            method: 'POST',
            body: JSON.stringify({
                data: {
                    content: 'پاسخ به نظر ناموجود',
                    course: 3,
                    comment_parent: 'missing-parent',
                },
            }),
        });

        const res = await createComment(req);
        expect(res.status).toBe(400);
    });
});
