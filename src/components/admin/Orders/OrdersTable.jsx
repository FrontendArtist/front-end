'use client';

/**
 * @file src/components/admin/Orders/OrdersTable.jsx
 * @description جدول سفارش‌ها – Client Component
 *
 * 🎯 مسئولیت‌ها:
 *   - نمایش جدول سفارش‌ها با ستون‌های: ID، کاربر، روش پرداخت، وضعیت، مبلغ، تاریخ، عملیات.
 *   - مدیریت state محلی برای آپدیت optimistic (بدون reload صفحه).
 *   - کنترل باز/بسته شدن مودال‌های ReceiptModal و StatusUpdateModal.
 *
 * 🔄 Optimistic Update:
 *   پس از هر آپدیت موفق، state محلی orders به‌روز می‌شود.
 *   کاربر نتیجه را فوری می‌بیند بدون نیاز به reload.
 *
 * @param {{ initialOrders: object[] }} props
 */

import { useState, useMemo } from 'react';
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

/** برچسب‌های فارسی وضعیت ارسال (دقیقاً با فاصله‌های Schema) */
const ORDER_STATUS_CONFIG = {
    'pending': { label: 'در پردازش', color: 'var(--color-warning)', bg: 'color-mix(in srgb, var(--color-warning) var(--op-15), transparent)' },
    'paid ': { label: 'پرداخت شده', color: 'var(--color-blue-light)', bg: 'color-mix(in srgb, var(--color-blue) var(--op-15), transparent)' },
    'shipped ': { label: 'ارسال شده', color: 'var(--color-blue-light)', bg: 'color-mix(in srgb, var(--color-blue) var(--op-15), transparent)' },
    'delivered ': { label: 'تحویل شده', color: 'var(--color-success)', bg: 'color-mix(in srgb, var(--color-success) var(--op-12), transparent)' },
    'canceled ': { label: 'لغو شده', color: 'var(--color-gray-cc)', bg: 'color-mix(in srgb, var(--color-black) var(--op-20), transparent)' },
};

/** برچسب‌های روش پرداخت */
const PAYMENT_METHOD_LABELS = {
    card_to_card: 'کارت‌به‌کارت',
    online: 'آنلاین',
    cash: 'نقدی',
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

// ── OrdersTable ──────────────────────────────────────────────────────────────

export default function OrdersTable({ initialOrders }) {
    // ── State ──────────────────────────────────────────────────────────────────
    const [orders, setOrders] = useState(initialOrders);
    const [receiptModalOrder, setReceiptModal] = useState(null);  // سفارش انتخاب‌شده برای رسید
    const [statusModalOrder, setStatusModal] = useState(null);  // سفارش انتخاب‌شده برای وضعیت
    const [searchQuery, setSearchQuery] = useState('');

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

    /**
     * آپدیت optimistic – state محلی را بدون reload به‌روز می‌کند.
     * پس از تأیید مودال صدا زده می‌شود.
     *
     * @param {number} orderId  - شناسه سفارش
     * @param {object} changes  - تغییرات (مثلاً { paymentStatus: 'paid' })
     */
    function handleOrderUpdate(orderId, changes) {
        setOrders((prev) =>
            prev.map((o) => (o.id === orderId ? { ...o, ...changes } : o))
        );
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
                            const ordConf = ORDER_STATUS_CONFIG[order.orderStatus] || ORDER_STATUS_CONFIG.pending;
                            const isCardToCard = order.paymentMethod === 'card_to_card';
                            const needsReceiptApproval =
                                isCardToCard && order.paymentStatus === 'pending_verification';

                            return (
                                <tr key={order.id} className={styles.table__row}>

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
                                            {/*
                       * دکمه "مشاهده رسید" فقط برای سفارش‌های کارت‌به‌کارت در انتظار تأیید نمایش دارد.
                       * بعد از تأیید یا رد، این دکمه ناپدید می‌شود.
                       */}
                                            {needsReceiptApproval && (
                                                <button
                                                    className={`${styles.action_btn} ${styles['action_btn--receipt']}`}
                                                    onClick={() => setReceiptModal(order)}
                                                    title="مشاهده و تأیید رسید پرداخت"
                                                >
                                                    🧾 رسید
                                                </button>
                                            )}

                                            {/* دکمه تغییر وضعیت همیشه نمایش دارد */}
                                            <button
                                                className={`${styles.action_btn} ${styles['action_btn--status']}`}
                                                onClick={() => setStatusModal(order)}
                                                title="تغییر وضعیت سفارش"
                                            >
                                                ✏️ وضعیت
                                            </button>
                                        </div>
                                    </td>
                                </tr>
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
