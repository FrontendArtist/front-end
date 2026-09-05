'use client';

import useAuthStore from '@/store/authStore';
import AuthForm from './AuthForm';
import styles from './AuthModal.module.scss';

export default function AuthModal() {
    const { isAuthModalOpen, closeAuthModal } = useAuthStore();

    if (!isAuthModalOpen) return null;

    return (
        <div className={styles.overlay} onClick={closeAuthModal}>
            <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
                <button
                    className={styles.closeButton}
                    onClick={closeAuthModal}
                    aria-label="بستن"
                >
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                </button>

                <AuthForm
                    title="ورود / ثبت‌نام"
                    subtitle="شماره موبایل خود را وارد کنید"
                    onSuccess={closeAuthModal}
                />
            </div>
        </div>
    );
}
