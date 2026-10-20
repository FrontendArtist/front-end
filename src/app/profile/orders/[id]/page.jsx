'use client';

/**
 * src/app/profile/orders/[id]/page.jsx
 * ─────────────────────────────────────────────────────────────────────────────
 * صفحه جزئیات یک سفارش خاص.
 * مسیر: /profile/orders/[id]   ← [id] همان Strapi v5 documentId است
 *
 * منطق نمایش:
 *  - اطلاعات سفارش از /api/orders?filters[documentId][$eq]=[id] فچ می‌شود.
 *  - اگر paymentMethod === 'card_to_card' و paymentStatus === 'pending_payment'
 *    → کامپوننت <OrderReceiptUpload /> نمایش داده می‌شود.
 *  - در غیر این صورت جزئیات استاندارد سفارش نمایش داده می‌شود.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import OrderReceiptUpload from '@/components/profile/OrderReceiptUpload';
import PriceWithHint from '@/components/ui/PriceWithHint/PriceWithHint';
import { getCoursePurchaseReceipt } from '@/lib/byeMoneyApi';
import styles from './orderDetail.module.scss';

// ─── فرمت‌کننده‌ها و ابزارها ──────────────────────────────────────────
const extractFromNotes = (notes, label) => {
    if (!notes || typeof notes !== 'string') return null;
    const regex = new RegExp(`${label}\\s*([^\\n\\r]+)`, 'i');
    const match = notes.match(regex);
    return match ? match[1].trim() : null;
};

function CopyBtn({ text, label = 'کپی' }) {
    const [copied, setCopied] = useState(false);

    const handleCopy = () => {
        if (!text) return;
        try {
            navigator.clipboard.writeText(String(text));
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch {
            // fallback
        }
    };

    return (
        <button
            type="button"
            className={`${styles.copyBtn} ${copied ? styles.copyBtnSuccess : ''}`}
            onClick={handleCopy}
            title={copied ? 'کپی شد!' : `کپی ${label}`}
        >
            {copied ? '✓ کپی شد' : 'کپی'}
        </button>
    );
}

const formatPrice = (price) =>
    Number(price || 0).toLocaleString('fa-IR');

const formatDate = (dateString) => {
    if (!dateString) return '—';
    return new Intl.DateTimeFormat('fa-IR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    }).format(new Date(dateString));
};

// ─── بج وضعیت پرداخت ─────────────────────────────────────────────────────────
const PaymentStatusBadge = ({ status }) => {
    const map = {
        pending_payment: { label: 'در انتظار پرداخت', cls: styles.badgeWarning },
        pending_verification: { label: 'در انتظار تأیید', cls: styles.badgePending },
        paid: { label: 'پرداخت شده', cls: styles.badgeSuccess },
        failed: { label: 'پرداخت ناموفق', cls: styles.badgeDanger },
    };
    const entry = map[status] ?? { label: status || 'نامشخص', cls: styles.badgeDefault };
    return <span className={`${styles.badge} ${entry.cls}`}>{entry.label}</span>;
};

// ─── بج وضعیت سفارش ──────────────────────────────────────────────────────────
const OrderStatusBadge = ({ status, paymentStatus, paymentMethod }) => {
    const normalized = status?.trim()?.toLowerCase();
    const pStatus = paymentStatus?.trim()?.toLowerCase();
    const isOnline = paymentMethod === 'online';

    if (normalized === 'canceled' || normalized === 'cancelled' || pStatus === 'failed') {
        return (
            <span className={`${styles.badge} ${styles.badgeDanger}`}>
                {isOnline ? 'پرداخت ناموفق / لغو شده' : 'لغو شده'}
            </span>
        );
    }
    const map = {
        paid: { label: 'پرداخت شده', cls: styles.badgeSuccess },
        pending: { label: 'در انتظار پرداخت', cls: styles.badgeWarning },
        shipped: { label: 'ارسال شده', cls: styles.badgeInfo },
        delivered: { label: 'تحویل داده شد', cls: styles.badgeSuccess },
    };
    const entry = map[normalized] ?? { label: status || 'نامشخص', cls: styles.badgeDefault };
    return <span className={`${styles.badge} ${entry.cls}`}>{entry.label}</span>;
};

// ─── کامپوننت اصلی ────────────────────────────────────────────────────────────
export default function OrderDetailPage() {
    const { id } = useParams();   // id = Strapi documentId یا ByeMoney orderId
    const router = useRouter();
    const { data: session } = useSession();

    const [order, setOrder] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [receiptModal, setReceiptModal] = useState({ isOpen: false, isLoading: false, data: null, error: null });

    const handleViewReceipt = async (purchaseId) => {
        if (!purchaseId) return;
        setReceiptModal({ isOpen: true, isLoading: true, data: null, error: null });
        try {
            if (session?.user?.jwt) {
                const res = await getCoursePurchaseReceipt({
                    jwt: session.user.jwt,
                    purchaseId
                });
                if (res.success && res.data) {
                    setReceiptModal({ isOpen: true, isLoading: false, data: res.data, error: null });
                    return;
                }
                if (res.unauthorized) {
                    throw new Error('نشست کاربری شما منقضی شده است. لطفاً مجدداً وارد شوید.');
                }
                if (res.notFound) {
                    throw new Error('رسید خرید پیدا نشد یا متعلق به شما نیست.');
                }
                throw new Error(res.error || 'خطا در دریافت رسید خرید.');
            }
            // fallback از مسیر داخلی سرور
            const response = await fetch(`/api/orders?purchaseId=${encodeURIComponent(purchaseId)}`);
            if (response.status === 401) throw new Error('نشست کاربری شما منقضی شده است.');
            if (response.status === 404) throw new Error('رسید خرید پیدا نشد.');
            if (!response.ok) throw new Error('خطا در دریافت رسید خرید.');
            const json = await response.json();
            if (json.data) {
                setReceiptModal({ isOpen: true, isLoading: false, data: json.data, error: null });
            } else {
                throw new Error(json.message || 'خطا در دریافت رسید');
            }
        } catch (err) {
            setReceiptModal({ isOpen: true, isLoading: false, data: null, error: err.message });
        }
    };


    // ── دریافت سفارش از API Proxy ─────────────────────────────────────────────
    const fetchOrder = useCallback(async () => {
        if (!id) return;
        setIsLoading(true);
        setError(null);
        try {
            // ── BUG FIX ─────────────────────────────────────────────────────────────
            // قبلاً URL با brackets فیلتر ارسال می‌شد اما GET handler هیچ query param
            // را نمی‌خواند — حالا ?documentId= استفاده می‌کنیم که handler آن را درک می‌کند.
            const res = await fetch(
                `/api/orders?documentId=${encodeURIComponent(id)}`,
                { cache: 'no-store' }
            );
            if (!res.ok) throw new Error('دریافت اطلاعات سفارش با خطا مواجه شد.');
            const json = await res.json();

            // Strapi v5: data یک آرایه است (حتی برای یک نتیجه)
            const orderData = json?.data?.[0] ?? null;

            if (!orderData) throw new Error('سفارشی با این شناسه یافت نشد.');

            setOrder(orderData);
        } catch (err) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    }, [id]);

    useEffect(() => { fetchOrder(); }, [fetchOrder]);

    // ── Callback موفقیت آپلود فیش ─────────────────────────────────────────────
    // وضعیت محلی order را بروز می‌کند تا فرم آپلود پنهان شود و به در حال بررسی تغییر کند
    const handleReceiptSuccess = (updatedOrderMeta) => {
        setOrder((prev) => ({
            ...prev,
            orderStatus: 'pending',
            paymentStatus: updatedOrderMeta?.paymentStatus ?? 'pending_verification',
            rejectionReason: null,
        }));
    };

    // ── حالت‌های Loading / Error ─────────────────────────────────────────────
    if (isLoading) {
        return (
            <div className={styles.page}>
                <div className={styles.loadingState}>در حال دریافت اطلاعات سفارش…</div>
            </div>
        );
    }

    if (error || !order) {
        return (
            <div className={styles.page}>
                <div className={styles.errorState} role="alert">
                    <p>{error || 'سفارش مورد نظر یافت نشد.'}</p>
                    <Link href="/profile/orders" className={styles.backLink}>
                        بازگشت به سفارشات
                    </Link>
                </div>
            </div>
        );
    }

    const items = Array.isArray(order.items) ? order.items : [];
    const isByeMoney = order.source === 'byemoney';
    const isCardToCard = !isByeMoney && order.paymentMethod === 'card_to_card';
    const isOnline = !isByeMoney && order.paymentMethod === 'online';
    const isPaid = isByeMoney
        ? order.financialStatus === 'Paid'
        : ['paid', 'shipped', 'delivered'].includes(order.orderStatus?.trim()?.toLowerCase()) || order.paymentStatus === 'paid';
    const isFailedOrCanceled = isByeMoney
        ? ['Failed', 'Expired'].includes(order.financialStatus)
        : !isByeMoney && (
            order.paymentStatus === 'failed' || 
            order.paymentStatus === 'rejected' ||
            order.orderStatus === 'canceled' ||
            order.orderStatus === 'cancelled'
        );
    const isRejected = isCardToCard && isFailedOrCanceled;
    const needsReceiptUpload = isCardToCard && order.paymentStatus === 'pending_payment' && !isRejected;

    const failureReason = order.rejectionReason 
        || extractFromNotes(order.notes, '❌ پرداخت ناموفق در درگاه:') 
        || extractFromNotes(order.notes, '❌ عدم تایید تراکنش توسط بانک:');

    // استخراج فیلدهای پرداخت آنلاین با fallback از notes
    const onlineRefNum = order.refNum || extractFromNotes(order.notes, 'رسید دیجیتال \\(RefNum\\):');
    const onlineTraceNo = order.traceNo || extractFromNotes(order.notes, 'کد رهگیری:') || order.trackingNumber;
    const onlineRrn = order.rrn || extractFromNotes(order.notes, 'شماره مرجع \\(RRN\\):');
    const onlineSecurePan = order.securePan || extractFromNotes(order.notes, 'شماره کارت:');
    const onlinePaymentDate = order.paymentDate || (isPaid ? order.createdAt : null);

    return (
        <div className={styles.page}>

            {/* ─── دکمه برگشت ─────────────────────────────────────────────── */}
            <Link href="/profile/orders" className={styles.backBtn} aria-label="بازگشت به لیست سفارشات">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
                    stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="15 18 9 12 15 6" />
                </svg>
                بازگشت به سفارشات
            </Link>

            {/* ─── هدر سفارش ──────────────────────────────────────────────── */}
            <div className={styles.orderHeader}>
                <div className={styles.orderHeaderTop}>
                    <h1 className={styles.orderTitle}>
                        {isByeMoney ? (isPaid ? 'جزئیات و رسید سفارش دوره' : 'جزئیات سفارش دوره') : 'جزئیات سفارش'}
                    </h1>
                </div>
                <div className={styles.orderMeta}>
                    <span className={styles.metaItem}>
                        <span className={styles.metaLabel}>شناسه:</span>
                        <span className={styles.metaValue} dir="ltr">{order.documentId || id}</span>
                    </span>
                    <span className={styles.metaItem}>
                        <span className={styles.metaLabel}>تاریخ ثبت:</span>
                        <span className={styles.metaValue}>{formatDate(order.createdAt)}</span>
                    </span>
                    <span className={styles.metaItem}>
                        <span className={styles.metaLabel}>روش پرداخت:</span>
                        <span className={styles.metaValue}>
                            {isByeMoney ? 'کیف نور (بای‌مانی)' : (isCardToCard ? 'کارت به کارت' : (order.paymentMethod === 'free' ? 'رایگان' : 'پرداخت آنلاین (درگاه سامان)'))}
                        </span>
                    </span>
                    <span className={styles.metaItem}>
                        <span className={styles.metaLabel}>مبلغ کل:</span>
                        <span className={`${styles.metaValue} ${styles.metaPrice}`}>
                            {order.totalPrice != null ? (
                                <PriceWithHint price={order.totalPrice} hideHint={isByeMoney} size="sm" />
                            ) : (
                                '—'
                            )}
                        </span>
                    </span>
                    <span className={styles.metaItem}>
                        <span className={styles.metaLabel}>وضعیت سفارش:</span>
                        <span className={styles.metaValue} style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                            {isByeMoney ? (
                                <>
                                    <span className={`${styles.badge} ${
                                        order.financialStatus === 'Paid' ? styles.badgeSuccess :
                                        ['Failed', 'Expired'].includes(order.financialStatus) ? styles.badgeDanger :
                                        order.financialStatus === 'RequiresReview' ? styles.badgeWarning :
                                        order.financialStatus === 'AwaitingPayment' ? styles.badgeWarning : styles.badgeDefault
                                    }`}>
                                        {order.financialStatus === 'Paid' ? 'پرداخت شده ✓' :
                                         order.financialStatus === 'AwaitingPayment' ? 'در انتظار پرداخت' :
                                         order.financialStatus === 'Processing' ? 'در حال پردازش' :
                                         order.financialStatus === 'Preparing' ? 'در حال آماده‌سازی' :
                                         order.financialStatus === 'Failed' ? 'پرداخت ناموفق ⚠️' :
                                         order.financialStatus === 'Expired' ? 'منقضی شده' :
                                         order.financialStatus === 'RequiresReview' ? 'نیازمند بررسی مالی' :
                                         (order.financialStatus || 'وضعیت مالی نامشخص')}
                                    </span>
                                    <span className={`${styles.badge} ${
                                        order.deliveryStatus === 'Delivered' ? styles.badgeSuccess :
                                        order.deliveryStatus === 'PartiallyDelivered' ? styles.badgeWarning :
                                        order.deliveryStatus === 'Pending' ? styles.badgeInfo : styles.badgeDefault
                                    }`}>
                                        {order.deliveryStatus === 'Delivered' ? 'دسترسی فعال شد ✓' :
                                         order.deliveryStatus === 'PartiallyDelivered' ? 'دسترسی بخشی از اقلام فعال شد' :
                                         order.deliveryStatus === 'Pending' ? 'در انتظار فعال‌سازی' :
                                         order.deliveryStatus === 'NotStarted' ? 'فعال‌سازی آغاز نشده' :
                                         (order.deliveryStatus || 'وضعیت دسترسی نامشخص')}
                                    </span>
                                </>
                            ) : (
                                <>
                                    <OrderStatusBadge status={isOnline && isPaid ? 'paid' : order.orderStatus} paymentStatus={order.paymentStatus} paymentMethod={order.paymentMethod} />
                                    {isCardToCard && <PaymentStatusBadge status={order.paymentStatus} />}
                                    {isOnline && isPaid && (
                                        <span className={`${styles.badge} ${styles.badgeSuccess}`}>
                                            پرداخت آنلاین موفق
                                        </span>
                                    )}
                                </>
                            )}
                        </span>
                    </span>
                    {(order.orderStatus?.trim() === 'shipped' || order.trackingNumber) && (
                        <span className={styles.metaItem}>
                            <span className={styles.metaLabel}>کد پیگیری:</span>
                            <span className={styles.metaValue} dir="ltr" style={{ fontWeight: 'bold' }}>
                                {order.trackingNumber || 'در حال ارسال...'}
                            </span>
                        </span>
                    )}
                </div>
            </div>

            {/* ─── مشخصات رسید پرداخت با نور (سامانه مالی بای‌مانی) ────────── */}
            {isByeMoney && (isPaid || order.cartSummary || order.baseAmountInNoor != null || order.totalPrice != null) && (
                <div className={styles.onlineReceiptCard}>
                    <div className={styles.onlineReceiptHeader}>
                        <div className={styles.onlineReceiptTitleWrap}>
                            <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
                                stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <rect x="2" y="5" width="20" height="14" rx="2" />
                                <line x1="2" y1="10" x2="22" y2="10" />
                            </svg>
                            <h2 className={styles.onlineReceiptTitle}>
                                {isPaid ? 'مشخصات مالی و رسید دوره (سامانه بای‌مانی)' : 'خلاصه مبالغ سفارش (سامانه بای‌مانی)'}
                            </h2>
                        </div>
                        <span className={isPaid ? styles.receiptStatusSuccess : (isFailedOrCanceled ? styles.receiptStatusFailed : styles.receiptStatusPending)}>
                            {isPaid ? '✓ پرداخت قطعی و موفق' : (isFailedOrCanceled ? '✕ پرداخت ناموفق' : '⏳ در انتظار پرداخت')}
                        </span>
                    </div>

                    <div className={styles.onlineReceiptGrid}>
                        <div className={styles.receiptField}>
                            <span className={styles.receiptFieldLabel}>شناسه سفارش</span>
                            <div className={styles.copyableWrapper}>
                                <span className={styles.receiptFieldValue} dir="ltr">{order.orderId || order.documentId || id}</span>
                                <CopyBtn text={order.orderId || order.documentId || id} label="شناسه سفارش" />
                            </div>
                        </div>

                        {order.cartId && (
                            <div className={styles.receiptField}>
                                <span className={styles.receiptFieldLabel}>شناسه سبد خرید (Cart ID)</span>
                                <div className={styles.copyableWrapper}>
                                    <span className={styles.receiptFieldValue} dir="ltr">{order.cartId}</span>
                                    <CopyBtn text={order.cartId} label="شناسه سبد" />
                                </div>
                            </div>
                        )}

                        {order.transactionId && (
                            <div className={styles.receiptField}>
                                <span className={styles.receiptFieldLabel}>شناسه تراکنش مالی (Transaction ID)</span>
                                <div className={styles.copyableWrapper}>
                                    <span className={styles.receiptFieldValue} dir="ltr">{order.transactionId}</span>
                                    <CopyBtn text={order.transactionId} label="شناسه تراکنش" />
                                </div>
                            </div>
                        )}

                        {(order.cartSummary?.originalTotalInNoor != null || order.baseAmountInNoor != null) && (
                            <div className={styles.receiptField}>
                                <span className={styles.receiptFieldLabel}>جمع کل اقلام (پایه)</span>
                                <span className={styles.receiptFieldValue}>
                                    {Number(order.cartSummary?.originalTotalInNoor ?? order.baseAmountInNoor).toLocaleString('fa-IR')} نور
                                </span>
                            </div>
                        )}

                        {((order.cartSummary?.itemDiscountInNoor != null && order.cartSummary.itemDiscountInNoor > 0) ||
                          (order.cartSummary?.couponDiscountInNoor != null && order.cartSummary.couponDiscountInNoor > 0) ||
                          (order.discountAmountInNoor != null && order.discountAmountInNoor > 0)) && (
                            <div className={styles.receiptField}>
                                <span className={styles.receiptFieldLabel}>مجموع تخفیف</span>
                                <span className={styles.receiptFieldValue}>
                                    {Number(
                                        (order.cartSummary?.itemDiscountInNoor || 0) + (order.cartSummary?.couponDiscountInNoor || 0) ||
                                        (order.discountAmountInNoor || 0)
                                    ).toLocaleString('fa-IR')} نور
                                </span>
                            </div>
                        )}

                        {order.couponCode && (
                            <div className={styles.receiptField}>
                                <span className={styles.receiptFieldLabel}>کد تخفیف اعمال‌شده</span>
                                <span className={styles.receiptFieldValue} dir="ltr">{order.couponCode}</span>
                            </div>
                        )}

                        <div className={styles.receiptField}>
                            <span className={styles.receiptFieldLabel}>مبلغ قابل پرداخت / نهایی</span>
                            <span className={styles.receiptFieldValue}>
                                {order.totalPrice != null ? `${Number(order.totalPrice).toLocaleString('fa-IR')} نور` : '—'}
                            </span>
                        </div>

                        {order.referenceRialPerNoorAtPurchaseTime != null && (
                            <div className={styles.receiptField}>
                                <span className={styles.receiptFieldLabel}>نرخ مرجع ریالی هنگام خرید</span>
                                <span className={styles.receiptFieldValue} dir="ltr">
                                    {Number(order.referenceRialPerNoorAtPurchaseTime).toLocaleString('fa-IR')} ریال
                                </span>
                            </div>
                        )}

                        <div className={styles.receiptField}>
                            <span className={styles.receiptFieldLabel}>تاریخ ثبت سفارش</span>
                            <span className={styles.receiptFieldValue}>{formatDate(order.createdAt)}</span>
                        </div>

                        <div className={styles.receiptField}>
                            <span className={styles.receiptFieldLabel}>وضعیت دسترسی</span>
                            <span className={styles.receiptFieldValue}>
                                {order.deliveryStatus === 'Delivered' ? 'دسترسی فعال شد' :
                                 order.deliveryStatus === 'PartiallyDelivered' ? 'بخشی از اقلام تحویل شد' :
                                 order.deliveryStatus === 'Pending' ? 'در حال فعال‌سازی دسترسی' : 'تحویل آغاز نشده'}
                            </span>
                        </div>
                    </div>
                </div>
            )}


            {/* ─── مشخصات رسید پرداخت آنلاین (درگاه سامان کیش - سپ) ────── */}
            {isOnline && (
                <div className={styles.onlineReceiptCard}>
                    <div className={styles.onlineReceiptHeader}>
                        <div className={styles.onlineReceiptTitleWrap}>
                            <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
                                stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <rect x="2" y="5" width="20" height="14" rx="2" />
                                <line x1="2" y1="10" x2="22" y2="10" />
                            </svg>
                            <h2 className={styles.onlineReceiptTitle}>
                                مشخصات پرداخت اینترنتی (درگاه پرداخت الکترونیک سامان)
                            </h2>
                        </div>
                        {isPaid ? (
                            <span className={styles.receiptStatusSuccess}>
                                ✓ پرداخت تایید شده توسط درگاه سپ
                            </span>
                        ) : isFailedOrCanceled ? (
                            <span className={styles.receiptStatusFailed}>
                                ✕ پرداخت لغو شده / ناموفق
                            </span>
                        ) : (
                            <span className={styles.receiptStatusPending}>
                                ⏳ در انتظار پرداخت آنلاین
                            </span>
                        )}
                    </div>

                    <div className={styles.onlineReceiptGrid}>
                        {onlineSecurePan && (
                            <div className={styles.receiptField}>
                                <span className={styles.receiptFieldLabel}>شماره کارت واریزکننده</span>
                                <span className={styles.receiptFieldValue} dir="ltr">💳 {onlineSecurePan}</span>
                            </div>
                        )}

                        {onlineRefNum && (
                            <div className={styles.receiptField}>
                                <span className={styles.receiptFieldLabel}>رسید دیجیتال بانک (RefNum)</span>
                                <div className={styles.copyableWrapper}>
                                    <span className={styles.receiptFieldValue} dir="ltr">{onlineRefNum}</span>
                                    <CopyBtn text={onlineRefNum} label="رسید دیجیتال" />
                                </div>
                            </div>
                        )}

                        {onlineTraceNo && (
                            <div className={styles.receiptField}>
                                <span className={styles.receiptFieldLabel}>کد پیگیری تراکنش (TraceNo)</span>
                                <div className={styles.copyableWrapper}>
                                    <span className={styles.receiptFieldValue} dir="ltr">{onlineTraceNo}</span>
                                    <CopyBtn text={onlineTraceNo} label="کد پیگیری" />
                                </div>
                            </div>
                        )}

                        {onlineRrn && (
                            <div className={styles.receiptField}>
                                <span className={styles.receiptFieldLabel}>شماره مرجع شاپرک (RRN)</span>
                                <span className={styles.receiptFieldValue} dir="ltr">{onlineRrn}</span>
                            </div>
                        )}

                        <div className={styles.receiptField}>
                            <span className={styles.receiptFieldLabel}>تاریخ و زمان پرداخت</span>
                            <span className={styles.receiptFieldValue}>{formatDate(onlinePaymentDate)}</span>
                        </div>

                        <div className={styles.receiptField}>
                            <span className={styles.receiptFieldLabel}>مبلغ پرداختی</span>
                            <span className={styles.receiptFieldValue}>
                                <PriceWithHint price={order.totalPrice} size="sm" />
                            </span>
                        </div>
                    </div>
                </div>
            )}

            {/* ─── اقلام سفارش ────────────────────────────────────────────── */}
            {items.length > 0 && (
                <div className={styles.orderItemsSection}>
                    <h2 className={styles.sectionTitle}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
                            stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" />
                            <line x1="3" y1="6" x2="21" y2="6" />
                            <path d="M16 10a4 4 0 01-8 0" />
                        </svg>
                        اقلام سفارش
                    </h2>
                    <ul className={styles.itemList}>
                        {items.map((item, idx) => {
                            const isCourse = item.__component === 'order.course-order-item';
                            return (
                                <li key={idx} className={styles.orderItem}>
                                    <div className={styles.itemThumb} aria-hidden>
                                        {isCourse ? (
                                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
                                                stroke="currentColor" strokeWidth="2">
                                                <path d="M2 3h6a4 4 0 014 4v14a3 3 0 00-3-3H2z" />
                                                <path d="M22 3h-6a4 4 0 00-4 4v14a3 3 0 013-3h7z" />
                                            </svg>
                                        ) : (
                                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
                                                stroke="currentColor" strokeWidth="2">
                                                <circle cx="9" cy="21" r="1" />
                                                <circle cx="20" cy="21" r="1" />
                                                <path d="M1 1h4l2.68 13.39a2 2 0 001.61 1.61H18a2 2 0 001.61-1.61L23 6H6" />
                                            </svg>
                                        )}
                                    </div>
                                    <div className={styles.itemBody}>
                                        <span className={styles.itemTitle}>{item.title || '—'}</span>
                                        <span className={styles.itemType}>
                                            {isCourse ? 'دوره آموزشی' : 'محصول'}
                                        </span>
                                    </div>
                                    <div className={styles.itemMeta}>
                                        {isByeMoney && item.purchaseId && (
                                            <button
                                                type="button"
                                                className={styles.viewReceiptBtn}
                                                onClick={() => handleViewReceipt(item.purchaseId)}
                                            >
                                                مشاهده رسید خرید
                                            </button>
                                        )}
                                        {item.quantity > 1 && (
                                            <span className={styles.itemQty}>× {item.quantity}</span>
                                        )}
                                        <span className={styles.itemPrice}>
                                            <PriceWithHint price={(item.price ?? 0) * (item.quantity ?? 1)} hideHint={isByeMoney} size="sm" />
                                        </span>
                                    </div>
                                </li>
                            );
                        })}
                    </ul>
                </div>
            )}

            {/* ─── تراکنش‌های شارژ مرتبط (TopUp Requests) ────────────────── */}
            {isByeMoney && Array.isArray(order.topUps) && order.topUps.length > 0 && (
                <div className={styles.topUpsSection}>
                    <h2 className={styles.sectionTitle}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
                            stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="2" y="5" width="20" height="14" rx="2" />
                            <line x1="2" y1="10" x2="22" y2="10" />
                        </svg>
                        تراکنش‌ها و تلاش‌های شارژ مرتبط
                    </h2>
                    <div className={styles.topUpsList}>
                        {order.topUps.map((topUp, idx) => {
                            const isConfirmed = topUp.status === 'Confirmed';
                            const isRejected = topUp.status === 'Rejected';
                            const isPending = topUp.status === 'Pending';
                            return (
                                <div key={idx} className={styles.topUpItem}>
                                    <div className={styles.topUpItemInfo}>
                                        <span className={styles.topUpRef}>کد پیگیری شارژ: <strong dir="ltr">{topUp.clientReferenceCode || topUp.topUpRequestId}</strong></span>
                                        <span className={styles.topUpDate}>{formatDate(topUp.createdAtUtc)}</span>
                                    </div>
                                    <div className={styles.topUpItemDetails}>
                                        <span className={styles.topUpAmount}>
                                            {Number(topUp.amountNoor || 0).toLocaleString('fa-IR')} نور
                                            {topUp.amountRial != null && (
                                                <span className={styles.rialNote}>({Number(topUp.amountRial).toLocaleString('fa-IR')} ریال)</span>
                                            )}
                                        </span>
                                        <span className={`${styles.badge} ${
                                            isConfirmed ? styles.badgeSuccess : (isRejected ? styles.badgeDanger : styles.badgeWarning)
                                        }`}>
                                            {isConfirmed ? 'شارژ تأیید شد ✓' : (isRejected ? 'شارژ رد شد' : 'در انتظار تأیید شارژ')}
                                        </span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                    <p className={styles.topUpExplanation}>
                        * توجه: تأیید شارژ به منزله افزایش اعتبار کیف پول نور است؛ وضعیت نهایی خرید دوره و تحویل دسترسی به‌صورت مستقل در بالای صفحه نمایش داده شده‌اند.
                    </p>
                </div>
            )}


            {/* ─── پیام لغو یا عدم موفقیت پرداخت آنلاین ─────────────────── */}
            {isOnline && isFailedOrCanceled && (
                <div className={`${styles.rejectionNoticeBox} ${styles.onlineFailure}`}>
                    <div className={styles.rejectionHeader}>
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
                            stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="12" cy="12" r="10" />
                            <line x1="15" y1="9" x2="9" y2="15" />
                            <line x1="9" y1="9" x2="15" y2="15" />
                        </svg>
                        <strong>پرداخت این سفارش انجام نشد یا لغو گردید</strong>
                    </div>
                    <div className={styles.rejectionReason}>
                        <span className={styles.rejectionReasonLabel}>علت عدم موفقیت / لغو پرداخت:</span>
                        <p className={styles.rejectionReasonValue}>
                            {failureReason || 'پرداخت در درگاه بانکی تکمیل نشد یا توسط کاربر لغو شد.'}
                        </p>
                    </div>

                    {/* پیام راهنمای کسر وجه و پشتیبانی */}
                    <div className={styles.deductionNotice}>
                        <div className={styles.deductionNoticeHeader}>
                            <svg width="17" height="17" viewBox="0 0 24 24" fill="none"
                                stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                <circle cx="12" cy="12" r="10" />
                                <line x1="12" y1="16" x2="12" y2="12" />
                                <line x1="12" y1="8" x2="12.01" y2="8" />
                            </svg>
                            <strong>اگر مبلغ از حسابتان کسر شده ولی دسترسی فعال نشده است:</strong>
                        </div>
                        <p>
                            طبق قوانین بانکی شاپرک، مبالغ تراکنش‌های تاییدنشده حداکثر ظرف ۷۲ ساعت توسط بانک به حساب شما عودت داده می‌شود.
                            در صورتی که پس از این مدت واریز نشد، لطفاً با پشتیبانی تماس بگیرید یا کد پیگیری را ارسال نمایید.
                        </p>
                    </div>


                </div>
            )}

            {/* ─── پیام رد توسط مدیریت (کارت‌به‌کارت) ──────────────────── */}
            {isCardToCard && isRejected && (
                <div className={styles.rejectionNoticeBox}>
                    <div className={styles.rejectionHeader}>
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
                            stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="12" cy="12" r="10" />
                            <line x1="15" y1="9" x2="9" y2="15" />
                            <line x1="9" y1="9" x2="15" y2="15" />
                        </svg>
                        <strong>این سفارش توسط مدیریت لغو شده است</strong>
                    </div>
                    {order.rejectionReason && (
                        <div className={styles.rejectionReason}>
                            <span className={styles.rejectionReasonLabel}>علت عدم تأیید توسط مدیریت:</span>
                            <p className={styles.rejectionReasonValue}>{order.rejectionReason}</p>
                        </div>
                    )}
                </div>
            )}

            {/* ─── بخش آپلود فیش — برای کارت‌به‌کارت در انتظار پرداخت یا ردشده ── */}
            {needsReceiptUpload && (
                <div className={styles.receiptUploadSection}>
                    <h2 className={styles.sectionTitle}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
                            stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="3" y="10" width="18" height="11" rx="2" />
                            <path d="M3 10l9-7 9 7" />
                            <line x1="12" y1="10" x2="12" y2="21" />
                        </svg>
                        {isRejected ? 'ارسال مجدد فیش واریزی' : 'ارسال فیش واریزی'}
                    </h2>

                    {/* توضیح راهنما */}
                    <div className={styles.infoNote}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                            stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="12" cy="12" r="10" />
                            <line x1="12" y1="16" x2="12" y2="12" />
                            <line x1="12" y1="8" x2="12.01" y2="8" />
                        </svg>
                        مبلغ <strong>{formatPrice(order.totalPrice)} تومان</strong> را به شماره کارت زیر واریز کرده،
                        سپس تصویر فیش و کد پیگیری را ارسال کنید.
                    </div>

                    {/*
                     * OrderReceiptUpload — کامپوننت ساخته‌شده در گام ۲
                     * orderId: documentId سفارش (Strapi v5)
                     * onSuccess: callback برای بروزرسانی وضعیت بدون reload صفحه
                     */}
                    <OrderReceiptUpload
                        orderId={order.documentId || id}
                        onSuccess={handleReceiptSuccess}
                    />
                </div>
            )}

            {/* ─── پیام تأییدیه — پس از آپلود یا وضعیت‌های دیگر ──────────── */}
            {isCardToCard && order.paymentStatus === 'pending_verification' && (
                <div className={styles.pendingVerificationBox}>
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
                        stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M22 11.08V12a10 10 0 11-5.93-9.14" />
                        <polyline points="22 4 12 14.01 9 11.01" />
                    </svg>
                    <div>
                        <strong>فیش واریزی دریافت شد</strong>
                        <p>سفارش شما در انتظار تأیید توسط فروشگاه است. پس از بررسی، وضعیت به‌روز می‌شود.</p>
                        {order.trackingNumber && (
                            <span className={styles.trackingInfo}>
                                کد پیگیری: <strong dir="ltr">{order.trackingNumber}</strong>
                            </span>
                        )}
                    </div>
                </div>
            )}

            {/* ─── مدال مشاهده رسید رسمی خرید از سامانه بای‌مانی (I11-P) ────── */}
            {receiptModal.isOpen && (
                <div className={styles.receiptModalOverlay} onClick={() => setReceiptModal({ isOpen: false, isLoading: false, data: null, error: null })}>
                    <div className={styles.receiptModal} onClick={(e) => e.stopPropagation()}>
                        <div className={styles.receiptModalHeader}>
                            <h3 className={styles.receiptModalTitle}>رسید رسمی خرید دوره (سامانه بای‌مانی)</h3>
                            <button
                                type="button"
                                className={styles.receiptModalClose}
                                onClick={() => setReceiptModal({ isOpen: false, isLoading: false, data: null, error: null })}
                                aria-label="بستن رسید"
                            >
                                ✕
                            </button>
                        </div>

                        {receiptModal.isLoading && (
                            <div style={{ textAlign: 'center', padding: '24px', color: 'var(--color-card-text)' }}>
                                در حال دریافت اطلاعات رسید خرید از بای‌مانی...
                            </div>
                        )}

                        {receiptModal.error && (
                            <div className={styles.errorState} style={{ margin: 0 }}>
                                <p>{receiptModal.error}</p>
                            </div>
                        )}

                        {receiptModal.data && (
                            <div className={styles.onlineReceiptGrid}>
                                <div className={styles.receiptField}>
                                    <span className={styles.receiptFieldLabel}>عنوان دوره</span>
                                    <span className={styles.receiptFieldValue} style={{ fontWeight: 'bold' }}>{receiptModal.data.courseTitle}</span>
                                </div>

                                <div className={styles.receiptField}>
                                    <span className={styles.receiptFieldLabel}>شناسه خرید (Purchase ID)</span>
                                    <div className={styles.copyableWrapper}>
                                        <span className={styles.receiptFieldValue} dir="ltr">{receiptModal.data.purchaseId}</span>
                                        <CopyBtn text={receiptModal.data.purchaseId} label="شناسه خرید" />
                                    </div>
                                </div>

                                {receiptModal.data.transactionId && (
                                    <div className={styles.receiptField}>
                                        <span className={styles.receiptFieldLabel}>شناسه تراکنش مالی (Transaction ID)</span>
                                        <div className={styles.copyableWrapper}>
                                            <span className={styles.receiptFieldValue} dir="ltr">{receiptModal.data.transactionId}</span>
                                            <CopyBtn text={receiptModal.data.transactionId} label="شناسه تراکنش" />
                                        </div>
                                    </div>
                                )}

                                {receiptModal.data.baseAmountInNoor != null && (
                                    <div className={styles.receiptField}>
                                        <span className={styles.receiptFieldLabel}>مبلغ پایه</span>
                                        <span className={styles.receiptFieldValue}>{Number(receiptModal.data.baseAmountInNoor).toLocaleString('fa-IR')} نور</span>
                                    </div>
                                )}

                                {receiptModal.data.discountAmountInNoor != null && receiptModal.data.discountAmountInNoor > 0 && (
                                    <div className={styles.receiptField}>
                                        <span className={styles.receiptFieldLabel}>مبلغ تخفیف</span>
                                        <span className={styles.receiptFieldValue}>{Number(receiptModal.data.discountAmountInNoor).toLocaleString('fa-IR')} نور</span>
                                    </div>
                                )}

                                {receiptModal.data.couponCode && (
                                    <div className={styles.receiptField}>
                                        <span className={styles.receiptFieldLabel}>کد تخفیف</span>
                                        <span className={styles.receiptFieldValue} dir="ltr">{receiptModal.data.couponCode}</span>
                                    </div>
                                )}

                                <div className={styles.receiptField}>
                                    <span className={styles.receiptFieldLabel}>مبلغ نهایی پرداختی</span>
                                    <span className={styles.receiptFieldValue} style={{ color: 'var(--color-primary)' }}>
                                        {Number(receiptModal.data.finalAmountInNoor || 0).toLocaleString('fa-IR')} نور
                                    </span>
                                </div>

                                {receiptModal.data.referenceRialPerNoorAtPurchaseTime != null && (
                                    <div className={styles.receiptField}>
                                        <span className={styles.receiptFieldLabel}>نرخ مرجع ریالی هنگام خرید</span>
                                        <span className={styles.receiptFieldValue} dir="ltr">
                                            {Number(receiptModal.data.referenceRialPerNoorAtPurchaseTime).toLocaleString('fa-IR')} ریال
                                        </span>
                                    </div>
                                )}

                                <div className={styles.receiptField}>
                                    <span className={styles.receiptFieldLabel}>زمان خرید</span>
                                    <span className={styles.receiptFieldValue}>{formatDate(receiptModal.data.purchasedAtUtc)}</span>
                                </div>

                                <div className={styles.receiptField}>
                                    <span className={styles.receiptFieldLabel}>وضعیت مالی و تحویل</span>
                                    <span className={styles.receiptFieldValue}>
                                        {receiptModal.data.financialStatus === 'Paid' ? 'پرداخت شده ✓' : receiptModal.data.financialStatus}
                                        {' — '}
                                        {receiptModal.data.deliveryStatus === 'Delivered' ? 'دسترسی فعال شد ✓' : 'در حال فعال‌سازی'}
                                    </span>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
