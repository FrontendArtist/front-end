'use client';

/**
 * @file src/components/admin/Orders/PhysicalDeliveryControl.jsx
 * @description مدیریت و پیشبرد وضعیت ارسال کالای فیزیکی در پنل ادمین (I11-O)
 *
 * تغییر وضعیت فقط از route سروری Next.js انجام می‌شود (JWT ادمین از session سروری)؛
 * مرورگر توکن بای‌مانی را برای PUT نمی‌فرستد و هیچ درخواستی به استراپی زده نمی‌شود.
 * وضعیت فقط در بای‌مانی نگهداری می‌شود و با ماشین وضعیت مجاز (Preparing -> Shipped -> Delivered) کنترل می‌شود.
 */

import { useEffect, useState, useRef } from 'react';
import { ChevronDown, Loader2, CheckCircle2, Truck, Package } from 'lucide-react';
import { CourseOrderId } from '@/lib/byeMoneyApi';
import { getAdminOrderReceipt } from '@/lib/admin/adminByeMoneyClient';
import { getPhysicalDeliveryLabel } from '@/lib/physicalDelivery';
import AdminBadge from '../Shared/AdminBadge';
import styles from './PhysicalDeliveryControl.module.scss';

const BADGE_VARIANTS = {
    Preparing: 'warning',
    Shipped: 'info',
    Delivered: 'success',
};

export default function PhysicalDeliveryControl({
    purchaseId,
    cartId,
    initialStatus = null,
    onStatusChange = null,
}) {
    const [status, setStatus] = useState(initialStatus);
    const [busy, setBusy] = useState(false);
    const [message, setMessage] = useState(null);
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef(null);

    useEffect(() => {
        if (initialStatus) {
            setStatus(initialStatus);
        }
    }, [initialStatus]);

    // بستن دراپ‌داون هنگام کلیک در خارج از کامپوننت
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

    // وضعیت فعلی از رسید سفارش ادمین (route سروری) خوانده می‌شود (فقط خواندن؛ شکست آن مانع ثبت نیست)
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
            })
            .catch(() => {});
        return () => {
            mounted = false;
            controller.abort();
        };
    }, [purchaseId, cartId, initialStatus, onStatusChange]);

    const submit = async (next) => {
        if (!next || next === status || busy) return;
        setIsOpen(false);
        setBusy(true);
        setMessage(null);
        try {
            const res = await fetch(`/api/admin/physical-purchases/${encodeURIComponent(purchaseId)}/delivery-status`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: next }),
            });
            const json = await res.json().catch(() => ({}));
            if (res.ok && json?.data?.deliveryStatus) {
                const newStatus = json.data.deliveryStatus;
                setStatus(newStatus);
                setMessage({ ok: true, text: `وضعیت ارسال به «${getPhysicalDeliveryLabel(newStatus)}» تغییر کرد.` });
                if (typeof onStatusChange === 'function') {
                    onStatusChange(newStatus);
                }
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

    // تنظیمات گزینه‌های دراپ‌داون بر اساس وضعیت فعلی
    const options = [
        {
            value: 'Preparing',
            label: 'در حال آماده‌سازی',
            hint: isPreparing ? 'وضعیت فعلی' : 'امکان بازگشت نیست',
            disabled: isPreparing || isShipped || isDelivered,
            icon: <Package size={14} />,
        },
        {
            value: 'Shipped',
            label: 'ارسال‌شده',
            hint: isShipped ? 'وضعیت فعلی' : isPreparing ? 'پیشبرد مرحله' : 'ارسال شده',
            disabled: !isPreparing || busy,
            icon: <Truck size={14} />,
        },
        {
            value: 'Delivered',
            label: 'تحویل‌شده',
            hint: isDelivered ? 'تکمیل شده' : isShipped ? 'پیشبرد مرحله' : 'ابتدا باید ارسال شود',
            disabled: !isShipped || busy,
            icon: <CheckCircle2 size={14} />,
        },
    ];

    const getTriggerInfo = () => {
        if (busy) {
            return { icon: <Loader2 size={14} className="spin" />, text: 'در حال ثبت تغییر وضعیت...' };
        }
        if (isPreparing) {
            return { icon: <Truck size={14} />, text: 'پیشبرد به: ارسال‌شده' };
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

            {/* پس از «تحویل‌شده» وضعیت نهایی است و نشان بالا کافی است؛ کنترلی برای پیشبرد نمی‌ماند */}
            {!isDelivered && (
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

                    {/* سلکت مخفی استاندارد جهت حفظ دسترسی‌پذیری و سازگاری با تست‌های خودکار */}
                    <select
                        id={`delivery-select-${purchaseId}`}
                        data-testid="delivery-status-select"
                        aria-label="پیشبرد وضعیت ارسال مرسوله (تست)"
                        value={status || 'Preparing'}
                        disabled={busy}
                        onChange={(e) => submit(e.target.value)}
                        className={styles.visuallyHiddenSelect}
                        tabIndex={-1}
                    >
                        {isPreparing && (
                            <>
                                <option value="Preparing" disabled>
                                    در حال آماده‌سازی (وضعیت فعلی)
                                </option>
                                <option value="Shipped">🚚 تغییر به: ارسال‌شده</option>
                                <option value="Delivered" disabled>
                                    تحویل‌شده (ابتدا باید ارسال شود)
                                </option>
                            </>
                        )}
                        {isShipped && (
                            <>
                                <option value="Preparing" disabled>
                                    در حال آماده‌سازی (امکان بازگشت نیست)
                                </option>
                                <option value="Shipped" disabled>
                                    ارسال‌شده (وضعیت فعلی)
                                </option>
                                <option value="Delivered">✅ تغییر به: تحویل‌شده</option>
                            </>
                        )}
                        {!isPreparing && !isShipped && (
                            <>
                                <option value="" disabled>
                                    انتخاب تغییر وضعیت...
                                </option>
                                <option value="Shipped">🚚 ثبت ارسال‌شده</option>
                                <option value="Delivered">✅ ثبت تحویل‌شده</option>
                            </>
                        )}
                    </select>
                </div>
            )}

            {message && (
                <p
                    role={message.ok ? 'status' : 'alert'}
                    className={`${styles.message} ${message.ok ? styles['message--ok'] : styles['message--error']}`}
                >
                    {message.text}
                </p>
            )}
        </div>
    );
}
