import { formatStrapiCourses, getEffectiveCoursePrice } from '../courseUtils';
import { formatStrapiProducts } from '../productUtils';

describe('courseUtils & productUtils with Noor pricing', () => {
  test('formatStrapiCourses extracts priceNoor and calculates decimal discount without integer truncation', () => {
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
    // 100.5 * 0.9 = 90.45 (not rounded to integer 90)
    expect(formatted[0].price.noor).toBe(90.45);
    expect(formatted[0].priceNoor).toBe(90.45);
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
