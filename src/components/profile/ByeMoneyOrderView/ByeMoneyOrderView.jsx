'use client';

/**
 * نمای جزئیات سفارش بای‌مانی برای کاربر (FE-ORDER-01).
 * ترتیب: خلاصه (وضعیت + مبلغ) ← اقلام ← ارسال کالا ← تلاش‌های پرداخت.
 * هر مقدار فقط یک‌بار می‌آید: مبلغ نهایی و تاریخ ثبت در خلاصه، وضعیت هر قلم کنار همان قلم.
 */

import { useState } from 'react';
import Link from 'next/link';
import PhysicalCancelFlow from '@/components/physicalCancel/PhysicalCancelFlow';
import { isGuid, sumRefunds, CANCEL_OUTCOME_LABELS } from '@/lib/physicalCancel';
import { getPhysicalDeliveryLabel } from '@/lib/physicalDelivery';
import {
    formatNoor, formatOrderDate, getAmountRows, getByeMoneyOrderView, getOrderNumber,
    getPaidAt, getPaymentRefCode, getPhysicalSteps,
} from '@/lib/byeMoneyOrderView';
import styles from './ByeMoneyOrderView.module.scss';

function CopyButton({ text, label }) {
    const [copied, setCopied] = useState(false);
    const copy = async () => {
        try {
            await navigator.clipboard.writeText(String(text));
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch {
            // کلیپ‌بورد در دسترس نیست؛ کاربر می‌تواند متن را دستی کپی کند
        }
    };
    return (
        <button type="button" className={`${styles.copyBtn} ${copied ? styles.copied : ''}`} onClick={copy} aria-label={`کپی ${label}`}>
            {copied ? 'کپی شد ✓' : 'کپی'}
        </button>
    );
}

const CourseIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
        <path d="M2 3h6a4 4 0 014 4v14a3 3 0 00-3-3H2z" />
        <path d="M22 3h-6a4 4 0 00-4 4v14a3 3 0 013-3h7z" />
    </svg>
);

const ProductIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
        <path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z" />
        <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
        <line x1="12" y1="22.08" x2="12" y2="12" />
    </svg>
);

function ItemRow({ item, view, showItemPhysicalStatus }) {
    const isProduct = item.type === 'product';
    const cancelledQty = Number(item.cancelledQuantity) || 0;
    const qty = Number(item.quantity) || 1;
    const fullyCancelled = isProduct && (view.physicalCancelled || cancelledQty >= qty);
    const partlyCancelled = isProduct && !fullyCancelled && cancelledQty > 0;
    const refundedRegular = Number(item.refundedRegularInNoor) || 0;
    const refundedGift = Number(item.refundedGiftInNoor) || 0;
    const typeLabel = isProduct ? 'کالای فیزیکی' : item.type === 'chapter' ? 'فصل' : 'دوره آموزشی';
    const physicalLabel = getPhysicalDeliveryLabel(item.physicalDeliveryStatus);

    return (
        <li className={styles.item}>
            <span className={styles.itemIcon}>{isProduct ? <ProductIcon /> : <CourseIcon />}</span>
            <div className={styles.itemBody}>
                <span className={styles.itemTitle}>{item.title || '—'}</span>
                <div className={styles.itemTags}>
                    <span className={styles.tag}>{typeLabel}</span>
                    {isProduct && qty > 1 && item.unitPrice != null && (
                        <span className={styles.itemHint}>{qty.toLocaleString('fa-IR')} × {formatNoor(item.unitPrice)}</span>
                    )}
                    {fullyCancelled && (
                        <span className={`${styles.pill} ${styles.danger}`} data-testid="physical-item-cancelled">لغو شد</span>
                    )}
                    {partlyCancelled && (
                        <span className={`${styles.pill} ${styles.warning}`}>
                            {cancelledQty.toLocaleString('fa-IR')} از {qty.toLocaleString('fa-IR')} عدد لغو شد
                        </span>
                    )}
                    {(fullyCancelled || partlyCancelled) && refundedRegular + refundedGift > 0 && (
                        <span className={styles.itemHint} data-testid="physical-item-refunded">
                            برگشتی: {formatNoor(refundedRegular)}
                            {refundedGift > 0 && ` + ${formatNoor(refundedGift)} هدیه`}
                        </span>
                    )}
                    {isProduct && !fullyCancelled && showItemPhysicalStatus && physicalLabel && (
                        <span className={`${styles.pill} ${item.physicalDeliveryStatus === 'Delivered' ? styles.success : styles.info}`} data-testid="physical-delivery-status">
                            {physicalLabel}
                        </span>
                    )}
                    {!isProduct && view.isPaid && item.deliveryStatus && (
                        <span className={`${styles.pill} ${item.deliveryStatus === 'Delivered' ? styles.success : styles.warning}`} data-testid="course-delivery-status">
                            {item.deliveryStatus === 'Delivered' ? 'فعال شد' : 'در حال فعال‌سازی'}
                        </span>
                    )}
                </div>
            </div>
            <span className={`${styles.itemPrice} ${fullyCancelled ? styles.struck : ''}`}>{formatNoor(item.price ?? 0)}</span>
        </li>
    );
}

