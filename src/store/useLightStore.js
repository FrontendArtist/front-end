import { create } from 'zustand';

export const useLightStore = create((set, get) => ({
    lightBalance: null,
    isLoading: false,
    lastFetched: null,

    setLightBalance: (balance) => set({ lightBalance: Number(balance) }),

    fetchLightBalance: async (force = false) => {
        const state = get();
        // جلوگیری از ارسال درخواست‌های موازی همزمان
        if (state.isLoading) return state.lightBalance;

        // اگر اجباری نباشد و موجودی از قبل لود شده باشد، نیازی به درخواست مجدد نیست
        if (!force && state.lightBalance !== null) {
            return state.lightBalance;
        }

        set({ isLoading: true });
        try {
            const res = await fetch('/api/payment-light', { cache: 'no-store' });
            if (res.status === 401) {
                set({ lightBalance: null, isLoading: false });
                return null;
            }
            if (res.ok) {
                const data = await res.json();
                const balance = Number(data.light ?? data.balance ?? 0);
                set({
                    lightBalance: balance,
                    isLoading: false,
                    lastFetched: Date.now(),
                });
                return balance;
            }
        } catch {
            // در صورت خطای شبکه بی‌صدا نادیده می‌گیریم
        } finally {
            set({ isLoading: false });
        }
        return get().lightBalance;
    },

    refreshLightBalance: () => get().fetchLightBalance(true),

    reset: () => set({ lightBalance: null, isLoading: false, lastFetched: null }),
}));

/**
 * دیسپچ رویداد و تحریک به‌روزرسانی موجودی نور در سراسر برنامه
 * @param {number|null} [newBalance] - در صورت وجود، مقدار موجودی جدید بلافاصله تنظیم می‌شود
 */
export const triggerLightUpdate = (newBalance = null) => {
    if (typeof window !== 'undefined') {
        if (newBalance !== null && !isNaN(Number(newBalance))) {
            useLightStore.getState().setLightBalance(Number(newBalance));
        }
        useLightStore.getState().fetchLightBalance(true);
        window.dispatchEvent(new CustomEvent('light-updated', { detail: { balance: newBalance } }));
    }
};

export default useLightStore;

