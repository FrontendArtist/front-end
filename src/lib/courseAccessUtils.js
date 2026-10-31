import { isOrderPaid } from './constants/orderConstants';

export function isChapterOrderItem(item) {
  if (!item || typeof item !== 'object') return false;
  const rawType = String(item.itemType || item.type || '').toLowerCase().replace(/_/g, '');
  return Boolean(
    rawType === 'chapter' ||
    rawType === 'coursechapter' ||
    item.chapterId ||
    item.parentExternalId ||
    String(item.slug || '').includes('-chapter-') ||
    String(item.id || '').startsWith('chapter-')
  );
}

function normalizeIdentity(value) {
  if (value == null) return '';
  return String(value).trim();
}

/**
 * آیا قلم سفارش از نوع فصل است و به دورهٔ داده‌شده تعلق دارد؟
 * هویت والد می‌تواند شناسهٔ عددی، اسلاگ یا documentId دوره باشد؛ اقلام بای‌مانی فقط
 * parentExternalId (documentId دوره) را دارند و شناسهٔ عددی/اسلاگ در آن‌ها خالی است.
 */
function chapterItemBelongsToCourse(item, courseId, courseSlug, courseDocumentId) {
  if (!item || typeof item !== 'object') return false;
  if (item.type === 'product' || item.__component === 'order.product-order-item' || !isChapterOrderItem(item)) return false;

  const targetId = normalizeIdentity(courseId);
  const targetSlug = normalizeIdentity(courseSlug).toLowerCase();
  const targetDocId = normalizeIdentity(courseDocumentId);
  const itemCourseId = normalizeIdentity(item.courseId ?? item.parentCourseId);
  const itemSlug = normalizeIdentity(item.slug).toLowerCase();
  const itemParentDocId = normalizeIdentity(
    item.parentExternalId || item.courseDocumentId || item.parentCourseDocumentId
  );

  if (targetId && itemCourseId && itemCourseId === targetId) return true;
  if (targetSlug && itemSlug.startsWith(`${targetSlug}-chapter-`)) return true;
  if (targetDocId && itemParentDocId && itemParentDocId === targetDocId) return true;
  return false;
}

export function getPurchasedChapterId(item, courseId, courseSlug, courseDocumentId = null) {
  if (!chapterItemBelongsToCourse(item, courseId, courseSlug, courseDocumentId)) return null;

  // id عددیِ component، شمارهٔ ردیف سفارش است؛ فقط chapterId یا قالب قدیمیِ صریح معتبر است.
  const chapterId = item.chapterId != null
    ? String(item.chapterId)
    : /^chapter-([1-9]\d*)$/.exec(String(item.id || ''))?.[1];
  return chapterId && /^[1-9]\d*$/.test(chapterId) ? chapterId : null;
}

/**
 * شناسهٔ یکتای فصل (integrationId) که بای‌مانی و Strapi برای خرید فصل استفاده می‌کنند.
 * شناسهٔ عددیِ ردیف component هرگز به‌عنوان integrationId پذیرفته نمی‌شود.
 */
export function getPurchasedChapterIntegrationId(item, courseId, courseSlug, courseDocumentId = null) {
  if (!chapterItemBelongsToCourse(item, courseId, courseSlug, courseDocumentId)) return null;
  const integrationId = normalizeIdentity(item.integrationId || item.externalCourseId || item.chapterExternalId);
  if (!integrationId) return null;
  if (/^chapter-[1-9]\d*$/.test(integrationId)) return null;
  return integrationId;
}

export function getPurchasedChapterIds(orders, course) {
  if (!Array.isArray(orders) || !course) return [];
  if (course.id == null && !course.documentId && !course.slug) return [];

  const ids = [];
  orders.filter(isOrderPaid).forEach(order => {
    const items = order.items || order.attributes?.items;
    if (!Array.isArray(items)) return;
    items.forEach(item => {
      const numericId = getPurchasedChapterId(item, course.id, course.slug, course.documentId);
      if (numericId) ids.push(numericId);
      const integrationId = getPurchasedChapterIntegrationId(item, course.id, course.slug, course.documentId);
      if (integrationId) ids.push(integrationId);
    });
  });

  return [...new Set(ids)];
}

