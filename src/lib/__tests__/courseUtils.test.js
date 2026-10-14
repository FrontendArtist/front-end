/** @jest-environment node */
import { formatStrapiCourses } from '../courseUtils';
import { getDiscountedCoursePrice } from '../coursePricing';

test.each([0, '0', '0.00'])('فصل با قیمت صفر %p در صفحه رایگان تشخیص داده می‌شود', price => {
  const course = formatStrapiCourses({ data: [{
    id: 42, documentId: 'course-doc', title: 'دوره', price: '100',
    chapters: [{ id: 7, title: 'فصل', price, lessons: [{ id: 7146, isFree: false, audioUrl: 'https://cdn.test/lesson.mp3' }] }],
  }] })[0];
  expect(course.chapters[0].price.toman).toBe(0);
  expect(course.chapters[0].lessons[0].audioUrl).toBe('/api/audio/7146?cid=course-doc');
});

test('قیمت فصل پولی با دقت اصلی حفظ می‌شود', () => {
  const course = formatStrapiCourses({ data: [{ title: 'دوره', price: '100', chapters: [{ id: 7, price: '12.50' }] }] })[0];
  expect(course.chapters[0].price.toman).toBe(12.5);
});

test('قیمت نامعتبر فصل به قیمت صفر تبدیل نمی‌شود', () => {
  const course = formatStrapiCourses({ data: [{ title: 'دوره', price: '100', chapters: [{ id: 7, price: 'invalid' }] }] })[0];
  expect(course.chapters[0].price.toman).not.toBe(0);
});

test.each([
  { price: '100', discountPercent: 100 },
  { price: '100', discountPercent: 100, discountUntil: '2099-01-01T00:00:00Z' },
  { price: '100', discountPercent: 100, discountUntil: '2000-01-01T00:00:00Z' },
  { price: '100', discountPercent: 100, discountUntil: 'invalid' },
  { price: '1', discountPercent: 99 },
])('صفحه همان قیمت مؤثر مسیر صوت را محاسبه می‌کند (%p)', record => {
  const course = formatStrapiCourses({ data: [{ title: 'دوره', ...record }] })[0];
  expect(course.price.toman).toBe(getDiscountedCoursePrice(record));
});
