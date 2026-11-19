'use client';

/**
 * فرم فشردهٔ تعیین‌تکلیف برگشتی پستکس یا هشدار خسارت/مفقودی.
 * فقط route سروری Next را صدا می‌زند؛ توکن بای‌مانی به مرورگر نمی‌رسد.
 * mode='alert' همان فرم را به مسیر carrier-alert/resolve می‌برد.
 */

import { useState } from 'react';
import styles from './PhysicalDeliveryControl.module.scss';

const RETURN_OPTIONS = [
    {
        value: 'DeliveryConfirmed',
        label: 'تحویل تأیید شد (ورود مجدد به تسویه)',
    },
    {
        value: 'ClosedWithoutSettlement',
        label: 'بدون تسویه بسته شد (حذف دائمی از تسویه)',
    },
];

const ALERT_OPTIONS = [
    {
        value: 'DeliveryConfirmed',
        label: 'تحویل تأیید شد (بستن هشدار و ورود مجدد به تسویه)',
    },
    {
        value: 'ClosedWithoutSettlement',
        label: 'بدون تسویه بسته شد (خروج دائمی از تحویل خودکار و تسویه)',
    },
];

function errorText(json, fallback) {
    if (typeof json?.error === 'string' && json.error.trim()) return json.error;
    if (Array.isArray(json?.errors)) {
        const hit = json.errors.find((item) => typeof item === 'string' && item.trim());
        if (hit) return hit;
    }
    return fallback;
}

export default function CarrierReturnResolveControl({ purchaseId, onResolved, mode = 'return' }) {
    const isAlert = mode === 'alert';
    const options = isAlert ? ALERT_OPTIONS : RETURN_OPTIONS;
    const endpoint = isAlert ? 'carrier-alert' : 'carrier-return';
    const testId = isAlert ? 'carrier-alert-resolve' : 'carrier-return-resolve';
    const [open, setOpen] = useState(false);
    const [resolution, setResolution] = useState('DeliveryConfirmed');
    const [note, setNote] = useState('');
    const [busy, setBusy] = useState(false);
    const [message, setMessage] = useState(null);

    const trimmed = note.trim();
    const canSubmit = !busy
        && options.some((opt) => opt.value === resolution)
        && trimmed.length >= 1
        && trimmed.length <= 1000;

    const submit = async (event) => {
        event.preventDefault();
        if (!canSubmit) return;
        setBusy(true);
        setMessage(null);
        try {
            const res = await fetch(
                `/api/admin/physical-purchases/${encodeURIComponent(purchaseId)}/${endpoint}/resolve`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ resolution, note: trimmed }),
                },
            );
            const json = await res.json().catch(() => ({}));
            if (res.ok) {
                if (typeof onResolved === 'function') onResolved(json);
            } else {
                setMessage(errorText(json, isAlert
                    ? 'تعیین تکلیف هشدار ناموفق بود.'
                    : 'تعیین تکلیف برگشتی ناموفق بود.'));
            }
        } catch {
            setMessage('خطا در ارتباط با سرور.');
        } finally {
            setBusy(false);
        }
    };

    if (!open) {
        return (
            <button
                type="button"
                className={styles.createShipmentBtn}
                data-testid={`${testId}-open`}
                onClick={() => setOpen(true)}
            >
                {isAlert ? 'تعیین تکلیف هشدار' : 'تعیین تکلیف برگشتی'}
            </button>
        );
    }

    return (
        <form className={styles.resolveForm} data-testid={`${testId}-form`} onSubmit={submit}>
            <fieldset className={styles.resolveOptions} disabled={busy}>
                <legend className={styles.trackingLabel}>نتیجهٔ رسیدگی</legend>
                {options.map((opt) => (
                    <label key={opt.value} className={styles.resolveOption}>
                        <input
                            type="radio"
                            name={`${testId}-${purchaseId}`}
                            value={opt.value}
                            checked={resolution === opt.value}
                            onChange={() => setResolution(opt.value)}
                        />
                        <span>{opt.label}</span>
                    </label>
                ))}
            </fieldset>
            {resolution === 'ClosedWithoutSettlement' && (
                <p className={styles.trackingHint}>
                    اگر قرار است وجه به مشتری برگردد، از بخش خروج نور اقدام کنید و شناسهٔ آن را در یادداشت بنویسید.
                </p>
            )}
            <label className={styles.trackingLabel} htmlFor={`${testId}-note-${purchaseId}`}>
                یادداشت (الزامی)
            </label>
            <textarea
                id={`${testId}-note-${purchaseId}`}
                className={styles.resolveNote}
                value={note}
                onChange={(event) => setNote(event.target.value)}
                maxLength={1000}
                rows={3}
                required
                disabled={busy}
                data-testid={`${testId}-note`}
            />
            <div className={styles.resolveActions}>
                <button
                    type="submit"
                    className={styles.createShipmentBtn}
                    disabled={!canSubmit}
                    data-testid={`${testId}-submit`}
                >
                    {busy ? 'در حال ثبت...' : 'ثبت تعیین تکلیف'}
                </button>
                <button type="button" className={styles.saveCodeBtn} onClick={() => setOpen(false)} disabled={busy}>
                    انصراف
                </button>
            </div>
            {message && (
                <p role="alert" className={`${styles.message} ${styles['message--error']}`}>{message}</p>
            )}
        </form>
    );
}
