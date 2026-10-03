import { create } from 'zustand';
import { getSession } from 'next-auth/react';
import { getWalletBalanceWithByeMoney } from '@/lib/byeMoneyApi';

export const useLightStore = create((set, get) => ({
    lightBalance: null,
    isLoading: false,
    lastFetched: null,

    setLightBalance: (balance) => set({ lightBalance: Number(balance) }),

    fetchLightBalance: async (force = false, explicitJwt = null) => {
        const state = get();
        // جلوگیری از ارسال درخواست‌های موازی همزمان
        if (state.isLoading) return state.lightBalance;

        // اگر اجباری نباشد و موجودی از قبل لود شده باشد، نیازی به درخواست مجدد نیست
        if (!force && state.lightBalance !== null) {
            return state.lightBalance;
        }

        set({ isLoading: true });
        try {
            let jwt = explicitJwt;
            if (!jwt) {
                const session = await getSession();
                jwt = session?.user?.jwt;
            }

            if (!jwt) {
                set({ lightBalance: null, isLoading: false });
                return null;
            }

            const res = await getWalletBalanceWithByeMoney({ jwt });
            if (res.unauthorized) {
                set({ lightBalance: null, isLoading: false });
                return null;
            }
            if (res.success) {
                const balance = Number(res.balance ?? 0);
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

    refreshLightBalance: (explicitJwt = null) => get().fetchLightBalance(true, explicitJwt),

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

