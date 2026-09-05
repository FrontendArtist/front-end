'use client';

import { useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import AuthForm from '@/components/auth/AuthForm';
import styles from './AuthStep.module.scss';

/**
 * مرحله 2 چک‌اوت: احراز هویت
 * از کامپوننت مشترک AuthForm استفاده می‌کند
 */
export default function AuthStep({ onNext, totalPrice = 0 }) {
    const { status } = useSession();
    const router = useRouter();

    useEffect(() => {
        if (status === 'authenticated') {
            const timer = setTimeout(() => {
                if (totalPrice === 0) {
                    router.replace('/payment/callback?status=success');
                } else {
                    onNext();
                }
            }, 1500);
            return () => clearTimeout(timer);
        }
    }, [status, onNext, totalPrice, router]);

    if (status === 'loading') {
        return (
            <div className={styles.authStep}>
                <div className={styles.loadingState}>
                    <div className={styles.spinner}></div>
                    <p>در حال بررسی وضعیت...</p>
                </div>
            </div>
        );
    }

    if (status === 'authenticated') {
        return (
            <div className={styles.authStep}>
                <div className={styles.successState}>
                    <div className={styles.successIcon}>
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                            <polyline points="22 4 12 14.01 9 11.01" />
                        </svg>
                    </div>
                    <h2 className={styles.successTitle}>شما وارد شده‌اید!</h2>
                    <p className={styles.successMessage}>
                        خوش آمدید، در حال انتقال به مرحله بعد...
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className={styles.authStep}>
            <AuthForm
                title="ورود / ثبت‌نام"
                subtitle="برای ادامه خرید، لطفاً وارد شوید"
            />
        </div>
    );
}
