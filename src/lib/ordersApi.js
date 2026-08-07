/**
 * Orders API - Server-side fetching
 * این لایه برای واکشی اطلاعات خرید کاربر از طریق سرور (Server Components) کاربرد دارد
 */
import { API_BASE_URL } from './api';

/**
 * بررسی اینکه آیا کاربر مالک یک دوره یا فصل‌های خاصی از آن است
 */
export async function getUserCoursePurchases(userId, courseId, courseSlug) {
  let hasPurchasedServer = false;
  let purchasedChapterIdsServer = [];
  
  if (!userId) {
    return { hasPurchasedServer, purchasedChapterIdsServer };
  }

  try {
    const STRAPI_TOKEN = process.env.STRAPI_API_TOKEN;
    const url = `${API_BASE_URL}/api/orders?filters[user][id][$eq]=${userId}&populate=*`;
    
    const ordersRes = await fetch(url, {
      headers: { 'Authorization': `Bearer ${STRAPI_TOKEN}` },
      cache: 'no-store'
    });

    if (ordersRes.ok) {
      const ordersData = await ordersRes.json();
      const ordersList = ordersData.data || [];

      ordersList.forEach(order => {
        const items = order.attributes?.items || order.items || [];
        items.forEach(item => {
          // بررسی خرید کل دوره
          if (
            item.slug === courseSlug ||
            String(item.courseId) === String(courseId) ||
            String(item.id) === String(courseId)
          ) {
            hasPurchasedServer = true;
          }
          
          // بررسی خرید فصل‌های مجزا
          if (item.type === 'chapter' || item.chapterId) {
            if (item.chapterId) purchasedChapterIdsServer.push(String(item.chapterId));
            if (item.id) {
              const cleanId = String(item.id).replace('chapter-', '');
              purchasedChapterIdsServer.push(cleanId);
            }
          }
        });
      });
    }
  } catch (e) {
    if (process.env.NODE_ENV === 'development') {
        console.error("Error fetching purchases on server via orders:", e.message);
    }
  }

  return { hasPurchasedServer, purchasedChapterIdsServer };
}
