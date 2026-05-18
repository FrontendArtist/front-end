'use client';

/**
 * src/components/profile/OrderDetailsModal.jsx
 *
 * مودال نمایش جزئیات کامل یک سفارش.
 * این کامپوننت اطلاعات فاکتور (دوره‌ها + محصولات)، مبلغ نهایی،
 * و آدرس ارسال را نمایش می‌دهد.
 *
 * @param {Object}   order    - آبجکت سفارش (attributes از Strapi)
 * @param {boolean}  isOpen   - آیا مودال باز است؟
 * @param {function} onClose  - callback برای بستن مودال
 */

import Link from 'next/link';
import styles from './OrderDetailsModal.module.scss';

// ─── Helper: فرمت قیمت به تومان ─────────────────────────────────────────────
const formatPrice = (price) =>
    Number(price || 0).toLocaleString('fa-IR');

// ─── Helper: فرمت تاریخ به شمسی ─────────────────────────────────────────────
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

// ─── Helper: بج وضعیت سفارش ──────────────────────────────────────────────────
const StatusBadge = ({ status }) => {
    const normalizedStatus = status?.trim();
    const map = {
        paid:    { label: 'پرداخت شده',       cls: styles.modal__badgeSuccess },
        pending: { label: 'در انتظار پرداخت', cls: styles.modal__badgeWarning },
        failed:  { label: 'ناموفق',            cls: styles.modal__badgeDanger  },
    };
    const { label, cls } = map[normalizedStatus] ?? { label: status || 'نامشخص', cls: styles.modal__badgeDefault };
    return <span className={`${styles.modal__badge} ${cls}`}>{label}</span>;
};

