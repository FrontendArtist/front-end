import { create } from 'zustand';

export const useOrdersStore = create((set, get) => ({
    orders: [],
    isLoading: false,
    error: null,
    hasFetched: false,

    fetchOrders: async (force = false) => {
        // اگر قبلاً فچ شده و نیازی به رفرش اجباری نیست، دوباره فچ نکن
        if ((get().hasFetched || get().isLoading) && !force) return;
        
        set({ isLoading: true, error: null });
        try {
            const response = await fetch('/api/orders');
            if (!response.ok) {
                throw new Error('خطا در دریافت لیست سفارشات');
            }
            const result = await response.json();
            const ordersData = result.data || result || [];
            
            set({ 
                orders: ordersData, 
                hasFetched: true, 
                isLoading: false 
            });
        } catch (err) {
            set({ 
                error: err.message, 
                isLoading: false 
            });
        }
    }
}));
