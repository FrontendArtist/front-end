'use client';

/**
 * @file src/components/physicalCancel/PhysicalCancelFlow.jsx
 * @description لغو کالای فیزیکی (I09-PC) برای کاربر (کل بخش فیزیکی سبد) و ادمین (قلم/تعداد).
 *
 * فقط از routeهای داخلی Next.js استفاده می‌شود؛ هویت و مبلغ از مرورگر نمی‌رود.
 * operationId یک‌بار ساخته می‌شود و در تلاش مجدد همان می‌ماند (تا تغییر تعداد/علت یا موفقیت).
 * متن هشدار و مبالغ فقط از پاسخ سرور نمایش داده می‌شود.
 */

import { useRef, useState } from 'react';
import { fetchCancelPreview, submitCancel } from '@/lib/client/physicalCancelClient';
import {
    CANCEL_OUTCOME_LABELS, CANCEL_REASON_MAX, MANUAL_REVIEW_CODES, newOperationId, sumRefunds,
} from '@/lib/physicalCancel';
import styles from './PhysicalCancelFlow.module.scss';

const fa = (n) => Number(n || 0).toLocaleString('fa-IR');

function RefundSummary({ data }) {
    const { regular, gift } = sumRefunds(data);
    return (
        <div className={styles.refundBox}>
            <div className={styles.refundTitle}>مبالغ برگشتی به کیف پول:</div>
            <ul data-testid="cancel-refund" className={styles.refundList}>
                <li className={styles.refundItem}>
                    <span>نور عادی برگشتی: </span>
                    <strong>{fa(regular)}</strong>
                </li>
                <li className={styles.refundItem}>
                    <span>نور هدیهٔ برگشتی: </span>
                    <strong>{fa(gift)}</strong>
                </li>
            </ul>
        </div>
    );
}

/**
 * @param {{ mode: 'user'|'admin', targetId: string, maxQuantity?: number, label?: string, className?: string, disabled?: boolean, disabledReason?: string, onCancelled?: (data: object) => void }} props
 */
