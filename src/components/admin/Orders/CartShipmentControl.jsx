'use client';

/**
 * @file src/components/admin/Orders/CartShipmentControl.jsx
 * @description ساخت مرسوله نزد واسط پستی در سطح سبد خرید (PostEx)
 *
 * یک مرسوله برای تمام اقلام فیزیکی فعال سبد خرید ایجاد می‌کند.
 * مطابق D20 / BND-07 فراخوانی فقط از طریق route سروری Next.js انجام می‌شود.
 */

import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { getPhysicalDeliveryLabel } from '@/lib/physicalDelivery';
import styles from './PhysicalDeliveryControl.module.scss';

export const POSTEX_BOX_OPTIONS = Array.from({ length: 12 }, (_, i) => ({
    value: i + 1,
    label: `جعبه استاندارد ${i + 1}`,
}));

export default function CartShipmentControl({
    cartId,
    onShipmentCreated = null,
}) {
    const [busy, setBusy] = useState(false);
    const [message, setMessage] = useState(null);
    const [boxTypeId, setBoxTypeId] = useState('');

    const createShipment = async () => {
        if (!cartId || busy) return;
        setBusy(true);
        setMessage(null);

        const body = {
            provider: 'PostEx',
            ...(boxTypeId ? { boxTypeId: Number(boxTypeId) } : {}),
        };

        try {
            const res = await fetch(`/api/admin/carts/${encodeURIComponent(cartId)}/shipments`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });

            const json = await res.json().catch(() => ({}));
            const payload = json?.data || json;

            if (res.ok) {
                const warning = typeof payload?.warning === 'string' ? payload.warning.trim() : '';
                const stillPreparing =
                    payload?.deliveryStatus === 'Preparing' ||
                    payload?.outcome === 'AwaitingTrackingCode';

                if (stillPreparing) {
                    setMessage({
                        ok: false,
                        text: warning || 'کد پستی هنوز نیامده.',
                    });
                } else {
                    const statusText = getPhysicalDeliveryLabel(payload?.deliveryStatus) || 'ارسال‌شده';
                    setMessage({
                        ok: true,
                        text: `مرسوله ثبت و وضعیت به «${statusText}» تغییر کرد.`,
                    });
                }

                if (typeof onShipmentCreated === 'function') {
                    onShipmentCreated(payload);
                }
            } else {
                setMessage({
                    ok: false,
                    text: json?.error || json?.message || 'ساخت مرسوله نزد واسط پستی ناموفق بود.',
                });
            }
        } catch {
            setMessage({ ok: false, text: 'خطا در ارتباط با سرور.' });
        } finally {
            setBusy(false);
        }
    };

    return (
        <div data-testid="cart-shipment-control" className={styles.dispatchBox}>
            <div className={styles.statusHeader}>
                <span className={styles.label}>ارسال به پستکس برای تمام اقلام این سفارش:</span>
            </div>

            <div className={styles.trackingBox}>
                <label className={styles.trackingLabel} htmlFor={`box-type-select-${cartId}`}>
                    سایز جعبه (اختیاری — پیش‌فرض سیستم):
                </label>
                <select
                    id={`box-type-select-${cartId}`}
                    data-testid="box-type-select"
                    className={styles.trackingProvider}
                    style={{ width: '100%' }}
                    value={boxTypeId}
                    onChange={(e) => setBoxTypeId(e.target.value)}
                    disabled={busy}
                    aria-label="سایز جعبه"
                >
                    <option value="">پیش‌فرض (محاسبه خودکار بر اساس اقلام)</option>
                    {POSTEX_BOX_OPTIONS.map((box) => (
                        <option key={box.value} value={box.value}>
                            {box.label}
                        </option>
                    ))}
                </select>
            </div>

            <button
                type="button"
                data-testid="create-provider-shipment"
                className={styles.createShipmentBtn}
                onClick={createShipment}
                disabled={busy}
            >
                {busy ? (
                    <span className={styles.spinner}>
                        <Loader2 size={14} className="spin" />
                        در حال ساخت مرسوله...
                    </span>
                ) : (
                    'ارسال به پستکس'
                )}
            </button>

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
