'use client';
import { useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useShallow } from 'zustand/react/shallow';
import { useOrdersStore, selectAccountOrders } from '@/store/useOrdersStore';

function useAccountOrdersState(includeStatus) {
    const { data: session, status } = useSession();
    const userId = status === 'authenticated' ? session?.user?.id : null;
    const state = useOrdersStore(useShallow((store) => {
        const matches = userId != null && store.userId === String(userId);
        return {
            matches,
            orders: selectAccountOrders(store, userId),
            hasFetched: matches && store.hasFetched,
            isLoading: includeStatus && userId != null && (!matches || store.isLoading),
            error: includeStatus && matches ? store.error : null,
            byemoneyWarning: includeStatus && matches ? store.byemoneyWarning : false,
        };
    }));
    const fetchOrders = useCallback((force = false) =>
        useOrdersStore.getState().fetchOrders(force, userId), [userId]);
    useEffect(() => {
        if (state.matches && !state.hasFetched) fetchOrders();
    }, [state.matches, state.hasFetched, fetchOrders]);
    return { ...state, fetchOrders };
}

export function useAccountOrders() {
    return useAccountOrdersState(true);
}

// مصرف‌کنندگان مالکیت و سبد به تغییر صرفاً بارگذاری یا خطا نیاز ندارند.
export function useAccountOrderItems() {
    return useAccountOrdersState(false).orders;
}
