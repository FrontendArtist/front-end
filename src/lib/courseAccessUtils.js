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