export default function PhysicalCancelFlow({
    mode,
    targetId,
    maxQuantity = 1,
    label,
    className = '',
    disabled = false,
    disabledReason = '',
    onCancelled,
}) {
    const isAdmin = mode === 'admin';
    const [open, setOpen] = useState(false);
    const [quantity, setQuantity] = useState(1);
    const [reason, setReason] = useState('');
    const [preview, setPreview] = useState(null);
    const [loadingPreview, setLoadingPreview] = useState(false);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState(null); // { message, manual }
    const [result, setResult] = useState(null);
    const operationIdRef = useRef(null);
    const inFlightRef = useRef(false);

    const resetOperation = () => { operationIdRef.current = null; };

    const openDialog = async () => {
        setOpen(true);
        setError(null);
        setPreview(null);
        setLoadingPreview(true);
        const res = await fetchCancelPreview({ mode, id: targetId, quantity });
        setLoadingPreview(false);
        if (res.ok) setPreview(res.data);
        else setError({ message: res.message, manual: MANUAL_REVIEW_CODES.includes(res.code) });
    };

    const closeDialog = () => {
        if (busy) return;
        setOpen(false);
        resetOperation();
    };

    const confirm = async () => {
        if (inFlightRef.current) return;
        inFlightRef.current = true;
        setBusy(true);
        setError(null);
        if (!operationIdRef.current) operationIdRef.current = newOperationId();
        const res = await submitCancel({
            mode, id: targetId, operationId: operationIdRef.current, reason: reason.trim(), quantity,
        });
        inFlightRef.current = false;
        setBusy(false);
        if (res.ok) {
            resetOperation();
            setResult(res.data);
            setOpen(false);
            if (onCancelled) onCancelled(res.data);
        } else {
            setError({ message: res.message, manual: MANUAL_REVIEW_CODES.includes(res.code) });
        }
    };

    const reasonOk = reason.trim().length >= 1 && reason.length <= CANCEL_REASON_MAX;
    const qtyOk = !isAdmin || (maxQuantity >= 1 && Number.isInteger(quantity) && quantity >= 1 && quantity <= maxQuantity);
    const warnings = Array.isArray(preview?.warnings) ? preview.warnings : [];

    const containerClass = `${styles.container} ${isAdmin ? styles.containerAdmin : styles.containerUser} ${className}`.trim();

    return (
        <div data-testid="physical-cancel" className={containerClass}>
            {isAdmin && !result && (
                <div className={styles.adminControls}>
                    {maxQuantity > 1 && (
                        <label className={styles.qtyLabel}>
                            <span>تعداد لغو:</span>
                            <input
                                type="number"
                                min={1}
                                max={maxQuantity}
                                value={quantity}
                                disabled={open || disabled}
                                onChange={(e) => setQuantity(Number(e.target.value))}
                                className={styles.qtyInput}
                            />
                            <span className={styles.qtyMax}>از {fa(maxQuantity)} عدد قابل لغو</span>
                        </label>
                    )}
                    <button
                        type="button"
                        onClick={openDialog}
                        disabled={open || !qtyOk || disabled}
                        className={styles.triggerBtnAdmin}
                        title={disabled ? disabledReason : undefined}
                    >
                        {label || (maxQuantity > 1 ? 'لغو تعداد انتخابی' : 'لغو این کالا')}
                    </button>
                    {disabled && disabledReason && (
                        <span className={styles.disabledNotice} title={disabledReason}>
                            ⚠️ {disabledReason}
                        </span>
                    )}
                </div>
            )}
            {!isAdmin && !result && (
                <button
                    type="button"
                    onClick={openDialog}
                    disabled={open || !qtyOk}
                    className={styles.triggerBtnUser}
                >
                    {label || 'لغو بخش فیزیکی سفارش'}
                </button>
            )}

            {result && (
                <div role="status" data-testid="cancel-result" className={styles.resultBox}>
                    <div className={styles.resultHeader}>
                        <strong>{CANCEL_OUTCOME_LABELS[result.outcome] || 'لغو شد'}</strong>
                    </div>
                    <RefundSummary data={result} />
                    {isAdmin && reason && <p className={styles.resultReason}>علت لغو: {reason}</p>}
                </div>
            )}

            {open && (
                <div className={styles.overlay} onClick={closeDialog}>
                    <div
                        role="dialog"
                        aria-modal="true"
                        aria-label="تأیید لغو"
                        className={styles.modal}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className={styles.modalHeader}>
                            <h3 className={styles.modalTitle}>
                                {isAdmin ? 'تأیید لغو قلم / تعداد' : 'تأیید لغو بخش فیزیکی سفارش'}
                            </h3>
                            <button
                                type="button"
                                className={styles.modalCloseBtn}
                                onClick={closeDialog}
                                disabled={busy}
                                aria-label="بستن"
                            >
                                ✕
                            </button>
                        </div>
                        <div className={styles.modalBody}>
                            {loadingPreview && (
                                <div className={styles.loading}>
                                    <span>در حال بررسی...</span>
                                </div>
                            )}
                            {warnings.map((w) => (
                                <p
                                    key={w.code}
                                    role="alert"
                                    data-testid="cancel-warning"
                                    className={styles.warningBox}
                                >
                                    ⚠️ {w.message}
                                </p>
                            ))}
                            {preview && <RefundSummary data={preview} />}
                            {preview && (
                                <label className={styles.fieldLabel}>
                                    <span className={styles.fieldTitle}>
                                        علت لغو <span className={styles.required}>*</span>
                                    </span>
                                    <textarea
                                        className={styles.textarea}
                                        value={reason}
                                        maxLength={CANCEL_REASON_MAX}
                                        rows={3}
                                        placeholder="علت لغو را وارد کنید..."
                                        onChange={(e) => { setReason(e.target.value); resetOperation(); }}
                                    />
                                </label>
                            )}
                            {error && (
                                <p
                                    role="alert"
                                    data-testid="cancel-error"
                                    data-manual={error.manual ? 'true' : 'false'}
                                    className={styles.errorBox}
                                >
                                    {error.manual ? '🛠️ رسیدگی دستی: ' : ''}{error.message}
                                </p>
                            )}
                        </div>
                        <div className={styles.modalActions}>
                            <button
                                type="button"
                                className={styles.btnCancel}
                                onClick={closeDialog}
                                disabled={busy}
                            >
                                انصراف
                            </button>
                            <button
                                type="button"
                                className={styles.btnConfirm}
                                onClick={confirm}
                                disabled={busy || !preview || !reasonOk}
                            >
                                {busy ? 'در حال لغو...' : 'تأیید و لغو'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
