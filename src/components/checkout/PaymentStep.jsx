'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useCartStore, selectTotalPrice, selectItemsCount } from '@/store/useCartStore';
import styles from './PaymentStep.module.scss';

/**
 * مرحله 4: روش پرداخت
 * انتخاب روش پرداخت (آنلاین یا کارت‌به‌کارت) و تکمیل خرید.
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
    const totalPrice = useCartStore(selectTotalPrice);
    const itemsCount = useCartStore(selectItemsCount);

    // مقدار پیش‌فرض: آنلاین (مطابق وضعیت قبلی)
    const [paymentMethod, setPaymentMethod] = useState('online');
    const [isProcessing, setIsProcessing] = useState(false);
    const [errorMessage, setErrorMessage] = useState(null);

    const formatPrice = (price) =>
        new Intl.NumberFormat('fa-IR').format(price);

    /**
     * ثبت سفارش — منطق مشترک برای هر دو روش پرداخت.
     * paymentMethod و paymentStatus بسته به انتخاب کاربر ارسال می‌شوند.
     */
    const handlePayment = async () => {
        setIsProcessing(true);
        setErrorMessage(null);

        // تعیین وضعیت اولیه پرداخت بر اساس روش انتخاب‌شده
        const isCardToCard = paymentMethod === 'card_to_card';
        const initialPaymentStatus = isCardToCard ? 'pending_payment' : 'paid';

        try {
            const response = await fetch('/api/orders', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    cartItems: items,
                    totalPrice: totalPrice,
                    shippingAddress: null,
                    // فیلدهای جدید — ارسال به API route که آن‌ها را به Strapi پاس می‌دهد
                    paymentMethod: paymentMethod,        // 'online' | 'card_to_card'
                    paymentStatus: initialPaymentStatus, // 'pending_payment'
                }),
            });

            if (!response.ok) {
                const errData = await response.json();
                throw new Error(errData.message || 'خطا در ثبت سفارش');
            }

            const newOrder = await response.json();

            // ── پاک کردن سبد خرید (Zustand) ──────────────────────────────────
            useCartStore.getState().clearCart();

            if (isCardToCard) {
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
            <h2 className={styles.title}>روش پرداخت</h2>
            <p className={styles.subtitle}>روش پرداخت خود را انتخاب کنید</p>

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
                                {formatPrice(item.price * item.quantity)} تومان
                            </span>
                        </div>
                    ))}
                </div>

                <div className={styles.divider} />

                <div className={styles.summaryRow}>
                    <span>تعداد اقلام:</span>
                    <strong>{itemsCount} مورد</strong>
                </div>

                <div className={styles.summaryTotal}>
                    <span>مبلغ قابل پرداخت:</span>
                    <strong>{formatPrice(totalPrice)} تومان</strong>
                </div>
            </div>

            {/* ─── انتخاب روش پرداخت ───────────────────────────────────────── */}
            <div className={styles.paymentMethods}>
                <div className={styles.methodsList}>

                    {/* گزینه ۱: پرداخت آنلاین (موجود قبلی) */}
                    <label
                        className={`${styles.method} ${paymentMethod === 'online' ? styles.selected : ''}`}
                        htmlFor="method-online"
                    >
                        <input
                            id="method-online"
                            type="radio"
                            name="paymentMethod"
                            value="online"
                            checked={paymentMethod === 'online'}
                            onChange={(e) => setPaymentMethod(e.target.value)}
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
                                <span className={styles.methodDesc}>پرداخت امن از طریق درگاه بانکی</span>
                            </div>
                            <div className={styles.checkmark}>
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                                    <polyline points="20 6 9 17 4 12" />
                                </svg>
                            </div>
                        </div>
                    </label>

                    {/* گزینه ۲: پرداخت کارت‌به‌کارت (جدید) */}
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
                                    {/* بج «توصیه‌شده» یا «بدون کارمزد» */}
                                    <span className={styles.methodBadge}>بدون کارمزد</span>
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
                            {paymentMethod === 'card_to_card'
                                ? 'در حال ثبت سفارش...'
                                : 'در حال انتقال به درگاه...'}
                        </>
                    ) : (
                        <>
                            <span>
                                {paymentMethod === 'card_to_card'
                                    ? 'ثبت نهایی سفارش'
                                    : 'پرداخت و تکمیل خرید'}
                            </span>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                {paymentMethod === 'card_to_card' ? (
                                    /* آیکون چک برای ثبت سفارش */
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
