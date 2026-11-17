'use client';

/**
 * فرم فشردهٔ تعیین‌تکلیف برگشتی پستکس.
 * فقط route سروری Next را صدا می‌زند؛ توکن بای‌مانی به مرورگر نمی‌رسد.
 */

import { useState } from 'react';
import styles from './PhysicalDeliveryControl.module.scss';

const OPTIONS = [
    {
        value: 'DeliveryConfirmed',
        label: 'تحویل تأیید شد (ورود مجدد به تسویه)',
    },
    {
        value: 'ClosedWithoutSettlement',
        label: 'بدون تسویه بسته شد (حذف دائمی از تسویه)',
    },
];

function errorText(json) {
    if (typeof json?.error === 'string' && json.error.trim()) return json.error;
    if (Array.isArray(json?.errors)) {
        const hit = json.errors.find((item) => typeof item === 'string' && item.trim());
        if (hit) return hit;
    }
    return 'تعیین تکلیف برگشتی ناموفق بود.';
}

export default function CarrierReturnResolveControl({ purchaseId, onResolved }) {
    const [open, setOpen] = useState(false);
    const [resolution, setResolution] = useState('DeliveryConfirmed');
    const [note, setNote] = useState('');
    const [busy, setBusy] = useState(false);
    const [message, setMessage] = useState(null);

    const trimmed = note.trim();
    const canSubmit = !busy
        && OPTIONS.some((opt) => opt.value === resolution)
        && trimmed.length >= 1
        && trimmed.length <= 1000;

    const submit = async (event) => {
        event.preventDefault();
        if (!canSubmit) return;
        setBusy(true);
        setMessage(null);
        try {
            const res = await fetch(
                `/api/admin/physical-purchases/${encodeURIComponent(purchaseId)}/carrier-return/resolve`,
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
                setMessage(errorText(json));
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
                data-testid="carrier-return-resolve-open"
                onClick={() => setOpen(true)}
            >
                تعیین تکلیف برگشتی
            </button>
        );
    }

    return (
        <form className={styles.resolveForm} data-testid="carrier-return-resolve-form" onSubmit={submit}>
            <fieldset className={styles.resolveOptions} disabled={busy}>
                <legend className={styles.trackingLabel}>نتیجهٔ رسیدگی</legend>
                {OPTIONS.map((opt) => (
                    <label key={opt.value} className={styles.resolveOption}>
                        <input
                            type="radio"
                            name={`carrier-return-${purchaseId}`}
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
            <label className={styles.trackingLabel} htmlFor={`carrier-return-note-${purchaseId}`}>
                یادداشت (الزامی)
            </label>
            <textarea
                id={`carrier-return-note-${purchaseId}`}
                className={styles.resolveNote}
                value={note}
                onChange={(event) => setNote(event.target.value)}
                maxLength={1000}
                rows={3}
                required
                disabled={busy}
                data-testid="carrier-return-note"
            />
            <div className={styles.resolveActions}>
                <button
                    type="submit"
                    className={styles.createShipmentBtn}
                    disabled={!canSubmit}
                    data-testid="carrier-return-submit"
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
