'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
    useCartStore,
    selectTotalPrice,
    selectCouponDiscount,
    selectFinalTotalPrice,
    selectItemsCount,
    selectItemLevelDiscount,
} from '@/store/useCartStore';
import { formatPrice } from '@/lib/formatters';
import { PAYMENT_METHOD, PAYMENT_STATUS } from '@/lib/constants/orderConstants';
import styles from './PaymentStep.module.scss';

/**
 * مرحله 4: روش پرداخت
 * انتخاب روش پرداخت (آنلاین یا کارت‌به‌کارت) و تکمیل خرید همراه با اعمال کوپن تخفیف.
 *
 * جریان کارت‌به‌کارت:
 *  1. کاربر گزینه «کارت به کارت» را انتخاب می‌کند.
 *  2. دکمه «ثبت نهایی سفارش» را می‌زند.
 *  3. سفارش با paymentMethod: 'card_to_card' و paymentStatus: 'pending_payment' ثبت می‌شود.
 *  4. سبد خرید (Zustand CartStore) پاک می‌شود.
 *  5. کاربر به /profile/orders/[documentId] هدایت می‌شود تا فیش آپلود کند.
 *
 * @param {function} onPrevious - callback برای برگشت به مرحله قبل
 */
export default function PaymentStep({ onPrevious }) {
    const router = useRouter();
    const items = useCartStore((state) => state.items);
    const appliedCoupon = useCartStore((state) => state.appliedCoupon);
    const totalPrice = useCartStore(selectTotalPrice);
    const couponDiscount = useCartStore(selectCouponDiscount);
    const finalTotalPrice = useCartStore(selectFinalTotalPrice);
    const itemLevelDiscount = useCartStore(selectItemLevelDiscount);
    const itemsCount = useCartStore(selectItemsCount);

    // مقدار پیش‌فرض: کارت به کارت (چون آنلاین فعلاً غیرفعال است)
    const [paymentMethod, setPaymentMethod] = useState(PAYMENT_METHOD.CARD_TO_CARD);
    const [isProcessing, setIsProcessing] = useState(false);
    const [errorMessage, setErrorMessage] = useState(null);

    // آیا این سفارش به دلیل تخفیف ۱۰۰٪ یا اقلام رایگان، صفر تومان است؟
    const isFreeOrder = finalTotalPrice === 0;

    /**
     * ثبت سفارش — در صورت صفر بودن مبلغ، مستقیماً تایید و فعال می‌شود.
     * در غیر این صورت بر اساس روش پرداخت انتخابی کاربر عمل می‌کند.
     */
    const handlePayment = async () => {
        setIsProcessing(true);
        setErrorMessage(null);

        // تعیین وضعیت اولیه پرداخت بر اساس روش انتخاب‌شده
        const isCardToCard = !isFreeOrder && paymentMethod === PAYMENT_METHOD.CARD_TO_CARD;
        const paymentMethodToSend = isFreeOrder ? PAYMENT_METHOD.FREE : paymentMethod;
        const initialPaymentStatus = isCardToCard ? PAYMENT_STATUS.PENDING_PAYMENT : PAYMENT_STATUS.PAID;

        try {
            const response = await fetch('/api/orders', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    cartItems: items,
                    totalPrice: finalTotalPrice,
                    shippingAddress: null,
                    // اطلاعات کوپن تخفیف
                    couponCode: appliedCoupon?.code || null,
                    couponDiscount: couponDiscount,
                    paymentMethod: paymentMethodToSend,
                    paymentStatus: initialPaymentStatus,
                }),
            });

            if (!response.ok) {
                const errData = await response.json();
                throw new Error(errData.message || 'خطا در ثبت سفارش');
            }

            const newOrder = await response.json();

            // توجه: پاکسازی سبد خرید به صورت امن و قطعی در صفحه callback پس از تایید موفقیت (status=success) انجام می‌شود.
            if (isFreeOrder) {
                router.push('/payment/callback?status=success&source=free');
            } else if (isCardToCard) {
                const documentId = newOrder?.data?.documentId;
                let redirectUrl = '/payment/callback?status=success&source=card_to_card';
                if (documentId) {
                    redirectUrl += `&orderId=${encodeURIComponent(documentId)}`;
                }
                router.push(redirectUrl);
            } else {
                // پرداخت آنلاین هم از callback رد می‌شود تا پیام «پرداخت موفق» نشان داده شود
                router.push('/payment/callback?status=success');
            }

        } catch (error) {
            console.error('Payment Error:', error);
            setErrorMessage(error.message);
            setIsProcessing(false);
        }
    };

    return (
        <div className={styles.paymentStep}>
            <h2 className={styles.title}>
                {isFreeOrder ? 'تأیید نهایی سفارش' : 'روش پرداخت'}
            </h2>
            <p className={styles.subtitle}>
                {isFreeOrder
                    ? 'سفارش شما رایگان است و نیازی به پرداخت وجه ندارد'
                    : 'روش پرداخت خود را انتخاب کنید'}
            </p>

            {/* ─── خلاصه سفارش ──────────────────────────────────────────────── */}
            <div className={styles.orderSummary}>
                <h3 className={styles.summaryTitle}>خلاصه سفارش</h3>

                <div className={styles.items}>
                    {items.map((item) => (
                        <div key={item.id} className={styles.item}>
                            <span className={styles.itemName}>
                                {item.title}
                                {item.quantity > 1 && (
                                    <span className={styles.quantity}> × {item.quantity}</span>
                                )}
                            </span>
                            <span className={styles.itemPrice}>
                                {item.originalPrice && item.originalPrice > item.price ? (
                                    <span style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                                        <del style={{ fontSize: '0.75rem', opacity: 0.5, color: '#f87171' }}>
                                            {formatPrice(item.originalPrice * item.quantity)}
                                        </del>
                                        <strong style={{ color: '#ffd166' }}>
                                            {formatPrice(item.price * item.quantity)} تومان
                                        </strong>
                                    </span>
                                ) : (
                                    `${formatPrice(item.price * item.quantity)} تومان`
                                )}
                            </span>
                        </div>
                    ))}
                </div>

                <div className={styles.divider} />

                <div className={styles.summaryRow}>
                    <span>تعداد اقلام:</span>
                    <strong>{itemsCount} مورد</strong>
                </div>

                <div className={styles.summaryRow}>
                    <span>جمع جزء:</span>
                    <strong>{formatPrice(totalPrice)} تومان</strong>
                </div>

                {itemLevelDiscount > 0 && (
                    <div className={styles.summaryRow} style={{ color: '#4ade80' }}>
                        <span>مجموع تخفیف‌های شما:</span>
                        <strong>
                            {formatPrice(itemLevelDiscount)} تومان
                        </strong>
                    </div>
                )}

                {couponDiscount > 0 && (
                    <div className={styles.summaryRow} style={{ color: '#86efac' }}>
                        <span>تخفیف کوپن ({appliedCoupon?.code}):</span>
                        <strong>-{formatPrice(couponDiscount)} تومان</strong>
                    </div>
                )}

                <div className={styles.divider} />

                <div className={styles.summaryTotal}>
                    <span>مبلغ قابل پرداخت:</span>
                    <strong style={{ color: isFreeOrder ? '#4ade80' : '#ffd166', fontSize: '1.2rem' }}>
                        {isFreeOrder ? 'رایگان (۰ تومان)' : `${formatPrice(finalTotalPrice)} تومان`}
                    </strong>
                </div>
            </div>

            {/* ─── انتخاب روش پرداخت یا بنر سفارش رایگان ─────────────────────── */}
            {isFreeOrder ? (
                <div className={styles.freeOrderNotice}>
                    <div className={styles.freeOrderIcon}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="2.5">
                            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                            <polyline points="22 4 12 14.01 9 11.01" />
                        </svg>
                    </div>
                    <div className={styles.freeOrderContent}>
                        <h3 className={styles.freeOrderTitle}>سفارش ۱۰۰٪ رایگان</h3>
                        <p className={styles.freeOrderDesc}>
                            مبلغ نهایی این سفارش صفر تومان است. نیازی به پرداخت وجه یا انتقال کارت‌به‌کارت نیست؛ با کلیک بر روی دکمه زیر، سفارش شما فوراً تأیید شده و دوره‌ها و محصولات به حسابتان اضافه می‌شوند.
                        </p>
                    </div>
                </div>
            ) : (
                <div className={styles.paymentMethods}>
                    <div className={styles.methodsList}>

                        {/* گزینه ۱: پرداخت آنلاین — فعلاً غیرفعال */}
                        <label
                            className={`${styles.method} ${styles.disabled}`}
                            htmlFor="method-online"
                        >
                            <input
                                id="method-online"
                                type="radio"
                                name="paymentMethod"
                                value="online"
                                disabled
                            />
                            <div className={styles.methodContent}>
                                <div className={styles.methodIcon}>
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
                                        <line x1="1" y1="10" x2="23" y2="10" />
                                    </svg>
                                </div>
                                <div className={styles.methodInfo}>
                                    <span className={styles.methodName}>پرداخت آنلاین</span>
                                    <span className={styles.methodDesc}>در حال فعال‌سازی</span>
                                </div>
                            </div>
                        </label>

                        {/* گزینه ۲: پرداخت کارت‌به‌کارت */}
                        <label
                            className={`${styles.method} ${paymentMethod === 'card_to_card' ? styles.selected : ''}`}
                            htmlFor="method-card-to-card"
                        >
                            <input
                                id="method-card-to-card"
                                type="radio"
                                name="paymentMethod"
                                value="card_to_card"
                                checked={paymentMethod === 'card_to_card'}
                                onChange={(e) => setPaymentMethod(e.target.value)}
                            />
                            <div className={styles.methodContent}>
                                <div className={styles.methodIcon}>
                                    {/* آیکون انتقال بین‌بانکی */}
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <rect x="2" y="5" width="20" height="14" rx="2" />
                                        <path d="M2 10h20" />
                                        <path d="M7 15h2" />
                                        <path d="M11 15h4" />
                                    </svg>
                                </div>
                                <div className={styles.methodInfo}>
                                    <span className={styles.methodName}>
                                        پرداخت کارت به کارت
                                    </span>
                                    <span className={styles.methodDesc}>
                                        واریز مستقیم به کارت فروشگاه و ارسال فیش
                                    </span>
                                </div>
                                <div className={styles.checkmark}>
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                                        <polyline points="20 6 9 17 4 12" />
                                    </svg>
                                </div>
                            </div>
                        </label>

                        {/* گزینه ۳: پرداخت در محل (غیرفعال — بدون تغییر) */}
                        <label className={`${styles.method} ${styles.disabled}`}>
                            <input
                                type="radio"
                                name="paymentMethod"
                                value="cod"
                                disabled
                            />
                            <div className={styles.methodContent}>
                                <div className={styles.methodIcon}>
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                                        <circle cx="12" cy="10" r="3" />
                                    </svg>
                                </div>
                                <div className={styles.methodInfo}>
                                    <span className={styles.methodName}>پرداخت در محل</span>
                                    <span className={styles.methodDesc}>فعلاً غیرفعال</span>
                                </div>
                            </div>
                        </label>
                    </div>
                </div>
            )}

            {/* ─── پیام خطا ────────────────────────────────────────────────── */}
            {errorMessage && (
                <div className={styles.errorBox} role="alert">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
                        stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="10" />
                        <line x1="12" y1="8" x2="12" y2="12" />
                        <line x1="12" y1="16" x2="12.01" y2="16" />
                    </svg>
                    {errorMessage}
                </div>
            )}

            {/* ─── دکمه‌های عملیات ─────────────────────────────────────────── */}
            <div className={styles.actions}>
                <button
                    onClick={onPrevious}
                    className={styles.previousButton}
                    disabled={isProcessing}
                >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="9 18 15 12 9 6" />
                    </svg>
                    <span>مرحله قبل</span>
                </button>

                <button
                    onClick={handlePayment}
                    className={styles.paymentButton}
                    disabled={isProcessing}
                    id="finalize-order-btn"
                >
                    {isProcessing ? (
                        <>
                            <span className={styles.spinner} />
                            <span>
                                {isFreeOrder
                                    ? 'در حال تأیید و فعال‌سازی...'
                                    : (paymentMethod === 'card_to_card'
                                        ? 'در حال ثبت سفارش...'
                                        : 'در حال انتقال به درگاه...')}
                            </span>
                        </>
                    ) : (
                        <>
                            <span>
                                {isFreeOrder
                                    ? 'تأیید و دریافت سفارش (رایگان)'
                                    : (paymentMethod === 'card_to_card'
                                        ? 'ثبت نهایی سفارش'
                                        : 'پرداخت و تکمیل خرید')}
                            </span>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                {isFreeOrder || paymentMethod === 'card_to_card' ? (
                                    /* آیکون چک برای سفارش رایگان یا ثبت سفارش */
                                    <polyline points="20 6 9 17 4 12" />
                                ) : (
                                    /* آیکون قفل برای پرداخت آنلاین */
                                    <>
                                        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                                        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                                    </>
                                )}
                            </svg>
                        </>
                    )}
                </button>
            </div>
        </div>
    );
}
