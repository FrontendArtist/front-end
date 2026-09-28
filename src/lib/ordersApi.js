/**
 * Orders API - Server-side fetching & Course Access Verification
 * مرجع اصلی و متمرکز بررسی دسترسی کاربران به دوره‌ها و فصل‌ها بر پایه سفارش‌های Paid
 */
import { API_BASE_URL } from './api';
import { ORDER_STATUS, PAYMENT_STATUS, isOrderPaid } from './constants/orderConstants';

/**
 * تابع واحد و استاندارد برای بررسی دسترسی کاربر به دوره و فصل‌ها
 * منبع اصلی دسترسی = سفارش پرداخت‌شده (Paid Order)
 * منبع تکمیلی / Fallback = ثبت‌نام مستقیم در سشن یا پروفایل کاربر (user.courses)
 *
 * @param {string|number} userId - شناسه عددی کاربر در استراپی
 * @param {string|number} courseId - شناسه دوره
 * @param {string} courseSlug - اسلاگ دوره
 * @param {object} sessionUser - آبجکت کاربر در سشن (جهت بررسی fallback)
 * @returns {Promise<{ hasAccess: boolean, purchasedChapterIds: string[] }>}
 */
export async function checkCourseAccess(userId, courseId, courseSlug, sessionUser = null) {
  if (!userId || !courseId) {
    return { hasAccess: false, purchasedChapterIds: [], activeCourseOrder: null };
  }

  let hasAccess = false;
  const purchasedChapterIds = [];
  let ordersList = [];
  let activeCourseOrder = null;

  const targetCourseId = String(courseId ?? '');
  const targetCourseSlug = String(courseSlug ?? '').toLowerCase();

  // Helper برای بررسی انطباق دوره با id عددی، documentId یا slug
  const matchesCourse = (c) => {
    if (!c) return false;
    const cId = String(c.id ?? '');
    const cDocId = String(c.documentId ?? '');
    const cSlug = String(c.slug ?? '').toLowerCase();
    return (
      (targetCourseId && (cId === targetCourseId || cDocId === targetCourseId)) ||
      (targetCourseSlug && cSlug === targetCourseSlug)
    );
  };

  // 1. بررسی از سشن کاربر (در صورت وجود sessionUser)
  if (sessionUser) {
    if (Array.isArray(sessionUser.courses) && sessionUser.courses.some(matchesCourse)) {
      hasAccess = true;
    }
    if (Array.isArray(sessionUser.enrolledCourses) && sessionUser.enrolledCourses.some(id => String(id) === targetCourseId)) {
      hasAccess = true;
    }
    if (Array.isArray(sessionUser.enrolledSlugs) && targetCourseSlug && sessionUser.enrolledSlugs.some(s => String(s).toLowerCase() === targetCourseSlug)) {
      hasAccess = true;
    }
    if (Array.isArray(sessionUser.enrolledChapters)) {
      sessionUser.enrolledChapters.forEach(chId => purchasedChapterIds.push(String(chId)));
    }
  }

  // 2. واکشی همزمان سفارش‌ها و رابطه دوره‌های کاربر از استراپی
  try {
    const STRAPI_TOKEN = process.env.STRAPI_API_TOKEN;
    const isNumericUserId = /^\d+$/.test(String(userId));

    const ordersUrl = isNumericUserId
      ? `${API_BASE_URL}/api/orders?filters[user][id][$eq]=${encodeURIComponent(userId)}&pagination[pageSize]=100&sort[0]=createdAt:desc&populate=*`
      : `${API_BASE_URL}/api/orders?filters[user][documentId][$eq]=${encodeURIComponent(userId)}&pagination[pageSize]=100&sort[0]=createdAt:desc&populate=*`;

    const userUrl = isNumericUserId
      ? `${API_BASE_URL}/api/users/${encodeURIComponent(userId)}?populate=courses`
      : `${API_BASE_URL}/api/users?filters[documentId][$eq]=${encodeURIComponent(userId)}&populate=courses`;

    const [ordersRes, userRes] = await Promise.all([
      fetch(ordersUrl, {
        headers: { 'Authorization': `Bearer ${STRAPI_TOKEN}` },
        cache: 'no-store'
      }),
      fetch(userUrl, {
        headers: { 'Authorization': `Bearer ${STRAPI_TOKEN}` },
        cache: 'no-store'
      })
    ]);

    // بررسی دوره‌های کاربر در استراپی (user.courses)
    if (userRes.ok && userRes.status !== 204) {
      try {
        const rawUser = await userRes.text();
        const userData = rawUser ? JSON.parse(rawUser) : null;
        const userObj = Array.isArray(userData) ? userData[0] : userData;
        if (userObj) {
          if (Array.isArray(userObj.courses) && userObj.courses.some(matchesCourse)) {
            hasAccess = true;
          }
          if (Array.isArray(userObj.enrolledChapters)) {
            userObj.enrolledChapters.forEach(chId => purchasedChapterIds.push(String(chId)));
          }
        }
      } catch (err) {
        console.error('[course-access] error parsing user courses:', err.message);
      }
    }

    // بررسی سفارش‌های استراپی
    if (ordersRes.ok && ordersRes.status !== 204) {
      try {
        const rawOrders = await ordersRes.text();
        const ordersData = rawOrders ? JSON.parse(rawOrders) : null;
        ordersList = ordersData?.data || [];

        for (const order of ordersList) {
          const isPaid = isOrderPaid(order);
          const items = order.items || order.attributes?.items || [];

          for (const item of items) {
            const itemCourseId = item.courseId != null ? String(item.courseId) : '';
            const itemDocId = item.courseDocumentId != null ? String(item.courseDocumentId) : '';
            const itemSlug = item.slug ? String(item.slug) : '';
            const fallbackCourseId = (!itemCourseId && item.id != null) ? String(item.id) : '';

            const isChapterItem = Boolean(
              item.type === 'chapter' ||
              item.chapterId ||
              itemSlug.includes('-chapter-') ||
              (item.id && String(item.id).startsWith('chapter-'))
            );

            const matchesThisItem = (
              (targetCourseId && (itemCourseId === targetCourseId || itemDocId === targetCourseId || fallbackCourseId === targetCourseId)) ||
              (targetCourseSlug && itemSlug.toLowerCase() === targetCourseSlug) ||
              (isChapterItem && targetCourseSlug && itemSlug.startsWith(`${targetCourseSlug}-chapter-`)) ||
              (isChapterItem && targetCourseId && itemCourseId === targetCourseId)
            );

            if (!matchesThisItem) continue;

            if (isPaid) {
              // بررسی خرید کامل دوره (فقط در صورتی که قلم مربوط به فصل نباشد)
              if (!isChapterItem) {
                hasAccess = true;
              } else {
                // بررسی خرید فصل‌های مجزا
                if (item.chapterId) purchasedChapterIds.push(String(item.chapterId));
                if (item.id) {
                  const cleanId = String(item.id).replace('chapter-', '');
                  purchasedChapterIds.push(cleanId);
                }
              }
            } else if (!activeCourseOrder) {
              // ذخیره وضعیت آخرین سفارش در صورتی که در وضعیت انتظار یا بررسی باشد
              // سفارش‌های رد یا لغو شده نادیده گرفته می‌شوند تا صفحه دوره کاملاً آزاد بوده و امکان خرید مجدد وجود داشته باشد
              const oStatus = String(order.orderStatus || order.attributes?.orderStatus || '').trim().toLowerCase();
              const pStatus = String(order.paymentStatus || order.attributes?.paymentStatus || '').trim().toLowerCase();
              const isRejected = pStatus === 'failed' || pStatus === 'rejected' || oStatus === 'canceled' || oStatus === 'cancelled' || oStatus === 'rejected';

              if (!isRejected) {
                activeCourseOrder = {
                  orderId: order.id,
                  documentId: order.documentId || String(order.id),
                  orderStatus: oStatus,
                  paymentStatus: pStatus,
                  rejectionReason: order.rejectionReason || order.attributes?.rejectionReason || null,
                  isPendingVerification: pStatus === 'pending_verification',
                  isPendingPayment: pStatus === 'pending_payment',
                  isRejected: false,
                };
              }
            }
          }
        }
      } catch (err) {
        console.error('[course-access] error parsing orders:', err.message);
      }
    } else {
      console.error('[course-access] orders request failed:', ordersRes.status);
    }
  } catch (error) {
    console.error('[course-access] error fetching orders or user courses:', error.message);
  }

  const uniqueChapterIds = [...new Set(purchasedChapterIds)];

  // ── لاگ دیباگ در حالت توسعه ────────────────────────────────────────────────
  if (process.env.NODE_ENV === 'development') {
    console.log("===== ACCESS DEBUG =====");
    console.log("USER ID:", userId);
    console.log("COURSE ID:", courseId);
    console.log("COURSE SLUG:", courseSlug);
    console.log("ORDERS FOUND:", ordersList.length);
    console.log("HAS ACCESS:", hasAccess);
    console.log("PURCHASED CHAPTERS:", uniqueChapterIds);
    console.log("========================");
  }

  return {
    hasAccess,
    purchasedChapterIds: uniqueChapterIds,
    activeCourseOrder: hasAccess ? null : activeCourseOrder,
  };
}

/**
 * تابع قدیمی جهت حفظ سازگاری ۱۰۰٪ با کدهای قبلی
 */
export async function getUserCoursePurchases(userId, courseId, courseSlug, sessionUser) {
  const { hasAccess, purchasedChapterIds } = await checkCourseAccess(userId, courseId, courseSlug, sessionUser);
  return {
    hasPurchasedServer: hasAccess,
    purchasedChapterIdsServer: purchasedChapterIds,
  };
}
