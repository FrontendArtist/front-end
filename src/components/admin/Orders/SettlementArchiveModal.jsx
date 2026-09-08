'use client';

/**
 * @file src/components/admin/Orders/SettlementArchiveModal.jsx
 * @description مودال آرشیو و بایگانی دوره‌های تسویه‌شده (پوشه‌های قبلی)
 */

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Folder, Calendar, ShoppingBag, CreditCard, ChevronLeft, Loader2, AlertCircle } from 'lucide-react';
import styles from './OrdersTable.module.scss';
import { fetchAdminSettlements } from '@/lib/client/admin/ordersClient';

export default function SettlementArchiveModal({
    isOpen,
    onClose,
    onSelectSettlement,
    activeSettlementId = null,
}) {
    const [settlements, setSettlements] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    useEffect(() => {
        if (!isOpen) return;

        let isCancelled = false;
        async function loadSettlements() {
            setIsLoading(true);
            setError(null);
            try {
                const data = await fetchAdminSettlements();
                if (!isCancelled) {
                    setSettlements(data || []);
                }
            } catch (err) {
                if (!isCancelled) {
                    setError(err.message || 'خطا در واکشی دوره‌های تسویه');
                }
            } finally {
                if (!isCancelled) {
                    setIsLoading(false);
                }
            }
        }

        loadSettlements();
        return () => {
            isCancelled = true;
        };
    }, [isOpen]);

    if (!isOpen) return null;

    const formatDate = (dateStr) => {
        if (!dateStr) return '—';
        try {
            return new Intl.DateTimeFormat('fa-IR', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
            }).format(new Date(dateStr));
        } catch {
            return dateStr;
        }
    };

    const formatAmount = (num) =>
        new Intl.NumberFormat('fa-IR').format(Number(num || 0)) + ' تومان';

    const modalContent = (
        <div className={styles.modal_backdrop} style={{ zIndex: 99999 }} onClick={onClose} role="dialog" aria-modal="true">
            <div
                className={styles.modal}
                style={{ maxWidth: '650px' }}
                onClick={(e) => e.stopPropagation()}
            >
                {/* ── سرصفحه مودال ────────────────────────────── */}
                <div className={styles.modal__header}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Folder size={22} style={{ color: 'var(--color-title-hover)' }} />
                        <h3 className={styles.modal__title}>
                            بایگانی دوره‌های تسویه با فروشندگان
                        </h3>
                    </div>
                    <button
                        type="button"
                        className={styles.modal__close}
                        onClick={onClose}
                    >
                        <X size={20} />
                    </button>
                </div>

                <p style={{ fontSize: '0.85rem', color: 'var(--color-card-text)', margin: 0 }}>
                    لیست دوره‌های مالی بسته‌شده و آرشیو سفارش‌های مربوط به هر دوره. با انتخاب هر پوشه، می‌توانید فاکتورهای آن دوره را مشاهده فرمایید.
                </p>

                {/* ── بدنه و لیست پوشه‌ها ───────────────────────── */}
                <div style={{ maxHeight: '55vh', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px', paddingLeft: '4px' }}>
                    {isLoading ? (
                        <div style={{ padding: '40px 0', textAlign: 'center', color: 'var(--color-card-text)' }}>
                            <Loader2 size={28} className={styles.spin} style={{ margin: '0 auto 8px' }} />
                            <p style={{ fontSize: '0.85rem' }}>در حال بارگذاری لیست دوره‌ها...</p>
                        </div>
                    ) : error ? (
                        <div
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                background: 'rgba(239, 68, 68, 0.12)',
                                color: 'var(--color-error)',
                                padding: '12px',
                                borderRadius: '8px',
                                fontSize: '0.85rem',
                            }}
                        >
                            <AlertCircle size={18} />
                            <span>{error}</span>
                        </div>
                    ) : settlements.length === 0 ? (
                        <div style={{ padding: '40px 0', textAlign: 'center', color: 'var(--color-card-text)' }}>
                            <Folder size={40} style={{ opacity: 0.3, margin: '0 auto 10px' }} />
                            <p style={{ fontSize: '0.9rem', margin: 0 }}>هنوز هیچ دوره تسویه‌ای ثبت نشده است.</p>
                            <span style={{ fontSize: '0.8rem', opacity: 0.7 }}>
                                پس از تسویه حساب با فروشندگان، با کلیک بر روی دکمه «بستن دوره»، دوره‌های قبلی در اینجا آرشیو می‌شوند.
                            </span>
                        </div>
                    ) : (
                        settlements.map((s) => {
                            const isCurrentSelected = activeSettlementId && (String(activeSettlementId) === String(s.id) || String(activeSettlementId) === String(s.documentId));

                            return (
                                <div
                                    key={s.id || s.documentId}
                                    style={{
                                        border: isCurrentSelected
                                            ? '1.5px solid var(--color-title-hover)'
                                            : '1px solid rgba(212, 175, 55, 0.15)',
                                        background: isCurrentSelected
                                            ? 'rgba(212, 175, 55, 0.1)'
                                            : 'rgba(0, 0, 0, 0.25)',
                                        borderRadius: '12px',
                                        padding: '16px',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: '10px',
                                        transition: 'all 0.2s',
                                    }}
                                >
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <span style={{ fontSize: '1.2rem' }}>📁</span>
                                            <strong style={{ fontSize: '0.95rem', color: 'var(--color-text-primary)' }}>
                                                {s.title}
                                            </strong>
                                            {isCurrentSelected && (
                                                <span
                                                    style={{
                                                        background: 'var(--color-title-hover)',
                                                        color: '#000',
                                                        fontSize: '0.7rem',
                                                        fontWeight: 'bold',
                                                        padding: '2px 8px',
                                                        borderRadius: '12px',
                                                    }}
                                                >
                                                    در حال مشاهده
                                                </span>
                                            )}
                                        </div>

                                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.78rem', color: 'var(--color-card-text)' }}>
                                            <Calendar size={13} />
                                            <span>{formatDate(s.settledAt)}</span>
                                        </div>
                                    </div>

                                    {/* آمار عددی دوره */}
                                    <div
                                        style={{
                                            display: 'grid',
                                            gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
                                            gap: '10px',
                                            background: 'rgba(0, 0, 0, 0.3)',
                                            padding: '10px 14px',
                                            borderRadius: '8px',
                                        }}
                                    >
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                            <ShoppingBag size={15} style={{ color: 'var(--color-blue-light)' }} />
                                            <span style={{ fontSize: '0.8rem', color: 'var(--color-card-text)' }}>تعداد سفارش‌ها:</span>
                                            <strong style={{ fontSize: '0.85rem', color: 'var(--color-text-primary)' }}>
                                                {new Intl.NumberFormat('fa-IR').format(s.ordersCount)}
                                            </strong>
                                        </div>

                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                            <CreditCard size={15} style={{ color: 'var(--color-success)' }} />
                                            <span style={{ fontSize: '0.8rem', color: 'var(--color-card-text)' }}>مبلغ تسویه‌شده:</span>
                                            <strong style={{ fontSize: '0.85rem', color: 'var(--color-success)' }}>
                                                {formatAmount(s.totalAmount)}
                                            </strong>
                                        </div>
                                    </div>

                                    {s.notes && (
                                        <p style={{ fontSize: '0.8rem', color: 'var(--color-card-text)', margin: 0, opacity: 0.85 }}>
                                            📝 {s.notes}
                                        </p>
                                    )}

                                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '2px' }}>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                if (onSelectSettlement) {
                                                    onSelectSettlement(s);
                                                }
                                                onClose();
                                            }}
                                            style={{
                                                background: isCurrentSelected ? 'rgba(212, 175, 55, 0.2)' : 'var(--color-title-hover)',
                                                color: isCurrentSelected ? 'var(--color-text-primary)' : 'var(--color-bg-primary)',
                                                border: 'none',
                                                borderRadius: '6px',
                                                padding: '6px 14px',
                                                fontSize: '0.8rem',
                                                fontWeight: 'bold',
                                                cursor: 'pointer',
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                gap: '4px',
                                                transition: 'opacity 0.2s',
                                            }}
                                        >
                                            <span>مشاهده سفارش‌های این پوشه</span>
                                            <ChevronLeft size={14} />
                                        </button>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>

                <div className={styles.modal__actions} style={{ justifyContent: 'flex-start', marginTop: '8px' }}>
                    <button
                        type="button"
                        className={styles.modal__btn_cancel}
                        onClick={onClose}
                    >
                        بستن
                    </button>
                </div>
            </div>
        </div>
    );

    return mounted ? createPortal(modalContent, document.body) : modalContent;
}
