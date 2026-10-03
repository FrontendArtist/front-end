'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/**
 * صفحه میانی شارژ نور حذف شده و پرداخت مستقیماً از مدال انجام می‌شود.
 * در صورت دسترسی مستقیم به این آدرس، کاربر به پروفایل هدایت می‌شود.
 */
export default function LightCheckoutRedirectPage() {
    const router = useRouter();

    useEffect(() => {
        router.replace('/profile');
    }, [router]);

    return (
        <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <p style={{ color: 'var(--color-text-primary)', fontSize: '1rem' }}>
                در حال انتقال به حساب کاربری...
            </p>
        </div>
    );
}
