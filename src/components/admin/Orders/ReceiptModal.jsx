'use client';

/**
 * @file src/components/admin/Orders/ReceiptModal.jsx
 * @description مودال نمایش تصویر رسید پرداخت کارت‌به‌کارت
 *
 * عملکرد:
 *   - تصویر رسید آپلودشده توسط کاربر را نمایش می‌دهد.
 *   - دو دکمه دارد: "تأیید پرداخت" و "رد کردن".
 *   - پس از تأیید، paymentStatus به 'paid' تغییر می‌کند.
 *   - پس از رد، paymentStatus به 'rejected' تغییر می‌کند.
 *
 * @param {object}   props
 * @param {object}   props.order       - سفارش کامل
 * @param {Function} props.onClose     - بستن مودال
 * @param {Function} props.onUpdate    - callback پس از آپدیت موفق (داده جدید)
 */

import { useState } from 'react';
import styles from './OrdersTable.module.scss';

export default function ReceiptModal({ order, onClose, onUpdate }) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    /**
     * ارسال درخواست PUT به API Route ادمین
     * @param {'paid'|'rejected'} newStatus
     */
    async function handleDecision(newStatus) {
        setLoading(true);
        setError(null);

        try {
            const res = await fetch(`/api/admin/orders/${order.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    // documentId برای Strapi v5 لازم است
                    documentId: order.documentId,
                    paymentStatus: newStatus,
                }),
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || 'خطا در آپدیت');
            }

            // callback به OrdersTable برای آپدیت state محلی
            onUpdate(order.id, { paymentStatus: newStatus });
            onClose();
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }

    return (
        // backdrop overlay
        <div className={styles.modal_backdrop} onClick={onClose} role="dialog" aria-modal="true">
            <div
                className={styles.modal}
                onClick={(e) => e.stopPropagation()} // جلوگیری از بسته شدن با کلیک روی مودال
            >
                {/* ── سرصفحه ──────────────────────────────────────── */}
                <div className={styles.modal__header}>
                    <h2 className={styles.modal__title}>رسید پرداخت</h2>
                    <button className={styles.modal__close} onClick={onClose} aria-label="بستن">✕</button>
                </div>

                {/* ── اطلاعات سفارش ────────────────────────────────── */}
                <div className={styles.modal__meta}>
                    <span>سفارش: <strong>{order.orderNumber}</strong></span>
                    <span>کاربر: <strong>{order.user?.username || '—'}</strong></span>
                    {order.cardHolderName && (
                        <span>نام صاحب کارت: <strong>{order.cardHolderName}</strong></span>
                    )}
                    <span>
                        مبلغ: <strong>
                            {new Intl.NumberFormat('fa-IR').format(order.totalPrice)} تومان
                        </strong>
                    </span>
                </div>

                {/* ── تصویر رسید ──────────────────────────────────── */}
                <div className={styles.modal__receipt}>
                    {order.receiptImageUrl ? (
                        <a href={order.receiptImageUrl} target="_blank" rel="noopener noreferrer">
                            <img
                                src={order.receiptImageUrl}
                                alt="رسید پرداخت"
                                className={styles.modal__receipt_img}
                            />
                            <span className={styles.modal__receipt_hint}>برای بزرگ‌نمایی کلیک کنید</span>
                        </a>
                    ) : (
                        <div className={styles.modal__receipt_empty}>
                            <span>📄</span>
                            <p>تصویر رسیدی ضمیمه نشده است.</p>
                        </div>
                    )}
                </div>

                {/* ── پیام خطا ────────────────────────────────────── */}
                {error && <p className={styles.modal__error}>⚠️ {error}</p>}

                {/* ── دکمه‌های تصمیم ──────────────────────────────── */}
                <div className={styles.modal__actions}>
                    <button
                        className={`${styles.btn} ${styles['btn--danger']}`}
                        onClick={() => handleDecision('rejected')}
                        disabled={loading}
                    >
                        {loading ? '...' : '✕ رد پرداخت'}
                    </button>
                    <button
                        className={`${styles.btn} ${styles['btn--success']}`}
                        onClick={() => handleDecision('paid')}
                        disabled={loading}
                    >
                        {loading ? '...' : '✓ تأیید پرداخت'}
                    </button>
                </div>
            </div>
        </div>
    );
}
