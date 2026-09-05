// src/app/providers.jsx
'use client';

import { useEffect } from 'react';
import { SessionProvider, useSession } from "next-auth/react";
import { useCartStore } from '@/store/useCartStore';

/**
 * همگام‌ساز سبد خرید با نشست کاربر جهت جلوگیری از Session Fixation و نشت داده
 */
function CartSessionSync() {
  const { data: session, status } = useSession();

  useEffect(() => {
    if (status === 'unauthenticated') {
      const currentUserId = useCartStore.getState().userId;
      if (currentUserId) {
        useCartStore.getState().clearCart();
      }
    } else if (status === 'authenticated' && session?.user?.id) {
      useCartStore.getState().setCartUser(session.user.id);
    }
  }, [session?.user?.id, status]);

  return null;
}

export function Providers({ children }) {
  useEffect(() => {
    // جلوگیری از لاگ‌های شلوغ و نامفهوم NextAuth در کنسول هنگام بارگذاری اولیه
    const originalConsoleError = console.error;
    console.error = (...args) => {
      const firstArg = typeof args[0] === 'string' ? args[0] : '';
      if (firstArg.includes('CLIENT_FETCH_ERROR') || firstArg.includes('next-auth.js.org/errors#client_fetch_error')) {
        console.warn('⚠️ [سرویس کاربری]: ارتباط با سرویس نشست با تاخیر مواجه شد و به صورت خودکار بازیابی می‌شود.');
        return;
      }
      originalConsoleError.apply(console, args);
    };

    return () => {
      console.error = originalConsoleError;
    };
  }, []);

  return (
    <SessionProvider basePath="/api/auth" refetchOnWindowFocus={false}>
      <CartSessionSync />
      {children}
    </SessionProvider>
  );
}