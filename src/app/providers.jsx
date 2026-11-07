// src/app/providers.jsx
'use client';

import { useEffect, useLayoutEffect } from 'react';
import { SessionProvider, signOut, useSession } from "next-auth/react";
import { SESSION_EXPIRED_ERROR, shouldRefreshJwt } from '@/lib/strapiTokenRefresh';
import { useCartStore } from '@/store/useCartStore';
import { useOrdersStore } from '@/store/useOrdersStore';
import { useNotificationsStore } from '@/store/useNotificationsStore';
import { setProfileUser } from '@/lib/client/profileClientApi';
import { syncByeMoneyUser } from '@/lib/byeMoneySync';
import { DisplayRateProvider } from '@/context/DisplayRateContext';

/**
 * همگام‌ساز سبد خرید با نشست کاربر جهت جلوگیری از Session Fixation و نشت داده
 */
function CartSessionSync() {
  const { data: session, status } = useSession();

  useLayoutEffect(() => {
    const userId = status === 'authenticated' ? session?.user?.id : null;
    useOrdersStore.getState().setOrdersUser(userId);
    useNotificationsStore.getState().setNotificationsUser(userId);
    setProfileUser(userId);
    if (status !== 'loading') useCartStore.getState().setCartUser(userId);
  }, [session?.user?.id, status]);

  return null;
}

/**
 * همگام‌ساز پس‌زمینه کاربر با سرویس ByeMoney پس از ورود یا در بارگذاری اولیه با نشست معتبر
 */
function ByeMoneySessionSync() {
  const { data: session, status } = useSession();

  // وابسته به کاربر، نه توکن: توکن هر نیم ساعت تمدید می‌شود (BND-08) و همگام‌سازی دوباره لازم ندارد.
  useEffect(() => {
    if (status === 'authenticated' && session?.user?.jwt) {
      syncByeMoneyUser(session.user.jwt);
    }
  }, [session?.user?.id, status]);

  return null;
}

/**
 * نگه‌دارندهٔ توکن کوتاه‌عمر (BND-08): با بازگشت به تب، اگر نیمی از عمر توکن گذشته باشد نشست تازه می‌شود،
 * و اگر سرور نشست را منقضی اعلام کرد کاربر خارج می‌شود تا دوباره وارد شود.
 */
function SessionTokenKeeper() {
  const { data: session, update } = useSession();
  const jwt = session?.user?.jwt;

  useEffect(() => {
    if (session?.error === SESSION_EXPIRED_ERROR) {
      signOut({ callbackUrl: '/' });
    }
  }, [session?.error]);

  useEffect(() => {
    if (!jwt) return undefined;
    const onVisible = () => {
      if (document.visibilityState === 'visible' && shouldRefreshJwt(jwt)) update();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [jwt, update]);

  return null;
}

// کمتر از نصف عمر یک‌ساعتهٔ توکن، تا session.user.jwt در مرورگر پیش از انقضا تازه شود.
const SESSION_REFETCH_INTERVAL_SECONDS = 10 * 60;
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
    <SessionProvider
      basePath="/api/auth"
      refetchOnWindowFocus={false}
      refetchInterval={SESSION_REFETCH_INTERVAL_SECONDS}
    >
      <DisplayRateProvider>
        <SessionTokenKeeper />
        <CartSessionSync />
        <ByeMoneySessionSync />
        {children}
      </DisplayRateProvider>
    </SessionProvider>
  );
}
