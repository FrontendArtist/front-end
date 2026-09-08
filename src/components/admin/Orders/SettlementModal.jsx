'use client';

/**
 * @file src/components/admin/Orders/SettlementModal.jsx
 * @description مودال بستن دوره مالی و ثبت سند تسویه حساب با فروشندگان
 */

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import styles from './OrdersTable.module.scss';
import { createAdminSettlement } from '@/lib/client/admin/ordersClient';

export default function SettlementModal({
    isOpen,
    onClose,
    onSuccess,
    pendingRevenue = 0,
    eligibleCount = 0,
}) {
    const [title, setTitle] = useState('');
    const [notes, setNotes] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    // ریست کردن فرم هر بار که مودال باز می‌شود
    useEffect(() => {
        if (isOpen) {
            setTitle('');
            setNotes('');
            setError(null);
        }
    }, [isOpen]);

    // ← این early return باید بعد از تمام hooks باشد
    if (!isOpen) return null;

    const formattedRevenue = new Intl.NumberFormat('fa-IR').format(pendingRevenue || 0);
    const formattedCount = new Intl.NumberFormat('fa-IR').format(eligibleCount || 0);

    async function handleSubmit(e) {
        e.preventDefault();
        if (eligibleCount <= 0 && pendingRevenue <= 0) {
            setError('سفارش پرداخت‌شده‌ای در دوره جاری برای تسویه وجود ندارد.');
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            const res = await createAdminSettlement({
                title: title.trim() || undefined,
                notes: notes.trim() || undefined,
            });

            if (res?.success) {
                if (onSuccess) {
                    onSuccess(res.settlement);
                }
                onClose();
            } else {
                setError(res?.error || 'خطا در ثبت تسویه');
            }
        } catch (err) {
            setError(err.message || 'خطا در برقراری ارتباط با سرور');
        } finally {
            setIsLoading(false);
        }
    }

    const modalContent = (
        <div className={styles.modal_backdrop} style={{ zIndex: 99999 }} onClick={onClose} role="dialog" aria-modal="true">
            <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
                {/* ── سرصفحه مودال ────────────────────────────── */}
                <div className={styles.modal__header}>
                    <h3 className={styles.modal__title}>
                        بستن دوره مالی و تسویه
                    </h3>
                    <button
                        type="button"
                        className={styles.modal__close}
                        onClick={onClose}
                        disabled={isLoading}
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* ── خلاصه دوره جاری ──────────────────────────── */}
                <div
                    style={{
                        background: 'rgba(0, 0, 0, 0.35)',
                        border: '1px solid rgba(212, 175, 55, 0.2)',
                        borderRadius: '12px',
                        padding: '16px',
                        display: 'grid',
                        gridTemplateColumns: '1fr 1fr',
                        gap: '12px',
                    }}
                >
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <span style={{ fontSize: '0.8rem', color: 'var(--color-card-text)' }}>
                            سفارش‌های آماده تسویه:
                        </span>
                        <strong style={{ fontSize: '1.1rem', color: 'var(--color-text-primary)' }}>
                            {formattedCount} سفارش
                        </strong>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <span style={{ fontSize: '0.8rem', color: 'var(--color-card-text)' }}>
                            مبلغ کل قابل تسویه:
                        </span>
                        <strong style={{ fontSize: '1.1rem', color: 'var(--color-success)' }}>
                            {formattedRevenue} تومان
                        </strong>
                    </div>
                </div>



                {/* ── فرم اطلاعات دوره ─────────────────────────── */}
                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div className={styles.modal__field}>
                        <label className={styles.modal__label}>
                            عنوان دوره :
                        </label>
                        <input
                            type="text"
                            className={styles.modal__input}
                            placeholder="مثال: تسویه با فروشندگان — نیمه دوم اسفند"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            disabled={isLoading}
                        />

                    </div>

                    <div className={styles.modal__field}>
                        <label className={styles.modal__label}>
                            یادداشت  (اختیاری):
                        </label>
                        <textarea
                            className={styles.modal__input}
                            rows={3}
                            placeholder="توضیحات..."
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            disabled={isLoading}
                            style={{ resize: 'vertical' }}
                        />
                    </div>

                    {error && (
                        <div
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                background: 'rgba(239, 68, 68, 0.12)',
                                border: '1px solid var(--color-error)',
                                color: 'var(--color-error)',
                                padding: '10px 12px',
                                borderRadius: '8px',
                                fontSize: '0.85rem',
                            }}
                        >
                            <AlertCircle size={18} />
                            <span>{error}</span>
                        </div>
                    )}

                    <div className={styles.modal__actions}>
                        <button
                            type="button"
                            className={styles.modal__btn_cancel}
                            onClick={onClose}
                            disabled={isLoading}
                        >
                            انصراف
                        </button>
                        <button
                            type="submit"
                            className={styles.modal__btn_save}
                            disabled={isLoading || (eligibleCount <= 0 && pendingRevenue <= 0)}
                            style={{
                                background: 'var(--color-success)',
                                color: '#fff',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '6px',
                                justifyContent: 'center',
                            }}
                        >
                            {isLoading ? (
                                <>
                                    <Loader2 size={16} className={styles.spin} />
                                    در حال ثبت تسویه...
                                </>
                            ) : (
                                <>
                                    <CheckCircle size={16} />
                                    تایید و بستن دوره مالی
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );

    return mounted ? createPortal(modalContent, document.body) : modalContent;
}
