'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import GradientBorderCard from '@/components/ui/GradientBorderCard/GradientBorderCard';
import PriceWithHint from '@/components/ui/PriceWithHint/PriceWithHint';
import { useAccountOrders } from '@/hooks/useAccountOrders';
import styles from './OrdersList.module.scss';

export default function OrdersList({ limit }) {
    const { orders, isLoading, error, fetchOrders, hasFetched, byemoneyWarning } = useAccountOrders();

    useEffect(() => {
        if (!hasFetched) {
            fetchOrders();
        }
    }, [hasFetched, fetchOrders]);

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
            canceled: { label: 'رد شده', cls: styles.orders__badgeDanger },
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
        if (order.source === 'byemoney') {
            return <span className={`${styles.orders__badge} ${styles.orders__badgeSuccess}`}>پرداخت شده ✓</span>;
        }

        const oStatus = order.orderStatus?.trim()?.toLowerCase();
        const pStatus = order.paymentStatus?.trim()?.toLowerCase();
        const isOnline = order.paymentMethod === 'online';
        const isCardToCard = order.paymentMethod === 'card_to_card';
        const isPaid = ['paid', 'shipped', 'delivered'].includes(oStatus) || pStatus === 'paid';
        const isFailedOrCanceled = (oStatus === 'canceled' || oStatus === 'cancelled' || pStatus === 'failed');

        // پرداخت آنلاین موفق
        if (isOnline && isPaid) {
            return <span className={`${styles.orders__badge} ${styles.orders__badgeSuccess}`}>پرداخت آنلاین موفق ✓</span>;
        }

        // پرداخت آنلاین ناموفق یا لغوشده — نه «رد شده» بلکه «ناموفق»
        if (isOnline && isFailedOrCanceled) {
            return <span className={`${styles.orders__badge} ${styles.orders__badgePaymentFailed}`}>پرداخت ناموفق ⚠️</span>;
        }

        // پرداخت آنلاین در انتظار
        if (isOnline) {
            return <span className={`${styles.orders__badge} ${styles.orders__badgeWarning}`}>در انتظار پرداخت</span>;
        }

        // کارت‌به‌کارت
        if (isCardToCard) {
            return <PaymentStatusBadge status={pStatus} />;
        }

        // سایر حالات
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
            <div className={styles.orders}>
                {byemoneyWarning && (
                    <div style={{
                        backgroundColor: 'rgba(234, 179, 8, 0.1)',
                        border: '1px solid rgba(234, 179, 8, 0.3)',
                        color: '#facc15',
                        padding: '12px 16px',
                        borderRadius: '8px',
                        marginBottom: '20px',
                        fontSize: '0.9rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                    }}>
                        <span>⚠️</span>
                        <span>امکان دریافت خریدهای جدید از بای‌مانی وجود ندارد؛ در حال حاضر فقط سفارش‌های استراپی نمایش داده می‌شوند.</span>
                    </div>
                )}
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
            </div>
        );
    }

    return (
        <div className={styles.orders}>
            <h2 className={styles.orders__title}>
                {limit ? 'سفارش‌های اخیر' : 'تاریخچه سفارشات'}
            </h2>

            {byemoneyWarning && (
                <div style={{
                    backgroundColor: 'rgba(234, 179, 8, 0.1)',
                    border: '1px solid rgba(234, 179, 8, 0.3)',
                    color: '#facc15',
                    padding: '12px 16px',
                    borderRadius: '8px',
                    marginBottom: '20px',
                    fontSize: '0.9rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                }}>
                    <span>⚠️</span>
                    <span>امکان دریافت خریدهای جدید از بای‌مانی وجود ندارد؛ در حال حاضر فقط سفارش‌های استراپی نمایش داده می‌شوند.</span>
                </div>
            )}

            <div className={styles.orders__list}>
                {displayedOrders.map((orderData) => {
                    const order = orderData.attributes || orderData;
                    const isByeMoney = order.source === 'byemoney' || orderData.source === 'byemoney';
                    const id = isByeMoney
                        ? (order.orderNumber || (orderData.id ? String(orderData.id).slice(0, 8).toUpperCase() : ''))
                        : orderData.id;
                    const items = Array.isArray(order.items) ? order.items : [];

                    return (
                        <GradientBorderCard gradient={'horizontal-rtl'} key={orderData.documentId || orderData.id} className={styles.orders__cardWrapper} contentClassName={styles.orders__card} enableHover={false}>
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
                                    <span className={styles.orders__value}>
                                        <PriceWithHint price={order.totalPrice} hideHint={isByeMoney} size="sm" />
                                    </span>
                                </div>
                                <div className={styles.orders__detailItem}>
                                    <span className={styles.orders__label}>تعداد اقلام:</span>
                                    <span className={styles.orders__value}>{items.length} آیتم</span>
                                </div>
                                {(order.traceNo || order.trackingNumber || order.refNum) && (
                                    <div className={styles.orders__detailItem}>
                                        <span className={styles.orders__label}>کد پیگیری:</span>
                                        <span className={styles.orders__value} dir="ltr" style={{ fontWeight: 'bold' }}>
                                            {order.traceNo || order.trackingNumber || order.refNum}
                                        </span>
                                    </div>
                                )}

                                <Link
                                    href={`/profile/orders/${orderData.documentId || order.documentId || orderData.id}`}
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
