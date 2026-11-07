'use client';

/**
 * @file src/components/admin/Orders/ByeMoneyOrderPanel.jsx
 * @description پنل جزئیات سفارش بای‌مانی: اقلام، رسید (فقط Paid) و خط زمانی تلاش‌های خرید (TRACK-03)
 *
 * فقط‌مشاهده است و هیچ تغییر وضعیت مالی ندارد. داده از route سروری /api/admin/orders/[id]/tracking
 * می‌آید. اگر استرپی در دسترس نباشد فقط وضعیت بای‌مانی با هشدار نمایش داده می‌شود و پنل نمی‌شکند.
 * وضعیت شارژ با وضعیت خرید یکی نمایش داده نمی‌شود (TRACK-04): خط «شارژ» جدا از «نتیجهٔ نهایی سفارش» است.
 * کنترل وضعیت ارسال کالا (PhysicalDeliveryControl) دست‌نخورده و فقط برای قلم کالای سفارش Paid نمایش داده می‌شود.
 *
 * هوک داده (useOrderTracking) و بخش‌ها (OrderItemsList، Timeline، OrderWarnings) جدا صادر می‌شوند تا
 * کشوی جزئیات سفارش (OrderDrawer) همان رفتار را در تب‌های جدا نشان دهد (ADMIN-ORDERS-REDESIGN).
 */

import { useEffect, useState } from 'react';
import { fetchOrderTracking } from '@/lib/client/admin/ordersClient';
import { canShowReceipt, isPhysicalFullyCancelled } from '@/lib/admin/orderTracking';
import { getPhysicalDeliveryLabel } from '@/lib/physicalDelivery';
import PhysicalDeliveryControl from './PhysicalDeliveryControl';
import PendingRestockNotice from './PendingRestockNotice';
import PhysicalCancelFlow from '@/components/physicalCancel/PhysicalCancelFlow';
import AdminButton from '../Shared/AdminButton';
import styles from './OrdersTable.module.scss';

export const DELIVERY_LABELS = {
    NotStarted: 'شروع نشده',
    Pending: 'در انتظار تحویل',
    PartiallyDelivered: 'تحویل ناقص',
    Delivered: 'تحویل شده',
    Cancelled: 'لغو شده',
};

const fa = (n) => (n === null || n === undefined ? '—' : Number(n).toLocaleString('fa-IR'));

export function formatTime(d) {
    if (!d) return '—';
    try {
        return new Intl.DateTimeFormat('fa-IR', {
            year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit',
        }).format(new Date(d));
    } catch {
        return '—';
    }
}

const TONE_CLASS = {
    success: 'onlinePayBadgeSuccess',
    error: 'onlinePayBadgeFailed',
    warning: 'onlinePayBadgePending',
    info: 'onlinePayBadgePending',
    default: 'onlinePayBadgePending',
};

function ResultBadge({ result }) {
    if (!result) return null;
    return (
        <span className={styles[TONE_CLASS[result.tone] || TONE_CLASS.default]} data-result={result.key}>
            {result.label}
        </span>
    );
}

const TIMELINE_VISIBLE = 2;

