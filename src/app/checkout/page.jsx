'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import styles from './page.module.scss';

/**
 * صفحهٔ قدیمی «آدرس و تحویل سفارش».
 * هر خرید جدید (دوره، فصل، کالا و سبد مختلط) فقط از سبد بای‌مانی انجام می‌شود؛
 * آدرس تحویل نیز در همان /cart با مودال گرفته می‌شود. پس این مسیر فقط به /cart هدایت می‌کند.
 */
export default function CheckoutPage() {
    const router = useRouter();

    useEffect(() => {
        router.replace('/cart');
    }, [router]);

    return (
        <div className={styles.checkoutPage}>
            <div className={styles.container}>
                <div className={styles.redirectCard} role="status" aria-live="polite">
                    <div className={styles.spinner} aria-hidden="true" />
                    <p className={styles.redirectNotice}>
                        در حال انتقال به سبد خرید...
                    </p>
                </div>
            </div>
        </div>
    );
}
