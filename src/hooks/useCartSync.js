// src/hooks/useCartSync.js
"use client";

import { useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { useCartStore } from "@/store/useCartStore";
import { fetchProfileCartData, updateProfileCartData } from "@/lib/client/profileClientApi";

const useCartSync = () => {
  const { data: session, status } = useSession();

  const cartState = useCartStore((state) => state);
  const items = cartState.items;

  const timeoutRef = useRef(null);
  const isFirstMount = useRef(true);

  // ... (بقیه کد بدون تغییر باقی می‌ماند)

  // 1. منطق HYDRATION
  useEffect(() => {
    const syncFromServer = async () => {
      if (status === "authenticated" && items.length === 0) {
        try {
          const userData = await fetchProfileCartData();
          const serverCart = userData.cartData;

          if (serverCart && serverCart.state && serverCart.state.items?.length > 0) {
            useCartStore.setState(serverCart.state);
          }
        } catch (error) {
          console.error("Failed to hydrate cart:", error);
        }
      }
    };

    syncFromServer();
  }, [status]);

  // 2. منطق DEBOUNCE SAVE
  useEffect(() => {
    if (isFirstMount.current) {
      isFirstMount.current = false;
      return;
    }

    if (status !== "authenticated") return;

    if (timeoutRef.current) clearTimeout(timeoutRef.current);

    timeoutRef.current = setTimeout(async () => {
      try {
        const cartDataPayload = {
          state: {
            items: cartState.items,
            totalPrice: cartState.totalPrice,
            itemsCount: cartState.itemsCount,
          },
          version: cartState.version || 0,
          updatedAt: new Date().toISOString(),
        };

        await updateProfileCartData(cartDataPayload);

        console.log("💾 Cart synced to server successfully");
      } catch (error) {
        console.error("Silent Sync Failed:", error);
      }
    }, 2000);

    return () => clearTimeout(timeoutRef.current);
  }, [items, status]);
};

export default useCartSync;