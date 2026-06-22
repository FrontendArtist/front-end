'use client';

/**
 * @file src/components/admin/Orders/StatusUpdateModal.jsx
 * @description مودال تغییر وضعیت سفارش و ثبت کد رهگیری
 *
 * عملکرد:
 *   - dropdown برای انتخاب orderStatus جدید.
 *   - اگر وضعیت 'shipped' انتخاب شود، فیلد کد رهگیری نمایش داده می‌شود.
 *   - پس از ذخیره، آپدیت به Strapi ارسال می‌شود.
 *
 * @param {object}   props
 * @param {object}   props.order    - سفارش فعلی
 * @param {Function} props.onClose  - بستن مودال
 * @param {Function} props.onUpdate - callback بعد از آپدیت موفق
 */

import { useState } from 'react';
import styles from './OrdersTable.module.scss';

// وضعیت‌های ممکن برای سفارش (دقیقاً مطابق Schema با فاصله‌های احتمالی)
const ORDER_STATUSES = [
    { value: 'pending', label: 'در حال پردازش' },
    { value: 'paid ', label: 'پرداخت شده' },
    { value: 'shipped ', label: 'ارسال شده' },
    { value: 'delivered ', label: 'تحویل داده شده' },
    { value: 'canceled ', label: 'لغو شده' },
];

export default function StatusUpdateModal({ order, onClose, onUpdate }) {
    const [selectedStatus, setSelectedStatus] = useState(order.orderStatus || 'pending');
    const [trackingNumber, setTrackingNumber] = useState(order.trackingNumber || '');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    // آیا وضعیت انتخاب‌شده نیاز به کد رهگیری دارد؟
    const needsTracking = selectedStatus === 'shipped ';

    async function handleSave() {
        // اعتبارسنجی: اگر 'shipped' انتخاب شده، کد رهگیری اجباری است
        if (needsTracking && !trackingNumber.trim()) {
            setError('لطفاً کد رهگیری مرسوله را وارد کنید.');
            return;
        }

        setLoading(true);
        setError(null);

        // ساخت payload برای Strapi
        const payload = {
            orderStatus: selectedStatus,
            // فقط کد رهگیری را اگر 'shipped' بود اضافه کن
            ...(needsTracking && { trackingNumber: trackingNumber.trim() }),
        };

        try {
            const res = await fetch(`/api/admin/orders/${order.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    // documentId برای Strapi v5 لازم است
                    documentId: order.documentId,
                    ...payload,
                }),
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || 'خطا در ذخیره وضعیت');
            }

            // آپدیت state محلی در OrdersTable
            onUpdate(order.id, {
                orderStatus: selectedStatus,
                ...(needsTracking && { trackingNumber: trackingNumber.trim() }),
            });
            onClose();
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className={styles.modal_backdrop} onClick={onClose} role="dialog" aria-modal="true">
            <div className={styles.modal} onClick={(e) => e.stopPropagation()}>

                {/* ── سرصفحه ──────────────────────────────────────── */}
                <div className={styles.modal__header}>
                    <h2 className={styles.modal__title}>تغییر وضعیت سفارش</h2>
                    <button className={styles.modal__close} onClick={onClose} aria-label="بستن">✕</button>
                </div>

                {/* ── اطلاعات سفارش ────────────────────────────────── */}
                <div className={styles.modal__meta}>
                    <span>سفارش: <strong>{order.orderNumber}</strong></span>
                    <span>کاربر: <strong>{order.user?.username || '—'}</strong></span>
                </div>

                {/* ── انتخاب وضعیت ─────────────────────────────────── */}
                <div className={styles.modal__field}>
                    <label className={styles.modal__label} htmlFor="status-select">
                        وضعیت جدید
                    </label>
                    <select
                        id="status-select"
                        className={styles.modal__select}
                        value={selectedStatus}
                        onChange={(e) => {
                            setSelectedStatus(e.target.value);
                            setError(null);
                        }}
                    >
                        {ORDER_STATUSES.map((s) => (
                            <option key={s.value} value={s.value}>
                                {s.label}
                            </option>
                        ))}
                    </select>
                </div>

                {/*
         * فیلد کد رهگیری – فقط زمانی نمایش داده می‌شود که وضعیت 'shipped' باشد.
         * این UX pattern از کاربر می‌خواهد قبل از تغییر وضعیت، کد را وارد کند.
         */}
                {needsTracking && (
                    <div className={styles.modal__field}>
                        <label className={styles.modal__label} htmlFor="tracking-input">
                            کد رهگیری مرسوله <span className={styles.modal__required}>*</span>
                        </label>
                        <input
                            id="tracking-input"
                            type="text"
                            className={styles.modal__input}
                            placeholder="مثلاً: 1234567890"
                            value={trackingNumber}
                            onChange={(e) => {
                                setTrackingNumber(e.target.value);
                                setError(null);
                            }}
                        />
                        <span className={styles.modal__hint}>
                            این کد در پروفایل کاربر نمایش داده خواهد شد.
                        </span>
                    </div>
                )}

                {error && <p className={styles.modal__error}>⚠️ {error}</p>}

                {/* ── دکمه‌ها ────────────────────────────────────────── */}
                <div className={styles.modal__actions}>
                    <button
                        className={`${styles.btn} ${styles['btn--ghost']}`}
                        onClick={onClose}
                        disabled={loading}
                    >
                        انصراف
                    </button>
                    <button
                        className={`${styles.btn} ${styles['btn--primary']}`}
                        onClick={handleSave}
                        disabled={loading}
                    >
                        {loading ? 'در حال ذخیره...' : '✓ ذخیره تغییرات'}
                    </button>
                </div>
            </div>
        </div>
    );
}
