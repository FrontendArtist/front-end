'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { useOrderNotifications } from '@/hooks/useOrderNotifications';
import styles from './OrderConfirmedBanner.module.scss';

export default function OrderConfirmedBanner() {
    const { notifications, markAsRead } = useOrderNotifications();

    // پیدا کردن اولین اعلان سفارش خوانده‌نشده (تایید یا رد شده)
    const unreadNotification = useMemo(() => {
        return notifications.find((n) => !n.isRead && (n.type === 'confirmed' || n.type === 'rejected'));
    }, [notifications]);

    if (!unreadNotification) {
        return null;
    }

    const isRejected = unreadNotification.type === 'rejected';

    const handleDismiss = () => {
        markAsRead(unreadNotification.id);
    };

    return (
        <div className={`${styles.banner} ${isRejected ? styles.bannerRejected : styles.bannerConfirmed}`} role="alert">
            <div className={styles.content}>
                <div className={`${styles.iconWrap} ${isRejected ? styles.iconWrapRejected : ''}`}>
                    {isRejected ? (
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="12" cy="12" r="10" />
                            <line x1="15" y1="9" x2="9" y2="15" />
                            <line x1="9" y1="9" x2="15" y2="15" />
                        </svg>
                    ) : (
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                            <polyline points="22 4 12 14.01 9 11.01" />
                        </svg>
                    )}
                </div>
                <div className={styles.textGroup}>
                    <h3 className={`${styles.title} ${isRejected ? styles.titleRejected : ''}`}>{unreadNotification.title}</h3>
                    <p className={`${styles.description} ${isRejected ? styles.descriptionRejected : ''}`}>{unreadNotification.message}</p>
                </div>
            </div>

            <div className={styles.actions}>
                <Link
                    href={unreadNotification.link || (isRejected ? '/profile/orders' : '/profile/purchases')}
                    className={`${styles.actionBtn} ${isRejected ? styles.actionBtnRejected : ''}`}
                    onClick={handleDismiss}
                >
                    {isRejected ? 'مشاهده جزئیات سفارش' : 'مشاهده و شروع دوره‌ها'}
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <path d="M19 12H5M12 19l-7-7 7-7" />
                    </svg>
                </Link>
                <button
                    type="button"
                    className={`${styles.dismissBtn} ${isRejected ? styles.dismissBtnRejected : ''}`}
                    onClick={handleDismiss}
                    aria-label="بستن پیام"
                    title="بستن"
                >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                        <line x1="18" y1="6" x2="6" y2="18" />
                        <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                </button>
            </div>
        </div>
    );
}
