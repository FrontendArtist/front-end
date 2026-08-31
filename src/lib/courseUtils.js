import { formatSingleImage } from './strapiUtils';

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
        ? item.chapters.map(ch => ({
            id: ch.id,
            title: ch.title || '',
            price: { toman: ch.price || 0 },
            duration: ch.duration || null,
            lessons: Array.isArray(ch.lessons)
              ? ch.lessons.map(formatLesson).filter(Boolean)
              : [],
          }))
        : [];

      const curriculum = Array.isArray(item.curriculum)
        ? item.curriculum.map(formatLesson).filter(Boolean)
        : [];

      let discountPercent = Number(item.discountPercent || 0);
      const discountUntil = item.discountUntil || null;

      if (discountUntil && new Date(discountUntil).getTime() <= Date.now()) {
        discountPercent = 0;
      }

      const originalPrice = item.price || 0;
      const discountPrice = discountPercent > 0 ? Math.round(originalPrice * (1 - discountPercent / 100)) : null;
      const finalPrice = discountPrice !== null ? discountPrice : originalPrice;

      return {
        id: item.id,
        documentId: item.documentId,
        slug: item.slug,
        title: item.title,
        price: { toman: finalPrice, original: originalPrice },
        originalPrice: originalPrice,
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
