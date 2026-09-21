// src/store/authStore.js
import { create } from 'zustand';

const useAuthStore = create((set) => ({
    isAuthModalOpen: false,
    authStep: 'phone', // 'phone' | 'otp'
    phoneNumber: '',

    onAuthSuccess: null,

    openAuthModal: (callback = null) => set({ isAuthModalOpen: true, authStep: 'phone', onAuthSuccess: typeof callback === 'function' ? callback : null }),
    closeAuthModal: () => set({ isAuthModalOpen: false, authStep: 'phone', phoneNumber: '', onAuthSuccess: null }),
    setAuthStep: (step) => set({ authStep: step }),
    setPhoneNumber: (phone) => set({ phoneNumber: phone }),
}));

export default useAuthStore;
