import { getCurrentCourseAccess } from '../courseCheckoutApi';

afterEach(() => jest.restoreAllMocks());

test('دسترسی فعلی را بدون کش و با شناسه سند دوره می‌خواند', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => ({ id: 7, courses: [{ id: 42, documentId: 'course-1' }] }) });
    const controller = new AbortController();
    expect(await getCurrentCourseAccess(7, controller.signal)).toEqual(new Set(['course-1']));
    expect(fetch).toHaveBeenCalledWith('/api/profile', { cache: 'no-store', signal: controller.signal });
});

test.each([
    { id: 8, courses: [{ documentId: 'course-1' }] },
    { id: 7 },
])('پروفایل حساب دیگر یا دسترسی نامعلوم تأیید نمی‌شود', async profile => {
    global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => profile });
    await expect(getCurrentCourseAccess(7)).rejects.toThrow();
});

test('خطای پروفایل به دسترسی خالی تبدیل نمی‌شود', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: false });
    await expect(getCurrentCourseAccess(7)).rejects.toThrow();
});

test('دسترسی فصل را از enrolledChapterIntegrationIds تایید می‌کند و در صورت حذف آن دسترسی رد می‌شود', async () => {
    global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
            id: 7,
            courses: [{ id: 42, documentId: 'course-parent' }],
            enrolledChapters: [6],
            enrolledChapterIntegrationIds: ['chapter-uuid-1'],
        })
    });
    const access = await getCurrentCourseAccess(7);
    expect(access.hasChapterAccess('chapter-uuid-1', 'other-parent')).toBe(true);
    expect(access.hasChapterAccess('chapter-uuid-2', 'course-parent')).toBe(true);
    // اگر شناسه فصل در enrolledChapterIntegrationIds نباشد (مثلاً حذف شده باشد)، دسترسی داده نمی‌شود
    expect(access.hasChapterAccess('chapter-uuid-deleted', 'other-parent')).toBe(false);
});

