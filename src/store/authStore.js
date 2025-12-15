// src/store/authStore.js
import { create } from 'zustand';

const useAuthStore = create((set) => ({
    isAuthModalOpen: false,
    authStep: 'phone', // 'phone' | 'otp'
    phoneNumber: '',

    openAuthModal: () => set({ isAuthModalOpen: true, authStep: 'phone' }),
    closeAuthModal: () => set({ isAuthModalOpen: false, authStep: 'phone', phoneNumber: '' }),
    setAuthStep: (step) => set({ authStep: step }),
    setPhoneNumber: (phone) => set({ phoneNumber: phone }),
}));

export default useAuthStore;
