'use client';

/**
 * src/app/profile/orders/[id]/page.jsx
 * ─────────────────────────────────────────────────────────────────────────────
 * صفحه جزئیات یک سفارش خاص.
 * مسیر: /profile/orders/[id]   ← [id] همان Strapi v5 documentId است
 *
 * منطق نمایش:
 *  - اطلاعات سفارش از /api/orders?filters[documentId][$eq]=[id] فچ می‌شود.
 *  - اگر paymentMethod === 'card_to_card' و paymentStatus === 'pending_payment'
 *    → کامپوننت <OrderReceiptUpload /> نمایش داده می‌شود.
 *  - در غیر این صورت جزئیات استاندارد سفارش نمایش داده می‌شود.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import OrderReceiptUpload from '@/components/profile/OrderReceiptUpload';
import styles from './orderDetail.module.scss';

// ─── فرمت‌کننده‌ها ────────────────────────────────────────────────────────────
const formatPrice = (price) =>
    Number(price || 0).toLocaleString('fa-IR');

const formatDate = (dateString) => {
    if (!dateString) return '—';
    return new Intl.DateTimeFormat('fa-IR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    }).format(new Date(dateString));
};

// ─── بج وضعیت پرداخت ─────────────────────────────────────────────────────────
const PaymentStatusBadge = ({ status }) => {
    const map = {
        pending_payment: { label: 'در انتظار پرداخت', cls: styles.badgeWarning },
        pending_verification: { label: 'در انتظار تأیید', cls: styles.badgePending },
        paid: { label: 'پرداخت تأیید شد', cls: styles.badgeSuccess },
        failed: { label: 'پرداخت ناموفق', cls: styles.badgeDanger },
    };
    const entry = map[status] ?? { label: status || 'نامشخص', cls: styles.badgeDefault };
    return <span className={`${styles.badge} ${entry.cls}`}>{entry.label}</span>;
};

// ─── بج وضعیت سفارش ──────────────────────────────────────────────────────────
const OrderStatusBadge = ({ status }) => {
    const normalized = status?.trim();
    const map = {
        'paid ': { label: 'پرداخت شده', cls: styles.badgeSuccess },
        paid: { label: 'پرداخت شده', cls: styles.badgeSuccess },
        pending: { label: 'در انتظار', cls: styles.badgeWarning },
        'shipped ': { label: 'ارسال شده', cls: styles.badgeInfo },
        'delivered ': { label: 'تحویل داده شد', cls: styles.badgeSuccess },
        'canceled ': { label: 'لغو شده', cls: styles.badgeDanger },
    };
    const entry = map[normalized] ?? { label: status || 'نامشخص', cls: styles.badgeDefault };
    return <span className={`${styles.badge} ${entry.cls}`}>{entry.label}</span>;
};

// ─── کامپوننت اصلی ────────────────────────────────────────────────────────────
export default function OrderDetailPage() {
    const { id } = useParams();   // id = Strapi documentId
    const router = useRouter();

    const [order, setOrder] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    // ── دریافت سفارش از API Proxy ─────────────────────────────────────────────
    const fetchOrder = useCallback(async () => {
        if (!id) return;
        setIsLoading(true);
        setError(null);
        try {
            // ── BUG FIX ─────────────────────────────────────────────────────────────
            // قبلاً URL با brackets فیلتر ارسال می‌شد اما GET handler هیچ query param
            // را نمی‌خواند — حالا ?documentId= استفاده می‌کنیم که handler آن را درک می‌کند.
            const res = await fetch(
                `/api/orders?documentId=${encodeURIComponent(id)}`,
                { cache: 'no-store' }
            );
            if (!res.ok) throw new Error('دریافت اطلاعات سفارش با خطا مواجه شد.');
            const json = await res.json();

            // Strapi v5: data یک آرایه است (حتی برای یک نتیجه)
            const orderData = json?.data?.[0] ?? null;

            // — Debug: در حال توسعه می‌توان این را ببینی تا مطمئن شوی فیلدها درست می‌رسن
            console.log('[OrderDetailPage] raw orderData:', JSON.stringify(orderData, null, 2));

            if (!orderData) throw new Error('سفارشی با این شناسه یافت نشد.');

            setOrder(orderData);
        } catch (err) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    }, [id]);

    useEffect(() => { fetchOrder(); }, [fetchOrder]);

    // ── Callback موفقیت آپلود فیش ─────────────────────────────────────────────
    // وضعیت محلی order را بروز می‌کند تا فرم آپلود پنهان شود
    const handleReceiptSuccess = (updatedOrderMeta) => {
        setOrder((prev) => ({
            ...prev,
            paymentStatus: updatedOrderMeta?.paymentStatus ?? 'pending_verification',
        }));
    };

    // ── حالت‌های Loading / Error ─────────────────────────────────────────────
    if (isLoading) {
        return (
            <div className={styles.page}>
                <div className={styles.loadingState}>در حال دریافت اطلاعات سفارش…</div>
            </div>
        );
    }

    if (error || !order) {
        return (
            <div className={styles.page}>
                <div className={styles.errorState} role="alert">
                    <p>{error || 'سفارش مورد نظر یافت نشد.'}</p>
                    <Link href="/profile/orders" className={styles.backLink}>
                        بازگشت به سفارشات
                    </Link>
                </div>
            </div>
        );
    }

    const items = Array.isArray(order.items) ? order.items : [];
    const isCardToCard = order.paymentMethod === 'card_to_card';
    const needsReceiptUpload = isCardToCard && order.paymentStatus === 'pending_payment';

    return (
        <div className={styles.page}>

            {/* ─── دکمه برگشت ─────────────────────────────────────────────── */}
            <Link href="/profile/orders" className={styles.backBtn} aria-label="بازگشت به لیست سفارشات">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
                    stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="15 18 9 12 15 6" />
                </svg>
                بازگشت به سفارشات
            </Link>

            {/* ─── هدر سفارش ──────────────────────────────────────────────── */}
            <div className={styles.orderHeader}>
                <div className={styles.orderHeaderTop}>
                    <h1 className={styles.orderTitle}>
                        جزئیات سفارش
                    </h1>
                    <div className={styles.orderBadges}>
                        <OrderStatusBadge status={order.orderStatus} />
                        {isCardToCard && <PaymentStatusBadge status={order.paymentStatus} />}
                    </div>
                </div>
                <div className={styles.orderMeta}>
                    <span className={styles.metaItem}>
                        <span className={styles.metaLabel}>شناسه:</span>
                        <span className={styles.metaValue} dir="ltr">{order.documentId || id}</span>
                    </span>
                    <span className={styles.metaItem}>
                        <span className={styles.metaLabel}>تاریخ ثبت:</span>
                        <span className={styles.metaValue}>{formatDate(order.createdAt)}</span>
                    </span>
                    <span className={styles.metaItem}>
                        <span className={styles.metaLabel}>روش پرداخت:</span>
                        <span className={styles.metaValue}>
                            {isCardToCard ? 'کارت به کارت' : 'پرداخت آنلاین'}
                        </span>
                    </span>
                    <span className={styles.metaItem}>
                        <span className={styles.metaLabel}>مبلغ کل:</span>
                        <span className={`${styles.metaValue} ${styles.metaPrice}`}>
                            {formatPrice(order.totalPrice)} تومان
                        </span>
                    </span>
                </div>
            </div>

            {/* ─── اقلام سفارش ────────────────────────────────────────────── */}
            {items.length > 0 && (
                <div className={styles.section}>
                    <h2 className={styles.sectionTitle}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
                            stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" />
                            <line x1="3" y1="6" x2="21" y2="6" />
                            <path d="M16 10a4 4 0 01-8 0" />
                        </svg>
                        اقلام سفارش
                    </h2>
                    <ul className={styles.itemList}>
                        {items.map((item, idx) => {
                            const isCourse = item.__component === 'order.course-order-item';
                            return (
                                <li key={idx} className={styles.orderItem}>
                                    <div className={styles.itemThumb} aria-hidden>
                                        {isCourse ? (
                                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
                                                stroke="currentColor" strokeWidth="2">
                                                <path d="M2 3h6a4 4 0 014 4v14a3 3 0 00-3-3H2z" />
                                                <path d="M22 3h-6a4 4 0 00-4 4v14a3 3 0 013-3h7z" />
                                            </svg>
                                        ) : (
                                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
                                                stroke="currentColor" strokeWidth="2">
                                                <circle cx="9" cy="21" r="1" />
                                                <circle cx="20" cy="21" r="1" />
                                                <path d="M1 1h4l2.68 13.39a2 2 0 001.61 1.61H18a2 2 0 001.61-1.61L23 6H6" />
                                            </svg>
                                        )}
                                    </div>
                                    <div className={styles.itemBody}>
                                        <span className={styles.itemTitle}>{item.title || '—'}</span>
                                        <span className={styles.itemType}>
                                            {isCourse ? 'دوره آموزشی' : 'محصول'}
                                        </span>
                                    </div>
                                    <div className={styles.itemMeta}>
                                        {item.quantity > 1 && (
                                            <span className={styles.itemQty}>× {item.quantity}</span>
                                        )}
                                        <span className={styles.itemPrice}>
                                            {formatPrice((item.price ?? 0) * (item.quantity ?? 1))} تومان
                                        </span>
                                    </div>
                                </li>
                            );
                        })}
                    </ul>
                </div>
            )}

            {/* ─── بخش آپلود فیش — فقط برای کارت‌به‌کارت در انتظار پرداخت ── */}
            {needsReceiptUpload && (
                <div className={styles.section}>
                    <h2 className={styles.sectionTitle}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
                            stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="3" y="10" width="18" height="11" rx="2" />
                            <path d="M3 10l9-7 9 7" />
                            <line x1="12" y1="10" x2="12" y2="21" />
                        </svg>
                        ارسال فیش واریزی
                    </h2>

                    {/* توضیح راهنما */}
                    <div className={styles.infoNote}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                            stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="12" cy="12" r="10" />
                            <line x1="12" y1="16" x2="12" y2="12" />
                            <line x1="12" y1="8" x2="12.01" y2="8" />
                        </svg>
                        مبلغ <strong>{formatPrice(order.totalPrice)} تومان</strong> را به شماره کارت زیر واریز کرده،
                        سپس تصویر فیش و کد پیگیری را ارسال کنید.
                    </div>

                    {/*
                     * OrderReceiptUpload — کامپوننت ساخته‌شده در گام ۲
                     * orderId: documentId سفارش (Strapi v5)
                     * onSuccess: callback برای بروزرسانی وضعیت بدون reload صفحه
                     */}
                    <OrderReceiptUpload
                        orderId={order.documentId || id}
                        onSuccess={handleReceiptSuccess}
                    />
                </div>
            )}

            {/* ─── پیام تأییدیه — پس از آپلود یا وضعیت‌های دیگر ──────────── */}
            {isCardToCard && order.paymentStatus === 'pending_verification' && (
                <div className={styles.pendingVerificationBox}>
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
                        stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M22 11.08V12a10 10 0 11-5.93-9.14" />
                        <polyline points="22 4 12 14.01 9 11.01" />
                    </svg>
                    <div>
                        <strong>فیش واریزی دریافت شد</strong>
                        <p>سفارش شما در انتظار تأیید توسط فروشگاه است. پس از بررسی، وضعیت به‌روز می‌شود.</p>
                        {order.trackingNumber && (
                            <span className={styles.trackingInfo}>
                                کد پیگیری: <strong dir="ltr">{order.trackingNumber}</strong>
                            </span>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