function Progress({ state }) {
    const steps = getPhysicalSteps(state);
    if (!steps) return null;
    return (
        <ol className={styles.progress} data-testid="physical-progress" aria-label="مراحل ارسال کالا">
            {steps.map((step) => (
                <li
                    key={step.label}
                    className={`${styles.step} ${step.done ? styles.stepDone : ''} ${step.current ? styles.stepCurrent : ''}`}
                    aria-current={step.current ? 'step' : undefined}
                >
                    <span className={styles.stepDot} aria-hidden>{step.done ? '✓' : ''}</span>
                    <span className={styles.stepLabel}>{step.label}</span>
                </li>
            ))}
        </ol>
    );
}

export default function ByeMoneyOrderView({ order }) {
    const [cancelResult, setCancelResult] = useState(null);

    const items = Array.isArray(order.items) ? order.items : [];
    const view = getByeMoneyOrderView(order, { cancelledNow: Boolean(cancelResult) });
    const { physicalItems } = view;
    const number = getOrderNumber(order);
    const created = formatOrderDate(order.createdAt);
    const paidAt = view.isPaid ? getPaidAt(order) : null;
    const refCode = getPaymentRefCode(order);
    const amountRows = getAmountRows(order);
    const refunds = sumRefunds(cancelResult);

    const physicalCartId = String(order.cartId || order.orderId || '').replace(/^cart:/, '');
    const canCancel = view.isPaid && !view.physicalCancelled && isGuid(physicalCartId)
        && physicalItems.length > 0 && physicalItems.every((i) => i.physicalDeliveryStatus === 'Preparing');

    // اگر وضعیت همهٔ کالاها یکی است، فقط نوار پیشرفت نشان داده می‌شود و کنار قلم‌ها تکرار نمی‌شود
    const uniformPhysical = new Set(physicalItems.map((i) => i.physicalDeliveryStatus)).size <= 1;
    const showProgress = view.isPaid && !view.physicalCancelled && uniformPhysical;
    const showItemPhysicalStatus = view.isPaid && !uniformPhysical;

    const topUps = Array.isArray(order.topUps) ? order.topUps : [];
    const address = order.shippingAddress;
    const addressLine = address ? [address.province, address.city, address.fullAddress].filter(Boolean).join('، ') : '';
    const showMyCourses = view.isPaid && view.hasCourse;

    return (
        <>
            {/* ─── خلاصه: وضعیت و مبلغ ─── */}
            <section className={`${styles.card} ${styles.summary} ${styles[`tone_${view.tone}`]}`} data-testid="order-summary">
                <div className={styles.summaryHead}>
                    <h1 className={styles.orderNumber}>
                        سفارش <span dir="ltr" data-testid="order-number">#{number.short}</span>
                    </h1>
                    {number.full && <CopyButton text={number.full} label="شمارهٔ سفارش" />}
                </div>

                <div className={styles.summaryMain}>
                    <div className={styles.statusBlock}>
                        <span className={`${styles.statusBadge} ${styles[view.tone]}`} data-testid="order-status-badge">{view.title}</span>
                        {view.hint && <p className={styles.hint} data-testid="order-hint">{view.hint}</p>}
                    </div>
                    {order.totalPrice != null && (
                        <div className={styles.amountBlock}>
                            <span className={styles.amountLabel}>{view.amountLabel}</span>
                            <strong className={styles.amountValue} data-testid={view.unpaid ? 'payable-amount' : 'paid-amount'}>
                                {formatNoor(order.totalPrice)}
                            </strong>
                            {view.unpaid && !view.hideUnpaidNote && (
                                <span className={styles.amountNote} data-testid="unpaid-note">پرداخت‌شده: {formatNoor(0)}</span>
                            )}
                        </div>
                    )}
                </div>

                <dl className={styles.facts}>
                    {created && (<div><dt>تاریخ ثبت</dt><dd>{created}</dd></div>)}
                    {paidAt && (<div><dt>زمان پرداخت</dt><dd>{paidAt}</dd></div>)}
                    {refCode && (
                        <div data-testid="payment-ref-code">
                            <dt>کد پیگیری پرداخت</dt>
                            <dd><bdi dir="ltr">{refCode}</bdi><CopyButton text={refCode} label="کد پیگیری پرداخت" /></dd>
                        </div>
                    )}
                </dl>

                {amountRows.length > 0 && (
                    <div className={styles.breakdown} data-testid="amount-breakdown">
                        {amountRows.map((row) => (
                            <div key={row.key} className={styles.breakdownRow} data-testid={`${row.key}-row`}>
                                <span>{row.label}</span><span>{row.value}</span>
                            </div>
                        ))}
                    </div>
                )}
            </section>

            {/* ─── اقلام ─── */}
            {items.length > 0 && (
                <section className={styles.card} data-testid="receipt-box">
                    <h2 className={styles.cardTitle}>اقلام سفارش <span className={styles.count}>{items.length.toLocaleString('fa-IR')}</span></h2>
                    <ul className={styles.itemList}>
                        {items.map((item, idx) => (
                            <ItemRow key={item.purchaseId || item.id || idx} item={item} view={view} showItemPhysicalStatus={showItemPhysicalStatus} />
                        ))}
                    </ul>
                    {showMyCourses && (
                        <Link href="/profile/purchases" className={styles.linkBtn}>مشاهدهٔ دوره‌ها در بخش «خریدهای من» ←</Link>
                    )}
                </section>
            )}

            {/* ─── ارسال کالا ─── */}
            {view.hasProduct && (
                <section className={styles.card} data-testid="shipping-card">
                    <h2 className={styles.cardTitle}>ارسال کالا</h2>

                    {showProgress && <Progress state={view.physicalState} />}

                    {view.physicalCancelled && (
                        <div role="status" data-testid="physical-cancelled-notice" className={styles.notice}>
                            <strong>
                                {cancelResult
                                    ? (CANCEL_OUTCOME_LABELS[cancelResult.outcome] || 'بخش کالای سفارش لغو شد')
                                    : 'بخش کالای این سفارش لغو شده است'}
                            </strong>
                            {cancelResult && (refunds.regular > 0 || refunds.gift > 0) && (
                                <ul className={styles.refunds} data-testid="cancelled-refunds">
                                    {refunds.regular > 0 && <li>نور عادی برگشتی: <strong>{refunds.regular.toLocaleString('fa-IR')}</strong></li>}
                                    {refunds.gift > 0 && <li>نور هدیهٔ برگشتی: <strong>{refunds.gift.toLocaleString('fa-IR')}</strong></li>}
                                </ul>
                            )}
                        </div>
                    )}

                    {address && (addressLine || address.recipientName) && (
                        <dl className={styles.address} data-testid="shipping-address">
                            {address.recipientName && (<div><dt>گیرنده</dt><dd>{address.recipientName}{address.recipientPhone ? ` — ${address.recipientPhone}` : ''}</dd></div>)}
                            {addressLine && (<div><dt>نشانی</dt><dd>{addressLine}</dd></div>)}
                            {address.postalCode && (<div><dt>کد پستی</dt><dd dir="ltr">{address.postalCode}</dd></div>)}
                        </dl>
                    )}

                    {canCancel && (
                        <div className={styles.actions}>
                            <PhysicalCancelFlow mode="user" targetId={physicalCartId} onCancelled={setCancelResult} />
                        </div>
                    )}
                </section>
            )}

            {/* ─── تلاش‌های پرداخت (فقط پرداخت‌نشده) ─── */}
            {!view.isPaid && topUps.length > 0 && (
                <details className={styles.card} data-testid="top-ups-section">
                    <summary className={styles.cardTitle}>تلاش‌های پرداخت <span className={styles.count}>{topUps.length.toLocaleString('fa-IR')}</span></summary>
                    <ul className={styles.attempts}>
                        {topUps.map((t, idx) => {
                            const tone = t.status === 'Confirmed' ? 'success' : t.status === 'Rejected' ? 'danger' : 'warning';
                            const label = t.status === 'Confirmed' ? 'شارژ تأیید شد' : t.status === 'Rejected' ? 'شارژ رد شد' : 'در انتظار تأیید';
                            return (
                                <li key={t.topUpRequestId || idx} className={styles.attempt}>
                                    <div className={styles.attemptInfo}>
                                        <bdi dir="ltr">{t.clientReferenceCode || t.topUpRequestId}</bdi>
                                        <span className={styles.itemHint}>{formatOrderDate(t.createdAtUtc)}</span>
                                    </div>
                                    <span>{formatNoor(t.amountNoor)}</span>
                                    <span className={`${styles.pill} ${styles[tone]}`}>{label}</span>
                                </li>
                            );
                        })}
                    </ul>
                    <p className={styles.footnote}>تأیید شارژ فقط اعتبار کیف پول را بالا می‌برد؛ وضعیت خرید در بالای صفحه است.</p>
                </details>
            )}
        </>
    );
}
