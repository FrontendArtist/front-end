import { isOrderPaid } from './constants/orderConstants';

export function normalizeText(text) {
  if (!text) return '';
  return String(text)
    .replace(/[۰-۹]/g, (d) => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d))
    .replace(/[٠-٩]/g, (d) => '٠١٢٣٤٥٦٧٨٩'.indexOf(d))
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

export function extractChapterTitleFromItem(itemTitle, courseTitle) {
  if (!itemTitle) return '';
  let str = String(itemTitle).trim();
  if (courseTitle) {
    const normCourse = normalizeText(courseTitle);
    const normItem = normalizeText(str);
    if (normItem.startsWith(normCourse)) {
      str = str.slice(courseTitle.length).replace(/^[\s\-–—]+/, '').trim();
      return str;
    }
  }
  const parts = str.split(/\s*[-–—]\s*/);
  if (parts.length > 1) {
    return parts[parts.length - 1].trim();
  }
  return str;
}

export function doesItemBelongToCourse(item, course) {
  if (!item || !course) return false;
  // اقلام محصول فیزیکی یا غیر دوره هرگز متعلق به دوره نیستند
  if (item.type === 'product' || item.__component === 'order.product-order-item') return false;

  const courseId = String(course.id ?? '');
  const courseDocId = String(course.documentId ?? '');
  const courseSlug = String(course.slug ?? '').trim().toLowerCase();
  
  const itemCourseId = String(item.courseId ?? '');
  const itemSlug = String(item.slug ?? '').trim().toLowerCase();
  const itemId = String(item.id ?? '');
  const itemUrl = String(item.itemUrl || item.item_url || '').trim().toLowerCase();

  // ۱. تطابق شناسه یا سند دوره
  if (courseId && itemCourseId === courseId) return true;
  if (courseDocId && itemCourseId === courseDocId) return true;
  if (courseId && itemId === courseId) return true;

  // ۲. تطابق اسلاگ دوره
  if (courseSlug) {
    if (itemSlug === courseSlug) return true;
    if (itemSlug.startsWith(`${courseSlug}-chapter-`)) return true;
    if (itemSlug.startsWith(`${courseSlug}-`)) return true;
    if (itemUrl.includes(`/courses/${courseSlug}`)) return true;
  }

  // ۳. تطابق عنوان دوره
  if (course.title && item.title) {
    const normItemTitle = normalizeText(item.title);
    const normCourseTitle = normalizeText(course.title);
    if (normCourseTitle && normItemTitle.startsWith(normCourseTitle)) return true;
  }

  return false;
}

export function isChapterOrderItem(item) {
  if (!item || typeof item !== 'object') return false;
  if (item.type === 'product' || item.__component === 'order.product-order-item') return false;
  if (item.type === 'course' && !item.chapterId) return false;
  return Boolean(
    item.type === 'chapter' ||
    item.chapterId != null ||
    String(item.slug || '').includes('-chapter-') ||
    String(item.id || '').startsWith('chapter-') ||
    (item.title && /فصل\s*[\d۰-۹]+/i.test(item.title))
  );
}

export function getPurchasedChapterId(item, courseId, courseSlug) {
  if (!item || typeof item !== 'object') return null;
  if (item.type === 'product' || item.__component === 'order.product-order-item' || !isChapterOrderItem(item)) return null;

  const courseObj = typeof courseId === 'object' && courseId !== null
    ? courseId
    : { id: courseId, slug: courseSlug };

  const belongsToCourse = doesItemBelongToCourse(item, courseObj);
  if (!belongsToCourse) return null;

  // id عددیِ component، شمارهٔ ردیف سفارش است؛ فقط chapterId یا قالب قدیمیِ صریح معتبر است.
  const chapterId = item.chapterId != null
    ? String(item.chapterId)
    : /^chapter-([1-9]\d*)$/.exec(String(item.id || ''))?.[1];
  return chapterId && /^[1-9]\d*$/.test(chapterId) ? chapterId : null;
}

export function getPurchasedChapterIds(orders, course) {
  if (!Array.isArray(orders) || !course || (course.id == null && !course.slug)) return [];
  const chapters = Array.isArray(course.chapters) ? course.chapters : [];
  const purchasedIds = new Set();

  for (const order of orders) {
    if (!order || !isOrderPaid(order)) continue;
    const items = order.items || order.attributes?.items;
    if (!Array.isArray(items)) continue;

    for (const item of items) {
      if (!isChapterOrderItem(item)) continue;
      if (!doesItemBelongToCourse(item, course)) continue;

      // ۰. شناسه ثابت فصل (UUID / chapterIntegrationId) - بالاترین اولویت و پایدار در برابر بازسازی کامپوننت استراپی
      const itemIntegrationId = item.chapterIntegrationId || item.integrationId || item.chapterExternalId;
      if (itemIntegrationId && chapters.length > 0) {
        const normItemUuid = String(itemIntegrationId).trim().toLowerCase();
        const matchedChapter = chapters.find(
          (ch) => ch.integrationId && String(ch.integrationId).trim().toLowerCase() === normItemUuid
        );
        if (matchedChapter) {
          purchasedIds.add(String(matchedChapter.id));
          continue;
        }
      }

      // ۱. شناسه خام مستقیم از روی سفارش
      const rawId = getPurchasedChapterId(item, course.id, course.slug);
      if (rawId) {
        purchasedIds.add(rawId);
      }

      // ۲. نگاشت داینامیک به فصل‌های فعلی دوره (حتی اگر Strapi شناسه‌های کامپوننت را بازتولید کرده باشد)
      if (chapters.length > 0) {
        const extractedTitle = normalizeText(extractChapterTitleFromItem(item.title, course.title));
        const itemChapterNumMatch = /(?:فصل|chapter)\s*([0-9]+)/i.exec(extractedTitle || normalizeText(item.title));
        const itemChapterNum = itemChapterNumMatch ? itemChapterNumMatch[1] : null;

        for (const ch of chapters) {
          const chIdStr = String(ch.id);

          // الف: تطابق با شناسه مستقیم فصل
          if (rawId && chIdStr === rawId) {
            purchasedIds.add(chIdStr);
            continue;
          }

          // ب: تطابق عنوان فصل (مثلاً "فصل 5" با "فصل 5")
          const chTitleNorm = normalizeText(ch.title);
          if (extractedTitle && chTitleNorm && extractedTitle === chTitleNorm) {
            if (process.env.NODE_ENV !== 'production') {
              console.warn(`[access-legacy-match] تطابق فصل با عنوان: ${ch.title} (سفارش ${order.id || ''})`);
            }
            purchasedIds.add(chIdStr);
            continue;
          }

          // ج: تطابق شماره فصل (مثلاً "فصل ۵" با "فصل 5")
          if (itemChapterNum) {
            const chNumMatch = /(?:فصل|chapter)\s*([0-9]+)/i.exec(chTitleNorm);
            if (chNumMatch && chNumMatch[1] === itemChapterNum) {
              if (process.env.NODE_ENV !== 'production') {
                console.warn(`[access-legacy-match] تطابق فصل با شماره: فصل ${itemChapterNum} (سفارش ${order.id || ''})`);
              }
              purchasedIds.add(chIdStr);
              continue;
            }
          }
        }
      }
    }
  }

  return [...purchasedIds];
}
