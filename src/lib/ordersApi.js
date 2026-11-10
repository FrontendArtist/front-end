/**
 * Orders API - Server-side fetching & Course Access Verification
 * مرجع اصلی و متمرکز بررسی دسترسی کاربران به دوره‌ها و فصل‌ها بر پایه سفارش‌های Paid
 */
import { API_BASE_URL } from './api';
import { PAYMENT_METHOD, isOrderPaid } from './constants/orderConstants';
import { getPurchasedChapterId, getPurchasedChapterIds, doesItemBelongToCourse, isChapterOrderItem } from './courseAccessUtils';

/**
 * تابع واحد و استاندارد برای بررسی دسترسی کاربر به دوره و فصل‌ها
 * منبع اصلی دسترسی = سفارش پرداخت‌شده (Paid Order)
 * منبع تکمیلی / Fallback = ثبت‌نام مستقیم در سشن یا پروفایل کاربر (user.courses)
 *
 * @param {string|number} userId - شناسه عددی کاربر در استراپی
 * @param {string|number} courseId - شناسه دوره
 * @param {string} courseSlug - اسلاگ دوره
 * @param {object} sessionUser - آبجکت کاربر در سشن (جهت بررسی fallback)
 * @param {object} courseData - آبجکت کامل دوره همراه با فصل‌ها (جهت نگاشت هوشمند فصل‌ها)
 * @returns {Promise<{ hasAccess: boolean, purchasedChapterIds: string[] }>}
 */
export async function checkCourseAccess(userId, courseId, courseSlug, sessionUser = null, courseData = null) {
  if (!userId || !courseId) {
    return { hasAccess: false, purchasedChapterIds: [] };
  }

  let hasAccess = false;
  const purchasedChapterIds = [];
  let ordersList = [];
  let activeCourseOrder = null;

  const courseObj = courseData ? { ...courseData } : { id: courseId, slug: courseSlug };

  try {
    const STRAPI_TOKEN = process.env.STRAPI_API_TOKEN;
    const rawPhone = sessionUser?.phoneNumber || sessionUser?.phone;
    const phone = typeof rawPhone === 'string' && rawPhone.trim().length >= 10 ? rawPhone.trim() : null;
    let filterQuery = `filters[user][id][$eq]=${encodeURIComponent(userId)}`;
    if (phone) {
      filterQuery = `filters[$or][0][user][id][$eq]=${encodeURIComponent(userId)}&filters[$or][1][phone][$eq]=${encodeURIComponent(phone)}`;
    }
    const url = `${API_BASE_URL}/api/orders?${filterQuery}&pagination[pageSize]=100&sort[0]=createdAt:desc&populate=*`;

    const res = await fetch(url, {
      headers: { 'Authorization': `Bearer ${STRAPI_TOKEN}` },
      cache: 'no-store'
    });

    if (res.ok) {
      const ordersData = await res.json();
      ordersList = ordersData.data || [];

      // فقط در صورتی که در سفارش‌های پرداخت‌شده قلم فصلی متعلق به این دوره وجود داشته باشد و فصل‌ها از قبل پاس داده نشده باشند
      const hasAnyChapterItem = ordersList.some(o =>
        isOrderPaid(o) && (o.items || o.attributes?.items || []).some(item =>
          isChapterOrderItem(item) && doesItemBelongToCourse(item, courseObj)
        )
      );

      if (hasAnyChapterItem && (!courseObj.chapters || courseObj.chapters.length === 0) && courseSlug) {
        try {
          const courseRes = await fetch(
            `${API_BASE_URL}/api/courses?filters[slug][$eq]=${encodeURIComponent(courseSlug)}&populate[chapters][fields][0]=title&populate[chapters][fields][1]=id`,
            { headers: { 'Authorization': `Bearer ${STRAPI_TOKEN}` }, next: { revalidate: 60 } }
          );
          if (courseRes.ok) {
            const cJson = await courseRes.json();
            const fetchedCourse = cJson?.data?.[0];
            if (fetchedCourse) {
              if (fetchedCourse.chapters && fetchedCourse.chapters.length > 0) {
                courseObj.chapters = fetchedCourse.chapters;
              }
              if (fetchedCourse.title && !courseObj.title) {
                courseObj.title = fetchedCourse.title;
              }
            }
          }
        } catch {}
      }

      for (const order of ordersList) {
        const isPaid = isOrderPaid(order);
        const items = order.items || order.attributes?.items || [];

        // بررسی آیا این سفارش به این دوره یا فصلی از آن مربوط است
        const matchesThisCourse = items.some(item => doesItemBelongToCourse(item, courseObj));

        if (isPaid) {
          for (const item of items) {
            if (!doesItemBelongToCourse(item, courseObj)) continue;

            const isChapterItem = isChapterOrderItem(item);

            // بررسی خرید کامل دوره (فقط در صورتی که قلم مربوط به فصل نباشد)
            if (!isChapterItem) {
              hasAccess = true;
            }
          }

          // بررسی خرید فصل‌های مجزا با نگاشت هوشمند عناوین به فصل‌های جاری
          const foundChapterIds = getPurchasedChapterIds([order], courseObj);
          if (foundChapterIds.length > 0) {
            purchasedChapterIds.push(...foundChapterIds);
          }
        } else if (matchesThisCourse && !activeCourseOrder) {
          // ذخیره وضعیت آخرین سفارش در صورتی که در وضعیت انتظار یا بررسی باشد
          // سفارش‌های رد یا لغو شده نادیده گرفته می‌شوند تا صفحه دوره کاملاً آزاد بوده و امکان خرید مجدد وجود داشته باشد
          const oStatus = String(order.orderStatus || order.attributes?.orderStatus || '').trim().toLowerCase();
          const pStatus = String(order.paymentStatus || order.attributes?.paymentStatus || '').trim().toLowerCase();
          const isRejected = pStatus === 'failed' || pStatus === 'rejected' || oStatus === 'canceled' || oStatus === 'cancelled' || oStatus === 'rejected';

          // انتظار فیش فقط مربوط به کارت‌به‌کارت است؛ سفارش آنلاین رهاشده نباید خرید دوباره را مسدود کند.
          const paymentMethod = String(order.paymentMethod || order.attributes?.paymentMethod || '').trim().toLowerCase();
          if (!isRejected && paymentMethod === PAYMENT_METHOD.CARD_TO_CARD) {
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
 * بررسی ساده آیا کاربر به کل دوره دسترسی دارد یا خیر
 */
export async function hasCourseAccess(userId, courseId, courseSlug, sessionUser = null, courseData = null) {
  const { hasAccess } = await checkCourseAccess(userId, courseId, courseSlug, sessionUser, courseData);
  return hasAccess;
}
