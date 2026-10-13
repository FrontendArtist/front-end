'use client';
import { useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useOrdersStore, selectAccountOrders } from '@/store/useOrdersStore';
export function useAccountOrders() {
    const { data: session, status } = useSession();
    const userId = status === 'authenticated' ? session?.user?.id : null;
    const state = useOrdersStore();
    const matches = userId != null && state.userId === String(userId);
    const fetchOrders = useCallback((force = false) =>
        useOrdersStore.getState().fetchOrders(force, userId), [userId]);
    useEffect(() => {
        if (matches && !state.hasFetched) fetchOrders();
    }, [matches, state.hasFetched, fetchOrders]);
    return {
        orders: selectAccountOrders(state, userId),
        isLoading: userId != null && (!matches || state.isLoading),
        error: matches ? state.error : null,
        hasFetched: matches && state.hasFetched,
        fetchOrders,
    };
}