export default function OrderDetailsModal({ order, isOpen, onClose }) {
    // اگر مودال بسته است یا سفارشی انتخاب نشده، چیزی رندر نمی‌شود
    if (!isOpen || !order) return null;

    // آیتم‌های سفارش — defensive: ممکن است items یک آرایه JSON باشد
    const items = Array.isArray(order.items) ? order.items : [];
    const address = order.address ?? null;

    return (
        /* Overlay: کلیک روی پس‌زمینه مودال را می‌بندد */
        <div
            className={styles.modal__overlay}
            onClick={onClose}
            role="dialog"
            aria-modal="true"
            aria-label="جزئیات سفارش"
        >
            {/* Panel: کلیک روی پنل bubble نمی‌کند */}
            <div
                className={styles.modal__panel}
                onClick={(e) => e.stopPropagation()}
            >
                {/* ─── Header ───────────────────────────────────── */}
                <div className={styles.modal__header}>
                    <h2 className={styles.modal__title}>جزئیات سفارش</h2>
                    <button
                        className={styles.modal__closeBtn}
                        onClick={onClose}
                        aria-label="بستن"
                    >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
                            stroke="currentColor" strokeWidth="2.5"
                            strokeLinecap="round" strokeLinejoin="round">
                            <path d="M18 6L6 18M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* ─── Body ─────────────────────────────────────── */}
                <div className={styles.modal__body}>

                    {/* خلاصه سفارش */}
                    <div className={styles.modal__summary}>
                        <div className={styles.modal__summaryItem}>
                            <span className={styles.modal__summaryLabel}>وضعیت</span>
                            <StatusBadge status={order.orderStatus} />
                        </div>
                        <div className={styles.modal__summaryItem}>
                            <span className={styles.modal__summaryLabel}>تاریخ ثبت</span>
                            <span className={styles.modal__summaryValue}>{formatDate(order.createdAt)}</span>
                        </div>
                        <div className={styles.modal__summaryItem}>
                            <span className={styles.modal__summaryLabel}>مبلغ نهایی</span>
                            <span className={`${styles.modal__summaryValue} ${styles.modal__price}`}>
                                {formatPrice(order.totalPrice)} تومان
                            </span>
                        </div>
                    </div>

                    {/* لیست اقلام */}
                    <section className={styles.modal__section}>
                        <h3 className={styles.modal__sectionTitle}>
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
                                stroke="currentColor" strokeWidth="2"
                                strokeLinecap="round" strokeLinejoin="round">
                                <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" />
                                <line x1="3" y1="6" x2="21" y2="6" />
                                <path d="M16 10a4 4 0 01-8 0" />
                            </svg>
                            اقلام سفارش
                        </h3>

                        {items.length === 0 ? (
                            <p className={styles.modal__empty}>اطلاعات اقلام موجود نیست.</p>
                        ) : (
                            <ul className={styles.modal__itemList}>
                                {items.map((item, idx) => {
                                    const isCourse = item.__component === 'order.course-order-item' || item.type === 'course';
                                    const itemUrl = item.itemUrl || (item.slug ? (isCourse ? `/courses/${item.slug}` : `/product/${item.slug}`) : '#');

                                    const InnerContent = (
                                        <>
                                            {/* آیکون placeholder تصویر */}
                                            <div className={styles.modal__itemThumb} aria-hidden>
                                                {isCourse ? (
                                                    /* آیکون دوره آموزشی */
                                                    <svg width="22" height="22" viewBox="0 0 24 24"
                                                        fill="none" stroke="currentColor" strokeWidth="2"
                                                        strokeLinecap="round" strokeLinejoin="round">
                                                        <path d="M2 3h6a4 4 0 014 4v14a3 3 0 00-3-3H2z" />
                                                        <path d="M22 3h-6a4 4 0 00-4 4v14a3 3 0 013-3h7z" />
                                                    </svg>
                                                ) : (
                                                    /* آیکون محصول */
                                                    <svg width="22" height="22" viewBox="0 0 24 24"
                                                        fill="none" stroke="currentColor" strokeWidth="2"
                                                        strokeLinecap="round" strokeLinejoin="round">
                                                        <circle cx="9" cy="21" r="1" />
                                                        <circle cx="20" cy="21" r="1" />
                                                        <path d="M1 1h4l2.68 13.39a2 2 0 001.61H18a2 2 0 002-1.61L23 6H6" />
                                                    </svg>
                                                )}
                                            </div>

                                            <div className={styles.modal__itemBody}>
                                                <span className={styles.modal__itemTitle}>
                                                    {item.title ?? '—'}
                                                </span>
                                                <span className={styles.modal__itemTypeBadge}>
                                                    {isCourse ? 'دوره آموزشی' : 'محصول'}
                                                </span>
                                            </div>

                                            <div className={styles.modal__itemMeta}>
                                                {item.quantity > 1 && (
                                                    <span className={styles.modal__itemQty}>× {item.quantity}</span>
                                                )}
                                                <span className={styles.modal__itemPrice}>
                                                    {formatPrice((item.price ?? 0) * (item.quantity ?? 1))} تومان
                                                </span>
                                            </div>
                                        </>
                                    );

                                    return (
                                        <li key={`order-item-${idx}`} className={styles.modal__itemWrapper}>
                                            {item.slug ? (
                                                <Link href={itemUrl} className={`${styles.modal__item} ${styles.modal__itemClickable}`}>
                                                    {InnerContent}
                                                </Link>
                                            ) : (
                                                <div className={styles.modal__item}>
                                                    {InnerContent}
                                                </div>
                                            )}
                                        </li>
                                    );
                                })}
                            </ul>
                        )}
                    </section>

                    {/* آدرس ارسال — فقط اگر وجود داشته باشد */}
                    {address && (
                        <section className={styles.modal__section}>
                            <h3 className={styles.modal__sectionTitle}>
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
                                    stroke="currentColor" strokeWidth="2"
                                    strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" />
                                    <circle cx="12" cy="10" r="3" />
                                </svg>
                                اطلاعات ارسال
                            </h3>
                            <div className={styles.modal__addressBox}>
                                {address.recipientName && (
                                    <div className={styles.modal__addressRow}>
                                        <span className={styles.modal__addressLabel}>گیرنده:</span>
                                        <span className={styles.modal__addressValue}>{address.recipientName}</span>
                                    </div>
                                )}
                                {address.recipientPhone && (
                                    <div className={styles.modal__addressRow}>
                                        <span className={styles.modal__addressLabel}>تلفن:</span>
                                        <span className={styles.modal__addressValue} dir="ltr">{address.recipientPhone}</span>
                                    </div>
                                )}
                                {address.fullAddress && (
                                    <div className={styles.modal__addressRow}>
                                        <span className={styles.modal__addressLabel}>آدرس:</span>
                                        <span className={styles.modal__addressValue}>{address.fullAddress}</span>
                                    </div>
                                )}
                                {address.postalCode && (
                                    <div className={styles.modal__addressRow}>
                                        <span className={styles.modal__addressLabel}>کد پستی:</span>
                                        <span className={styles.modal__addressValue} dir="ltr">{address.postalCode}</span>
                                    </div>
                                )}
                            </div>
                        </section>
                    )}
                </div>

                {/* ─── Footer ───────────────────────────────────── */}
                <div className={styles.modal__footer}>
                    <button className={styles.modal__closeAction} onClick={onClose}>
                        بستن
                    </button>
                </div>
            </div>
        </div>
    );
}
