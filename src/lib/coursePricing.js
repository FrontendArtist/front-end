// قیمت مؤثر محلی برای نمایش و دسترسی؛ کوپن فقط از سفارش معتبر دسترسی ایجاد می‌کند.
export function getDiscountedCoursePrice(course, now = Date.now()) {
  if (!course || typeof course !== 'object') return NaN;
  if (!['number', 'string'].includes(typeof course.price) || String(course.price).trim() === '') return NaN;
  const price = Number(course.price);
  if (!Number.isFinite(price) || price < 0) return NaN;
  const percent = Number(course.discountPercent ?? 0);
  const expiry = course.discountUntil ? new Date(course.discountUntil).getTime() : null;
  if (!Number.isInteger(percent) || percent <= 0 || percent > 100 ||
      (expiry !== null && (!Number.isFinite(expiry) || expiry <= now))) return price;
  return Math.round(price * (1 - percent / 100));
}