/** آخرین رویدادها همیشه دیده می‌شوند؛ قدیمی‌ترها پشت دکمهٔ «نمایش بیشتر» می‌مانند */
export function Timeline({ events, visibleCount = TIMELINE_VISIBLE }) {
    const [showAll, setShowAll] = useState(false);
    const hiddenCount = Math.max(0, events.length - visibleCount);
    const visible = showAll ? events : events.slice(hiddenCount);
    return (
        <>
            <ol className={styles.timeline} aria-label="خط زمانی تلاش‌های خرید">
                {visible.map((ev, i) => (
                    <li key={`${ev.kind}-${i}`} className={`${styles.timeline__item} ${styles[`timeline__item--${ev.kind}`] || ''}`}>
                        <div className={styles.timeline__head}>
                            <strong>{ev.title}</strong>
                            <ResultBadge result={ev.result} />
                            <span className={styles.timeline__time}>{formatTime(ev.at)}</span>
                        </div>
                        {ev.details?.length > 0 && (
                            <ul className={styles.timeline__details}>
                                {ev.details.map((d) => (
                                    <li key={d.label}>
                                        <span className={styles.expanded_field__label}>{d.label}: </span>
                                        <span>{d.isTime ? formatTime(d.value) : (DELIVERY_LABELS[d.value] || d.value)}</span>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </li>
                ))}
            </ol>
            {hiddenCount > 0 && (
                <button
                    type="button"
                    className={styles.moreLink}
                    onClick={() => setShowAll((v) => !v)}
                    aria-expanded={showAll}
                >
                    {showAll ? 'کمتر' : `موارد بیشتر (${fa(hiddenCount)})`}
                </button>
            )}
        </>
    );
}

/**
 * داده و بارگذاری جزئیات یک سفارش؛ بین پنل درون‌خطی و کشوی جزئیات مشترک است.
 * onPhysicalCancelled پس از هر بارگذاری (از جمله بعد از لغو) وضعیت «لغو کامل کالا» را خبر می‌دهد.
 */
export function useOrderTracking(order, { onSummary, onPhysicalCancelled } = {}) {
    const [state, setState] = useState({ loading: true, error: null, data: null });
    const [reloadKey, setReloadKey] = useState(0);
    const orderId = order.orderId || order.id;

    useEffect(() => {
        const controller = new AbortController();
        let mounted = true;
        setState({ loading: true, error: null, data: null });
        fetchOrderTracking(orderId, { signal: controller.signal, force: reloadKey > 0 })
            .then((data) => {
                if (!mounted) return;
                setState({ loading: false, error: null, data });
                if (onSummary) onSummary(data.attemptSummary || null);
                if (onPhysicalCancelled) {
                    const cancelled = isPhysicalFullyCancelled(data.order?.items);
                    if (cancelled !== Boolean(order.physicalCancelled)) onPhysicalCancelled(cancelled);
                }
            })
            .catch((err) => {
                if (!mounted || err.name === 'AbortError') return;
                setState({ loading: false, error: err.message || 'خطا در دریافت جزئیات سفارش', data: null });
            });
        return () => {
            mounted = false;
            controller.abort();
        };
        // onSummary عمداً در وابستگی‌ها نیست: بارگذاری فقط به تغییر سفارش وابسته است
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [orderId, reloadKey]);

    const reload = () => setReloadKey((k) => k + 1);

    /** به‌روزرسانی محلی وضعیت ارسال یک قلم پس از ثبت در PhysicalDeliveryControl */
    const setItemDeliveryStatus = (purchaseId, newStatus) => {
        setState((prev) => {
            if (!prev?.data?.order?.items) return prev;
            const updated = prev.data.order.items.map((it) =>
                it.purchaseId === purchaseId ? { ...it, physicalDeliveryStatus: newStatus } : it
            );
            return { ...prev, data: { ...prev.data, order: { ...prev.data.order, items: updated } } };
        });
    };

    return { state, reload, setItemDeliveryStatus };
}

export function OrderWarnings({ warnings }) {
    if (!warnings?.length) return null;
    return (
        <div className={styles.byemoneyWarningAlert} role="status">
            <ul style={{ margin: 0, paddingInlineStart: '1rem' }}>
                {warnings.map((w) => (<li key={w}>⚠️ {w}</li>))}
            </ul>
        </div>
    );
}

/**
 * فهرست اقلام با کنترل ارسال و لغو کالا (همان رفتار قبلی پنل).
 * @param {{ detail: object, isPaid: boolean, onReload: () => void,
 *   onItemStatus: (purchaseId: string, status: string) => void }} props
 */
export function OrderItemsList({ detail, isPaid, onReload, onItemStatus }) {
    if (detail.items.length === 0) {
        return <p className={styles.expanded_empty}>اطلاعات اقلام در دسترس نیست.</p>;
    }
    return (
        <div className={styles.items_list}>
            {detail.items.map((item, idx) => {
                const isProduct = String(item.itemType || '').toLowerCase() === 'product';
                const isShippedOrDelivered = item.physicalDeliveryStatus === 'Shipped' || item.physicalDeliveryStatus === 'Delivered';
                const totalQty = Number(item.quantity) > 0 ? Number(item.quantity) : 1;
                const cancelledQty = Math.min(Number(item.cancelledQuantity) || 0, totalQty);
                const remainingQty = totalQty - cancelledQty;
                const refundedRegular = Number(item.refundedRegularInNoor) || 0;
                const refundedGift = Number(item.refundedGiftInNoor) || 0;
                const refundedTotal = refundedRegular + refundedGift;
                const fullyCancelled = isProduct && cancelledQty >= totalQty;
                const partlyCancelled = isProduct && cancelledQty > 0 && !fullyCancelled;
                const canCancel = isProduct && isPaid && Boolean(item.purchaseId)
                    && !fullyCancelled && !isShippedOrDelivered;

                return (
                    <div
                        key={`${item.externalItemId || item.purchaseId || idx}`}
                        className={`${styles.item_card} ${fullyCancelled ? styles['item_card--cancelled'] : ''}`}
                        data-cancelled={fullyCancelled ? 'full' : partlyCancelled ? 'partial' : undefined}
                    >
                        <div className={styles.item_card__main}>
                            <span className={styles.item_card__icon}>{isProduct ? '📦' : '📚'}</span>
                            <div className={styles.item_card__info}>
                                <span className={styles.item_card__title}>{item.title || (isProduct ? 'کالا' : 'دوره آموزشی')}</span>
                                <span className={styles.item_card__type}>{isProduct ? 'کالای فیزیکی' : 'دوره آموزشی'}</span>
                                {item.quantity > 1 && (
                                    <span className={styles.item_card__meta}>
                                        تعداد: {fa(item.quantity)}
                                        {item.priceInNoor != null && ` (قیمت واحد: ${fa(item.priceInNoor)} نور)`}
                                    </span>
                                )}
                                {fullyCancelled && (
                                    <span className={`${styles.item_card__badge} ${styles['item_card__badge--danger']}`} data-testid="item-cancelled-badge">
                                        ⛔ این کالا لغو شده است{totalQty > 1 ? ` (${fa(cancelledQty)} از ${fa(totalQty)} عدد)` : ''}
                                    </span>
                                )}
                                {partlyCancelled && (
                                    <span className={`${styles.item_card__badge} ${styles['item_card__badge--warning']}`} data-testid="item-cancelled-badge">
                                        ⚠️ {fa(cancelledQty)} از {fa(totalQty)} عدد لغو شده — {fa(remainingQty)} عدد باقی‌مانده
                                    </span>
                                )}
                                {(fullyCancelled || partlyCancelled) && refundedTotal > 0 && (
                                    <span className={styles.item_card__meta} data-testid="item-refunded">
                                        برگشتی: {fa(refundedRegular)} نور عادی
                                        {refundedGift > 0 && ` و ${fa(refundedGift)} نور هدیه`}
                                    </span>
                                )}
                                {isProduct && !(isPaid && item.purchaseId) && item.physicalDeliveryStatus && (
                                    <span className={styles.item_card__meta}>
                                        ارسال: {getPhysicalDeliveryLabel(item.physicalDeliveryStatus)}
                                    </span>
                                )}
                            </div>
                            <span className={`${styles.item_card__price} ${fullyCancelled ? styles['item_card__price--struck'] : ''}`}>
                                {fa(item.finalAmountInNoor ?? item.priceInNoor)} نور
                            </span>
                        </div>

                        {isProduct && isPaid && item.purchaseId && !fullyCancelled && (
                            <div className={styles.item_card__actions}>
                                <PhysicalDeliveryControl
                                    purchaseId={item.purchaseId}
                                    cartId={detail.cartId}
                                    initialStatus={item.physicalDeliveryStatus || null}
                                    onStatusChange={(newStatus) => onItemStatus(item.purchaseId, newStatus)}
                                />
                                {canCancel && (
                                    <PhysicalCancelFlow
                                        mode="admin"
                                        targetId={item.purchaseId}
                                        maxQuantity={remainingQty}
                                        onCancelled={onReload}
                                    />
                                )}
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
}

/**
 * @param {{ order: object, onSummary?: (summary: object|null) => void, onPhysicalCancelled?: (cancelled: boolean) => void }} props
 * onPhysicalCancelled پس از هر بارگذاری (از جمله بعد از لغو) وضعیت «لغو کامل کالا» را به گرید خبر می‌دهد.
 */
export default function ByeMoneyOrderPanel({ order, onSummary, onPhysicalCancelled, onRestockCleared }) {
    const { state, reload, setItemDeliveryStatus } = useOrderTracking(order, { onSummary, onPhysicalCancelled });

    if (state.loading) {
        return <p className={styles.expanded_empty}>در حال دریافت اقلام و خط زمانی سفارش...</p>;
    }
    if (state.error || !state.data) {
        return (
            <div className={`${styles.expanded_section}`} role="alert">
                <p className={styles.expanded_empty}>⚠️ {state.error || 'جزئیات سفارش در دسترس نیست.'}</p>
                <AdminButton variant="default" onClick={reload}>
                    تلاش مجدد
                </AdminButton>
            </div>
        );
    }

    const { order: detail, timeline, warnings = [], receipt, shippingAddress } = state.data;
    const isPaid = canShowReceipt(detail);

    return (
        <>
            <OrderWarnings warnings={warnings} />

            {detail.cartId && (
                <PendingRestockNotice cartId={detail.cartId} items={detail.items} onCleared={onRestockCleared} />
            )}

            <div className={`${styles.expanded_section} ${styles.expanded_section_online}`}>
                <h4 className={styles.expanded_section__title}>🧾 خلاصهٔ سفارش</h4>
                <div className={styles.onlinePayDetails}>
                    <div className={styles.expanded_field}>
                        <span className={styles.expanded_field__label}>شناسهٔ سفارش</span>
                        <span className={styles.expanded_field__value} dir="ltr">{detail.orderId}</span>
                    </div>
                    <div className={styles.summaryGrid}>
                    <div className={styles.expanded_field}>
                        <span className={styles.expanded_field__label}>وضعیت تحویل</span>
                        <span className={styles.expanded_field__value}>
                            {DELIVERY_LABELS[detail.deliveryStatus] || detail.deliveryStatus || '—'}
                        </span>
                    </div>
                    {!(isPaid && receipt) && (
                        <div className={styles.expanded_field}>
                            <span className={styles.expanded_field__label}>مبلغ نهایی</span>
                            <span className={styles.expanded_field__value}>{fa(detail.finalAmountInNoor)} نور</span>
                        </div>
                    )}
                    {isPaid && receipt && (
                        <div data-testid="order-receipt" className={styles.summaryContents}>
                            <div className={styles.expanded_field}>
                                <span className={styles.expanded_field__label}>زمان خرید</span>
                                <span className={styles.expanded_field__value}>{formatTime(receipt.purchasedAtUtc)}</span>
                            </div>
                            {receipt.couponCode && (
                                <div className={styles.expanded_field}>
                                    <span className={styles.expanded_field__label}>کد تخفیف</span>
                                    <span className={styles.expanded_field__value} dir="ltr">{receipt.couponCode}</span>
                                </div>
                            )}
                            {receipt.cartSummary && (
                                <>
                                    <div className={styles.expanded_field}>
                                        <span className={styles.expanded_field__label}>جمع قیمت اقلام</span>
                                        <span className={styles.expanded_field__value}>{fa(receipt.cartSummary.originalTotalInNoor)} نور</span>
                                    </div>
                                    {((receipt.cartSummary.itemDiscountInNoor || 0) + (receipt.cartSummary.couponDiscountInNoor || 0)) > 0 && (
                                        <div className={styles.expanded_field}>
                                            <span className={styles.expanded_field__label}>مجموع تخفیف</span>
                                            <span className={styles.expanded_field__value}>
                                                {fa((receipt.cartSummary.itemDiscountInNoor || 0) + (receipt.cartSummary.couponDiscountInNoor || 0))} نور
                                            </span>
                                        </div>
                                    )}
                                    {receipt.cartSummary.shippingAmountInNoor > 0 && (
                                        <div className={styles.expanded_field}>
                                            <span className={styles.expanded_field__label}>هزینهٔ ارسال</span>
                                            <span className={styles.expanded_field__value}>{fa(receipt.cartSummary.shippingAmountInNoor)} نور</span>
                                        </div>
                                    )}
                                </>
                            )}
                            <div className={styles.expanded_field}>
                                <span className={styles.expanded_field__label}>مبلغ پرداختی قطعی</span>
                                <span className={styles.expanded_field__value}>{fa(receipt.finalAmountInNoor)} نور</span>
                            </div>
                        </div>
                    )}
                    </div>
                    <div>
                        <AdminButton variant="default" onClick={reload} title="دریافت دوباره از سرور">
                            تازه‌سازی
                        </AdminButton>
                    </div>
                </div>
            </div>

            <div className={styles.expanded_section}>
                <h4 className={styles.expanded_section__title}>🛒 اقلام سفارش</h4>
                <OrderItemsList detail={detail} isPaid={isPaid} onReload={reload} onItemStatus={setItemDeliveryStatus} />
            </div>

            {shippingAddress && (
                <div className={styles.expanded_section} data-testid="shipping-address">
                    <h4 className={styles.expanded_section__title}>📍 آدرس تحویل</h4>
                    <p>{shippingAddress.recipientName} — {shippingAddress.recipientPhone}</p>
                    <p>
                        {[shippingAddress.province, shippingAddress.city, shippingAddress.fullAddress].filter(Boolean).join('، ')}
                        {shippingAddress.postalCode ? ` — کد پستی: ${shippingAddress.postalCode}` : ''}
                    </p>
                </div>
            )}

            <div className={styles.expanded_section}>
                <h4 className={styles.expanded_section__title}>⏱️ خط زمانی تلاش‌های خرید</h4>
                <Timeline events={timeline} />
            </div>
        </>
    );
}
