import { isOrderPaid } from './constants/orderConstants';

export function isChapterOrderItem(item) {
  if (!item || typeof item !== 'object') return false;
  return Boolean(item.type === 'chapter' || item.chapterId ||
    String(item.slug || '').includes('-chapter-') || String(item.id || '').startsWith('chapter-'));
}

export function getPurchasedChapterId(item, courseId, courseSlug) {
  if (!item || typeof item !== 'object') return null;
  if (item.type === 'product' || item.__component === 'order.product-order-item' || !isChapterOrderItem(item)) return null;
  const belongsToCourse = String(item.courseId ?? '') === String(courseId) ||
    (courseSlug && String(item.slug || '').startsWith(`${courseSlug}-chapter-`));
  if (!belongsToCourse) return null;

  // id عددیِ component، شمارهٔ ردیف سفارش است؛ فقط chapterId یا قالب قدیمیِ صریح معتبر است.
  const chapterId = item.chapterId != null
    ? String(item.chapterId)
    : /^chapter-([1-9]\d*)$/.exec(String(item.id || ''))?.[1];
  return chapterId && /^[1-9]\d*$/.test(chapterId) ? chapterId : null;
}

export function getPurchasedChapterIds(orders, course) {
  if (!Array.isArray(orders) || !course || course.id == null) return [];
  return [...new Set(orders.filter(isOrderPaid).flatMap(order => {
    const items = order.items || order.attributes?.items;
    return Array.isArray(items) ? items.map(item =>
      getPurchasedChapterId(item, course.id, course.slug)).filter(Boolean) : [];
  }))];
}

/**
 * بررسی اینکه آیا کاربر مالک دوره است یا خیر (از طریق فلگ مستقیم، سشن کاربر، پروفایل یا سفارش‌های پرداخت‌شده)
 *
 * @param {Object} course - شیء دوره
 * @param {Object} [options]
 * @param {Object} [options.session] - سشن کاربر (NextAuth)
 * @param {Array} [options.orders] - لیست سفارشات کاربر
 * @param {Array} [options.profileCourses] - لیست دوره‌های موجود در پروفایل کاربر
 * @param {boolean} [options.checkChapters] - آیا خرید حداقل یکی از فصل‌ها نیز به عنوان مالکیت دوره تلقی شود (مخصوص کارت دوره)
 * @returns {boolean}
 */
export function isCoursePurchasedByUser(course, { session = null, orders = [], profileCourses = null, checkChapters = false } = {}) {
  if (!course) return false;
  if (typeof course.isPurchased === 'boolean') return course.isPurchased;
  if (typeof course.hasAccess === 'boolean') return course.hasAccess;

  const targetDocId = course.documentId ? String(course.documentId).trim() : null;
  const targetId = (course.id != null && course.id !== '') ? String(course.id).trim() : null;
  const targetSlug = course.slug ? String(course.slug).trim().toLowerCase() : null;

  if (!targetDocId && !targetId && !targetSlug) return false;

  const matchesCourseEntity = (c) => {
    if (!c) return false;
    if (typeof c === 'string' || typeof c === 'number') {
      const str = String(c).trim();
      if (targetDocId && str === targetDocId) return true;
      if (targetId && str === targetId) return true;
      if (targetSlug && str.toLowerCase() === targetSlug) return true;
      return false;
    }
    const cDocId = c.documentId ? String(c.documentId).trim() : (c.externalCourseId ? String(c.externalCourseId).trim() : null);
    const cId = c.id != null ? String(c.id).trim() : null;
    const cCourseId = c.courseId != null ? String(c.courseId).trim() : null;
    const cSlug = c.slug ? String(c.slug).trim().toLowerCase() : null;

    if (targetDocId && (cDocId === targetDocId || cId === targetDocId || cCourseId === targetDocId)) return true;
    if (targetId && (cId === targetId || cCourseId === targetId || cDocId === targetId)) return true;
    if (targetSlug && cSlug === targetSlug) return true;
    return false;
  };

  // 1. بررسی سشن کاربر
  const user = session?.user;
  if (user) {
    if (Array.isArray(user.courses) && user.courses.some(matchesCourseEntity)) {
      return true;
    }
    if (Array.isArray(user.enrolledCourses)) {
      if (user.enrolledCourses.some(matchesCourseEntity)) return true;
    }
    if (Array.isArray(user.enrolledSlugs) && targetSlug) {
      if (user.enrolledSlugs.some(s => String(s).trim().toLowerCase() === targetSlug)) return true;
    }
  }

  // 2. بررسی دوره‌های پروفایل
  if (Array.isArray(profileCourses) && profileCourses.some(matchesCourseEntity)) {
    return true;
  }

  // 3. بررسی سفارش‌های پرداخت‌شده
  if (Array.isArray(orders)) {
    const paidOrders = orders.filter(isOrderPaid);
    for (const order of paidOrders) {
      const items = order.items || order.attributes?.items || [];
      if (!Array.isArray(items)) continue;
      for (const item of items) {
        if (!item) continue;
        if (item.type === 'product' || item.__component === 'order.product-order-item') continue;

        const isChapter = isChapterOrderItem(item);
        if (isChapter) {
          if (checkChapters) {
            const itemCourseId = item.courseId != null ? String(item.courseId).trim() : null;
            const itemSlug = item.slug ? String(item.slug).trim().toLowerCase() : null;
            const parentMatches =
              (targetDocId && itemCourseId === targetDocId) ||
              (targetId && itemCourseId === targetId) ||
              (targetSlug && itemSlug && itemSlug.startsWith(`${targetSlug}-chapter-`));
            if (parentMatches) return true;

            if (Array.isArray(course.chapters) && course.chapters.length > 0) {
              const rawChapterId = item.chapterId || (item.id && String(item.id).replace('chapter-', ''));
              if (rawChapterId && course.chapters.some(ch => String(ch.id) === String(rawChapterId))) {
                return true;
              }
            }
          }
          continue;
        }

        const itemDocId = item.documentId || item.courseDocumentId || item.externalCourseId;
        const itemCourseId = item.courseId != null ? String(item.courseId).trim() : (item.id != null ? String(item.id).trim() : null);
        const itemSlug = item.slug ? String(item.slug).trim().toLowerCase() : null;

        if (targetDocId && itemDocId && String(itemDocId).trim() === targetDocId) return true;
        if (targetDocId && itemCourseId && itemCourseId === targetDocId) return true;
        if (targetId && itemCourseId && itemCourseId === targetId) return true;
        if (targetId && itemDocId && String(itemDocId).trim() === targetId) return true;
        if (targetSlug && itemSlug && itemSlug === targetSlug) return true;
      }
    }
  }

  return false;
}

