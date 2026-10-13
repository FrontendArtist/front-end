/** @jest-environment node */
import { getPurchasedChapterId, getPurchasedChapterIds } from '../courseAccessUtils';
import { checkCourseAccess } from '../ordersApi';

const course = { id: 189, slug: 'az-khak-ta-aflak' };
const item = { id: 1824, courseId: 189, chapterId: 589, slug: 'az-khak-ta-aflak-chapter-589' };
const paid = items => ({ orderStatus: 'paid', paymentStatus: 'paid', items });

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
