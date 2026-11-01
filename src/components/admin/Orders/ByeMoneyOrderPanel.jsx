'use client';

/**
 * @file src/components/admin/Orders/ByeMoneyOrderPanel.jsx
 * @description پنل جزئیات سفارش بای‌مانی: اقلام، رسید (فقط Paid) و خط زمانی تلاش‌های خرید (TRACK-03)
 *
 * فقط‌مشاهده است و هیچ تغییر وضعیت مالی ندارد. داده از route سروری /api/admin/orders/[id]/tracking
 * می‌آید. اگر استرپی در دسترس نباشد فقط وضعیت بای‌مانی با هشدار نمایش داده می‌شود و پنل نمی‌شکند.
 * وضعیت شارژ با وضعیت خرید یکی نمایش داده نمی‌شود (TRACK-04): خط «شارژ» جدا از «نتیجهٔ نهایی سفارش» است.
 * کنترل وضعیت ارسال کالا (PhysicalDeliveryControl) دست‌نخورده و فقط برای قلم کالای سفارش Paid نمایش داده می‌شود.
 */

import { useEffect, useState } from 'react';
import { fetchOrderTracking } from '@/lib/client/admin/ordersClient';
import { canShowReceipt, getFinancialStatusConfig } from '@/lib/admin/orderTracking';
import { getPhysicalDeliveryLabel } from '@/lib/physicalDelivery';
import PhysicalDeliveryControl from './PhysicalDeliveryControl';
import AdminBadge from '../Shared/AdminBadge';
import AdminButton from '../Shared/AdminButton';
import styles from './OrdersTable.module.scss';

const DELIVERY_LABELS = {
    NotStarted: 'شروع نشده',
    Pending: 'در انتظار تحویل',
    PartiallyDelivered: 'تحویل ناقص',
    Delivered: 'تحویل شده',
};

const fa = (n) => (n === null || n === undefined ? '—' : Number(n).toLocaleString('fa-IR'));

function formatTime(d) {
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

function Timeline({ events }) {
    return (
        <ol className={styles.timeline} aria-label="خط زمانی تلاش‌های خرید">
            {events.map((ev, i) => (
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
    );
}

/**
 * @param {{ order: object, onSummary?: (summary: object|null) => void }} props
 */
export default function ByeMoneyOrderPanel({ order, onSummary }) {
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

    if (state.loading) {
        return <p className={styles.expanded_empty}>در حال دریافت اقلام و خط زمانی سفارش...</p>;
    }
    if (state.error || !state.data) {
        return (
            <div className={`${styles.expanded_section}`} role="alert">
                <p className={styles.expanded_empty}>⚠️ {state.error || 'جزئیات سفارش در دسترس نیست.'}</p>
                <AdminButton variant="default" onClick={() => setReloadKey((k) => k + 1)}>
                    تلاش مجدد
                </AdminButton>
            </div>
        );
    }

    const { order: detail, buyer, timeline, warnings = [], receipt } = state.data;
    const fin = getFinancialStatusConfig(detail.financialStatus);
    const isPaid = canShowReceipt(detail);

    return (
        <>
            {warnings.map((w) => (
                <div key={w} className={styles.byemoneyWarningAlert} role="status">
                    <span>⚠️ {w}</span>
                </div>
            ))}

            <div className={`${styles.expanded_section} ${styles.expanded_section_online}`}>
                <h4 className={styles.expanded_section__title}>🧾 وضعیت سفارش (بای‌مانی)</h4>
                <div className={styles.onlinePayDetails}>
                    <div className={styles.onlinePayStatusRow}>
                        <span className={styles.expanded_field__label}>وضعیت مالی:</span>
                        <AdminBadge text={fin.label} variant={fin.variant} />
                    </div>
                    <div className={styles.expanded_field}>
                        <span className={styles.expanded_field__label}>وضعیت تحویل</span>
                        <span className={styles.expanded_field__value}>
                            {DELIVERY_LABELS[detail.deliveryStatus] || detail.deliveryStatus || '—'}
                        </span>
                    </div>
                    <div className={styles.expanded_field}>
                        <span className={styles.expanded_field__label}>شناسهٔ سفارش</span>
                        <span className={styles.expanded_field__value} dir="ltr">{detail.orderId}</span>
                    </div>
                    {buyer?.displayName || buyer?.externalUserId ? (
                        <div className={styles.expanded_field}>
                            <span className={styles.expanded_field__label}>خریدار</span>
                            <span className={styles.expanded_field__value}>
                                {buyer.displayName || buyer.externalUserId}
                            </span>
                        </div>
                    ) : null}
                    {!(isPaid && receipt) && (
                        <div className={styles.expanded_field}>
                            <span className={styles.expanded_field__label}>مبلغ نهایی</span>
                            <span className={styles.expanded_field__value}>{fa(detail.finalAmountInNoor)} نور</span>
                        </div>
                    )}
                    {isPaid && receipt && (
                        <div data-testid="order-receipt" className={styles.onlinePayDetails}>
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
                    <div>
                        <AdminButton variant="default" onClick={() => setReloadKey((k) => k + 1)} title="دریافت دوباره از سرور">
                            تازه‌سازی
                        </AdminButton>
                    </div>
                </div>
            </div>

            <div className={styles.expanded_section}>
                <h4 className={styles.expanded_section__title}>🛒 اقلام سفارش</h4>
                {detail.items.length === 0 ? (
                    <p className={styles.expanded_empty}>اطلاعات اقلام در دسترس نیست.</p>
                ) : (
                    <div className={styles.items_list}>
                        {detail.items.map((item, idx) => {
                            const isProduct = String(item.itemType || '').toLowerCase() === 'product';
                            return (
                                <div key={`${item.externalCourseId || item.purchaseId || idx}`} className={styles.item_card}>
                                    <span className={styles.item_card__icon}>{isProduct ? '📦' : '📚'}</span>
                                    <div className={styles.item_card__info}>
                                        <span className={styles.item_card__title}>{item.title || (isProduct ? 'کالا' : 'دوره آموزشی')}</span>
                                        <span className={styles.item_card__type}>{isProduct ? 'کالای فیزیکی' : 'دوره آموزشی'}</span>
                                        {item.quantity > 1 && (
                                            <span className={styles.item_card__meta}>تعداد: {fa(item.quantity)}</span>
                                        )}
                                        {isProduct && item.physicalDeliveryStatus && (
                                            <span className={styles.item_card__meta}>
                                                ارسال: {getPhysicalDeliveryLabel(item.physicalDeliveryStatus)}
                                            </span>
                                        )}
                                    </div>
                                    <span className={styles.item_card__price}>{fa(item.finalAmountInNoor ?? item.priceInNoor)} نور</span>
                                </div>
                            );
                        })}
                    </div>
                )}
                {isPaid && detail.items
                    .filter((i) => String(i.itemType || '').toLowerCase() === 'product' && i.purchaseId)
                    .map((i) => (
                        <PhysicalDeliveryControl key={i.purchaseId} purchaseId={i.purchaseId} cartId={detail.cartId} />
                    ))}
            </div>

            <details className={styles.expanded_section}>
                <summary className={styles.expanded_section__title} style={{ cursor: 'pointer' }}>
                    ⏱️ خط زمانی تلاش‌های خرید ({fa(timeline.length)} رویداد)
                </summary>
                <Timeline events={timeline} />
            </details>
        </>
    );
}
