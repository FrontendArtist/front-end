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
import { updateOrderStatus } from '@/lib/client/admin/ordersClient';

export default function ReceiptModal({ order, onClose, onUpdate }) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [isRejecting, setIsRejecting] = useState(false);
    const [rejectionReason, setRejectionReason] = useState(order.rejectionReason || '');

    /**
     * ارسال درخواست PUT به API Route ادمین
     * @param {'paid'|'failed'} newStatus
     * @param {string} [reason]
     */
    async function handleDecision(newStatus, reason = '') {
        setLoading(true);
        setError(null);

        try {
            const isPaid = newStatus === 'paid';
            const isFailed = newStatus === 'failed';
            const finalReason = reason.trim() || 'فیش واریزی معتبر نمی‌باشد';

            const updatePayload = {
                documentId: order.documentId,
                paymentStatus: newStatus,
                ...(isPaid ? { orderStatus: 'paid', rejectionReason: null } : {}),
                ...(isFailed ? { orderStatus: 'canceled', rejectionReason: finalReason } : {}),
            };

            await updateOrderStatus(order.id, updatePayload);

            // callback به OrdersTable برای آپدیت state محلی
            onUpdate(order.id, {
                paymentStatus: newStatus,
                ...(isPaid ? { orderStatus: 'paid', rejectionReason: null } : {}),
                ...(isFailed ? { orderStatus: 'canceled', rejectionReason: finalReason } : {}),
            });
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
                    <span>کاربر: <strong>{order.fullName || order.cardHolderName || order.user?.username || '—'}</strong></span>
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

                {/* ── نمایش دلیل رد قبلی در صورت وجود ─────────────── */}
                {order.rejectionReason && !isRejecting && (
                    <div style={{
                        margin: '12px 0',
                        padding: '10px 14px',
                        borderRadius: '8px',
                        background: 'rgba(239, 68, 68, 0.1)',
                        border: '1px solid rgba(239, 68, 68, 0.25)',
                        color: 'var(--color-danger, #ef4444)',
                        fontSize: 'var(--font-sm)',
                    }}>
                        <strong>علت رد قبلی:</strong> {order.rejectionReason}
                    </div>
                )}

                {/* ── پیام خطا ────────────────────────────────────── */}
                {error && <p className={styles.modal__error}>⚠️ {error}</p>}

                {/* ── بخش ورود دلیل رد پرداخت ───────────────────────── */}
                {isRejecting ? (
                    <div style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '10px',
                        padding: '12px',
                        background: 'rgba(239, 68, 68, 0.05)',
                        border: '1px solid rgba(239, 68, 68, 0.2)',
                        borderRadius: '10px',
                        marginTop: '12px'
                    }}>
                        <label style={{ fontSize: 'var(--font-sm)', fontWeight: 'bold', color: '#ef4444' }}>
                            علت رد پرداخت (این دلیل برای کاربر در بخش سفارش نمایش داده می‌شود):
                        </label>
                        <textarea
                            value={rejectionReason}
                            onChange={(e) => setRejectionReason(e.target.value)}
                            placeholder="مثلاً: تصویر فیش ناخوانا است / مبلغ واریز شده مغایرت دارد / فیش تکراری است..."
                            rows={3}
                            style={{
                                width: '100%',
                                padding: '10px 12px',
                                borderRadius: '8px',
                                border: '1px solid rgba(239, 68, 68, 0.3)',
                                background: 'var(--color-bg-surface, #fff)',
                                color: 'inherit',
                                fontFamily: 'inherit',
                                fontSize: 'var(--font-sm)',
                                resize: 'vertical'
                            }}
                        />
                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '4px' }}>
                            <button
                                type="button"
                                className={`${styles.btn} ${styles['btn--ghost']}`}
                                onClick={() => setIsRejecting(false)}
                                disabled={loading}
                            >
                                انصراف
                            </button>
                            <button
                                type="button"
                                className={`${styles.btn} ${styles['btn--danger']}`}
                                onClick={() => handleDecision('failed', rejectionReason)}
                                disabled={loading || !rejectionReason.trim()}
                            >
                                {loading ? 'در حال ثبت...' : 'ثبت قطعی رد پرداخت'}
                            </button>
                        </div>
                    </div>
                ) : (
                    /* ── دکمه‌های تصمیم / وضعیت ────────────────────────── */
                    <div className={styles.modal__actions}>
                        {order.paymentStatus === 'paid' ? (
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', flexWrap: 'wrap', gap: '8px' }}>
                                <span style={{ color: 'var(--color-success)', fontSize: 'var(--font-sm)', fontWeight: 'bold' }}>
                                    ✓ پرداخت این سفارش تأیید شده است
                                </span>
                                <button
                                    type="button"
                                    className={`${styles.btn} ${styles['btn--ghost']}`}
                                    onClick={onClose}
                                >
                                    بستن
                                </button>
                            </div>
                        ) : (
                            <>
                                <button
                                    type="button"
                                    className={`${styles.btn} ${styles['btn--danger']}`}
                                    onClick={() => setIsRejecting(true)}
                                    disabled={loading}
                                >
                                    ✕ رد پرداخت
                                </button>
                                <button
                                    type="button"
                                    className={`${styles.btn} ${styles['btn--success']}`}
                                    onClick={() => handleDecision('paid')}
                                    disabled={loading}
                                >
                                    {loading ? '...' : '✓ تأیید پرداخت'}
                                </button>
                            </>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
