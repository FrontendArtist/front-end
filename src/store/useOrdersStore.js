import { create } from 'zustand';
import { fetchClientOrders } from '@/lib/client/ordersClientApi';

let inFlightPromise = null;

export const useOrdersStore = create((set, get) => ({
    orders: [],
    isLoading: false,
    error: null,
    hasFetched: false,

    fetchOrders: async (force = false) => {
        // اگر قبلاً فچ شده و نیازی به رفرش اجباری نیست، از دیتای موجود استفاده کن
        if (get().hasFetched && !force) return get().orders;

        // اگر درخواستی در حال ارسال به شبکه است، به همان متصل شو و درخواست جدید نساز
        if (inFlightPromise) {
            return inFlightPromise;
        }

        set({ isLoading: true, error: null });

        inFlightPromise = (async () => {
            try {
                const result = await fetchClientOrders();
                const ordersData = result.data || result || [];
                
                set({ 
                    orders: ordersData, 
                    hasFetched: true, 
                    isLoading: false 
                });
                return ordersData;
            } catch (err) {
                set({ 
                    error: err.message, 
                    isLoading: false 
                });
                return get().orders;
            } finally {
                inFlightPromise = null;
            }
        })();

        return inFlightPromise;
    },

    invalidateOrders: () => {
        set({ hasFetched: false });
    }
}));
