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
