import { useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { useCartStore } from "@/store/useCartStore";
import { fetchProfileCartData, updateProfileCartData } from "@/lib/client/profileClientApi";
import { isIranianPhoneNumber } from "@/lib/phoneUtils";
import { useOrdersStore } from "@/store/useOrdersStore";
import { isOrderPaid } from "@/lib/constants/orderConstants";

const useCartSync = () => {
  const { data: session, status } = useSession();
  const orders = useOrdersStore((state) => state.orders);

  const cartState = useCartStore((state) => state);
  const items = cartState.items;

  const timeoutRef = useRef(null);
  const hydratedUserId = useCartStore((state) => state.hydratedUserId);
  const userId = session?.user?.id;

  // ۰. بروزرسانی قیمت‌های سبد بر اساس وضعیت کاربر (ایرانی یا خارجی)
  useEffect(() => {
    const isForeign = Boolean(
      session?.user?.is_foreigner || 
      (session?.user?.phoneNumber && !isIranianPhoneNumber(session.user.phoneNumber))
    );
    useCartStore.getState().updateUserPricing(isForeign);
  }, [session]);

  // دریافت اولیه باید پیش از هر ذخیره انجام شود؛ پاسخ قدیمی حق بازنویسی تغییر کاربر را ندارد.
  useEffect(() => {
    let active = true;
    useCartStore.setState({ hydratedUserId: null });
    const syncFromServer = async () => {
      if (status !== 'authenticated' || !userId) return;
      const initialItems = useCartStore.getState().items;
      try {
        const profile = await fetchProfileCartData(true);
        if (!active) return;
        const current = useCartStore.getState();
        if (initialItems.length === 0 && current.items === initialItems && Array.isArray(profile.cartData?.state?.items)) {
          useCartStore.setState({ items: profile.cartData.state.items, appliedCoupon: null });
        }
        useCartStore.setState({ hydratedUserId: userId });
      } catch (error) {
        console.error('دریافت سبد خرید انجام نشد؛ ذخیره تا بازیابی متوقف می‌ماند.', error);
      }
    };
    syncFromServer();
    const retry = () => {
      if (useCartStore.getState().hydratedUserId !== userId) syncFromServer();
    };
    window.addEventListener('online', retry);
    window.addEventListener('focus', retry);
    return () => { active = false; window.removeEventListener('online', retry); window.removeEventListener('focus', retry); };
  }, [status, userId]);

  // ۲. پاکسازی دائمی و آنی دوره‌ها و فصل‌های خریداری‌شده پس از پرداخت آنلاین یا تغییر وضعیت کاربر
  useEffect(() => {
    if (status !== 'authenticated') return;

    const enrolledCourses = (session?.user?.enrolledCourses || []).map(Number);
    const enrolledSlugs = [...(session?.user?.enrolledSlugs || [])];
    const enrolledChapters = (session?.user?.enrolledChapters || []).map(Number);

    // افزودن اقلام سفارشات پرداخت‌شده جهت تضمین حذف آنی دوره‌ها حتی پیش از رفرش توکن NextAuth
    (orders || []).forEach((order) => {
      if (!isOrderPaid(order)) return;
      const orderItems = order.items || order.attributes?.items || [];
      orderItems.forEach((oi) => {
        if (!oi.chapterId && oi.type !== 'chapter' && (oi.type === 'course' || oi.__component === 'order.course-order-item')) {
          const cId = Number(oi.courseId || oi.id);
          if (cId) enrolledCourses.push(cId);
          if (oi.slug) enrolledSlugs.push(oi.slug);
        }
        if (oi.type === 'chapter' || (oi.__component === 'order.course-order-item' && oi.chapterId)) {
          const chapId = Number(oi.chapterId || (typeof oi.id === 'string' ? oi.id.replace('chapter-', '') : oi.id));
          if (chapId) enrolledChapters.push(chapId);
        }
      });
    });

    useCartStore.getState().removePaidCoursesAndChapters({
      courseIds: enrolledCourses,
      courseSlugs: enrolledSlugs,
      chapterIds: enrolledChapters,
    });

  }, [session, orders, status, hydratedUserId]);

  // ۳. منطق DEBOUNCE SAVE
  useEffect(() => {
    if (status !== 'authenticated' || !userId || hydratedUserId !== userId) return;

    if (timeoutRef.current) clearTimeout(timeoutRef.current);

    timeoutRef.current = setTimeout(async () => {
      try {
        const currentCart = useCartStore.getState();
        if (currentCart.hydratedUserId !== userId) return;
        const currentItems = currentCart.items || [];

        if (currentItems.length === 0) {
          await updateProfileCartData(null);
        } else {
          const cartDataPayload = {
            state: {
              items: currentItems,
              totalPrice: currentCart.totalPrice,
              itemsCount: currentItems.length,
            },
            version: currentCart.version || 0,
            updatedAt: new Date().toISOString(),
          };

          await updateProfileCartData(cartDataPayload);
        }

        console.log("💾 Cart synced to server successfully");
      } catch (error) {
        console.error("Silent Sync Failed:", error);
      }
    }, 2000);

    return () => clearTimeout(timeoutRef.current);
  }, [items, status, userId, hydratedUserId]);
};

export default useCartSync;