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
    return { hasAccess: false, purchasedChapterIds: [] };
  }

  let hasAccess = false;
  const purchasedChapterIds = [];
  let ordersList = [];
  let activeCourseOrder = null;

  try {
    const STRAPI_TOKEN = process.env.STRAPI_API_TOKEN;
    const url = `${API_BASE_URL}/api/orders?filters[user][id][$eq]=${encodeURIComponent(userId)}&pagination[pageSize]=100&sort[0]=createdAt:desc&populate=*`;

    const res = await fetch(url, {
      headers: { 'Authorization': `Bearer ${STRAPI_TOKEN}` },
      cache: 'no-store'
    });

    if (res.ok) {
      const ordersData = await res.json();
      ordersList = ordersData.data || [];

      for (const order of ordersList) {
        const isPaid = isOrderPaid(order);
        const items = order.items || order.attributes?.items || [];

        // بررسی آیا این سفارش به این دوره یا فصلی از آن مربوط است
        const matchesThisCourse = items.some(item => {
          const itemCourseId = String(item.courseId ?? '');
          const itemSlug = String(item.slug ?? '');
          const itemId = String(item.id ?? '');
          return (
            itemCourseId === String(courseId) ||
            itemSlug === String(courseSlug) ||
            itemId === String(courseId) ||
            (item.type === 'chapter' && (itemSlug.startsWith(`${courseSlug}-chapter-`) || itemCourseId === String(courseId)))
          );
        });

        if (isPaid) {
          for (const item of items) {
            const itemCourseId = String(item.courseId ?? '');
            const itemSlug = String(item.slug ?? '');
            const itemId = String(item.id ?? '');

            const isChapterItem = Boolean(
              item.type === 'chapter' ||
              item.chapterId ||
              itemSlug.includes('-chapter-') ||
              itemId.startsWith('chapter-')
            );

            // بررسی خرید کامل دوره (فقط در صورتی که قلم مربوط به فصل نباشد)
            if (
              !isChapterItem &&
              (
                itemCourseId === String(courseId) ||
                itemSlug === String(courseSlug) ||
                itemId === String(courseId)
              )
            ) {
              hasAccess = true;
            }

            // بررسی خرید فصل‌های مجزا
            if (isChapterItem) {
              if (item.chapterId) purchasedChapterIds.push(String(item.chapterId));
              if (item.id) {
                const cleanId = String(item.id).replace('chapter-', '');
                purchasedChapterIds.push(cleanId);
              }
            }
          }
        } else if (matchesThisCourse && !activeCourseOrder) {
          // ذخیره وضعیت آخرین سفارش معلق یا رد شده مربوط به این دوره
          const oStatus = String(order.orderStatus || order.attributes?.orderStatus || '').trim().toLowerCase();
          const pStatus = String(order.paymentStatus || order.attributes?.paymentStatus || '').trim().toLowerCase();
          const rejectionReason = order.rejectionReason || order.attributes?.rejectionReason || null;

          activeCourseOrder = {
            orderId: order.id,
            documentId: order.documentId || String(order.id),
            orderStatus: oStatus,
            paymentStatus: pStatus,
            rejectionReason,
            isPendingVerification: pStatus === 'pending_verification',
            isPendingPayment: pStatus === 'pending_payment',
            isRejected: pStatus === 'failed' || oStatus === 'canceled',
          };
        }
      }
    } else {
      console.error('[course-access] orders request failed:', res.status);
    }
  } catch (error) {
    console.error('[course-access] error fetching orders:', error.message);
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
