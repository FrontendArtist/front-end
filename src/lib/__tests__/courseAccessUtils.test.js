/** @jest-environment node */
import { isChapterOrderItem, getPurchasedChapterId, getPurchasedChapterIds } from '../courseAccessUtils';
import { checkCourseAccess } from '../ordersApi';

const course = { id: 189, slug: 'az-khak-ta-aflak' };
const item = { id: 1824, courseId: 189, chapterId: 589, slug: 'az-khak-ta-aflak-chapter-589' };
const paid = items => ({ orderStatus: 'paid', paymentStatus: 'paid', items });

test.each([null, undefined, false, 'invalid', 42])('قلم نامعتبر %p مجوز نمی‌سازد', value => {
  expect(isChapterOrderItem(value)).toBe(false);
  expect(getPurchasedChapterId(value, course.id, course.slug)).toBeNull();
});

test.each([null, undefined, {}, 'invalid'])('فهرست نامعتبر %p متوقف نمی‌شود', orders => {
  expect(getPurchasedChapterIds(orders, course)).toEqual([]);
});

test.each([null, undefined, {}])('دوره نامعتبر %p مجوز نمی‌سازد', value => {
  expect(getPurchasedChapterIds([paid([item])], value)).toEqual([]);
});

test('اقلام خراب و سفارش خالی بدون خطا نادیده گرفته می‌شوند', () => {
  expect(getPurchasedChapterIds([null, paid(null), paid({}), paid([null, item])], course)).toEqual(['589']);
});

test('قالب واقعی کپی دیتابیس فقط شناسه فصل را برمی‌گرداند', () => {
  expect(getPurchasedChapterIds([paid([item])], course)).toEqual(['589']);
});

test('فصل دوره دیگر وارد دسترسی نمی‌شود', () => {
  expect(getPurchasedChapterIds([paid([{ ...item, courseId: 208, slug: 'seven-chakras-seven-bodies-chapter-605', chapterId: 605 }])], course)).toEqual([]);
});

test('اسلاگ معتبر، سفارش قدیمی با شناسه عددی قبلی دوره را حفظ می‌کند', () => {
  expect(getPurchasedChapterId({ ...item, courseId: 108 }, course.id, course.slug)).toBe('589');
});

test('قالب قدیمی صریح chapter- حفظ می‌شود', () => {
  expect(getPurchasedChapterId({ id: 'chapter-589', type: 'chapter', courseId: 189 }, course.id, course.slug)).toBe('589');
});

test('chapterId صریح بر id قالب قدیمی اولویت دارد', () => {
  expect(getPurchasedChapterId({ ...item, id: 'chapter-590' }, course.id, course.slug)).toBe('589');
});

test('id عددی بدون chapterId مجوز فصل نمی‌سازد', () => {
  expect(getPurchasedChapterId({ id: 589, type: 'chapter', courseId: 189 }, course.id, course.slug)).toBeNull();
});

test.each([0, -1, 'invalid', '589.5'])('شناسه فصل نامعتبر %p رد می‌شود', chapterId => {
  expect(getPurchasedChapterId({ ...item, chapterId }, course.id, course.slug)).toBeNull();
});

test('سفارش لغوشده، ناموفق و معلق دسترسی نمی‌دهد', () => {
  const orders = [
    { ...paid([item]), orderStatus: 'canceled' },
    { ...paid([item]), paymentStatus: 'failed' },
    { orderStatus: 'pending', paymentStatus: 'pending_payment', items: [item] },
  ];
  expect(getPurchasedChapterIds(orders, course)).toEqual([]);
});

test('شکل attributes سفارش قدیمی و حذف تکرار پشتیبانی می‌شوند', () => {
  expect(getPurchasedChapterIds([{ attributes: paid([item]) }, paid([item])], course)).toEqual(['589']);
});

test('محصول با اسلاگ مشابه دوره دسترسی فصل نمی‌دهد', () => {
  expect(getPurchasedChapterId({ ...item, type: 'product', __component: 'order.product-order-item' }, course.id, course.slug)).toBeNull();
});

test('بررسی واقعی سفارش سمت سرور با منطق مشترک صفحه هماهنگ است', async () => {
  const orders = [paid([item])];
  global.fetch = jest.fn().mockResolvedValue(new Response(JSON.stringify({ data: orders })));
  const access = await checkCourseAccess(9, course.id, course.slug);
  expect(access.hasAccess).toBe(false);
  expect(access.purchasedChapterIds).toEqual(getPurchasedChapterIds(orders, course));
  expect(access.purchasedChapterIds).not.toContain('1824');
});

test('خرید کل دوره همچنان دسترسی کامل می‌دهد', async () => {
  global.fetch = jest.fn().mockResolvedValue(new Response(JSON.stringify({ data: [paid([{ courseId: 189, slug: course.slug }])] })));
  expect((await checkCourseAccess(9, course.id, course.slug)).hasAccess).toBe(true);
});

test('تطابق دقیق بر اساس UUID فصل حتی در صورت بازتولید ID عددی توسط استراپی ۵', () => {
  const targetUuid = '550e8400-e29b-41d4-a716-446655440000';
  const regeneratedCourse = {
    id: 999,
    slug: 'khak-be-aflak',
    title: 'خاک به افلاک',
    chapters: [
      { id: 140, integrationId: targetUuid, title: 'فصل ۱' },
      { id: 141, integrationId: 'other-uuid', title: 'فصل ۲' },
    ],
  };

  const oldOrderItem = {
    __component: 'order.course-order-item',
    type: 'chapter',
    courseId: 100,
    chapterId: 78,
    chapterIntegrationId: targetUuid,
    slug: 'khak-be-aflak-chapter-78',
    title: 'خاک به افلاک - فصل ۱',
  };

  const result = getPurchasedChapterIds([paid([oldOrderItem])], regeneratedCourse);
  expect(result).toEqual(['140']);
});

test('UUID فصل متعلق به دوره دیگر مجوز دسترسی به دوره جاری نمی‌دهد', () => {
  const anotherCourse = {
    id: 500,
    slug: 'another-course',
    title: 'دوره دیگر',
    chapters: [{ id: 10, integrationId: 'uuid-1', title: 'فصل ۱' }],
  };

  const orderItemForDifferentCourse = {
    __component: 'order.course-order-item',
    type: 'chapter',
    courseId: 999,
    chapterIntegrationId: 'uuid-1',
    slug: 'different-course-chapter-1',
    title: 'دوره کاملاً متفاوت - فصل ۱',
  };

  const result = getPurchasedChapterIds([paid([orderItemForDifferentCourse])], anotherCourse);
  expect(result).toEqual([]);
});
