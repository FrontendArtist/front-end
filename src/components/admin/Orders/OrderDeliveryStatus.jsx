'use client';

/**
 * @file src/components/admin/Orders/OrderDeliveryStatus.jsx
 * @description یک وضعیت ارسال برای کل سفارش.
 *
 * مرسوله یکی است و روی هر خرید فیزیکی کپی می‌شود. این بلوک همان وضعیت را یک‌بار نشان می‌دهد
 * و «تحویل‌شده» را فقط برای اقلام هنوز ارسال‌شده ثبت می‌کند. شکست یک قلم بقیه را متوقف نمی‌کند.
 */

import { useState } from 'react';
import { CheckCircle2, Loader2 } from 'lucide-react';
import { getPhysicalDeliveryLabel } from '@/lib/physicalDelivery';
import { getItemsShippingState } from '@/lib/admin/orderDisplay';
import AdminBadge from '../Shared/AdminBadge';
import styles from './PhysicalDeliveryControl.module.scss';

const BADGE_VARIANTS = {
    Preparing: 'warning',
    Shipped: 'info',
    Delivered: 'success',
};

function isProductItem(item) {
    return String(item?.itemType || item?.type || '').toLowerCase() === 'product';
}

/** اقلام فیزیکی فعال سفارش پرداخت‌شده. */
export function activeShipmentItems(detail, isPaid) {
    if (!isPaid || !Array.isArray(detail?.items)) return [];
    return detail.items.filter((item) => {
        if (!isProductItem(item) || !item.purchaseId) return false;
        const totalQty = Number(item.quantity) > 0 ? Number(item.quantity) : 1;
        const cancelledQty = Math.min(Number(item.cancelledQuantity) || 0, totalQty);
        return cancelledQty < totalQty && item.physicalDeliveryStatus !== 'Cancelled';
    });
}

function returnLocksDelivery(item) {
    return Boolean(item?.carrierReturnedAtUtc) && (
        !item.carrierReturnResolution || item.carrierReturnResolution === 'ClosedWithoutSettlement'
    );
}

export default function OrderDeliveryStatus({ detail, isPaid, onItemStatus = null }) {
    const items = activeShipmentItems(detail, isPaid);
    const [busy, setBusy] = useState(false);
    const [message, setMessage] = useState(null);

    if (items.length === 0) return null;

    const statuses = items.map((item) => item.physicalDeliveryStatus || 'Preparing');
    const shared = statuses.every((status) => status === statuses[0]) ? statuses[0] : null;
    const aggregate = getItemsShippingState(detail.items);
    const statusLabel = shared
        ? (getPhysicalDeliveryLabel(shared) || 'نامشخص')
        : (aggregate?.label || 'ارسال ناقص');
    const badgeVariant = shared
        ? (BADGE_VARIANTS[shared] || 'default')
        : (aggregate?.variant || 'warning');
    const shippedItems = items.filter((item) => item.physicalDeliveryStatus === 'Shipped');
    const deliverableItems = shippedItems.filter((item) => !returnLocksDelivery(item));
    const deliveryLocked = shippedItems.length > 0 && deliverableItems.length === 0;

    const markDelivered = async () => {
        if (busy || deliverableItems.length === 0) return;
        setBusy(true);
        setMessage(null);
        const failures = [];
        for (const item of deliverableItems) {
            try {
                const res = await fetch(
                    `/api/admin/physical-purchases/${encodeURIComponent(item.purchaseId)}/delivery-status`,
                    {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ status: 'Delivered' }),
                    }
                );
                const json = await res.json().catch(() => ({}));
                if (!res.ok || !json?.data?.deliveryStatus) {
                    failures.push(json?.error || 'ثبت وضعیت ارسال ناموفق بود.');
                    continue;
                }
                if (typeof onItemStatus === 'function') {
                    onItemStatus(item.purchaseId, json.data.deliveryStatus);
                }
            } catch (error) {
                failures.push(error?.message || 'خطا در ارتباط با سرور.');
            }
        }
        if (failures.length > 0) {
            setMessage({ ok: false, text: failures[0] });
        } else {
            setMessage({ ok: true, text: 'وضعیت ارسال سفارش به «تحویل‌شده» تغییر کرد.' });
        }
        setBusy(false);
    };

    return (
        <div data-testid="order-delivery-status" className={styles.container}>
            <div className={styles.statusHeader}>
                <span className={styles.label}>وضعیت ارسال مرسوله:</span>
                <AdminBadge variant={badgeVariant} text={statusLabel} />
            </div>

            {deliveryLocked && (
                <p className={styles.trackingHint} data-testid="delivery-locked-by-return">
                    تغییر به تحویل‌شده تا تعیین‌تکلیف برگشتی غیرفعال است.
                </p>
            )}

            {deliverableItems.length > 0 && (
                <button
                    type="button"
                    data-testid="advance-order-delivery"
                    className={styles.saveCodeBtn}
                    onClick={markDelivered}
                    disabled={busy}
                >
                    {busy ? (
                        <span className={styles.spinner}>
                            <Loader2 size={14} className="spin" />
                            در حال ثبت تغییر وضعیت...
                        </span>
                    ) : (
                        <span className={styles.spinner}>
                            <CheckCircle2 size={14} />
                            پیشبرد به: تحویل‌شده
                        </span>
                    )}
                </button>
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
