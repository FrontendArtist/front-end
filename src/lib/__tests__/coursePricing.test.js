/** @jest-environment node */
import { getDiscountedCoursePrice } from '../coursePricing';

test.each([null, undefined, false, 'invalid', 42, {}])('دوره نامعتبر %p قیمت صفر نمی‌سازد', course => {
  expect(getDiscountedCoursePrice(course)).toBeNaN();
});

test.each([null, undefined, '', ' ', 'invalid', false, -1, Infinity])('قیمت نامعتبر %p رایگان نیست', price => {
  expect(getDiscountedCoursePrice({ price, discountPercent: 100 })).toBeNaN();
});

test.each([0, '0', '0.00'])('قیمت صفر معتبر %p حفظ می‌شود', price => {
  expect(getDiscountedCoursePrice({ price })).toBe(0);
});

test('تخفیف منقضی یا نامعتبر مجوز رایگان نمی‌سازد', () => {
  expect(getDiscountedCoursePrice({ price: 100, discountPercent: 100, discountUntil: 'invalid' })).toBe(100);
  expect(getDiscountedCoursePrice({ price: 100, discountPercent: 100, discountUntil: '2000-01-01' })).toBe(100);
});

test.each([[101, 10, 91], [109, 10, 99], [1, 99, 1], [101, 100, 0], [0, 100, 0]])(
  'قیمت پایه %s و تخفیف %s درصد، مبلغ نهایی %s می‌سازد', (price, discountPercent, expected) => {
    expect(getDiscountedCoursePrice({ price, discountPercent })).toBe(expected);
  });

test('لحظه پایان تخفیف نیز منقضی است', () => {
  expect(getDiscountedCoursePrice({ price: 101, discountPercent: 10, discountUntil: '2026-10-15T10:00:00Z' },
    Date.parse('2026-10-15T10:00:00Z'))).toBe(101);
});
