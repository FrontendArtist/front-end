import { formatStrapiCourses, getEffectiveCoursePrice } from '../courseUtils';
import { formatStrapiProducts, formatStrapiProduct } from '../productUtils';

describe('courseUtils & productUtils with Noor pricing', () => {
  test('formatStrapiCourses extracts priceNoor and rounds the discount down, preserving the base precision', () => {
    const apiResponse = {
      data: [
        {
          id: 1,
          documentId: 'doc-course-1',
          title: 'دوره نور',
          slug: 'noor-course',
          price: 100.5,
          discountPercent: 10,
        },
      ],
    };

    const formatted = formatStrapiCourses(apiResponse);
    expect(formatted).toHaveLength(1);
    expect(formatted[0].originalPrice).toBe(100.5);
    // مبلغ تخفیف ۱۰ نور است؛ دقت قیمت پایه در مبلغ نهایی ۹۰٫۵ حفظ می‌شود.
    expect(formatted[0].price.noor).toBe(90.5);
    expect(formatted[0].priceNoor).toBe(90.5);
  });

  test('getEffectiveCoursePrice returns Noor as primary unit', () => {
    const course = {
      price: { noor: 150.25, original: 200 },
    };
    const res = getEffectiveCoursePrice(course, null);
    expect(res.noor).toBe(150.25);
    expect(res.originalNoor).toBe(200);
  });

  test('formatStrapiProducts extracts priceNoor and preserves decimal Noor price', () => {
    const apiResponse = {
      data: [
        {
          id: 10,
          documentId: 'doc-prod-10',
          attributes: {
            title: 'محصول نوری',
            slug: 'noor-prod',
            price: 75.5,
          },
        },
      ],
    };

    const formatted = formatStrapiProducts(apiResponse);
    expect(formatted).toHaveLength(1);
    expect(formatted[0].price.noor).toBe(75.5);
    expect(formatted[0].priceNoor).toBe(75.5);
  });
});

test.each([undefined, '2099-01-01', '2000-01-01', 'invalid'])(
  'دوره، محصول و محصول خلاصه با تاریخ %s محاسبه یکسان دارند', discountUntil => {
    const record = { id: 1, title: 'آزمون', price: 109, discountPercent: 10, discountUntil };
    const expected = !discountUntil || discountUntil === '2099-01-01' ? 99 : 109;
    expect(formatStrapiCourses({ data: [record] })[0].priceNoor).toBe(expected);
    expect(formatStrapiProducts({ data: [record] })[0].priceNoor).toBe(expected);
    expect(formatStrapiProduct(record).priceNoor).toBe(expected);
  });
