'use client';

import Link from 'next/link';
import styles from './EmptyCartState.module.scss';

/**
 * کامپوننت مشترک نمایش وضعیت سبد خرید خالی
 * مورد استفاده در صفحات /cart و /checkout
 */
export default function EmptyCartState({
    title = 'سبد خرید شما خالی است',
    description = 'هنوز محصول یا دوره‌ای به سبد خرید خود اضافه نکرده‌اید.',
    buttonText = 'بازگشت به فروشگاه',
    buttonHref = '/products',
}) {
    return (
        <div className={styles.emptyState}>
            <div className={styles.emptyIcon}>
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="9" cy="21" r="1" />
                    <circle cx="20" cy="21" r="1" />
                    <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
                </svg>
            </div>
            <h2 className={styles.emptyTitle}>{title}</h2>
            <p className={styles.emptyText}>{description}</p>
            <Link href={buttonHref} className={styles.emptyButton}>
                {buttonText}
            </Link>
        </div>
    );
}
