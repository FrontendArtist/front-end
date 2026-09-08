'use client';

/**
 * @file src/components/admin/Orders/BulkDeleteModal.jsx
 * @description مودال تایید حذف دسته‌جمعی سفارش‌های رد شده یا در انتظار پرداخت
 */

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Trash2, AlertTriangle, Loader2 } from 'lucide-react';
import styles from './OrdersTable.module.scss';
import { bulkDeleteOrders } from '@/lib/client/admin/ordersClient';

export default function BulkDeleteModal({
    isOpen,
    onClose,
    status = 'canceled', // 'canceled' | 'pending'
    count = 0,
    onSuccess,
}) {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    if (!isOpen) return null;

    const statusTitle = status === 'canceled' ? 'رد شده (لغو شده)' : 'در انتظار پرداخت';

    async function handleConfirmDelete() {
        setIsLoading(true);
        setError(null);

        try {
            const res = await bulkDeleteOrders(status);
            if (res?.success) {
                if (onSuccess) {
                    onSuccess(res);
                }
                onClose();
            } else {
                setError(res?.error || 'خطا در حذف سفارش‌ها');
            }
        } catch (err) {
            setError(err.message || 'خطا در برقراری ارتباط با سرور');
        } finally {
            setIsLoading(false);
        }
    }

    const modalContent = (
        <div
            className={styles.modal_backdrop}
            style={{ zIndex: 99999 }}
            onClick={onClose}
            role="dialog"
            aria-modal="true"
        >
            <div
                className={styles.modal}
                style={{ maxWidth: '480px' }}
                onClick={(e) => e.stopPropagation()}
            >
                {/* ── سرصفحه ──────────────────────────────────────── */}
                <div className={styles.modal__header}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--color-error)' }}>
                        <Trash2 size={22} />
                        <h3 className={styles.modal__title} style={{ color: 'var(--color-error)' }}>
                            حذف گروهی سفارش‌های {statusTitle}
                        </h3>
                    </div>
                    <button
                        type="button"
                        className={styles.modal__close}
                        onClick={onClose}
                        disabled={isLoading}
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* ── متن هشدار ───────────────────────────────────── */}
                <div
                    style={{
                        background: 'rgba(239, 68, 68, 0.12)',
                        border: '1px solid var(--color-error)',
                        borderRadius: '10px',
                        padding: '14px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '8px',
                        color: 'var(--color-text-primary)',
                    }}
                >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--color-error)', fontWeight: 'bold' }}>
                        <AlertTriangle size={20} />
                        <span>هشدار عملیات غیرقابل بازگشت!</span>
                    </div>
                    <p style={{ fontSize: '0.85rem', lineHeight: '1.6', margin: 0 }}>
                        آیا از حذف دائم{' '}
                        <strong>{new Intl.NumberFormat('fa-IR').format(count)}</strong> سفارش{' '}
                        <strong>{statusTitle}</strong> اطمینان دارید؟
                        این سفارش‌ها به طور کامل از پایگاه داده پاک خواهند شد و امکان بازگردانی آن‌ها وجود ندارد.
                    </p>
                </div>

                {error && (
                    <div
                        style={{
                            background: 'rgba(239, 68, 68, 0.15)',
                            color: 'var(--color-error)',
                            padding: '10px 12px',
                            borderRadius: '8px',
                            fontSize: '0.85rem',
                        }}
                    >
                        {error}
                    </div>
                )}

                {/* ── دکمه‌های عملیات ─────────────────────────────── */}
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
                        type="button"
                        onClick={handleConfirmDelete}
                        disabled={isLoading}
                        style={{
                            background: 'var(--color-error)',
                            color: '#ffffff',
                            border: 'none',
                            padding: '10px 18px',
                            borderRadius: '8px',
                            fontSize: '0.85rem',
                            fontWeight: 'bold',
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            boxShadow: '0 4px 14px rgba(239, 68, 68, 0.35)',
                        }}
                    >
                        {isLoading ? (
                            <>
                                <Loader2 size={16} className={styles.spin} />
                                در حال حذف...
                            </>
                        ) : (
                            <>
                                <Trash2 size={16} />
                                تایید و حذف دائم
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );

    return mounted ? createPortal(modalContent, document.body) : modalContent;
}
