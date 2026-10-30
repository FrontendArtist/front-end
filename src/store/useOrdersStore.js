import { create } from 'zustand';
import { fetchClientOrders } from '@/lib/client/ordersClientApi';
import { useNotificationsStore } from '@/store/useNotificationsStore';

const EMPTY_ORDERS = [];
let generation = 0;
let inFlight = null;

export const selectAccountOrders = (state, userId) =>
    userId != null && state.userId === String(userId) ? state.orders : EMPTY_ORDERS;

export const useOrdersStore = create((set, get) => ({
    userId: null, orders: [], isLoading: false, error: null, hasFetched: false,
    setOrdersUser: (userId) => {
        const nextId = userId == null ? null : String(userId);
        if (get().userId === nextId) return;
        generation++;
        inFlight = null;
        set({ userId: nextId, orders: [], isLoading: false, error: null, hasFetched: false });
    },
    fetchOrders: async (force = false, userId = get().userId) => {
        if (userId == null || String(userId) !== get().userId) return [];
        if (get().hasFetched && !force) return get().orders;
        if (inFlight) return inFlight.promise;
        const request = { generation };
        const isCurrent = () => request.generation === generation;
        set({ isLoading: true, error: null });
        request.promise = (async () => {
            try {
                const result = await fetchClientOrders();
                if (!isCurrent()) return [];
                const orders = result.data || result || [];
                set({ orders, hasFetched: true, isLoading: false });
                return orders;
            } catch (err) {
                if (!isCurrent()) return [];
                set({ error: err.message, isLoading: false });
                return get().orders;
            } finally {
                // پاسخ نشست قبلی نباید درخواست نشست فعلی را آزاد کند.
                if (inFlight === request) inFlight = null;
            }
        })();
        inFlight = request;
        return request.promise;
    },
    invalidateOrders: () => {
        set({ hasFetched: false });
        useNotificationsStore.getState().invalidateNotifications();
    },
}));
