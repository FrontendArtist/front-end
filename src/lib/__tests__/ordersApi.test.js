import { checkCourseAccess, getUserCoursePurchases } from '../ordersApi';

describe('ordersApi - checkCourseAccess', () => {
    const originalFetch = global.fetch;

    beforeEach(() => {
        global.fetch = jest.fn();
    });

    afterEach(() => {
        global.fetch = originalFetch;
        jest.clearAllMocks();
    });

    it('returns hasAccess: false when userId or courseId is missing', async () => {
        const res1 = await checkCourseAccess(null, '126', 'ezdevaj');
        expect(res1).toEqual({ hasAccess: false, purchasedChapterIds: [], activeCourseOrder: null });

        const res2 = await checkCourseAccess('35', null, 'ezdevaj');
        expect(res2).toEqual({ hasAccess: false, purchasedChapterIds: [], activeCourseOrder: null });
    });

    it('detects full course access from sessionUser.courses', async () => {
        const sessionUser = {
            id: 35,
            courses: [
                { id: 126, documentId: 'rjmfjwsdlye17u1ojlwrqxxv', slug: 'ezdevaj', title: 'ازدواج کائناتی' }
            ]
        };

        // Mock Strapi returning empty orders and empty user
        global.fetch.mockResolvedValueOnce({
            ok: true,
            status: 200,
            text: async () => JSON.stringify({ data: [] })
        }).mockResolvedValueOnce({
            ok: true,
            status: 200,
            text: async () => JSON.stringify({ id: 35, courses: [] })
        });

        const res = await checkCourseAccess(35, 126, 'ezdevaj', sessionUser);
        expect(res.hasAccess).toBe(true);
        expect(res.activeCourseOrder).toBeNull();
    });

    it('detects full course access from Strapi user.courses (Noor purchase without order)', async () => {
        // User has no orders in Strapi
        const mockOrdersResponse = { data: [] };
        // User has ezdevaj in user.courses in Strapi
        const mockUserResponse = {
            id: 35,
            documentId: 'kxeokzal4md7xdbh0k5x3hdc',
            courses: [
                {
                    id: 126,
                    documentId: 'rjmfjwsdlye17u1ojlwrqxxv',
                    slug: 'ezdevaj',
                    title: 'ازدواج کائناتی'
                }
            ]
        };

        global.fetch.mockImplementation((url) => {
            if (url.includes('/api/orders')) {
                return Promise.resolve({
                    ok: true,
                    status: 200,
                    text: async () => JSON.stringify(mockOrdersResponse)
                });
            }
            if (url.includes('/api/users')) {
                return Promise.resolve({
                    ok: true,
                    status: 200,
                    text: async () => JSON.stringify(mockUserResponse)
                });
            }
            return Promise.reject(new Error('Unknown url'));
        });

        const res = await checkCourseAccess('kxeokzal4md7xdbh0k5x3hdc', 'rjmfjwsdlye17u1ojlwrqxxv', 'ezdevaj');
        expect(res.hasAccess).toBe(true);
        expect(res.activeCourseOrder).toBeNull();
    });

    it('preserves access for old order-based purchases', async () => {
        const mockOrdersResponse = {
            data: [
                {
                    id: 211,
                    orderStatus: 'paid',
                    paymentStatus: 'paid',
                    items: [
                        {
                            __component: 'order.course-order-item',
                            id: 101,
                            courseId: 124,
                            slug: 'nejatmali',
                            title: 'نجات از مشکلات مالی'
                        }
                    ]
                }
            ]
        };
        const mockUserResponse = { id: 24, courses: [] };

        global.fetch.mockImplementation((url) => {
            if (url.includes('/api/orders')) {
                return Promise.resolve({
                    ok: true,
                    status: 200,
                    text: async () => JSON.stringify(mockOrdersResponse)
                });
            }
            if (url.includes('/api/users')) {
                return Promise.resolve({
                    ok: true,
                    status: 200,
                    text: async () => JSON.stringify(mockUserResponse)
                });
            }
            return Promise.reject(new Error('Unknown url'));
        });

        const res = await checkCourseAccess(24, 124, 'nejatmali');
        expect(res.hasAccess).toBe(true);
    });

    it('preserves chapter-only access behavior for chapter purchases', async () => {
        const mockOrdersResponse = {
            data: [
                {
                    id: 211,
                    orderStatus: 'paid',
                    paymentStatus: 'paid',
                    items: [
                        {
                            __component: 'order.course-order-item',
                            id: 113,
                            courseId: 118,
                            slug: 'khakbeaflak-chapter-78',
                            chapterId: 78,
                            type: 'chapter',
                            title: 'خاک به افلاک - فصل 1'
                        }
                    ]
                }
            ]
        };
        const mockUserResponse = { id: 24, courses: [] };

        global.fetch.mockImplementation((url) => {
            if (url.includes('/api/orders')) {
                return Promise.resolve({
                    ok: true,
                    status: 200,
                    text: async () => JSON.stringify(mockOrdersResponse)
                });
            }
            if (url.includes('/api/users')) {
                return Promise.resolve({
                    ok: true,
                    status: 200,
                    text: async () => JSON.stringify(mockUserResponse)
                });
            }
            return Promise.reject(new Error('Unknown url'));
        });

        const res = await checkCourseAccess(24, 118, 'khakbeaflak');
        expect(res.hasAccess).toBe(false);
        expect(res.purchasedChapterIds).toContain('78');
    });

    it('denies access if user has no orders and no relation in user.courses', async () => {
        const mockOrdersResponse = { data: [] };
        const mockUserResponse = { id: 99, courses: [] };

        global.fetch.mockImplementation((url) => {
            if (url.includes('/api/orders')) {
                return Promise.resolve({
                    ok: true,
                    status: 200,
                    text: async () => JSON.stringify(mockOrdersResponse)
                });
            }
            if (url.includes('/api/users')) {
                return Promise.resolve({
                    ok: true,
                    status: 200,
                    text: async () => JSON.stringify(mockUserResponse)
                });
            }
            return Promise.reject(new Error('Unknown url'));
        });

        const res = await checkCourseAccess(99, 126, 'ezdevaj');
        expect(res.hasAccess).toBe(false);
        expect(res.purchasedChapterIds).toEqual([]);
    });

    it('getUserCoursePurchases backward-compatible wrapper works as expected', async () => {
        const sessionUser = {
            id: 35,
            courses: [{ id: 126, slug: 'ezdevaj' }]
        };

        global.fetch.mockResolvedValue({
            ok: true,
            status: 200,
            text: async () => JSON.stringify({ data: [] })
        });

        const res = await getUserCoursePurchases(35, 126, 'ezdevaj', sessionUser);
        expect(res.hasPurchasedServer).toBe(true);
        expect(res.purchasedChapterIdsServer).toEqual([]);
    });
});
