// src/hooks/useCartSync.js
"use client";

import { useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
// 👇 تغییر این خط: اضافه کردن آکولاد { }
import { useCartStore } from "@/store/useCartStore";
import apiClient from "@/lib/apiClient";

const useCartSync = () => {
  const { data: session, status } = useSession();

  // 👇 اگر با ارور store function مواجه شدید، نحوه فراخوانی را هم چک کنید
  // اما فعلا فقط خط ایمپورت مشکل دارد.
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
          const response = await fetch("/api/profile");

          if (response.ok) {
            const userData = await response.json();
            const serverCart = userData.cartData;

            if (serverCart && serverCart.state && serverCart.state.items?.length > 0) {
              useCartStore.setState(serverCart.state);
            }
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

        await fetch("/api/profile", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ cartData: cartDataPayload }),
        });

        console.log("💾 Cart synced to server successfully");
      } catch (error) {
        console.error("Silent Sync Failed:", error);
      }
    }, 2000);

    return () => clearTimeout(timeoutRef.current);
  }, [items, status]);
};

export default useCartSync;