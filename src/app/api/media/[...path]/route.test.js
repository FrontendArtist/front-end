/** @jest-environment node */
import { GET, HEAD } from './route';
import { getServerSession } from 'next-auth';
import { checkCourseAccess } from '@/lib/ordersApi';
import { API_BASE_URL } from '@/lib/api';

jest.mock('next-auth', () => ({ getServerSession: jest.fn() }));
jest.mock('@/lib/auth', () => ({ authOptions: {} }));
jest.mock('@/lib/ordersApi', () => ({ checkCourseAccess: jest.fn() }));

let course, session, sourceFetch, catalogFetch;
const fileUrl = `${API_BASE_URL}/uploads/lesson.mp3`;
beforeEach(() => {
  jest.clearAllMocks();
  course = { id: 42, documentId: 'course-doc', slug: 'course', price: '100',
    curriculum: [], media: [],
    chapters: [{ id: 7, price: '50', lessons: [{ id: 99, audioUrl: fileUrl, isFree: false }] }] };
  session = { user: { id: 9, role: 'authenticated' } };
  getServerSession.mockImplementation(async () => session);
  checkCourseAccess.mockResolvedValue({ hasAccess: false, purchasedChapterIds: [] });
  catalogFetch = jest.fn(async () => new Response(JSON.stringify({ data: [course],
    meta: { pagination: { page: 1, pageCount: 1 } } })));
  sourceFetch = jest.fn(async options => new Response(options.method === 'HEAD' ? null : 'audio', {
    headers: { 'content-type': 'audio/mpeg', 'content-length': '5', 'accept-ranges': 'bytes' },
  }));
  global.fetch = jest.fn(async (url, options) =>
    String(url).includes('/api/courses?') ? catalogFetch(url, options) : sourceFetch(options));
});

