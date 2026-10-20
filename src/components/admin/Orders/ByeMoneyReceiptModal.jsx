'use client';

import React from 'react';
import styles from './OrdersTable.module.scss';
import { CheckCircle2, Clock, X, Receipt } from 'lucide-react';

export default function ByeMoneyReceiptModal({ order, onClose }) {
    if (!order) return null;

    const formatDate = (dateString) => {
        if (!dateString) return '—';
        try {
            return new Intl.DateTimeFormat('fa-IR', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            }).format(new Date(dateString));
        } catch {
            return '—';
        }
    };

    const courseItem = order.items?.[0] || {};

    return (
        <div className={styles.modal_overlay} onClick={onClose} role="dialog" aria-modal="true">
            <div
                className={styles.modal_box}
                style={{ maxWidth: '600px', width: '90%' }}
                onClick={(e) => e.stopPropagation()}
            >
                {/* سرصفحه مودال */}
                <div className={styles.modal_header} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Receipt size={20} color="#34d399" />
                        <h3 className={styles.modal_title}>رسید خرید دوره (بای‌مانی)</h3>
                    </div>
                    <button
                        type="button"
                        className={styles.modal_close}
                        onClick={onClose}
                        aria-label="بستن"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* محتوای رسید */}
                <div className={styles.modal_body} style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '16px 0' }}>
                    <div style={{
                        backgroundColor: 'rgba(52, 211, 153, 0.08)',
                        border: '1px solid rgba(52, 211, 153, 0.25)',
                        borderRadius: '8px',
                        padding: '12px 16px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        color: '#34d399',
                        fontSize: '0.9rem'
                    }}>
                        <CheckCircle2 size={18} />
                        <span>این خرید مستقیماً در سامانه بای‌مانی ثبت شده و دارای وضعیت مالی قطعی (Paid) است.</span>
                    </div>

                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                        gap: '12px',
                        backgroundColor: 'var(--color-bg-secondary, rgba(255, 255, 255, 0.03))',
                        padding: '16px',
                        borderRadius: '8px',
                        border: '1px solid rgba(255, 255, 255, 0.07)'
                    }}>
                        <div>
                            <span style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', display: 'block' }}>شناسه خرید (Purchase ID)</span>
                            <span style={{ fontSize: '0.85rem', fontFamily: 'monospace', fontWeight: 'bold' }} dir="ltr">{order.documentId || order.id}</span>
                        </div>

                        <div>
                            <span style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', display: 'block' }}>نام خریدار</span>
                            <span style={{ fontSize: '0.9rem', fontWeight: 'bold' }}>{order.buyerDisplayName || order.fullName || '—'}</span>
                        </div>

                        {order.buyerExternalUserId && (
                            <div>
                                <span style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', display: 'block' }}>شناسه کاربر در استراپی</span>
                                <span style={{ fontSize: '0.85rem', fontFamily: 'monospace' }} dir="ltr">{order.buyerExternalUserId}</span>
                            </div>
                        )}

                        <div>
                            <span style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', display: 'block' }}>عنوان دوره</span>
                            <span style={{ fontSize: '0.9rem', fontWeight: 'bold' }}>{courseItem.title || 'دوره آموزشی'}</span>
                        </div>

                        {order.baseAmountInNoor != null && (
                            <div>
                                <span style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', display: 'block' }}>مبلغ پایه</span>
                                <span style={{ fontSize: '0.9rem' }}>{Number(order.baseAmountInNoor).toLocaleString('fa-IR')} نور</span>
                            </div>
                        )}

                        {order.discountAmountInNoor != null && order.discountAmountInNoor > 0 && (
                            <div>
                                <span style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', display: 'block' }}>مبلغ تخفیف</span>
                                <span style={{ fontSize: '0.9rem', color: '#f87171' }}>{Number(order.discountAmountInNoor).toLocaleString('fa-IR')} نور</span>
                            </div>
                        )}

                        {order.couponCode && (
                            <div>
                                <span style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', display: 'block' }}>کد تخفیف</span>
                                <span style={{ fontSize: '0.85rem', fontFamily: 'monospace' }} dir="ltr">{order.couponCode}</span>
                            </div>
                        )}

                        <div>
                            <span style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', display: 'block' }}>مبلغ پرداختی نهایی</span>
                            <span style={{ fontSize: '1rem', fontWeight: 'bold', color: '#34d399' }}>
                                {Number(order.totalPrice || 0).toLocaleString('fa-IR')} نور
                            </span>
                        </div>

                        {/* نرخ مرجع هنگام خرید: فقط اگر در پاسخ رسید مقدار داشت نمایش داده شود؛ اگر null بود چیزی نشان داده نشود و ریال هم نمایش داده نشود */}
                        {order.referenceRialPerNoorAtPurchaseTime != null && (
                            <div>
                                <span style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', display: 'block' }}>نرخ مرجع هنگام خرید</span>
                                <span style={{ fontSize: '0.9rem' }} dir="ltr">
                                    {Number(order.referenceRialPerNoorAtPurchaseTime).toLocaleString('fa-IR')}
                                </span>
                            </div>
                        )}

                        <div>
                            <span style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', display: 'block' }}>زمان ثبت تراکنش</span>
                            <span style={{ fontSize: '0.85rem' }}>{formatDate(order.createdAt)}</span>
                        </div>

                        <div>
                            <span style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', display: 'block' }}>وضعیت تحویل</span>
                            <span style={{
                                fontSize: '0.85rem',
                                fontWeight: 'bold',
                                color: order.deliveryStatus === 'Delivered' ? '#34d399' : '#fbbf24'
                            }}>
                                {order.deliveryStatus === 'Delivered' ? 'تحویل داده شد (Delivered)' : 'در انتظار فعال‌سازی (Pending)'}
                            </span>
                        </div>
                    </div>
                </div>

                {/* پاورقی مودال (صرفاً دکمه بستن) */}
                <div className={styles.modal_footer} style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '12px', borderTop: '1px solid rgba(255, 255, 255, 0.08)' }}>
                    <button
                        type="button"
                        className={styles.modal_btn_cancel}
                        onClick={onClose}
                    >
                        بستن
                    </button>
                </div>
            </div>
        </div>
    );
}

