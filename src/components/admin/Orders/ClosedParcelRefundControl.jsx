'use client';

/**
 * نشان و ثبت برگشت دستی نور برای قلم بسته‌شده بدون تسویه.
 * فقط route سروری Next را صدا می‌زند. دکمه با مجوز Noor.Inject پنل دیده می‌شود.
 */

import { useRef, useState } from 'react';
import { usePermissions } from '@/context/PermissionsContext';
import { ADMIN_PERMISSIONS } from '@/config/adminPermissions';
import { formatNoor, formatOrderDate } from '@/lib/byeMoneyOrderView';
import {
    CONFIRMATION_TEXT,
    REFUND_SUCCESS_MESSAGE,
    REFUND_UNKNOWN_MESSAGE,
    interpretRefundResponse,
    newOperationId,
} from '@/lib/closedParcelRefund';
import formStyles from './PhysicalDeliveryControl.module.scss';
import badgeStyles from './OrdersTable.module.scss';

const BADGES = {
    NotRefunded: { label: 'برگشت ثبت نشده', tone: 'warning' },
    Refunded: { label: 'برگشت‌شده', tone: 'info' },
    ManualReview: { label: 'پیگیری دستی', tone: 'neutral' },
};

function hasText(value) {
    return typeof value === 'string' && value.trim().length > 0;
}

function finiteAmount(value) {
    if (value == null || value === '') return null;
    const amount = Number(value);
    return Number.isFinite(amount) ? amount : null;
}

