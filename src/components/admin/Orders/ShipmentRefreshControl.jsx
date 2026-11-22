'use client';

/**
 * «بررسی وضعیت» مرسولهٔ پرداخت‌نشده، یک‌بار برای سفارش.
 * فقط route سروری Next را صدا می‌زند؛ توکن بای‌مانی به مرورگر نمی‌رسد (BND-07).
 */

import { useState } from 'react';
import { shipmentRefreshMessage } from '@/lib/admin/shipmentRefresh';
import styles from './PhysicalDeliveryControl.module.scss';

function errorText(json) {
    if (typeof json?.error === 'string' && json.error.trim()) return json.error.trim();
    if (Array.isArray(json?.errors)) {
        const hit = json.errors.find((item) => typeof item === 'string' && item.trim());
        if (hit) return hit.trim();
    }
    return 'بررسی وضعیت مرسوله ناموفق بود.';
}

export default function ShipmentRefreshControl({ purchaseId, onRefreshed = null }) {
    const [busy, setBusy] = useState(false);
    const [message, setMessage] = useState(null);

    const refresh = async () => {
        if (!purchaseId || busy) return;
        setBusy(true);
        setMessage(null);
        try {
            const res = await fetch(
                `/api/admin/physical-purchases/${encodeURIComponent(purchaseId)}/shipments/refresh`,
                { method: 'POST' },
            );
            const json = await res.json().catch(() => ({}));
            if (!res.ok) {
                setMessage({ ok: false, text: errorText(json) });
                return;
            }
            const note = shipmentRefreshMessage(json?.data || json);
            setMessage(note);
            if (typeof onRefreshed === 'function') onRefreshed(json?.data || json);
        } catch {
            setMessage({ ok: false, text: 'خطا در ارتباط با سرور.' });
        } finally {
            setBusy(false);
        }
    };

    return (
        <div data-testid="shipment-refresh-control" className={styles.container}>
            {purchaseId && (
                <button
                    type="button"
                    data-testid="refresh-carrier-shipment"
                    className={styles.saveCodeBtn}
                    onClick={refresh}
                    disabled={busy}
                >
                    {busy ? 'در حال بررسی...' : 'بررسی وضعیت'}
                </button>
            )}
            {message && (
                <p
                    role={message.ok ? 'status' : 'alert'}
                    className={`${styles.message} ${message.ok ? styles['message--ok'] : styles['message--error']}`}
                    data-testid="shipment-refresh-message"
                >
                    {message.text}
                </p>
            )}
        </div>
    );
}
