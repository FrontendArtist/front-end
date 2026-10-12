/** @jest-environment node */
import { GET, HEAD } from './route';
import { getServerSession } from 'next-auth';
import { checkCourseAccess } from '@/lib/ordersApi';

jest.mock('next-auth', () => ({ getServerSession: jest.fn() }));
jest.mock('@/lib/auth', () => ({ authOptions: {} }));
jest.mock('@/lib/ordersApi', () => ({ checkCourseAccess: jest.fn() }));

const audioUrl = 'https://cdn.test/lesson.mp3';
let course;
let session;
let cdnFetch;

beforeEach(() => {
  jest.clearAllMocks();
  course = {
    id: 42, documentId: 'course-doc', slug: 'test-course', price: '100',
    chapters: [{ id: 7, price: '50', lessons: [{ id: 7146, isFree: false, audioUrl }] }],
  };
  session = { user: { id: 9, role: { type: 'authenticated' } } };
  getServerSession.mockImplementation(async () => session);
  checkCourseAccess.mockResolvedValue({ hasAccess: false, purchasedChapterIds: [] });
  cdnFetch = jest.fn(async options => new Response(options?.method === 'HEAD' ? null : 'audio', {
    headers: { 'content-type': 'audio/mpeg', 'accept-ranges': 'bytes' },
  }));
  global.fetch = jest.fn(async (url, options) => {
    if (url === audioUrl) return cdnFetch(options);
    return new Response(JSON.stringify({ data: course }));
  });
});

describe.each([['GET', GET], ['HEAD', HEAD]])('%s', (method, handler) => {
  const run = (headers = {}) => handler(
    new Request('https://site.test/api/audio/7146?cid=course-doc', { method, headers }),
    { params: Promise.resolve({ lessonId: '7146' }) },
  );

  test.each([0, '0', '0.00'])('دوره صفرمبلغ با قیمت %p برای مهمان پخش می‌شود', async price => {
    course.price = price;
    session = null;
    expect((await run()).status).toBe(200);
    expect(getServerSession).not.toHaveBeenCalled();
    expect(checkCourseAccess).not.toHaveBeenCalled();
    expect(cdnFetch).toHaveBeenCalledTimes(1);
  });

  test('جلسه بدون فصل در دوره رایگان هم پخش می‌شود', async () => {
    course.price = '0';
    course.curriculum = course.chapters[0].lessons;
    course.chapters = [];
    session = null;
    expect((await run()).status).toBe(200);
  });

  test.each([0, '0', '0.00'])('فصل صفرمبلغ با قیمت %p در دوره پولی پخش می‌شود', async price => {
    course.chapters[0].price = price;
    session = null;
    expect((await run()).status).toBe(200);
    expect(checkCourseAccess).not.toHaveBeenCalled();
  });

  test('جلسه رایگان در فصل پولی پخش می‌شود', async () => {
    course.chapters[0].lessons[0].isFree = true;
    session = null;
    expect((await run()).status).toBe(200);
  });

  test.each([null, undefined, '', ' ', 'invalid', false])('قیمت نامعتبر %p مجوز نمی‌سازد', async price => {
    course.price = price;
    course.chapters[0].price = price;
    expect((await run()).status).toBe(403);
    expect(cdnFetch).not.toHaveBeenCalled();
  });

  test('خرید کل دوره اجازه پخش فصل پولی را می‌دهد', async () => {
    checkCourseAccess.mockResolvedValue({ hasAccess: true, purchasedChapterIds: [] });
    expect((await run()).status).toBe(200);
    expect(checkCourseAccess).toHaveBeenCalledWith(9, 42, 'test-course', session.user);
  });

  test('خرید فصل همان جلسه اجازه پخش می‌دهد', async () => {
    checkCourseAccess.mockResolvedValue({ hasAccess: false, purchasedChapterIds: ['7'] });
    expect((await run()).status).toBe(200);
  });

  test('خرید فصل دیگر اجازه پخش نمی‌دهد', async () => {
    checkCourseAccess.mockResolvedValue({ hasAccess: false, purchasedChapterIds: ['8'] });
    expect((await run()).status).toBe(403);
    expect(cdnFetch).not.toHaveBeenCalled();
  });

  test('ثبت‌نام قبلی دوره حفظ می‌شود', async () => {
    session.user.enrolledCourses = ['course-doc'];
    expect((await run()).status).toBe(200);
  });

  test('ثبت‌نام قبلی فصل حفظ می‌شود', async () => {
    session.user.enrolledChapters = [7];
    expect((await run()).status).toBe(200);
  });

  test('ادمین همچنان اجازه پخش دارد', async () => {
    session.user.role.type = 'administrator';
    expect((await run()).status).toBe(200);
  });

  test('مهمان به صوت پولی دسترسی ندارد', async () => {
    session = null;
    expect((await run()).status).toBe(401);
    expect(cdnFetch).not.toHaveBeenCalled();
  });

  test('جلسه فاقد فایل خطای ۴۰۴ می‌دهد', async () => {
    course.chapters[0].lessons[0].audioUrl = null;
    expect((await run()).status).toBe(404);
    expect(cdnFetch).not.toHaveBeenCalled();
  });
});

test('درخواست محدوده صوت رایگان به منبع منتقل می‌شود', async () => {
  course.price = '0';
  session = null;
  cdnFetch.mockResolvedValue(new Response('audio', {
    status: 206,
    headers: { 'content-type': 'audio/mpeg', 'content-range': 'bytes 0-4/10', 'accept-ranges': 'bytes' },
  }));
  const response = await GET(new Request('https://site.test/api/audio/7146?cid=course-doc', {
    headers: { Range: 'bytes=0-4' },
  }), { params: Promise.resolve({ lessonId: '7146' }) });
  expect(response.status).toBe(206);
  expect(response.headers.get('content-range')).toBe('bytes 0-4/10');
  expect(cdnFetch).toHaveBeenCalledWith({ headers: { Range: 'bytes=0-4' } });
});
