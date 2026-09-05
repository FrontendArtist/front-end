'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { useOrderNotifications } from '@/hooks/useOrderNotifications';
import styles from './NotificationBell.module.scss';

export default function NotificationBell() {
    const { status } = useSession();
    const { notifications, unreadCount, markAsRead, markAllAsRead } = useOrderNotifications();
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef(null);

    // بستن دراپ‌داون با کلیک بیرون
    useEffect(() => {
        if (!isOpen) return;

        const handleClickOutside = (e) => {
            if (containerRef.current && !containerRef.current.contains(e.target)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        document.addEventListener('touchstart', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('touchstart', handleClickOutside);
        };
    }, [isOpen]);

    // فقط در صورتی که کاربر لاگین کرده باشد و حداقل یک اعلان خوانده‌نشده داشته باشد (یا دراپ‌داون باز باشد)، زنگوله نمایش داده می‌شود
    if (status !== 'authenticated' || (unreadCount === 0 && !isOpen)) {
        return null;
    }

    const toggleOpen = () => {
        setIsOpen((prev) => !prev);
    };

    const handleNotificationClick = (n) => {
        markAsRead(n.id);
        setIsOpen(false);
    };

    const formatDate = (dateString) => {
        if (!dateString) return '';
        try {
            return new Intl.DateTimeFormat('fa-IR', {
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
            }).format(new Date(dateString));
        } catch {
            return '';
        }
    };

    return (
        <div className={styles.notificationContainer} ref={containerRef}>
            <button
                type="button"
                className={`${styles.iconButton} ${isOpen ? styles.active : ''}`}
                onClick={toggleOpen}
                title="اعلان‌ها"
                aria-label="اعلان‌ها"
                aria-expanded={isOpen}
            >
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                >
                    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                    <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                </svg>

                {unreadCount > 0 && (
                    <span className={styles.badge}>
                        {new Intl.NumberFormat('fa-IR').format(unreadCount)}
                    </span>
                )}
            </button>

            {isOpen && (
                <div className={styles.dropdown}>
                    <div className={styles.dropdownHeader}>
                        <div className={styles.headerTitle}>
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                                <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                            </svg>
                            <span>اعلان‌ها</span>
                            {unreadCount > 0 && (
                                <span className={styles.unreadTag}>
                                    {new Intl.NumberFormat('fa-IR').format(unreadCount)} جدید
                                </span>
                            )}
                        </div>

                        {unreadCount > 0 && (
                            <button
                                type="button"
                                className={styles.markAllBtn}
                                onClick={markAllAsRead}
                            >
                                خوانده شد همه
                            </button>
                        )}
                    </div>

                    <div className={styles.list}>
                        {notifications.length === 0 ? (
                            <div className={styles.emptyState}>
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                                    <circle cx="12" cy="12" r="10" />
                                    <path d="m9 12 2 2 4-4" />
                                </svg>
                                <p>هیچ اعلان جدیدی وجود ندارد</p>
                            </div>
                        ) : (
                            notifications.map((n) => {
                                const isRejected = n.type === 'rejected';
                                const isMentor = n.type === 'mentor_reply';
                                const isSupport = n.type === 'support_reply';

                                let itemTypeClass = '';
                                let iconTypeClass = '';
                                let dotTypeClass = '';

                                if (isRejected) {
                                    itemTypeClass = styles.rejectedItem;
                                    iconTypeClass = styles.rejectedIcon;
                                    dotTypeClass = styles.rejectedDot;
                                } else if (isMentor) {
                                    itemTypeClass = styles.mentorItem;
                                    iconTypeClass = styles.mentorIcon;
                                    dotTypeClass = styles.mentorDot;
                                } else if (isSupport) {
                                    itemTypeClass = styles.supportItem;
                                    iconTypeClass = styles.supportIcon;
                                    dotTypeClass = styles.supportDot;
                                }

                                return (
                                    <Link
                                        key={n.id}
                                        href={n.link}
                                        className={`${styles.item} ${!n.isRead ? styles.unread : ''} ${itemTypeClass}`}
                                        onClick={() => handleNotificationClick(n)}
                                    >
                                        <div className={`${styles.itemIcon} ${iconTypeClass}`}>
                                            {isRejected ? (
                                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                                    <circle cx="12" cy="12" r="10" />
                                                    <line x1="15" y1="9" x2="9" y2="15" />
                                                    <line x1="9" y1="9" x2="15" y2="15" />
                                                </svg>
                                            ) : isMentor ? (
                                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                                    <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
                                                    <path d="M6 12v5c3 3 9 3 12 0v-5" />
                                                </svg>
                                            ) : isSupport ? (
                                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                                                </svg>
                                            ) : (
                                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                                    <polyline points="20 6 9 17 4 12" />
                                                </svg>
                                            )}
                                        </div>
                                        <div className={styles.itemContent}>
                                            <div className={styles.itemTop}>
                                                <h4 className={styles.itemTitle}>{n.title}</h4>
                                                {!n.isRead && (
                                                    <span className={`${styles.itemDot} ${dotTypeClass}`} />
                                                )}
                                            </div>
                                            <p className={styles.itemMessage}>{n.message}</p>
                                            {n.date && (
                                                <span className={styles.itemTime}>{formatDate(n.date)}</span>
                                            )}
                                        </div>
                                    </Link>
                                );
                            })
                        )}
                    </div>

                    <div className={styles.dropdownFooter}>
                        <Link
                            href="/profile/messages"
                            className={styles.footerLink}
                            onClick={() => setIsOpen(false)}
                        >
                            پیام‌های من ←
                        </Link>
                        <span className={styles.footerDivider}>•</span>
                        <Link
                            href="/profile/orders"
                            className={styles.footerLink}
                            onClick={() => setIsOpen(false)}
                        >
                            سفارش‌های من ←
                        </Link>
                    </div>
                </div>
            )}
        </div>
    );
}