/**
 * بررسی اینکه آیا یک آیتم موجود در سبد خرید (دوره یا فصل) از قبل توسط کاربر خریداری شده است یا خیر
 *
 * @param {Object} item - قلم سبد خرید
 * @param {Object} [options]
 * @returns {boolean}
 */
export function isCartItemPurchasedByUser(item, { session = null, orders = [], profileCourses = null } = {}) {
  if (!item || typeof item !== 'object') return false;

  // کالای فیزیکی مانع خرید مجدد ندارد
  if (item.type === 'product' || item.__component === 'order.product-order-item') {
    return false;
  }

  // اگر قلم مربوط به یک دوره کامل است
  if (item.type === 'course' || (!item.type && !isChapterOrderItem(item))) {
    return isCoursePurchasedByUser(item, { session, orders, profileCourses, checkChapters: false });
  }

  // اگر قلم مربوط به یک فصل است
  if (item.type === 'chapter' || item.type === 'course_chapter' || isChapterOrderItem(item)) {
    // ۱. اگر کاربر مالک کل دوره والد باشد، فصل را هم داراست
    const parentCourseObj = {
      id: item.courseId || item.parentCourseId,
      documentId: item.parentExternalId || item.parentCourseDocumentId || item.courseDocumentId || item.externalParentId,
      slug: item.courseSlug || (item.slug ? item.slug.split('-chapter-')[0] : null),
    };
    if (isCoursePurchasedByUser(parentCourseObj, { session, orders, profileCourses, checkChapters: false })) {
      return true;
    }

    // ۲. بررسی خرید همین فصل خاص در سشن کاربر
    const rawChapterId = item.chapterId != null ? String(item.chapterId) : (item.id != null ? String(item.id).replace('chapter-', '') : null);
    const integrationId = item.integrationId || item.externalCourseId;

    const user = session?.user;
    if (user && Array.isArray(user.enrolledChapters)) {
      if (rawChapterId && user.enrolledChapters.some(id => String(id) === rawChapterId)) return true;
      if (integrationId && user.enrolledChapters.some(id => String(id) === String(integrationId))) return true;
    }

    // ۳. بررسی خرید فصل در سفارشات پرداخت‌شده
    if (Array.isArray(orders)) {
      const parentCourseForLookup = {
        id: item.courseId,
        slug: item.courseSlug || (item.slug ? item.slug.split('-chapter-')[0] : null)
      };
      if (parentCourseForLookup.id != null) {
        const purchasedChapterIds = getPurchasedChapterIds(orders, parentCourseForLookup);
        if (rawChapterId && purchasedChapterIds.includes(rawChapterId)) {
          return true;
        }
      }
    }
  }

  return false;
}


export default {
  isChapterOrderItem,
  getPurchasedChapterId,
  getPurchasedChapterIds,
  isCoursePurchasedByUser,
  isCartItemPurchasedByUser
};
