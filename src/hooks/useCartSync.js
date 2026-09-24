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
  const isFirstMount = useRef(true);

  // ۰. بروزرسانی قیمت‌های سبد بر اساس وضعیت کاربر (ایرانی یا خارجی)
  useEffect(() => {
    const isForeign = Boolean(
      session?.user?.is_foreigner || 
      (session?.user?.phoneNumber && !isIranianPhoneNumber(session.user.phoneNumber))
    );
    useCartStore.getState().updateUserPricing(isForeign);
  }, [session]);

  // ۱. منطق HYDRATION امن با حذف خودکار دوره‌ها و فصل‌های از قبل خریداری‌شده
  useEffect(() => {
    const syncFromServer = async () => {
      if (status === "authenticated" && items.length === 0) {
        try {
          const userData = await fetchProfileCartData();
          const serverCart = userData.cartData;

          if (serverCart && serverCart.state && Array.isArray(serverCart.state.items) && serverCart.state.items.length > 0) {
            const enrolledCourses = (session?.user?.enrolledCourses || []).map(Number);
            const enrolledSlugs = session?.user?.enrolledSlugs || [];
            const enrolledChapters = (session?.user?.enrolledChapters || []).map(Number);

            const filteredItems = serverCart.state.items.filter((item) => {
              if (item.type === 'course') {
                const isOwned = enrolledCourses.includes(Number(item.id)) ||
                                enrolledCourses.includes(Number(item.courseId)) ||
                                (item.slug && enrolledSlugs.includes(item.slug));
                return !isOwned;
              }
              if (item.type === 'chapter') {
                const rawChapId = Number(item.chapterId || (typeof item.id === 'string' ? item.id.replace('chapter-', '') : item.id));
                const isOwned = enrolledChapters.includes(rawChapId) || (item.courseId && enrolledCourses.includes(Number(item.courseId)));
                return !isOwned;
              }
              return true;
            });

            if (filteredItems.length > 0) {
              useCartStore.setState({
                ...serverCart.state,
                items: filteredItems,
              });
            } else {
              useCartStore.getState().clearCart();
              await updateProfileCartData(null).catch(() => {});
            }
          }
        } catch (error) {
          console.error("Failed to hydrate cart:", error);
        }
      }
    };

    syncFromServer();
  }, [status, session]);

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
        if (oi.type === 'course' || oi.__component === 'order.course-order-item') {
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

    const changed = useCartStore.getState().removePaidCoursesAndChapters({
      courseIds: enrolledCourses,
      courseSlugs: enrolledSlugs,
      chapterIds: enrolledChapters,
    });

    if (changed) {
      const remainingItems = useCartStore.getState().items;
      if (remainingItems.length === 0) {
        updateProfileCartData(null).catch(() => {});
      } else {
        const cartDataPayload = {
          state: {
            items: remainingItems,
            totalPrice: useCartStore.getState().totalPrice,
            itemsCount: remainingItems.length,
          },
          version: useCartStore.getState().version || 0,
          updatedAt: new Date().toISOString(),
        };
        updateProfileCartData(cartDataPayload).catch(() => {});
      }
    }
  }, [session, orders, status]);

  // ۳. منطق DEBOUNCE SAVE
  useEffect(() => {
    if (isFirstMount.current) {
      isFirstMount.current = false;
      return;
    }

    if (status !== "authenticated") return;

    if (timeoutRef.current) clearTimeout(timeoutRef.current);

    timeoutRef.current = setTimeout(async () => {
      try {
        const currentCart = useCartStore.getState();
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
  }, [items, status]);
};

export default useCartSync;