export default function ClosedParcelRefundControl({
    purchaseId,
    status,
    amountInNoor = null,
    refundedAtUtc = null,
    reason = null,
    onReload,
    onRecorded,
}) {
    const { hasPermission, isLoaded } = usePermissions();
    const allowed = isLoaded && hasPermission(ADMIN_PERMISSIONS.NOOR_INJECT);
    const [open, setOpen] = useState(false);
    const [reasonText, setReasonText] = useState('');
    const [confirmed, setConfirmed] = useState(false);
    const [busy, setBusy] = useState(false);
    const [locked, setLocked] = useState(false);
    const [recorded, setRecorded] = useState(null);
    const [notice, setNotice] = useState(null);
    const operationIdRef = useRef(null);
    const reasonKeyRef = useRef(null);
    const inFlightRef = useRef(false);

    const trimmed = reasonText.trim();
    const canSubmit = !busy && trimmed.length >= 1 && trimmed.length <= 500 && confirmed;
    const serverRefunded = status === 'Refunded';
    const badge = BADGES[locked ? 'Refunded' : status];
    const showDetails = serverRefunded || locked;
    const amount = finiteAmount(serverRefunded ? amountInNoor : recorded?.totalRefundInNoor)
        ?? finiteAmount(locked ? recorded?.totalRefundInNoor : null);
    const at = (serverRefunded && refundedAtUtc) || (locked ? recorded?.createdAtUtc : null) || null;
    const shownReason = serverRefunded
        ? (hasText(reason) ? reason : (locked && hasText(recorded?.reason) ? recorded.reason : null))
        : (locked && hasText(recorded?.reason) ? recorded.reason : null);
    const canAct = allowed && status === 'NotRefunded' && !locked;

    const discardOperation = () => {
        operationIdRef.current = null;
        reasonKeyRef.current = null;
    };

    const operationIdFor = (nextReason) => {
        if (!operationIdRef.current || reasonKeyRef.current !== nextReason) {
            operationIdRef.current = newOperationId();
            reasonKeyRef.current = nextReason;
        }
        return operationIdRef.current;
    };

    const submit = async (event) => {
        event.preventDefault();
        if (!canSubmit || inFlightRef.current || !canAct) return;
        inFlightRef.current = true;
        setBusy(true);
        setNotice(null);
        const operationId = operationIdFor(trimmed);
        try {
            let res;
            try {
                res = await fetch(
                    `/api/admin/physical-purchases/${encodeURIComponent(purchaseId)}/closed-parcel-refund`,
                    {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ operationId, reason: trimmed }),
                    },
                );
            } catch {
                setNotice({ tone: 'error', text: REFUND_UNKNOWN_MESSAGE });
                return;
            }
            const result = await interpretRefundResponse(res);
            if (result.kind === 'unknown') {
                setNotice({ tone: 'error', text: REFUND_UNKNOWN_MESSAGE });
                return;
            }
            if (result.kind === 'success') {
                setRecorded(result.data);
                setLocked(true);
                setOpen(false);
                discardOperation();
                setNotice({ tone: 'ok', text: REFUND_SUCCESS_MESSAGE });
                try {
                    await onReload?.();
                } catch {
                    // شکست بازخوانی، ثبت موفق را برنمی‌گرداند و ارسال دوباره بسته می‌ماند.
                }
                try {
                    await onRecorded?.(result.data?.totalRefundInNoor);
                } catch {
                    // تازه‌نشدن فهرست، موفقیت ثبت را برنمی‌گرداند.
                }
                return;
            }
            if (result.kind === 'conflict') discardOperation();
            setNotice({ tone: 'error', text: result.message });
            if (result.kind === 'conflict') {
                try {
                    await onReload?.();
                } catch {
                    // پیام خطا می‌ماند تا جزئیات، حتی اگر بازخوانی نشود، تنها منبع وضعیت نباشد.
                }
            }
        } finally {
            inFlightRef.current = false;
            setBusy(false);
        }
    };

    if (!badge && !notice) return null;

    return (
        <div className={badgeStyles.item_card__section} data-testid="closed-parcel-refund">
            {badge && (
                <div className={badgeStyles.item_card__sectionHeader}>
                    <span className={badgeStyles.item_card__sectionTitle}>بازگشت وجه (نور) به خریدار</span>
                    <span
                        className={`${badgeStyles.item_card__badge} ${badgeStyles[`item_card__badge--${badge.tone}`]}`}
                        data-testid="closed-parcel-refund-badge"
                    >
                        {badge.label}
                    </span>
                </div>
            )}
            {canAct && !open && (
                <p className={badgeStyles.item_card__hint}>
                    پروندهٔ این مرسوله بدون تسویه بسته شده است؛ در صورت لزوم بازگشت نور به کیف‌پول خریدار را دستی ثبت کنید.
                </p>
            )}
            {showDetails && (amount != null || at || shownReason) && (
                <div className={badgeStyles.item_card__resolved} data-testid="closed-parcel-refund-details">
                    {amount != null && (
                        <div className={badgeStyles.item_card__kv}>
                            <span className={badgeStyles.item_card__kvLabel}>مبلغ برگشتی:</span>
                            <span className={badgeStyles.item_card__kvValue}>{formatNoor(amount)}</span>
                        </div>
                    )}
                    {at && (
                        <div className={badgeStyles.item_card__kv}>
                            <span className={badgeStyles.item_card__kvLabel}>زمان:</span>
                            <span className={badgeStyles.item_card__kvValue}>{formatOrderDate(at)}</span>
                        </div>
                    )}
                    {shownReason && (
                        <div className={badgeStyles.item_card__kv}>
                            <span className={badgeStyles.item_card__kvLabel}>علت:</span>
                            <span className={badgeStyles.item_card__kvValue} data-testid="closed-parcel-refund-reason-text">{shownReason}</span>
                        </div>
                    )}
                </div>
            )}
            {canAct && !open && (
                <button
                    type="button"
                    className={formStyles.createShipmentBtn}
                    data-testid="closed-parcel-refund-open"
                    onClick={() => setOpen(true)}
                    disabled={busy}
                >
                    ثبت برگشت نور
                </button>
            )}
            {canAct && open && (
                <form className={formStyles.resolveForm} data-testid="closed-parcel-refund-form" onSubmit={submit}>
                    <label className={formStyles.trackingLabel} htmlFor={`closed-parcel-reason-${purchaseId}`}>
                        علت
                    </label>
                    <textarea
                        id={`closed-parcel-reason-${purchaseId}`}
                        className={formStyles.resolveNote}
                        value={reasonText}
                        onChange={(event) => setReasonText(event.target.value)}
                        maxLength={500}
                        rows={3}
                        required
                        disabled={busy}
                        data-testid="closed-parcel-refund-reason"
                    />
                    <label className={formStyles.resolveOption}>
                        <input
                            type="checkbox"
                            checked={confirmed}
                            onChange={(event) => setConfirmed(event.target.checked)}
                            disabled={busy}
                            data-testid="closed-parcel-refund-confirm"
                        />
                        <span>{CONFIRMATION_TEXT}</span>
                    </label>
                    <div className={formStyles.resolveActions}>
                        <button
                            type="submit"
                            className={formStyles.createShipmentBtn}
                            disabled={!canSubmit}
                            data-testid="closed-parcel-refund-submit"
                        >
                            {busy ? 'در حال ثبت...' : 'ثبت برگشت نور'}
                        </button>
                        <button
                            type="button"
                            className={formStyles.saveCodeBtn}
                            onClick={() => setOpen(false)}
                            disabled={busy}
                        >
                            انصراف
                        </button>
                    </div>
                </form>
            )}
            {notice && (
                <p
                    role={notice.tone === 'ok' ? 'status' : 'alert'}
                    className={`${formStyles.message} ${notice.tone === 'ok' ? formStyles['message--ok'] : formStyles['message--error']}`}
                    data-testid="closed-parcel-refund-notice"
                >
                    {notice.text}
                </p>
            )}
        </div>
    );
}
