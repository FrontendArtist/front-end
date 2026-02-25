// src/components/layout/CartSyncProvider.jsx
"use client";

import useCartSync from "@/hooks/useCartSync";

/**
 * این کامپوننت هیچ UI ندارد و فقط مسئول اجرای منطق همگام‌سازی سبد خرید است.
 * باید در Layout اصلی قرار داده شود.
 */
const CartSyncProvider = () => {
  useCartSync(); // فعال‌سازی هوک
  return null;   // چیزی رندر نمی‌کند
};

export default CartSyncProvider;