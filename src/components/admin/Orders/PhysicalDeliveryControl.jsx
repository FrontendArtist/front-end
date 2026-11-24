'use client';

/**
 * @file src/components/admin/Orders/PhysicalDeliveryControl.jsx
 * @description مدیریت و پیشبرد وضعیت ارسال کالای فیزیکی در پنل ادمین (I11-O / SHIP-ADMIN-DISPATCH)
 *
 * صفحهٔ سفارش‌های زنده، سفارش‌های بای‌مانی در `/admin/orders` است (`OrderDrawer`)، نه
 * `/admin/orders/legacy` و نه پنل بازنشستهٔ `ByeMoneyOrderPanel`.
 * کشوی سفارش این کنترل را روی هر قلم سوار نمی‌کند؛ وضعیت یک‌بار در `OrderDeliveryStatus` است.
 * کد رهگیری سفارش یک‌بار در `OrderTrackingControl` است.
 * پیشبرد جدا به «ارسال‌شده» بدون کد حذف شده است.
 * نشان «ارسال‌شده» فقط وقتی عوض می‌شود که بای‌مانی واقعاً Shipped با کد برگرداند.
 * تغییر وضعیت فقط از route سروری Next.js؛ توکن بای‌مانی به مرورگر نمی‌رسد.
 */

import { useEffect, useState, useRef } from 'react';
import { ChevronDown, Loader2, CheckCircle2, Package } from 'lucide-react';
import { CourseOrderId } from '@/lib/byeMoneyApi';
import { getAdminOrderReceipt } from '@/lib/admin/adminByeMoneyClient';
import { getPhysicalDeliveryLabel } from '@/lib/physicalDelivery';
import {
    getPhysicalDeliveryProvider,
    PHYSICAL_DELIVERY_PROVIDERS,
} from '@/lib/physicalDeliveryProviders';
import AdminBadge from '../Shared/AdminBadge';
import CartShipmentControl from './CartShipmentControl';
import styles from './PhysicalDeliveryControl.module.scss';

export { default as CartShipmentControl } from './CartShipmentControl';

const BADGE_VARIANTS = {
    Preparing: 'warning',
    Shipped: 'info',
    Delivered: 'success',
};

