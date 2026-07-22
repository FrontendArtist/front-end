'use client';

/**
 * @file src/components/admin/Orders/OrdersTable.jsx
 * @description جدول سفارش‌ها – Client Component
 *
 * 🎯 مسئولیت‌ها:
 *   - نمایش جدول سفارش‌ها با ستون‌های: ID، کاربر، روش پرداخت، وضعیت، مبلغ، تاریخ، عملیات.
 *   - ردیف کشویی (Expandable Row) برای هر سفارش با تمام جزئیات خریدار و اقلام.
 *   - مدیریت state محلی برای آپدیت optimistic (بدون reload صفحه).
 *   - کنترل باز/بسته شدن مودال‌های ReceiptModal و StatusUpdateModal.
 *
 * @param {{ initialOrders: object[] }} props
 */

import { useState, useMemo, Fragment } from 'react';
import ReceiptModal from './ReceiptModal';
import StatusUpdateModal from './StatusUpdateModal';
import styles from './OrdersTable.module.scss';

// ── ابزارهای نمایش ──────────────────────────────────────────────────────────

/** برچسب‌های فارسی وضعیت پرداخت */
const PAYMENT_STATUS_CONFIG = {
    pending_payment: { label: 'در انتظار پرداخت', color: 'var(--color-warning)', bg: 'color-mix(in srgb, var(--color-warning) var(--op-15), transparent)' },
    pending_verification: { label: 'انتظار تأیید رسید', color: 'var(--color-warning-amber)', bg: 'color-mix(in srgb, var(--color-warning) var(--op-15), transparent)' },
    paid: { label: 'پرداخت شده', color: 'var(--color-success)', bg: 'color-mix(in srgb, var(--color-success) var(--op-12), transparent)' },
    failed: { label: 'ناموفق / رد شده', color: 'var(--color-error)', bg: 'color-mix(in srgb, var(--color-error) var(--op-12), transparent)' },
};

/** برچسب‌های فارسی وضعیت ارسال */
const ORDER_STATUS_CONFIG = {
    'pending': { label: 'در پردازش', color: 'var(--color-warning)', bg: 'color-mix(in srgb, var(--color-warning) var(--op-15), transparent)' },
    'paid': { label: 'پرداخت شده', color: 'var(--color-blue-light)', bg: 'color-mix(in srgb, var(--color-blue) var(--op-15), transparent)' },
    'shipped': { label: 'ارسال شده', color: 'var(--color-blue-light)', bg: 'color-mix(in srgb, var(--color-blue) var(--op-15), transparent)' },
    'delivered': { label: 'تحویل شده', color: 'var(--color-success)', bg: 'color-mix(in srgb, var(--color-success) var(--op-12), transparent)' },
    'canceled': { label: 'لغو شده', color: 'var(--color-gray-cc)', bg: 'color-mix(in srgb, var(--color-black) var(--op-20), transparent)' },
};

/** برچسب‌های روش پرداخت */
const PAYMENT_METHOD_LABELS = {
    card_to_card: 'کارت‌به‌کارت',
    online: 'آنلاین',
    cash: 'نقدی',
};

/** برچسب‌های نوع قلم */
const ITEM_TYPE_LABELS = {
    'order.course-order-item': { icon: '🎓', label: 'دوره / فصل آموزشی' },
    'order.product-order-item': { icon: '📦', label: 'محصول فیزیکی' },
};

/**
 * کامپوننت Badge – نمایش یکسان badge های رنگی
 */
function Badge({ label, color, bg }) {
    return (
        <span
            className={styles.badge}
            style={{ color, backgroundColor: bg, borderColor: 'transparent' }}
        >
            {label}
        </span>
    );
}

/**
 * OrderExpandedRow – ردیف کشویی با تمام جزئیات سفارش
 */