/**
 * شناسه‌های قابل‌مقایسهٔ یک فصل: شناسهٔ عددی دیتابیس و شناسهٔ یکتای یکپارچه‌سازی.
 */
export function getChapterIdentityIds(chapter) {
  if (!chapter || typeof chapter !== 'object') return [];
  return [...new Set(
    [chapter.id, chapter.integrationId, chapter.externalCourseId]
      .map(normalizeIdentity)
      .filter(Boolean)
  )];
}

/**
 * آیا کاربر به این فصل دسترسی دارد؟
 * منابع: فلگ محاسبه‌شده در سرور، سشن (شناسهٔ عددی و integrationId)، یا سفارش‌های پرداخت‌شده.
 *
 * @param {Object} chapter - فصل دوره
 * @param {Object} [options]
 * @param {Object} [options.session] - سشن NextAuth
 * @param {Array} [options.orders] - سفارش‌های کاربر
 * @param {Object} [options.course] - دورهٔ والد (برای استخراج اقلام سفارش)
 * @param {Array} [options.purchasedChapterIds] - شناسه‌های محاسبه‌شده در سرور (عدد یا UUID)
 * @returns {boolean}
 */
export function isChapterPurchasedByUser(chapter, { session = null, orders = [], course = null, purchasedChapterIds = null } = {}) {
  if (!chapter || typeof chapter !== 'object') return false;
  if (chapter.isPurchased === true || chapter.hasAccess === true) return true;

  const identityIds = getChapterIdentityIds(chapter);
  if (identityIds.length === 0) return false;

  const user = session?.user;
  const enrolledIds = [
    ...(Array.isArray(user?.enrolledChapters) ? user.enrolledChapters : []),
    ...(Array.isArray(user?.enrolledChapterIntegrationIds) ? user.enrolledChapterIntegrationIds : []),
  ].map(normalizeIdentity).filter(Boolean);
  if (identityIds.some(id => enrolledIds.includes(id))) return true;

  const purchasedIds = Array.isArray(purchasedChapterIds)
    ? purchasedChapterIds.map(normalizeIdentity)
    : (course ? getPurchasedChapterIds(orders, course) : []);
  return identityIds.some(id => purchasedIds.includes(id));
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
    if (checkChapters) {
      // فلگ سرور (پس از خرید فصل) بر دادهٔ قدیمی سشن مقدم است.
      if (Array.isArray(course.chapters) && course.chapters.some(ch => ch?.isPurchased === true || ch?.hasAccess === true)) {
        return true;
      }
      const chapterIds = Array.isArray(course.chapters)
        ? course.chapters.flatMap(ch => [ch?.id, ch?.integrationId].filter(Boolean).map(String))
        : [];
      if (chapterIds.length > 0) {
        const enrolledNumeric = Array.isArray(user.enrolledChapters) ? user.enrolledChapters.map(String) : [];
        const enrolledIntegration = Array.isArray(user.enrolledChapterIntegrationIds)
          ? user.enrolledChapterIntegrationIds.map(String)
          : [];
        if (chapterIds.some(id => enrolledNumeric.includes(id) || enrolledIntegration.includes(id))) {
          return true;
        }
      }
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
            const itemParentDoc = item.parentExternalId || item.courseDocumentId || item.documentId;
            const parentMatches =
              (targetDocId && (itemCourseId === targetDocId || String(itemParentDoc || '') === targetDocId)) ||
              (targetId && itemCourseId === targetId) ||
              (targetSlug && itemSlug && itemSlug.startsWith(`${targetSlug}-chapter-`));
            if (parentMatches) return true;

            if (Array.isArray(course.chapters) && course.chapters.length > 0) {
              const rawChapterId = item.chapterId || (item.id && String(item.id).replace('chapter-', ''));
              const itemIntegration = item.integrationId || item.externalCourseId;
              if (course.chapters.some(ch =>
                (rawChapterId && String(ch.id) === String(rawChapterId)) ||
                (itemIntegration && ch.integrationId && String(ch.integrationId) === String(itemIntegration))
              )) {
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
  getPurchasedChapterIntegrationId,
  getChapterIdentityIds,
  isChapterPurchasedByUser,
  isCoursePurchasedByUser,
  isCartItemPurchasedByUser
};