describe.each([['GET', GET], ['HEAD', HEAD]])('%s', (method, handler) => {
  const run = (cid = null, path = ['lesson.mp3'], headers = {}) => handler(
    new Request(`https://site.test/api/media/lesson.mp3${cid == null ? '' : `?cid=${cid}`}`, { method, headers }),
    { params: Promise.resolve({ path }) });

  test.each([null, '', 'course-doc', 'free-course'])('شناسه %p مجوز محتوای پولی نمی‌سازد', async cid => {
    expect((await run(cid)).status).toBe(403);
    expect(sourceFetch).not.toHaveBeenCalled();
  });
  test('خرید دوره دیگر با تغییر شناسه، فایل را باز نمی‌کند', async () => {
    checkCourseAccess.mockResolvedValue({ hasAccess: true, purchasedChapterIds: [] });
    expect((await run('other-course')).status).toBe(403);
    expect(checkCourseAccess).not.toHaveBeenCalled();
    expect(sourceFetch).not.toHaveBeenCalled();
  });
  test.each(['course-doc', 'course', '42', null])('خرید دوره واقعی با شناسه %p حفظ می‌شود', async cid => {
    checkCourseAccess.mockResolvedValue({ hasAccess: true, purchasedChapterIds: [] });
    expect((await run(cid)).status).toBe(200);
    expect(checkCourseAccess).toHaveBeenCalledWith(9, 42, 'course', session.user);
  });
  test.each([['7', 200], ['8', 403]])('خرید فصل %s نتیجه %s دارد', async (chapter, status) => {
    checkCourseAccess.mockResolvedValue({ hasAccess: false, purchasedChapterIds: [chapter] });
    expect((await run()).status).toBe(status);
  });
  test.each(['enrolledCourses', 'enrolledSlugs', 'enrolledChapters'])('دسترسی قبلی %s حفظ می‌شود', async key => {
    session.user[key] = [key === 'enrolledCourses' ? 42 : key === 'enrolledSlugs' ? 'course' : 7];
    expect((await run()).status).toBe(200);
  });
  test('ادمین به فایل متعلق به دوره دسترسی دارد', async () => {
    session.user.role = 'administrator';
    expect((await run('course-doc')).status).toBe(200);
    expect((await run('other-course')).status).toBe(403);
  });
  test.each(['lesson', 'chapter', 'course', 'discount'])('رایگان بودن %s حفظ می‌شود', async kind => {
    if (kind === 'lesson') course.chapters[0].lessons[0].isFree = true;
    if (kind === 'chapter') course.chapters[0].price = '0.00';
    if (kind === 'course') course.price = '0.00';
    if (kind === 'discount') course.discountPercent = 100;
    expect((await run()).status).toBe(200);
    expect(checkCourseAccess).not.toHaveBeenCalled();
  });
  test('قیمت بین‌المللی پولی با تخفیف محلی رایگان نمی‌شود', async () => {
    course.discountPercent = 100;
    course.internationalPrice = 10;
    session.user.is_foreigner = true;
    expect((await run()).status).toBe(403);
  });
  test.each([null, '', ' ', 'invalid'])('قیمت نامعتبر %p مجوز نمی‌سازد', async price => {
    course.price = price;
    course.chapters[0].price = price;
    expect((await run()).status).toBe(403);
  });
  test('خطای شبکهٔ سفارش به منبع فایل نمی‌رسد', async () => {
    checkCourseAccess.mockRejectedValue(new Error('قطع شبکه'));
    const log = jest.spyOn(console, 'error').mockImplementation(() => {});
    expect((await run()).status).toBe(503);
    expect(sourceFetch).not.toHaveBeenCalled();
    log.mockRestore();
  });
  test('خطای استعلام واقعی سفارش مجوز نمی‌سازد', async () => {
    checkCourseAccess.mockImplementation(jest.requireActual('@/lib/ordersApi').checkCourseAccess);
    const fetch = global.fetch;
    global.fetch = jest.fn(async (url, options) => {
      if (String(url).includes('/api/orders?')) throw new Error('قطع شبکه');
      return fetch(url, options);
    });
    const log = jest.spyOn(console, 'error').mockImplementation(() => {});
    expect((await run()).status).toBe(403);
    expect(sourceFetch).not.toHaveBeenCalled();
    log.mockRestore();
  });
  test.each(['network', 'http', 'shape', 'unpopulated'])('استعلام ناموفق محتوا: %s', async failure => {
    catalogFetch.mockImplementation(async () => {
      if (failure === 'network') throw new Error('قطع شبکه');
      if (failure === 'http') return new Response(null, { status: 403 });
      if (failure === 'unpopulated') delete course.chapters;
      return new Response(JSON.stringify({ data: [course], ...(failure === 'shape' ? {} :
        { meta: { pagination: { page: 1, pageCount: 1 } } }) }));
    });
    const log = jest.spyOn(console, 'error').mockImplementation(() => {});
    expect((await run(null, ['public.pdf'])).status).toBe(503);
    expect(sourceFetch).not.toHaveBeenCalled();
    log.mockRestore();
  });
  test.each(['image.jpg', 'public.pdf', 'public.mp3'])('فایل عمومی %s حفظ می‌شود', async filename => {
    expect((await run(null, [filename])).status).toBe(200);
  });
  test('فایل عمومیِ دوره باید با شناسه ادعاشده منطبق باشد', async () => {
    course.media = [{ url: '/uploads/image.jpg' }];
    expect((await run('course-doc', ['image.jpg'])).status).toBe(200);
    expect((await run('other-course', ['image.jpg'])).status).toBe(403);
  });
  test('فایل آموزشی موجود در گالری همچنان نیازمند خرید است', async () => {
    course.media = [{ url: '/uploads/lesson.mp3' }];
    expect((await run('course-doc')).status).toBe(403);
  });
  test('صوت صفحه دوم عمومی تلقی نمی‌شود', async () => {
    catalogFetch.mockImplementation(async url => {
      const page = Number(new URL(url).searchParams.get('pagination[page]'));
      return new Response(JSON.stringify({ data: page === 1 ? [] : [course],
        meta: { pagination: { page, pageCount: 2 } } }));
    });
    expect((await run()).status).toBe(403);
    expect(catalogFetch).toHaveBeenCalledTimes(4);
    expect(sourceFetch).not.toHaveBeenCalled();
  });
  test('ویدئوی جلسه هم محافظت می‌شود', async () => {
    course.chapters[0].lessons[0] = { id: 99, videoUrl: fileUrl };
    expect((await run()).status).toBe(403);
  });
  test.each(['lesson', 'course', 'discount'])('رایگان بودن پیش‌نویس %s مجوز نمی‌سازد', async kind => {
    if (kind === 'lesson') course.chapters[0].lessons[0].isFree = true;
    if (kind === 'course') course.price = '0';
    if (kind === 'discount') course.discountPercent = 100;
    catalogFetch.mockImplementation(async url => new Response(JSON.stringify({
      data: new URL(url).searchParams.get('status') === 'draft' ? [course] : [],
      meta: { pagination: { page: 1, pageCount: 1 } },
    })));
    expect((await run()).status).toBe(403);
    expect(sourceFetch).not.toHaveBeenCalled();
    checkCourseAccess.mockResolvedValue({ hasAccess: true, purchasedChapterIds: [] });
    expect((await run()).status).toBe(200);
  });
  test('مهمان مطابق رفتار قبلی رد می‌شود', async () => {
    session = null;
    expect((await run()).status).toBe(401);
    expect(global.fetch).not.toHaveBeenCalled();
  });
  test.each([['..', 'secret'], ['%2e%2e', 'secret'], ['a/b'], ['a\\b']])('مسیر نامعتبر %p رد می‌شود', async (...path) => {
    expect((await run(null, path)).status).toBe(400);
    expect(global.fetch).not.toHaveBeenCalled();
  });
  test('پیشوند uploads و هدرهای استریم حفظ می‌شوند', async () => {
    checkCourseAccess.mockResolvedValue({ hasAccess: true });
    sourceFetch.mockResolvedValue(new Response(method === 'HEAD' ? null : 'audio', { status: 206,
      headers: { 'content-range': 'bytes 0-4/10', 'content-length': '5', 'accept-ranges': 'bytes' } }));
    const response = await run(null, ['uploads', 'lesson.mp3'], { range: 'bytes=0-4' });
    expect(response.status).toBe(206);
    expect(response.headers.get('content-range')).toBe('bytes 0-4/10');
    expect(sourceFetch).toHaveBeenCalledWith({ method, headers: { Range: 'bytes=0-4' } });
  });
});
