'use client';

/**
 * @file src/components/admin/Orders/OrderTrackingControl.jsx
 * @description یک کد رهگیری برای کل سفارش، نه برای هر قلم.
 *
 * بای‌مانی کد را روی هر خرید فیزیکی نگه می‌دارد؛ این فرم همان کد را یک‌بار می‌گیرد
 * و برای همهٔ اقلام فیزیکیِ فعال و تحویل‌نشدهٔ همین سفارش ثبت می‌کند.
 */

import { useEffect, useMemo, useState } from 'react';
import {
    getPhysicalDeliveryProvider,
    PHYSICAL_DELIVERY_PROVIDERS,
} from '@/lib/physicalDeliveryProviders';
import styles from './PhysicalDeliveryControl.module.scss';

function isProductItem(item) {
    const type = String(item?.itemType || item?.type || '').toLowerCase();
    return type === 'product';
}

/** اقلام فیزیکی فعال که هنوز تحویل نشده‌اند و می‌توان کد رهگیری‌شان را ثبت کرد. */
export function trackablePurchases(detail, isPaid) {
    if (!isPaid || !Array.isArray(detail?.items)) return [];
    return detail.items.filter((item) => {
        if (!isProductItem(item) || !item.purchaseId) return false;
        const totalQty = Number(item.quantity) > 0 ? Number(item.quantity) : 1;
        const cancelledQty = Math.min(Number(item.cancelledQuantity) || 0, totalQty);
        if (cancelledQty >= totalQty) return false;
        return item.physicalDeliveryStatus !== 'Delivered';
    });
}

async function putDeliveryStatus(purchaseId, body) {
    const res = await fetch(
        `/api/admin/physical-purchases/${encodeURIComponent(purchaseId)}/delivery-status`,
        {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
        }
    );
    const json = await res.json().catch(() => ({}));
    if (!res.ok || !json?.data) {
        throw new Error(json?.error || 'ثبت کد رهگیری ناموفق بود.');
    }
    return json.data;
}