function OrderExpandedRow({ order, colSpan }) {
    const formatPrice = (p) =>
        p !== undefined && p !== null
            ? new Intl.NumberFormat('fa-IR').format(Number(p)) + ' تومان'
            : '—';

    const formatDate = (d) =>
        d
            ? new Intl.DateTimeFormat('fa-IR', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
            }).format(new Date(d))
            : '—';

    return (
        <tr className={styles.expanded_row}>
            <td colSpan={colSpan} className={styles.expanded_cell}>
                <div className={styles.expanded_content}>

                    {/* ── ستون ۱: اطلاعات خریدار ──────────────────────────── */}
                    <div className={styles.expanded_section}>
                        <h4 className={styles.expanded_section__title}>👤 اطلاعات خریدار</h4>
                        <div className={styles.expanded_grid}>
                            <div className={styles.expanded_field}>
                                <span className={styles.expanded_field__label}>نام و نام‌خانوادگی</span>
                                <span className={styles.expanded_field__value}>{order.fullName || '—'}</span>
                            </div>
                            <div className={styles.expanded_field}>
                                <span className={styles.expanded_field__label}>موبایل خریدار</span>
                                <span className={styles.expanded_field__value} dir="ltr">{order.phone || order.user?.phoneNumber || '—'}</span>
                            </div>
                            <div className={styles.expanded_field}>
                                <span className={styles.expanded_field__label}>ایمیل</span>
                                <span className={styles.expanded_field__value}>{order.email || '—'}</span>
                            </div>
                            <div className={styles.expanded_field}>
                                <span className={styles.expanded_field__label}>تاریخ ثبت</span>
                                <span className={styles.expanded_field__value}>{formatDate(order.createdAt)}</span>
                            </div>
                            <div className={styles.expanded_field}>
                                <span className={styles.expanded_field__label}>روش پرداخت</span>
                                <span className={styles.expanded_field__value}>{PAYMENT_METHOD_LABELS[order.paymentMethod] || order.paymentMethod || '—'}</span>
                            </div>
                            {order.trackingNumber && (
                                <div className={styles.expanded_field}>
                                    <span className={styles.expanded_field__label}>کد رهگیری</span>
                                    <span className={styles.expanded_field__value} dir="ltr">🚚 {order.trackingNumber}</span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* ── ستون ۲: آدرس ارسال ──────────────────────────────── */}
                    {(order.address || order.postalCode) && (
                        <div className={styles.expanded_section}>
                            <h4 className={styles.expanded_section__title}>📍 آدرس ارسال</h4>
                            <div className={styles.expanded_grid}>
                                <div className={`${styles.expanded_field} ${styles['expanded_field--full']}`}>
                                    <span className={styles.expanded_field__label}>آدرس کامل</span>
                                    <span className={styles.expanded_field__value}>{order.address || '—'}</span>
                                </div>
                                {order.postalCode && order.postalCode !== '0000000000' && (
                                    <div className={styles.expanded_field}>
                                        <span className={styles.expanded_field__label}>کد پستی</span>
                                        <span className={styles.expanded_field__value} dir="ltr">{order.postalCode}</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* ── ستون ۳: اقلام سفارش ─────────────────────────────── */}
                    <div className={styles.expanded_section}>
                        <h4 className={styles.expanded_section__title}>🛒 اقلام سفارش</h4>
                        {order.items && order.items.length > 0 ? (
                            <div className={styles.items_list}>
                                {order.items.map((item, idx) => {
                                    const typeConfig = ITEM_TYPE_LABELS[item.__component] || { icon: '📌', label: 'قلم' };
                                    return (
                                        <div key={idx} className={styles.item_card}>
                                            <span className={styles.item_card__icon}>{typeConfig.icon}</span>
                                            <div className={styles.item_card__info}>
                                                <span className={styles.item_card__title}>{item.title || '—'}</span>
                                                <span className={styles.item_card__type}>{typeConfig.label}</span>
                                                {item.chapterId && (
                                                    <span className={styles.item_card__meta}>شناسه فصل: {item.chapterId}</span>
                                                )}
                                                {item.quantity && Number(item.quantity) > 1 && (
                                                    <span className={styles.item_card__meta}>تعداد: {item.quantity}</span>
                                                )}
                                            </div>
                                            <span className={styles.item_card__price}>{formatPrice(item.price)}</span>
                                        </div>
                                    );
                                })}
                                <div className={styles.items_total}>
                                    <span>جمع کل</span>
                                    <strong>{formatPrice(order.totalPrice)}</strong>
                                </div>
                            </div>
                        ) : (
                            <p className={styles.expanded_empty}>اطلاعات اقلام در دسترس نیست.</p>
                        )}

                        {/* notes اگر وجود داشت */}
                        {order.notes && (
                            <div className={styles.expanded_notes}>
                                <span className={styles.expanded_field__label}>یادداشت:</span>
                                <pre className={styles.expanded_notes__text}>{order.notes}</pre>
                            </div>
                        )}
                    </div>

                </div>
            </td>
        </tr>
    );
}

// ── OrdersTable ──────────────────────────────────────────────────────────────

export default function OrdersTable({ initialOrders }) {
    // ── State ──────────────────────────────────────────────────────────────────
    const [orders, setOrders] = useState(initialOrders);
    const [receiptModalOrder, setReceiptModal] = useState(null);
    const [statusModalOrder, setStatusModal] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [expandedId, setExpandedId] = useState(null); // شناسه ردیف باز

    // ── فیلتر جستجو ──────────────────────────────────────────────────────────
    const filteredOrders = useMemo(() => {
        if (!searchQuery.trim()) return orders;
        const q = searchQuery.toLowerCase();
        return orders.filter(
            (o) =>
                o.orderNumber?.toLowerCase().includes(q) ||
                o.user?.username?.toLowerCase().includes(q) ||
                o.user?.phoneNumber?.includes(q)
        );
    }, [orders, searchQuery]);

    function handleOrderUpdate(orderId, changes) {
        setOrders((prev) =>
            prev.map((o) => (o.id === orderId ? { ...o, ...changes } : o))
        );
    }

    function toggleExpand(orderId) {
        setExpandedId((prev) => (prev === orderId ? null : orderId));
    }

    // ── رندر خالی ──────────────────────────────────────────────────────────────
    if (orders.length === 0) {
        return (
            <div className={styles.empty}>
                <span>📋</span>
                <p>هیچ سفارشی ثبت نشده است.</p>
            </div>
        );
    }

    const COL_SPAN = 9; // تعداد ستون‌های جدول

    return (
        <div className={styles.container}>

            {/* ── نوار جستجو ──────────────────────────────────────────────── */}
            <div className={styles.toolbar}>
                <input
                    type="search"
                    className={styles.search}
                    placeholder="جستجو بر اساس شماره سفارش، کاربر یا موبایل..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    aria-label="جستجوی سفارش"
                />
                <span className={styles.toolbar__count}>
                    {new Intl.NumberFormat('fa-IR').format(filteredOrders.length)} سفارش
                </span>
            </div>

            {/* ── جدول ────────────────────────────────────────────────────── */}
            <div className={styles.table_wrapper}>
                <table className={styles.table}>
                    <thead>
                        <tr>
                            <th style={{ width: 36 }}></th>{/* toggle arrow */}
                            <th>شناسه</th>
                            <th>کاربر</th>
                            <th>روش پرداخت</th>
                            <th>وضعیت پرداخت</th>
                            <th>وضعیت سفارش</th>
                            <th>مبلغ (تومان)</th>
                            <th>تاریخ</th>
                            <th>عملیات</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredOrders.map((order) => {
                            const payConf = PAYMENT_STATUS_CONFIG[order.paymentStatus] || PAYMENT_STATUS_CONFIG.pending_payment;
                            const ordConf = ORDER_STATUS_CONFIG[order.orderStatus?.trim()] || ORDER_STATUS_CONFIG[order.orderStatus] || ORDER_STATUS_CONFIG.pending;
                            const isCardToCard = order.paymentMethod === 'card_to_card';
                            const needsReceiptApproval =
                                isCardToCard && order.paymentStatus === 'pending_verification';
                            const isExpanded = expandedId === order.id;

                            return (
                                <Fragment key={order.id}>
                                    <tr
                                        className={`${styles.table__row} ${isExpanded ? styles['table__row--expanded'] : ''}`}
                                        onClick={() => toggleExpand(order.id)}
                                    >
                                        {/* دکمه toggle */}
                                        <td className={styles.expand_toggle_cell}>
                                            <span
                                                className={`${styles.expand_toggle} ${isExpanded ? styles['expand_toggle--open'] : ''}`}
                                                title={isExpanded ? 'بستن جزئیات' : 'مشاهده جزئیات سفارش'}
                                                aria-label={isExpanded ? 'بستن جزئیات' : 'مشاهده جزئیات'}
                                            >
                                                ▶
                                            </span>
                                        </td>

                                        {/* شناسه */}
                                        <td className={styles.table__id}>{order.orderNumber}</td>

                                        {/* کاربر */}
                                        <td>
                                            <div className={styles.user_cell}>
                                                <span className={styles.user_cell__name}>
                                                    {order.user?.username || '—'}
                                                </span>
                                                {order.user?.phoneNumber && (
                                                    <span className={styles.user_cell__phone}>
                                                        {order.user.phoneNumber}
                                                    </span>
                                                )}
                                                {order.cardHolderName && (
                                                    <span className={styles.user_cell__card}>
                                                        💳 {order.cardHolderName}
                                                    </span>
                                                )}
                                            </div>
                                        </td>

                                        {/* روش پرداخت */}
                                        <td>
                                            <span className={styles.method_label}>
                                                {PAYMENT_METHOD_LABELS[order.paymentMethod] || order.paymentMethod}
                                            </span>
                                        </td>

                                        {/* وضعیت پرداخت */}
                                        <td>
                                            <Badge
                                                label={payConf.label}
                                                color={payConf.color}
                                                bg={payConf.bg}
                                            />
                                        </td>

                                        {/* وضعیت سفارش */}
                                        <td>
                                            <div className={styles.status_cell}>
                                                <Badge
                                                    label={ordConf.label}
                                                    color={ordConf.color}
                                                    bg={ordConf.bg}
                                                />
                                                {order.trackingNumber && (
                                                    <span className={styles.tracking_code}>
                                                        🚚 {order.trackingNumber}
                                                    </span>
                                                )}
                                            </div>
                                        </td>

                                        {/* مبلغ */}
                                        <td className={styles.table__amount}>
                                            {new Intl.NumberFormat('fa-IR').format(order.totalPrice)}
                                        </td>

                                        {/* تاریخ */}
                                        <td className={styles.table__date}>
                                            {order.createdAt
                                                ? new Intl.DateTimeFormat('fa-IR', {
                                                    year: 'numeric',
                                                    month: 'short',
                                                    day: 'numeric',
                                                }).format(new Date(order.createdAt))
                                                : '—'}
                                        </td>

                                        {/* عملیات */}
                                        <td>
                                            <div className={styles.actions}>
                                                {needsReceiptApproval && (
                                                    <button
                                                        className={`${styles.action_btn} ${styles['action_btn--receipt']}`}
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setReceiptModal(order);
                                                        }}
                                                        title="مشاهده و تأیید رسید پرداخت"
                                                    >
                                                        🧾 رسید
                                                    </button>
                                                )}

                                                <button
                                                    className={`${styles.action_btn} ${styles['action_btn--status']}`}
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setStatusModal(order);
                                                    }}
                                                    title="تغییر وضعیت سفارش"
                                                >
                                                    ✏️ وضعیت
                                                </button>
                                            </div>
                                        </td>
                                    </tr>

                                    {/* ردیف کشویی جزئیات */}
                                    {isExpanded && (
                                        <OrderExpandedRow
                                            key={`expanded-${order.id}`}
                                            order={order}
                                            colSpan={COL_SPAN}
                                        />
                                    )}
                                </Fragment>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {/* ── مودال رسید ──────────────────────────────────────────────── */}
            {receiptModalOrder && (
                <ReceiptModal
                    order={receiptModalOrder}
                    onClose={() => setReceiptModal(null)}
                    onUpdate={handleOrderUpdate}
                />
            )}

            {/* ── مودال وضعیت ─────────────────────────────────────────────── */}
            {statusModalOrder && (
                <StatusUpdateModal
                    order={statusModalOrder}
                    onClose={() => setStatusModal(null)}
                    onUpdate={handleOrderUpdate}
                />
            )}
        </div>
    );
}
