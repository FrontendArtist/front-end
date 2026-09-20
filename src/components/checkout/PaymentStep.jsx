'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
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
import {
    purchaseCourseWithByeMoney,
    checkCoursesPurchaseStatusWithByeMoney,
    createTopUpRequestWithByeMoney,
} from '@/lib/byeMoneyApi';
import {
    getPendingBasketPurchase,
    setPendingBasketPurchase,
    clearPendingBasketPurchase,
} from '@/lib/pendingPurchaseManager';
import styles from './PaymentStep.module.scss';

/**
 * مرحله 4: روش پرداخت
 * انتخاب روش پرداخت و تکمیل خرید.
 *
 * در صورت سبد دوره‌ای خالص (فقط دوره بدون محصول فیزیکی یا فصل):
 *  - ارسال به قرارداد خرید سبدی ByeMoney با externalCourseIds
 *  - در صورت موفقیت: پاکسازی سبد و هدایت مستقیم به کتابخانه دوره‌ها
 *  - در صورت کسری موجودی: پیش‌ثبت درخواست شارژ تاپ‌آپ و ثبت سفارش کارت‌به‌کارت
 *  - بازاعتبارسنجی خودکار وضعیت سبد جهت تکمیل Zero-Click
 *
 * در غیر این صورت:
 *  - حفظ ۱۰۰٪ جریان قبلی ثبت سفارش استراپی بدون کوچک‌ترین تغییر
 *
 * @param {function} onPrevious - callback برای برگشت به مرحله قبل
 */