export default function PhysicalDeliveryControl(props) {
    const {
        purchaseId,
        cartId,
        initialStatus = null,
        onStatusChange = null,
        carrierReturnLocked = false,
        showTracking = true,
    } = props;

    // اگر کامپوننت برای سبد بدون شناسهٔ خرید صدا زده شده باشد، کنترل مرسولهٔ سبد را نشان می‌دهد
    if (!purchaseId && cartId) {
        return <CartShipmentControl cartId={cartId} {...props} />;
    }

    const [status, setStatus] = useState(initialStatus);
    const [busy, setBusy] = useState(false);
    const [message, setMessage] = useState(null);
    const [isOpen, setIsOpen] = useState(false);
    const [trackingCode, setTrackingCode] = useState('');
    const [trackingProvider, setTrackingProvider] = useState('Manual');
    const [providerParcelId, setProviderParcelId] = useState('');
    const [loadedProvider, setLoadedProvider] = useState(null);
    const dropdownRef = useRef(null);

    useEffect(() => {
        if (initialStatus) {
            setStatus(initialStatus);
        }
    }, [initialStatus]);

    useEffect(() => {
        if (!isOpen) return;
        const handleClickOutside = (e) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        document.addEventListener('touchstart', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('touchstart', handleClickOutside);
        };
    }, [isOpen]);

    useEffect(() => {
        if (initialStatus || !purchaseId) return;
        const controller = new AbortController();
        let mounted = true;
        const orderId = cartId ? CourseOrderId.for('Cart', cartId) : CourseOrderId.for('Purchase', purchaseId);
        getAdminOrderReceipt({ orderId, signal: controller.signal })
            .then((res) => {
                if (!mounted || !res?.success) return;
                const item = (res.data?.items || []).find((i) => i?.purchaseId === purchaseId);
                if (item?.physicalDeliveryStatus) {
                    setStatus(item.physicalDeliveryStatus);
                    if (typeof onStatusChange === 'function') {
                        onStatusChange(item.physicalDeliveryStatus);
                    }
                }
                if (item?.trackingCode) {
                    setTrackingCode(item.trackingCode);
                }
                if (item?.trackingProvider) {
                    setTrackingProvider(item.trackingProvider);
                    setLoadedProvider(item.trackingProvider);
                }
            })
            .catch(() => {});
        return () => {
            mounted = false;
            controller.abort();
        };
    }, [purchaseId, cartId, initialStatus, onStatusChange]);

    const applyDeliveryPayload = (data, { fallbackOkText } = {}) => {
        const newStatus = data?.deliveryStatus;
        if (data?.trackingCode) {
            setTrackingCode(data.trackingCode);
        }
        if (data?.trackingProvider) {
            setTrackingProvider(data.trackingProvider);
            setLoadedProvider(data.trackingProvider);
        }
        if (data?.providerParcelId) {
            setProviderParcelId(String(data.providerParcelId));
        }

        const warning = typeof data?.warning === 'string' ? data.warning.trim() : '';
        const stillPreparing =
            newStatus === 'Preparing' ||
            data?.outcome === 'AwaitingTrackingCode';

        if (stillPreparing) {
            // نشان وضعیت عوض نمی‌شود؛ پیام «کد پستی هنوز نیامده» (یا warning سرور) نمایش داده می‌شود.
            setMessage({
                ok: false,
                text: warning || 'کد پستی هنوز نیامده.',
            });
            return;
        }

        if (newStatus) {
            setStatus(newStatus);
            setMessage({
                ok: true,
                text: fallbackOkText
                    ? fallbackOkText(getPhysicalDeliveryLabel(newStatus))
                    : `وضعیت ارسال به «${getPhysicalDeliveryLabel(newStatus)}» تغییر کرد.`,
            });
            if (typeof onStatusChange === 'function') {
                onStatusChange(newStatus);
            }
        }
    };

    const registerManualTracking = async () => {
        if (!purchaseId || busy || !isPreparing) return;
        const code = trackingCode.trim();
        if (!code) {
            setMessage({ ok: false, text: 'کد رهگیری را وارد کنید.' });
            return;
        }
        setBusy(true);
        setMessage(null);
        try {
            const res = await fetch(
                `/api/admin/physical-purchases/${encodeURIComponent(purchaseId)}/delivery-status`,
                {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        status: 'Shipped',
                        trackingCode: code,
                        trackingProvider: 'Manual',
                    }),
                }
            );
            const json = await res.json().catch(() => ({}));
            if (res.ok && json?.data) {
                applyDeliveryPayload(json.data);
            } else {
                setMessage({
                    ok: false,
                    text: json?.error || 'ثبت کد رهگیری ناموفق بود.',
                });
            }
        } catch {
            setMessage({ ok: false, text: 'خطا در ارتباط با سرور.' });
        } finally {
            setBusy(false);
        }
    };

    const submit = async (next, { force = false } = {}) => {
        if (!next || (!force && next === status) || busy) return;
        // از Preparing دیگر پیشبرد جدا به Shipped بدون کد مجاز نیست.
        if (next === 'Shipped' && (!status || status === 'Preparing') && !force) {
            return;
        }
        setIsOpen(false);
        setBusy(true);
        setMessage(null);
        try {
            const body = { status: next };
            const code = trackingCode.trim();
            if (next === 'Shipped' && code) {
                body.trackingCode = code;
                const reference = providerParcelId.trim();
                const requiresReference =
                    getPhysicalDeliveryProvider(trackingProvider)?.requiresProviderReference;
                if (trackingProvider !== loadedProvider || (requiresReference && reference)) {
                    body.trackingProvider = trackingProvider;
                    if (requiresReference && reference) {
                        body.providerParcelId = reference;
                    }
                }
            }
            const res = await fetch(`/api/admin/physical-purchases/${encodeURIComponent(purchaseId)}/delivery-status`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });
            const json = await res.json().catch(() => ({}));
            if (res.ok && json?.data?.deliveryStatus) {
                applyDeliveryPayload(json.data);
            } else {
                const from = getPhysicalDeliveryLabel(status);
                const to = getPhysicalDeliveryLabel(next);
                const invalidTransition = res.status === 400 && from && to;
                setMessage({
                    ok: false,
                    text: invalidTransition
                        ? `انتقال از «${from}» به «${to}» مجاز نیست.`
                        : json?.error || 'ثبت وضعیت ارسال ناموفق بود.',
                });
            }
        } catch {
            setMessage({ ok: false, text: 'خطا در ارتباط با سرور.' });
        } finally {
            setBusy(false);
        }
    };

    const statusLabel = getPhysicalDeliveryLabel(status) || 'نامشخص';
    const badgeVariant = BADGE_VARIANTS[status] || 'default';
    const isPreparing = !status || status === 'Preparing';
    const isShipped = status === 'Shipped';
    const isDelivered = status === 'Delivered';
    const requiresProviderReference =
        getPhysicalDeliveryProvider(trackingProvider)?.requiresProviderReference || false;

    const options = [
        {
            value: 'Delivered',
            label: 'تحویل‌شده',
            hint: carrierReturnLocked
                ? 'برای این برگشتی غیرفعال است'
                : isDelivered ? 'تکمیل شده' : isShipped ? 'پیشبرد مرحله' : 'ابتدا باید ارسال شود',
            disabled: !isShipped || busy || carrierReturnLocked,
            icon: <CheckCircle2 size={14} />,
        },
    ];

    const getTriggerInfo = () => {
        if (busy) {
            return { icon: <Loader2 size={14} className="spin" />, text: 'در حال ثبت تغییر وضعیت...' };
        }
        if (isShipped) {
            return { icon: <CheckCircle2 size={14} />, text: 'پیشبرد به: تحویل‌شده' };
        }
        return { icon: <Package size={14} />, text: 'انتخاب وضعیت ارسال...' };
    };

    const triggerInfo = getTriggerInfo();

    return (
        <div data-testid="physical-delivery-control" className={styles.container}>
            <div className={styles.statusHeader}>
                <span className={styles.label}>وضعیت ارسال مرسوله:</span>
                <AdminBadge variant={badgeVariant} text={statusLabel} />
            </div>

            {showTracking && isPreparing && (
                <div className={styles.trackingBox} data-testid="manual-tracking-box">
                        <label className={styles.trackingLabel} htmlFor={`tracking-code-${purchaseId}`}>
                            ثبت کد رهگیری دستی
                        </label>
                        <input
                            id={`tracking-code-${purchaseId}`}
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
                            onClick={registerManualTracking}
                            disabled={busy}
                        >
                            ثبت کد رهگیری دستی
                        </button>
                    </div>
            )}

            {/* پس از ارسال: اصلاح کد/منبع و پیشبرد به تحویل‌شده */}
            {showTracking && isShipped && (
                <div className={styles.trackingBox}>
                    <label className={styles.trackingLabel} htmlFor={`tracking-code-${purchaseId}`}>
                        کد رهگیری مرسوله
                    </label>
                    <div className={styles.trackingRow}>
                        <input
                            id={`tracking-code-${purchaseId}`}
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
                        <>
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
                            <p className={styles.trackingHint}>
                                با ثبت شناسهٔ ارجاع، وضعیت «تحویل‌شده» خودکار از واسط پستی خوانده می‌شود.
                            </p>
                        </>
                    )}
                    <button
                        type="button"
                        data-testid="save-tracking-code"
                        className={styles.saveCodeBtn}
                        onClick={() => submit('Shipped', { force: true })}
                        disabled={busy}
                    >
                        ذخیرهٔ کد رهگیری
                    </button>
                </div>
            )}

            {isShipped && carrierReturnLocked && (
                <p className={styles.trackingHint} data-testid="delivery-locked-by-return">
                    تغییر به تحویل‌شده برای این برگشتی غیرفعال است.
                </p>
            )}

            {isShipped && !carrierReturnLocked && (
                <div ref={dropdownRef} className={styles.customSelectContainer}>
                    <button
                        type="button"
                        className={`${styles.triggerButton} ${isOpen ? styles['triggerButton--open'] : ''}`}
                        onClick={() => !busy && setIsOpen((prev) => !prev)}
                        disabled={busy}
                        aria-haspopup="listbox"
                        aria-expanded={isOpen}
                        aria-label="پیشبرد وضعیت ارسال مرسوله"
                    >
                        <span className={styles.triggerContent}>
                            <span className={styles.triggerIcon}>{triggerInfo.icon}</span>
                            <span className={styles.triggerLabel}>{triggerInfo.text}</span>
                        </span>
                        <ChevronDown
                            size={16}
                            className={`${styles.chevron} ${isOpen ? styles['chevron--open'] : ''}`}
                        />
                    </button>

                    {isOpen && (
                        <div className={styles.dropdownMenu} role="listbox" aria-label="گزینه‌های پیشبرد وضعیت">
                            {options.map((opt) => (
                                <button
                                    key={opt.value}
                                    type="button"
                                    role="option"
                                    aria-selected={status === opt.value}
                                    disabled={opt.disabled}
                                    className={`${styles.optionItem} ${
                                        status === opt.value ? styles['optionItem--active'] : ''
                                    }`}
                                    onClick={() => submit(opt.value)}
                                >
                                    <span className={styles.optionContent}>
                                        {opt.icon}
                                        <span>{opt.label}</span>
                                    </span>
                                    <span className={styles.optionHint}>{opt.hint}</span>
                                </button>
                            ))}
                        </div>
                    )}

                    <select
                        id={`delivery-select-${purchaseId}`}
                        data-testid="delivery-status-select"
                        aria-label="پیشبرد وضعیت ارسال مرسوله (تست)"
                        value={status || 'Shipped'}
                        disabled={busy}
                        onChange={(e) => submit(e.target.value)}
                        className={styles.visuallyHiddenSelect}
                        tabIndex={-1}
                    >
                        <option value="Shipped" disabled>
                            ارسال‌شده (وضعیت فعلی)
                        </option>
                        <option value="Delivered">تغییر به: تحویل‌شده</option>
                    </select>
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
