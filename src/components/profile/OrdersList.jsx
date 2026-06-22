'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import GradientBorderCard from '@/components/ui/GradientBorderCard/GradientBorderCard';
import { useOrdersStore } from '@/store/useOrdersStore';
import styles from './OrdersList.module.scss';

export default function OrdersList({ limit }) {
    const { orders, isLoading, error, fetchOrders, hasFetched } = useOrdersStore();

    useEffect(() => {
        fetchOrders(true);
    }, [fetchOrders]);

    const formatPrice = (price) => {
        return Number(price || 0).toLocaleString('fa-IR');
    };

    const formatDate = (dateString) => {
        if (!dateString) return '—';
        return new Intl.DateTimeFormat('fa-IR', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        }).format(new Date(dateString));
    };

    // ─── بج وضعیت سفارش (orderStatus) ────────────────────────────────────────
    const StatusBadge = ({ status }) => {
        const normalizedStatus = status?.trim();
        const map = {
            paid: { label: 'پرداخت شده', cls: styles.orders__badgeSuccess },
            pending: { label: 'در انتظار پرداخت', cls: styles.orders__badgeWarning },
            shipped: { label: 'ارسال شده', cls: styles.orders__badgeDefault },
            delivered: { label: 'تحویل داده شد', cls: styles.orders__badgeSuccess },
            canceled: { label: 'لغو شده', cls: styles.orders__badgeDanger },
            failed: { label: 'ناموفق', cls: styles.orders__badgeDanger },
        };
        const { label, cls } = map[normalizedStatus] ?? { label: status || 'نامشخص', cls: styles.orders__badgeDefault };
        return <span className={`${styles.orders__badge} ${cls}`}>{label}</span>;
    };

    // ─── BUG FIX: بج وضعیت پرداخت (paymentStatus) ─────────────────────────
    // قبلاً فقط orderStatus نمایش داده می‌شد — برای کارت‌به‌کارت باید paymentStatus هم نشان داده شود.
    const PaymentStatusBadge = ({ status }) => {
        const map = {
            pending_payment: { label: 'منتظر فیش واریز', cls: styles.orders__badgeWarning },
            pending_verification: { label: 'در انتظار تأیید', cls: styles.orders__badgePending },
            paid: { label: 'پرداخت شده', cls: styles.orders__badgeSuccess },
            failed: { label: 'رد شد', cls: styles.orders__badgeDanger },
        };
        const { label, cls } = map[status] ?? { label: status || 'نامشخص', cls: styles.orders__badgeDefault };
        return <span className={`${styles.orders__badge} ${cls}`}>{label}</span>;
    };

    const CombinedStatusBadge = ({ order }) => {
        const oStatus = order.orderStatus?.trim();
        // در صورت ارسال، تحویل یا لغو، این وضعیت اولویت دارد
        if (['shipped', 'delivered', 'canceled'].includes(oStatus)) {
            return <StatusBadge status={order.orderStatus} />;
        }
        if (order.paymentMethod === 'card_to_card') {
            return <PaymentStatusBadge status={order.paymentStatus} />;
        }
        return <StatusBadge status={order.orderStatus} />;
    };

    if (isLoading) {
        return (
            <div className={styles.orders__loading}>
                <div className={styles.orders__spinner}></div>
                <p>در حال دریافت تاریخچه سفارشات...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className={styles.orders__error}>
                <p>{error}</p>
            </div>
        );
    }

    const displayedOrders = limit ? orders.slice(0, limit) : orders;

    if (!displayedOrders || displayedOrders.length === 0) {
        return (
            <div className={styles.orders__empty}>
                <div className={styles.orders__emptyIcon}>
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="9" cy="21" r="1" />
                        <circle cx="20" cy="21" r="1" />
                        <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
                    </svg>
                </div>
                <h2 className={styles.orders__emptyTitle}>سفارشی ثبت نشده است</h2>
                <p className={styles.orders__emptyDesc}>شما تاکنون هیچ دوره‌ای ثبت نام نکرده‌اید یا سفارشی نداشته‌اید.</p>
                <Link href="/courses" className={styles.orders__shopBtn}>
                    مشاهده دوره‌ها
                </Link>
            </div>
        );
    }

    return (
        <div className={styles.orders}>
            <h2 className={styles.orders__title}>
                {limit ? 'سفارش‌های اخیر' : 'تاریخچه سفارشات'}
            </h2>

            <div className={styles.orders__list}>
                {displayedOrders.map((orderData) => {
                    // depending on strapi version, the order data might be flat or nested under attributes
                    const order = orderData.attributes || orderData;
                    const id = orderData.id;
                    const items = Array.isArray(order.items) ? order.items : [];

                    return (
                        <GradientBorderCard gradient={'horizontal-rtl'} key={id} className={styles.orders__cardWrapper} contentClassName={styles.orders__card} enableHover={false}>
                            <div className={styles.orders__header}>
                                <div className={styles.orders__headerInfo}>
                                    <span className={styles.orders__id}>سفارش #{id}</span>
                                    <span className={styles.orders__date}>{formatDate(order.createdAt)}</span>
                                </div>
                                <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
                                    <CombinedStatusBadge order={order} />
                                </div>
                            </div>

                            <div className={styles.orders__details}>
                                <div className={styles.orders__detailItem}>
                                    <span className={styles.orders__label}>مبلغ کل:</span>
                                    <span className={styles.orders__value}>{formatPrice(order.totalPrice)} تومان</span>
                                </div>
                                <div className={styles.orders__detailItem}>
                                    <span className={styles.orders__label}>تعداد اقلام:</span>
                                    <span className={styles.orders__value}>{items.length} آیتم</span>
                                </div>

                                <Link
                                    href={`/profile/orders/${orderData.documentId}`}
                                    className={styles.orders__viewBtn}
                                    aria-label={`مشاهده جزئیات سفارش ${id}`}
                                >
                                    {order.paymentMethod === 'card_to_card' && order.paymentStatus === 'pending_payment'
                                        ? 'آپلود فیش پرداخت'
                                        : 'مشاهده جزئیات'}
                                </Link>
                            </div>
                        </GradientBorderCard>
                    );
                })}
            </div>
        </div>
    );
}
