import { formatSingleImage } from './strapiUtils';
import { isIranianPhoneNumber } from './phoneUtils';

/**
 * بررسی و دریافت قیمت موثر دوره بر اساس کاربر (عادی یا خارجی)
 */
export function getEffectiveCoursePrice(course, user) {
  if (!course) return { noor: 0, originalNoor: 0, toman: 0, original: 0, isInternational: false };

  const isForeign = Boolean(
    user?.is_foreigner || 
    (user?.phoneNumber && !isIranianPhoneNumber(user.phoneNumber))
  );

  const intlPrice = course.internationalPrice ? Number(course.internationalPrice) : null;

  if (isForeign && intlPrice && intlPrice > 0) {
    return {
      noor: intlPrice,
      originalNoor: intlPrice,
      toman: intlPrice,
      original: intlPrice,
      isInternational: true,
    };
  }

  const rawNoor = typeof course.price === 'object' ? (course.price?.noor ?? course.price?.toman) : (course.priceNoor ?? course.price);
  const noor = Number(rawNoor) || 0;
  const original = Number(course.originalPrice || (typeof course.price === 'object' ? (course.price?.original ?? course.price?.originalNoor) : noor)) || noor;

  return {
    noor,
    originalNoor: original,
    toman: noor,
    original,
    isInternational: false,
  };
}

/**
 * Formats your specific Strapi API response for COURSES.
 */
export function formatStrapiCourses(apiResponse) {
  if (!apiResponse || !apiResponse.data) return [];

  const rawList = Array.isArray(apiResponse.data)
    ? apiResponse.data
    : [apiResponse.data];

  return rawList
    .filter(item => item && item.title)
    .map(item => {
      const formatLesson = (session) => {
        if (!session) return null;
        let audioUrl = session.audioUrl || null;
        if (audioUrl) {
          try {
            const url = new URL(audioUrl);
            if (url.pathname.startsWith('/uploads/')) {
              audioUrl = `/api/media${url.pathname}`;
            }
          } catch {
            // relative url
          }
        }
        return {
          id: session.id,
          title: session.title || '',
          videoUrl: session.videoUrl || null,
          audioUrl,
          isFree: Boolean(session.isFree),
          duration: session.duration || '00:00',
        };
      };

      const chapters = Array.isArray(item.chapters)
        ? item.chapters.map(ch => {
            const chPrice = Number(ch.priceNoor ?? ch.price) || 0;
            return {
              id: ch.id,
              title: ch.title || '',
              price: { noor: chPrice, toman: chPrice, original: chPrice },
              priceNoor: chPrice,
              duration: ch.duration || null,
              lessons: Array.isArray(ch.lessons)
                ? ch.lessons.map(formatLesson).filter(Boolean)
                : [],
            };
          })
        : [];

      const curriculum = Array.isArray(item.curriculum)
        ? item.curriculum.map(formatLesson).filter(Boolean)
        : [];

      let discountPercent = Number(item.discountPercent || 0);
      const discountUntil = item.discountUntil || null;

      if (discountUntil && new Date(discountUntil).getTime() <= Date.now()) {
        discountPercent = 0;
      }

      const rawPrice = item.priceNoor ?? item.price;
      const originalPrice = Number(rawPrice) || 0;
      const internationalPrice = item.internationalPrice ? Number(item.internationalPrice) : null;
      const discountPrice = discountPercent > 0 ? Number((originalPrice * (1 - discountPercent / 100)).toFixed(4)) : null;
      const finalPrice = discountPrice !== null ? discountPrice : originalPrice;

      return {
        id: item.id,
        documentId: item.documentId,
        slug: item.slug,
        title: item.title,
        price: { noor: finalPrice, toman: finalPrice, original: originalPrice },
        priceNoor: finalPrice,
        originalPrice: originalPrice,
        originalPriceNoor: originalPrice,
        internationalPrice,
        discountPercent: discountPercent,
        discountPrice: discountPrice,
        discountUntil: discountUntil,
        shortDescription:
          (item.description && item.description[0]?.children[0]?.text) || item.shortDescription || '',
        image: formatSingleImage(item.media ? item.media[0] : item.image || null),
        teaserUrl: item.teaserUrl || null,
        content: item.content || null,
        isChaptered: Boolean(item.isChaptered),
        chapters,
        curriculum,
        telegramLink: item.telegramLink || item.telegram_link || item.telegramGroupLink || item.telegram || null,
      };
    });
}
