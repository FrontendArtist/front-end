'use client';

/**
 * @file WithdrawalActionModal.jsx
 * @description «پرداخت شد» (شناسهٔ پرداخت + فیش، هر دو الزامی) و «پرداخت نشد» (علت؛ نور به کاربر برمی‌گردد)
 * برای خروج نور در انتظار پرداخت (I11-W). خطای `{code,error}` بای‌مانی همان‌طور نمایش داده می‌شود.
 */

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, AlertTriangle, CheckCircle2, Undo2 } from 'lucide-react';
import { markAdminNoorWithdrawalPaid, reverseAdminNoorWithdrawal } from '@/lib/admin/adminByeMoneyClient';
import { formatNumber, validateReceiptFile } from '@/lib/admin/noorWithdrawal';
import shell from '@/components/admin/Users/AdminNoorGiftModal/AdminNoorGiftModal.module.scss';
import { AdminToastViewport, useAdminToast } from '@/components/admin/Shared/AdminToast';
import styles from './NoorWithdrawals.module.scss';

/** @param {{ mode: 'pay'|'reverse', withdrawal: object, onClose: () => void, onDone: (dto: object) => void }} props */
export default function WithdrawalActionModal({ mode, withdrawal, onClose, onDone }) {
    const [mounted, setMounted] = useState(false);
    const [paymentReference, setPaymentReference] = useState('');
    const [receipt, setReceipt] = useState(null);
    const [reason, setReason] = useState('');
    const [loading, setLoading] = useState(false);
    const { toasts, toast, dismiss } = useAdminToast();
    const showError = (message) => toast(message, 'error');

    useEffect(() => setMounted(true), []);

    useEffect(() => {
        const onKey = (e) => { if (e.key === 'Escape' && !loading) onClose?.(); };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [loading, onClose]);

    const isPay = mode === 'pay';

    const submit = async (e) => {
        e.preventDefault();

        if (isPay) {
            const ref = paymentReference.trim();
            if (!ref || ref.length > 100) return showError('شناسهٔ پرداخت الزامی است (حداکثر ۱۰۰ نویسه).');
            if (!receipt) return showError('بارگذاری فیش الزامی است.');
            const receiptError = validateReceiptFile(receipt);
            if (receiptError) return showError(receiptError);
        } else {
            const text = reason.trim();
            if (!text || text.length > 500) return showError('علت الزامی است (حداکثر ۵۰۰ نویسه).');
        }

        setLoading(true);
        try {
            const res = isPay
                ? await markAdminNoorWithdrawalPaid({ id: withdrawal.id, paymentReference: paymentReference.trim(), receipt })
                : await reverseAdminNoorWithdrawal({ id: withdrawal.id, reason: reason.trim() });
            if (!res.success) {
                showError(res.error || `عملیات ناموفق بود (کد خطا: ${res.status || 'نامشخص'}).`);
                return;
            }
            onDone?.(res.data);
        } catch {
            showError('خطای غیرمنتظره در برقراری ارتباط با سرور.');
        } finally {
            setLoading(false);
        }
    };

    if (!mounted) return null;

    return createPortal(
        <>
        <div className={shell.backdrop} onClick={(e) => { if (e.target === e.currentTarget && !loading) onClose?.(); }}>
            <div className={shell.modal} role="dialog" aria-modal="true" aria-labelledby="nw-action-title">
                <div className={shell.header}>
                    <div className={shell.header__titleWrap}>
                        <div className={shell.header__icon}>
                            {isPay ? <CheckCircle2 size={20} /> : <Undo2 size={20} />}
                        </div>
                        <h2 className={shell.header__title} id="nw-action-title">
                            {isPay ? 'ثبت پرداخت خروج نور' : 'پرداخت نشد'}
                        </h2>
                    </div>
                    <button type="button" className={shell.header__closeBtn} onClick={onClose} disabled={loading} aria-label="بستن">
                        <X size={20} />
                    </button>
                </div>
                <form className={shell.body} onSubmit={submit} noValidate>
                    <div className={styles.summaryBox}>
                        <div><span>نور: </span><strong>{formatNumber(withdrawal.amountNoor)}</strong></div>
                        <div><span>مبلغ واریز: </span><strong>{formatNumber(withdrawal.amountRial)}</strong> ریال</div>
                    </div>
                    {withdrawal.beneficiaryName && (
                        <div className={styles.hint}>ذی‌نفع: {withdrawal.beneficiaryName}</div>
                    )}
                    {!isPay && (
                        <div className={`${shell.alertBox} ${shell['alertBox--warning']}`}>
                            <AlertTriangle size={18} style={{ flexShrink: 0 }} />
                            <div>با این اقدام نور به نور عادی کاربر برمی‌گردد و رکورد دیگر قابل ویرایش نیست.</div>
                        </div>
                    )}
                    {isPay ? (
                        <>
                            <div className={shell.field}>
                                <label className={shell.field__label} htmlFor="nw-pay-ref">شناسهٔ پرداخت <span className={styles.required}>*</span></label>
                                <input
                                    id="nw-pay-ref"
                                    className={shell.field__input}
                                    dir="ltr"
                                    maxLength={100}
                                    value={paymentReference}
                                    onChange={(e) => setPaymentReference(e.target.value)}
                                    disabled={loading}
                                />
                            </div>
                            <div className={shell.field}>
                                <label className={shell.field__label} htmlFor="nw-pay-receipt">فیش واریز (png، jpg، webp؛ تا ۱۰ مگابایت) <span className={styles.required}>*</span></label>
                                <input
                                    id="nw-pay-receipt"
                                    className={styles.fileInput}
                                    type="file"
                                    accept="image/png,image/jpeg,image/webp"
                                    onChange={(e) => setReceipt(e.target.files?.[0] || null)}
                                    disabled={loading}
                                />
                            </div>
                        </>
                    ) : (
                        <div className={shell.field}>
                            <label className={shell.field__label} htmlFor="nw-reverse-reason">علت <span className={styles.required}>*</span></label>
                            <textarea
                                id="nw-reverse-reason"
                                className={shell.field__textarea}
                                maxLength={500}
                                value={reason}
                                onChange={(e) => setReason(e.target.value)}
                                disabled={loading}
                            />
                        </div>
                    )}
                    <div className={shell.footer}>
                        <button type="button" className={shell.btnSecondary} onClick={onClose} disabled={loading}>انصراف</button>
                        <button type="submit" className={shell.btnPrimary} disabled={loading}>
                            {loading ? 'در حال ثبت...' : isPay ? 'ثبت پرداخت' : 'تأیید «پرداخت نشد»'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
        <AdminToastViewport toasts={toasts} onDismiss={dismiss} />
        </>,
        document.body,
    );
}