export default function OrderTrackingControl({ detail, isPaid, onApplied = null }) {
    const targets = useMemo(() => trackablePurchases(detail, isPaid), [detail, isPaid]);
    const signature = targets
        .map((item) => [
            item.purchaseId,
            item.physicalDeliveryStatus || '',
            item.trackingCode || '',
            item.trackingProvider || '',
            item.providerParcelId || '',
        ].join(':'))
        .join('|');

    const [trackingCode, setTrackingCode] = useState('');
    const [trackingProvider, setTrackingProvider] = useState('Manual');
    const [providerParcelId, setProviderParcelId] = useState('');
    const [loadedProvider, setLoadedProvider] = useState('Manual');
    const [busy, setBusy] = useState(false);
    const [message, setMessage] = useState(null);

    useEffect(() => {
        const current = trackablePurchases(detail, isPaid);
        const code = current.map((item) => item.trackingCode).find(Boolean) || '';
        const provider = current.map((item) => item.trackingProvider).find(Boolean) || 'Manual';
        const parcel = current.map((item) => item.providerParcelId).find(Boolean) || '';
        setTrackingCode(code);
        setTrackingProvider(provider);
        setLoadedProvider(provider);
        setProviderParcelId(String(parcel));
    }, [signature, detail, isPaid]);

    if (targets.length === 0) return null;

    const allPreparing = targets.every(
        (item) => !item.physicalDeliveryStatus || item.physicalDeliveryStatus === 'Preparing'
    );
    const requiresProviderReference =
        getPhysicalDeliveryProvider(trackingProvider)?.requiresProviderReference || false;

    const submit = async () => {
        if (busy) return;
        const code = trackingCode.trim();
        if (!code) {
            setMessage({ ok: false, text: 'کد رهگیری را وارد کنید.' });
            return;
        }

        const reference = providerParcelId.trim();
        const bodies = targets.map(() => {
            if (allPreparing) {
                return {
                    status: 'Shipped',
                    trackingCode: code,
                    trackingProvider: 'Manual',
                };
            }
            const body = { status: 'Shipped', trackingCode: code };
            if (trackingProvider !== loadedProvider || (requiresProviderReference && reference)) {
                body.trackingProvider = trackingProvider;
                if (requiresProviderReference && reference) {
                    body.providerParcelId = reference;
                }
            }
            return body;
        });

        setBusy(true);
        setMessage(null);
        try {
            for (let i = 0; i < targets.length; i += 1) {
                await putDeliveryStatus(targets[i].purchaseId, bodies[i]);
            }
            setMessage({ ok: true, text: 'کد رهگیری سفارش ثبت شد.' });
            if (typeof onApplied === 'function') onApplied();
        } catch (error) {
            setMessage({ ok: false, text: error?.message || 'ثبت کد رهگیری ناموفق بود.' });
        } finally {
            setBusy(false);
        }
    };

    return (
        <div data-testid="order-tracking" className={styles.container}>
            {allPreparing ? (
                <div className={styles.trackingBox} data-testid="manual-tracking-box">
                    <label className={styles.trackingLabel} htmlFor="order-tracking-code">
                        کد رهگیری سفارش
                    </label>
                    <input
                        id="order-tracking-code"
                        data-testid="tracking-code-input"
                        className={styles.trackingInput}
                        value={trackingCode}
                        onChange={(event) => setTrackingCode(event.target.value)}
                        placeholder="بارکد یا کد رهگیری پستی"
                        maxLength={50}
                        dir="ltr"
                        disabled={busy}
                    />
                    <button
                        type="button"
                        data-testid="register-manual-tracking"
                        className={styles.saveCodeBtn}
                        onClick={submit}
                        disabled={busy}
                    >
                        ثبت کد رهگیری دستی
                    </button>
                </div>
            ) : (
                <div className={styles.trackingBox}>
                    <label className={styles.trackingLabel} htmlFor="order-tracking-code">
                        کد رهگیری سفارش
                    </label>
                    <div className={styles.trackingRow}>
                        <input
                            id="order-tracking-code"
                            data-testid="tracking-code-input"
                            className={styles.trackingInput}
                            value={trackingCode}
                            onChange={(event) => setTrackingCode(event.target.value)}
                            placeholder="بارکد یا کد رهگیری پستی"
                            maxLength={50}
                            dir="ltr"
                            disabled={busy}
                        />
                        <select
                            data-testid="tracking-provider-select"
                            aria-label="منبع کد رهگیری"
                            className={styles.trackingProvider}
                            value={trackingProvider}
                            onChange={(event) => setTrackingProvider(event.target.value)}
                            disabled={busy}
                        >
                            {PHYSICAL_DELIVERY_PROVIDERS.map((provider) => (
                                <option key={provider.value} value={provider.value}>
                                    {provider.label}
                                </option>
                            ))}
                        </select>
                    </div>
                    {requiresProviderReference && (
                        <input
                            data-testid="provider-parcel-reference-input"
                            aria-label="شناسهٔ ارجاع مرسوله نزد واسط پستی"
                            className={styles.trackingInput}
                            value={providerParcelId}
                            onChange={(event) => setProviderParcelId(event.target.value)}
                            placeholder="شناسهٔ ارجاع مرسوله نزد واسط پستی"
                            maxLength={50}
                            dir="ltr"
                            disabled={busy}
                        />
                    )}
                    <button
                        type="button"
                        data-testid="save-tracking-code"
                        className={styles.saveCodeBtn}
                        onClick={submit}
                        disabled={busy}
                    >
                        ذخیرهٔ کد رهگیری
                    </button>
                </div>
            )}
            {message && (
                <p
                    role={message.ok ? 'status' : 'alert'}
                    className={`${styles.message} ${message.ok ? styles['message--ok'] : styles['message--error']}`}
                    data-testid={message.ok ? 'delivery-message-ok' : 'delivery-message-alert'}
                >
                    {message.text}
                </p>
            )}
        </div>
    );
}
