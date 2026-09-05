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
import { updateOrderStatus } from '@/lib/client/admin/ordersClient';

// وضعیت‌های ممکن برای سفارش (دقیقاً مطابق Schema)
const ORDER_STATUSES = [
    { value: 'pending', label: 'در حال پردازش' },
    { value: 'paid', label: 'پرداخت شده' },
    { value: 'shipped', label: 'ارسال شده' },
    { value: 'delivered', label: 'تحویل داده شده' },
    { value: 'canceled', label: 'رد شده' },
];

export default function StatusUpdateModal({ order, onClose, onUpdate }) {
    const [selectedStatus, setSelectedStatus] = useState(order.orderStatus?.trim() || 'pending');
    const [trackingNumber, setTrackingNumber] = useState(order.trackingNumber || '');
    const [rejectionReason, setRejectionReason] = useState(order.rejectionReason || '');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    // آیا وضعیت انتخاب‌شده نیاز به کد رهگیری دارد؟
    const needsTracking = selectedStatus.trim() === 'shipped';
    // آیا وضعیت به لغو شده تغییر کرده است؟
    const isCanceled = selectedStatus.trim() === 'canceled';

    async function handleSave() {
        // اعتبارسنجی: اگر 'shipped' انتخاب شده، کد رهگیری اجباری است
        if (needsTracking && !trackingNumber.trim()) {
            setError('لطفاً کد رهگیری مرسوله را وارد کنید.');
            return;
        }

        // اعتبارسنجی: اگر 'canceled' انتخاب شده، دلیل لغو اجباری است
        if (isCanceled && !rejectionReason.trim()) {
            setError('لطفاً دلیل رد سفارش را برای نمایش به کاربر وارد کنید.');
            return;
        }

        setLoading(true);
        setError(null);

        // ساخت payload برای Strapi
        const payload = {
            orderStatus: selectedStatus,
            // اگر وضعیت به پرداخت شده تغییر کند، وضعیت پرداخت هم paid می‌شود
            ...(selectedStatus === 'paid' && { paymentStatus: 'paid', rejectionReason: null }),
            // اگر وضعیت لغو شده باشد، وضعیت پرداخت failed و دلیل ذخیره می‌شود
            ...(isCanceled && { paymentStatus: 'failed', rejectionReason: rejectionReason.trim() }),
            // فقط کد رهگیری را اگر 'shipped' بود اضافه کن
            ...(needsTracking && { trackingNumber: trackingNumber.trim() }),
        };

        try {
            await updateOrderStatus(order.id, {
                documentId: order.documentId,
                ...payload,
            });

            // آپدیت state محلی در OrdersTable
            onUpdate(order.id, {
                orderStatus: selectedStatus,
                ...(selectedStatus === 'paid' && { paymentStatus: 'paid', rejectionReason: null }),
                ...(isCanceled && { paymentStatus: 'failed', rejectionReason: rejectionReason.trim() }),
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
                    <span>کاربر: <strong>{order.fullName || order.cardHolderName || order.user?.username || '—'}</strong></span>
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

                {/* ── فیلد دلیل لغو — فقط وقتی وضعیت 'canceled' باشد ─── */}
                {isCanceled && (
                    <div className={styles.modal__field}>
                        <label className={styles.modal__label} htmlFor="rejection-input" style={{ color: '#ef4444' }}>
                            دلیل رد سفارش <span className={styles.modal__required}>*</span>
                        </label>
                        <textarea
                            id="rejection-input"
                            rows={3}
                            className={styles.modal__input}
                            placeholder="علت رد سفارش را بنویسید (این دلیل برای کاربر در بخش جزئیات سفارش نمایش داده می‌شود)..."
                            value={rejectionReason}
                            onChange={(e) => {
                                setRejectionReason(e.target.value);
                                setError(null);
                            }}
                            style={{ resize: 'vertical' }}
                        />
                        <span className={styles.modal__hint}>
                            این پیام در بخش سفارشات کاربر نمایش داده می‌شود و کاربر می‌تواند بر اساس آن فیش صحیح ارسال کند.
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
