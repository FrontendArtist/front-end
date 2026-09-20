/**
 * Pending Purchase Context Manager
 * 
 * نگهداری و مدیریت چرخه عمر کانتکست خرید معلق (به دلیل کسری موجودی) در sessionStorage.
 * کانتکست شامل مشخصات دوره، قیمت، و کسری است و فقط تا زمانی نگهداری می‌شود
 * که به درخواست TopUp پیوست شده و فرایند شارژ و خرید تعیین تکلیف گردد.
 * به همراه انقضای خودکار (TTL) برای جلوگیری از نشت اطلاعات به خریدهای بعدی.
 */

const STORAGE_KEY_PREFIX = 'byemoney_pending_purchase_';
const BASKET_STORAGE_KEY = 'byemoney_pending_basket';
const DEFAULT_TTL_MS = 2 * 60 * 60 * 1000; // 2 ساعت

/**
 * ذخیره کانتکست خرید سبد معلق (به دلیل کسری موجودی) در sessionStorage
 * 
 * @param {object} details - جزئیات سبد دوره‌ها و ارقام مالی
 * @param {number} [ttlMs] - مدت زمان اعتبار به میلی‌ثانیه
 */
export function setPendingBasketPurchase(details, ttlMs = DEFAULT_TTL_MS) {
  if (typeof window === 'undefined' || !details) return;

  try {
    const payload = {
      externalCourseIds: Array.isArray(details.externalCourseIds) ? details.externalCourseIds : [],
      pendingItems: Array.isArray(details.pendingItems) ? details.pendingItems : [],
      items: Array.isArray(details.items) ? details.items : [],
      priceInNoor: Number(details.priceInNoor || 0),
      shortfallInNoor: Number(details.shortfallInNoor || 0),
      shortfallInRial: Number(details.shortfallInRial || 0),
      currentBalanceInNoor: Number(details.currentBalanceInNoor || 0),
      orderId: details.orderId || null,
      topUpRequested: Boolean(details.topUpRequested),
      topUpRequestId: details.topUpRequestId || null,
      clientReferenceId: details.clientReferenceId || null,
      createdAt: Date.now(),
      expiresAt: Date.now() + ttlMs,
    };

    window.sessionStorage.setItem(BASKET_STORAGE_KEY, JSON.stringify(payload));
  } catch (err) {
    console.warn('[PendingPurchaseManager] Failed to write basket to sessionStorage:', err);
  }
}

/**
 * دریافت کانتکست سبد خرید معلق
 * در صورتی که زمان انقضا سپری شده باشد، پاک شده و null بازمی‌گرداند.
 * 
 * @returns {object|null}
 */
export function getPendingBasketPurchase() {
  if (typeof window === 'undefined') return null;

  try {
    const raw = window.sessionStorage.getItem(BASKET_STORAGE_KEY);
    if (!raw) return null;

    const data = JSON.parse(raw);
    const now = Date.now();

    if (data.expiresAt && now > data.expiresAt) {
      clearPendingBasketPurchase();
      return null;
    }

    return data;
  } catch (err) {
    console.warn('[PendingPurchaseManager] Failed to read basket from sessionStorage:', err);
    return null;
  }
}

/**
 * پاکسازی کانتکست سبد خرید معلق پس از اتمام یا انصراف
 */
export function clearPendingBasketPurchase() {
  if (typeof window === 'undefined') return;

  try {
    window.sessionStorage.removeItem(BASKET_STORAGE_KEY);
  } catch (err) {
    console.warn('[PendingPurchaseManager] Failed to remove basket from sessionStorage:', err);
  }
}

/**
 * ذخیره کانتکست خرید معلق برای یک دوره
 * 
 * @param {string} courseId - شناسه دوره (externalCourseId / documentId)
 * @param {object} details - جزئیات دوره و ارقام مالی
 * @param {number} [ttlMs] - مدت زمان اعتبار به میلی‌ثانیه
 */
export function setPendingPurchase(courseId, details, ttlMs = DEFAULT_TTL_MS) {
  if (typeof window === 'undefined' || !courseId) return;

  try {
    const payload = {
      courseId,
      courseSlug: details.courseSlug || '',
      courseTitle: details.courseTitle || '',
      priceInNoor: Number(details.priceInNoor || 0),
      shortfallInNoor: Number(details.shortfallInNoor || 0),
      shortfallInRial: Number(details.shortfallInRial || 0),
      currentBalanceInNoor: Number(details.currentBalanceInNoor || 0),
      topUpRequested: Boolean(details.topUpRequested),
      topUpRequestId: details.topUpRequestId || null,
      orderId: details.orderId || null,
      createdAt: Date.now(),
      expiresAt: Date.now() + ttlMs,
    };

    window.sessionStorage.setItem(`${STORAGE_KEY_PREFIX}${courseId}`, JSON.stringify(payload));
  } catch (err) {
    console.warn('[PendingPurchaseManager] Failed to write to sessionStorage:', err);
  }
}

/**
 * دریافت کانتکست خرید معلق برای دوره
 * در صورتی که زمان انقضا سپری شده باشد، به صورت خودکار پاک شده و null برمی‌گرداند.
 * 
 * @param {string} courseId
 * @returns {object|null}
 */
export function getPendingPurchase(courseId) {
  if (typeof window === 'undefined' || !courseId) return null;

  try {
    const raw = window.sessionStorage.getItem(`${STORAGE_KEY_PREFIX}${courseId}`);
    if (!raw) return null;

    const data = JSON.parse(raw);
    const now = Date.now();

    // بررسی زمان انقضا (TTL)
    if (data.expiresAt && now > data.expiresAt) {
      clearPendingPurchase(courseId);
      return null;
    }

    return data;
  } catch (err) {
    console.warn('[PendingPurchaseManager] Failed to read from sessionStorage:', err);
    return null;
  }
}

/**
 * پاکسازی کانتکست خرید معلق پس از اتمام یا انصراف
 * 
 * @param {string} courseId
 */
export function clearPendingPurchase(courseId) {
  if (typeof window === 'undefined' || !courseId) return;

  try {
    window.sessionStorage.removeItem(`${STORAGE_KEY_PREFIX}${courseId}`);
  } catch (err) {
    console.warn('[PendingPurchaseManager] Failed to remove from sessionStorage:', err);
  }
}