export default function PaymentStep({ onPrevious }) {
    const router = useRouter();
    const { data: session, status: sessionStatus } = useSession();
    const items = useCartStore((state) => state.items);
    const appliedCoupon = useCartStore((state) => state.appliedCoupon);
    const totalPrice = useCartStore(selectTotalPrice);
    const couponDiscount = useCartStore(selectCouponDiscount);
    const finalTotalPrice = useCartStore(selectFinalTotalPrice);
    const itemLevelDiscount = useCartStore(selectItemLevelDiscount);
    const itemsCount = useCartStore(selectItemsCount);

    // تشخیص سبد دوره‌ای خالص (منحصراً دوره آموزشی بدون کالای فیزیکی یا فصل)
    const isPureCoursesOnly = items.length > 0 && items.every((item) => item.type === 'course');

    // مقدار پیش‌فرض: کارت به کارت (برای سفارش‌های غیراز دوره‌ای خالص)
    const [paymentMethod, setPaymentMethod] = useState(PAYMENT_METHOD.CARD_TO_CARD);
    const [isProcessing, setIsProcessing] = useState(false);
    const [errorMessage, setErrorMessage] = useState(null);

    const isCheckingResumeRef = useRef(false);

    // آیا این سفارش به دلیل تخفیف ۱۰۰٪ یا اقلام رایگان، صفر تومان است؟
    const isFreeOrder = finalTotalPrice === 0;

    /**
     * بازاعتبارسنجی و بررسی وضعیت خرید خودکار سبد پس از تأیید واریز تاپ‌آپ (Zero-Click)
     */
    const revalidatePendingBasket = useCallback(async () => {
        if (!session?.user?.jwt || isCheckingResumeRef.current) return;

        const pendingBasket = getPendingBasketPurchase();
        if (!pendingBasket || !pendingBasket.topUpRequested) return;

        const courseIds = pendingBasket.externalCourseIds;
        if (!Array.isArray(courseIds) || courseIds.length === 0) return;

        isCheckingResumeRef.current = true;

        try {
            const statusRes = await checkCoursesPurchaseStatusWithByeMoney({
                externalCourseIds: courseIds,
                jwt: session.user.jwt,
            });

            if (statusRes.allEnrolled) {
                // خرید در بک‌اند کامل شده است!
                clearPendingBasketPurchase();
                useCartStore.getState().clearCart();
                router.push('/payment/callback?status=success&source=byemoney');
            }
        } catch (err) {
            console.warn('[PaymentStep Pending Basket Revalidation Error]:', err);
        } finally {
            isCheckingResumeRef.current = false;
        }
    }, [session?.user?.jwt, router]);

    // لیسنرهای رویداد بازگشت به پنجره و پولینگ سبک دوره‌ای ۷ ثانیه‌ای
    useEffect(() => {
        if (!isPureCoursesOnly) return;

        // بررسی در لود اولیه
        revalidatePendingBasket();

        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                revalidatePendingBasket();
            }
        };

        const handleWindowFocus = () => {
            revalidatePendingBasket();
        };

        window.addEventListener('visibilitychange', handleVisibilityChange);
        window.addEventListener('focus', handleWindowFocus);

        const pollTimer = setInterval(() => {
            const pending = getPendingBasketPurchase();
            if (pending && pending.topUpRequested) {
                revalidatePendingBasket();
            }
        }, 7000);

        return () => {
            window.removeEventListener('visibilitychange', handleVisibilityChange);
            window.removeEventListener('focus', handleWindowFocus);
            clearInterval(pollTimer);
        };
    }, [isPureCoursesOnly, revalidatePendingBasket]);

    /**
     * ثبت سفارش — در صورت صفر بودن مبلغ، مستقیماً تایید و فعال می‌شود.
     * در غیر این صورت بر اساس روش پرداخت انتخابی کاربر عمل می‌کند.
     */
    const handlePayment = async () => {
        setIsProcessing(true);
        setErrorMessage(null);

        // ۱. در صورتی که سبد خرید منحصراً دوره باشد، از قرارداد خرید بای‌مانی استفاده می‌کنیم
        if (isPureCoursesOnly && !isFreeOrder) {
            if (sessionStatus !== 'authenticated' || !session?.user?.jwt) {
                setErrorMessage('نشست کاربری شما منقضی شده است. لطفاً ابتدا وارد حساب کاربری خود شوید.');
                setIsProcessing(false);
                return;
            }

            const externalCourseIds = items
                .map(item => item.documentId || item.externalCourseId || item.id)
                .filter(Boolean);

            if (externalCourseIds.length === 0) {
                setErrorMessage('شناسه یکتای دوره‌های سبد خرید معتبر نیست.');
                setIsProcessing(false);
                return;
            }

            try {
                const result = await purchaseCourseWithByeMoney({
                    externalCourseIds,
                    jwt: session.user.jwt,
                });

                if (result.success) {
                    useCartStore.getState().clearCart();
                    clearPendingBasketPurchase();
                    router.push('/payment/callback?status=success&source=byemoney');
                    return;
                }

                if (result.conflict) {
                    setErrorMessage(result.error || 'یک یا چند دوره از دوره‌های موجود در سبد خرید قبلاً توسط شما خریداری شده‌اند.');
                    setIsProcessing(false);
                    return;
                }

                if (result.insufficientBalance && result.insufficientDetails) {
                    const receivedPendingItems = result.pendingItems || [];

                    // ۱. پیش‌ثبت درخواست TopUp در سامانه ByeMoney جهت پیوست دوره‌های معلق
                    let topUpRequestId = null;
                    let clientReferenceId = null;
                    try {
                        const topUpRes = await createTopUpRequestWithByeMoney({
                            amountInNoor: result.insufficientDetails.shortfallInNoor,
                            pendingItems: receivedPendingItems,
                            jwt: session.user.jwt,
                        });
                        if (topUpRes?.success && topUpRes?.data) {
                            topUpRequestId = topUpRes.data.topUpRequestId;
                            clientReferenceId = topUpRes.data.clientReferenceId;
                        }
                    } catch (topUpErr) {
                        console.warn('[PaymentStep] TopUp request creation warning:', topUpErr);
                    }

                    // ۲. ثبت سفارش کارت‌به‌کارت در استراپی (جریان استاندارد کارت به کارت)
                    const shortfallInToman = result.insufficientDetails.shortfallInToman ||
                        (result.insufficientDetails.shortfallInRial
                            ? Math.round(result.insufficientDetails.shortfallInRial / 10)
                            : result.insufficientDetails.shortfallInNoor * 1000);

                    const orderResponse = await fetch('/api/orders', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            cartItems: items,
                            totalPrice: shortfallInToman || finalTotalPrice,
                            shippingAddress: null,
                            couponCode: appliedCoupon?.code || null,
                            couponDiscount: couponDiscount,
                            paymentMethod: PAYMENT_METHOD.CARD_TO_CARD,
                            paymentStatus: PAYMENT_STATUS.PENDING_PAYMENT,
                            lightAmount: result.insufficientDetails.shortfallInNoor,
                            orderType: 'course',
                            topUpRequestId: topUpRequestId,
                        }),
                    });

                    if (!orderResponse.ok) {
                        const errData = await orderResponse.json();
                        throw new Error(errData.message || 'خطا در ثبت سفارش کارت‌به‌کارت');
                    }

                    const newOrder = await orderResponse.json();
                    const documentId = newOrder?.data?.documentId;

                    // ۳. ذخیره کانتکست سبد خرید معلق
                    setPendingBasketPurchase({
                        orderId: documentId,
                        externalCourseIds,
                        pendingItems: receivedPendingItems,
                        items,
                        shortfallInNoor: result.insufficientDetails.shortfallInNoor,
                        shortfallInRial: result.insufficientDetails.shortfallInRial,
                        shortfallInToman,
                        currentBalanceInNoor: result.insufficientDetails.currentBalanceInNoor,
                        priceInNoor: result.insufficientDetails.priceInNoor,
                        topUpRequested: true,
                        topUpRequestId,
                        clientReferenceId,
                    });

                    // ۴. هدایت به صفحه در انتظار پرداخت (فلوی قبلی سبد خرید)
                    let redirectUrl = '/payment/callback?status=success&source=card_to_card';
                    if (documentId) {
                        redirectUrl += `&orderId=${encodeURIComponent(documentId)}`;
                    }
                    if (result.insufficientDetails.shortfallInNoor) {
                        redirectUrl += `&lightAmount=${encodeURIComponent(result.insufficientDetails.shortfallInNoor)}`;
                    }
                    router.push(redirectUrl);
                    return;
                }

                if (result.unauthorized) {
                    setErrorMessage(result.error || 'نشست کاربری شما نامعتبر است.');
                    setIsProcessing(false);
                    return;
                }

                setErrorMessage(result.error || 'خطا در ثبت سفارش دوره‌ها.');
                setIsProcessing(false);
                return;
            } catch (err) {
                console.error('[ByeMoney Cart Purchase Error]:', err);
                setErrorMessage('خطای غیرمنتظره در برقراری ارتباط با سامانه پرداخت ByeMoney.');
                setIsProcessing(false);
                return;
            }
        }

        // ۲. برای سفارش‌های رایگان یا سبدهای حاوی محصول فیزیکی/فصل‌ها: جریان قبلی سفارشات
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
                // شبیه‌سازی پرداخت آنلاین: هدایت با کد پیگیری و شناسه سفارش به صفحه تایید
                const documentId = newOrder?.data?.documentId;
                const simulatedTraceNo = Math.floor(100000 + Math.random() * 900000).toString();
                let redirectUrl = `/payment/callback?status=success&source=online&refNum=${simulatedTraceNo}`;
                if (documentId) {
                    redirectUrl += `&orderId=${encodeURIComponent(documentId)}`;
                }
                router.push(redirectUrl);
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
