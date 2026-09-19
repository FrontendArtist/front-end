'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { setPendingPurchase } from '@/lib/pendingPurchaseManager';
import { createTopUpRequestWithByeMoney } from '@/lib/byeMoneyApi';
import { LIGHT_TO_TOMAN_RATE } from '@/lib/constants';
import styles from './page.module.scss';

/**
 * محتوای اصلی صفحه پرداخت نور
 * جدا شده تا داخل Suspense قرار گیرد (useSearchParams نیاز دارد)
 */
function LightCheckoutContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { data: session, status: sessionStatus } = useSession();

    const rawAmount = Number(searchParams.get('amount') || '0');
    const paramDocId = searchParams.get('documentId') || searchParams.get('courseDocumentId') || searchParams.get('externalCourseId');
    const paramCourseId = searchParams.get('courseId');
    const courseTitle = searchParams.get('courseTitle');
    const courseSlug = searchParams.get('courseSlug');

    // استخراج documentId دوره (رشته‌های غیرعددی در استراپی v5 نشان‌دهنده documentId هستند)
    const initialDocId = paramDocId || (paramCourseId && !/^\d+$/.test(paramCourseId) ? paramCourseId : null);
    const [resolvedCourseDocId, setResolvedCourseDocId] = useState(initialDocId);

    const lightAmount = Number.isFinite(rawAmount) && rawAmount > 0 ? rawAmount : 0;
    const totalPrice = lightAmount * LIGHT_TO_TOMAN_RATE;

    const [paymentMethod, setPaymentMethod] = useState('card_to_card');
    const [isProcessing, setIsProcessing] = useState(false);
    const [errorMessage, setErrorMessage] = useState(null);

    const formatPrice = (n) => new Intl.NumberFormat('fa-IR').format(n);

    // جستجوی تکمیلی در صورت عدم وجود documentId مستقیم در URL
    useEffect(() => {
        if (resolvedCourseDocId) return;

        // بررسی sessionStorage خریدهای معلق
        if (typeof window !== 'undefined') {
            try {
                for (let i = 0; i < window.sessionStorage.length; i++) {
                    const key = window.sessionStorage.key(i);
                    if (key && key.startsWith('byemoney_pending_purchase_')) {
                        const raw = window.sessionStorage.getItem(key);
                        if (raw) {
                            const data = JSON.parse(raw);
                            if (
                                (courseSlug && data.courseSlug === courseSlug) ||
                                (paramCourseId && (data.courseId === paramCourseId || String(data.orderId) === paramCourseId))
                            ) {
                                const docId = data.courseId || key.replace('byemoney_pending_purchase_', '');
                                if (docId) {
                                    setResolvedCourseDocId(docId);
                                    return;
                                }
                            }
                        }
                    }
                }
            } catch {
                // ignore
            }
        }

        // در صورت نیاز استعلام از API استراپی
        let isMounted = true;
        async function fetchCourseDocId() {
            try {
                let query = '';
                if (courseSlug) {
                    query = `filters[slug][$eq]=${encodeURIComponent(courseSlug)}`;
                } else if (paramCourseId) {
                    query = `filters[id][$eq]=${encodeURIComponent(paramCourseId)}`;
                }
                if (!query) return;

                const strapiUrl = process.env.NEXT_PUBLIC_STRAPI_API_URL || 'http://localhost:1337';
                const res = await fetch(`${strapiUrl}/api/courses?${query}&fields[0]=documentId&fields[1]=id`);
                if (res.ok) {
                    const json = await res.json();
                    const item = json?.data?.[0];
                    const docId = item?.documentId || item?.attributes?.documentId;
                    if (isMounted && docId) {
                        setResolvedCourseDocId(docId);
                    }
                }
            } catch (err) {
                console.warn('[LightCheckout] Failed to resolve course documentId:', err);
            }
        }

        fetchCourseDocId();
        return () => { isMounted = false; };
    }, [paramDocId, paramCourseId, courseSlug, resolvedCourseDocId]);

    // اگر کاربر لاگین نیست به صفحه ورود بفرستیم
    useEffect(() => {
        if (sessionStatus === 'unauthenticated') {
            router.push('/auth/login?callbackUrl=' + encodeURIComponent(window.location.href));
        }
    }, [sessionStatus, router]);

    // اگر مقدار نور نامعتبر باشد
    if (lightAmount <= 0) {
        return (
            <div className={`${styles.page} container`}>
                <div className={styles.errorState}>
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
                        stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="10" />
                        <line x1="12" y1="8" x2="12" y2="12" />
                        <line x1="12" y1="16" x2="12.01" y2="16" />
                    </svg>
                    <h2>مقدار نور نامعتبر است</h2>
                    <p>لطفاً از طریق دکمه افزایش نور در پروفایل اقدام کنید.</p>
                    <Link href="/" className={styles.backLink}>بازگشت به صفحه اصلی</Link>
                </div>
            </div>
        );
    }

    if (sessionStatus === 'loading' || sessionStatus === 'unauthenticated') {
        return (
            <div className={styles.loadingState}>
                <div className={styles.spinner} />
                <p>در حال بارگذاری...</p>
            </div>
        );
    }

    const handlePayment = async () => {
        setIsProcessing(true);
        setErrorMessage(null);

        const isCardToCard = paymentMethod === 'card_to_card';
        const finalCourseDocumentId = resolvedCourseDocId || initialDocId || paramCourseId;

        try {
            // پیش‌ثبت درخواست شارژ در ByeMoney برای سفارش‌های کارت‌به‌کارت
            let byeMoneyTopUpId = null;
            if (isCardToCard && session?.user?.jwt) {
                try {
                    const topUpRes = await createTopUpRequestWithByeMoney({
                        amountInNoor: lightAmount,
                        pendingPurchaseItem: finalCourseDocumentId ? {
                            pendingItemExternalId: finalCourseDocumentId,
                            externalCourseId: finalCourseDocumentId,
                            documentId: finalCourseDocumentId,
                            courseId: finalCourseDocumentId,
                            courseTitle: courseTitle || '',
                            courseSlug: courseSlug || '',
                            priceInNoor: lightAmount,
                        } : null,
                        jwt: session.user.jwt,
                    });
                    if (topUpRes?.success && topUpRes?.data?.topUpRequestId) {
                        byeMoneyTopUpId = topUpRes.data.topUpRequestId;
                    }
                } catch (topUpErr) {
                    console.warn('[LightCheckout] Pre-registration with ByeMoney skipped or failed:', topUpErr);
                }
            }

            // ثبت سفارش نور از طریق همان API سفارشات
            const response = await fetch('/api/orders', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    cartItems: [
                        {
                            id: finalCourseDocumentId ? `course-${finalCourseDocumentId}` : `light-${lightAmount}`,
                            type: finalCourseDocumentId ? 'course' : 'light_topup',
                            title: courseTitle
                                ? `شارژ ${formatPrice(lightAmount)} نور جهت ثبت‌نام در ${courseTitle}`
                                : `شارژ ${formatPrice(lightAmount)} نور`,
                            price: totalPrice,
                            quantity: 1,
                            lightAmount: lightAmount,
                            courseId: finalCourseDocumentId || null,
                            documentId: finalCourseDocumentId || null,
                            slug: courseSlug || null,
                        },
                    ],
                    totalPrice: totalPrice,
                    shippingAddress: null,
                    paymentMethod: paymentMethod,
                    paymentStatus: isCardToCard ? 'pending_payment' : 'paid',
                    // داده اضافی برای مدیریت نور
                    lightAmount: lightAmount,
                    orderType: finalCourseDocumentId ? 'course' : 'light_topup',
                    topUpRequestId: byeMoneyTopUpId,
                }),
            });

            if (!response.ok) {
                const errData = await response.json();
                throw new Error(errData.message || 'خطا در ثبت سفارش');
            }

            const newOrder = await response.json();
            const documentId = newOrder?.data?.documentId;

            if (isCardToCard) {
                if (finalCourseDocumentId && documentId) {
                    setPendingPurchase(finalCourseDocumentId, {
                        orderId: documentId,
                        courseSlug: courseSlug || '',
                        courseTitle: courseTitle || '',
                        shortfallInNoor: lightAmount,
                        priceInNoor: lightAmount,
                        topUpRequested: true,
                        topUpRequestId: byeMoneyTopUpId,
                    });
                }
                let redirectUrl = `/payment/callback?status=success&source=card_to_card&orderType=${finalCourseDocumentId ? 'course' : 'light_topup'}&lightAmount=${lightAmount}`;
                if (documentId) redirectUrl += `&orderId=${encodeURIComponent(documentId)}`;
                router.push(redirectUrl);
            } else {
                // پرداخت آنلاین: نور بلافاصله اضافه می‌شود
                router.push(`/payment/callback?status=success&source=light_topup&lightAmount=${lightAmount}`);
            }

        } catch (error) {
            console.error('[LightCheckout] Payment Error:', error);
            setErrorMessage(error.message);
            setIsProcessing(false);
        }
    };

    return (
        <div className={`${styles.page} container`}>
            <h1 className={styles.pageTitle}>
                {courseTitle ? `تکمیل خرید: ${courseTitle}` : 'شارژ نور'}
            </h1>

            <div className={styles.paymentStep}>
                <div>
                    <h2 className={styles.title}>روش پرداخت</h2>
                    <p className={styles.subtitle}>روش پرداخت خود را انتخاب کنید</p>
                </div>

                {/* ── خلاصه سفارش ────────────────────────────────────────── */}
                <div className={styles.orderSummary}>
                    <h3 className={styles.summaryTitle}>خلاصه سفارش</h3>

                    <div className={styles.items}>
                        <div className={styles.item}>
                            <span className={styles.itemName}>
                                <span className={styles.lightIcon}>
                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"
                                        fill="currentColor" strokeWidth="0" width="14" height="14">
                                        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                                    </svg>
                                </span>
                                {courseTitle
                                    ? `شارژ ${formatPrice(lightAmount)} نور جهت ثبت‌نام در ${courseTitle}`
                                    : `شارژ ${formatPrice(lightAmount)} نور`}
                            </span>
                            <span className={styles.itemPrice}>
                                {formatPrice(totalPrice)} تومان
                            </span>
                        </div>
                    </div>

                    <div className={styles.divider} />

                    <div className={styles.summaryTotal}>
                        <span>مبلغ قابل پرداخت:</span>
                        <strong>{formatPrice(totalPrice)} تومان</strong>
                    </div>
                </div>

                {/* ── روش‌های پرداخت ──────────────────────────────────────── */}
                <div className={styles.paymentMethods}>
                    <div className={styles.methodsList}>

                        {/* پرداخت آنلاین — فعلاً غیرفعال */}
                        <label
                            className={`${styles.method} ${styles.disabled}`}
                            htmlFor="light-method-online"
                        >
                            <input
                                id="light-method-online"
                                type="radio"
                                name="lightPaymentMethod"
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

                        {/* کارت به کارت */}
                        <label
                            className={`${styles.method} ${paymentMethod === 'card_to_card' ? styles.selected : ''}`}
                            htmlFor="light-method-card-to-card"
                        >
                            <input
                                id="light-method-card-to-card"
                                type="radio"
                                name="lightPaymentMethod"
                                value="card_to_card"
                                checked={paymentMethod === 'card_to_card'}
                                onChange={() => setPaymentMethod('card_to_card')}
                                disabled={isProcessing}
                            />
                            <div className={styles.methodContent}>
                                <div className={styles.methodIcon}>
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
                    </div>
                </div>

                {/* ── پیام خطا ────────────────────────────────────────────── */}
                {errorMessage && (
                    <div className={styles.errorBox} role="alert">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
                            stroke="currentColor" strokeWidth="2">
                            <circle cx="12" cy="12" r="10" />
                            <line x1="12" y1="8" x2="12" y2="12" />
                            <line x1="12" y1="16" x2="12.01" y2="16" />
                        </svg>
                        {errorMessage}
                    </div>
                )}

                {/* ── دکمه‌ها ──────────────────────────────────────────────── */}
                <div className={styles.actions}>
                    <button
                        onClick={() => router.back()}
                        className={styles.previousButton}
                        disabled={isProcessing}
                    >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <polyline points="9 18 15 12 9 6" />
                        </svg>
                        <span>بازگشت</span>
                    </button>

                    <button
                        onClick={handlePayment}
                        className={styles.paymentButton}
                        disabled={isProcessing}
                        id="light-finalize-btn"
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
                                        : 'پرداخت و شارژ نور'}
                                </span>
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    {paymentMethod === 'card_to_card' ? (
                                        <polyline points="20 6 9 17 4 12" />
                                    ) : (
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
        </div>
    );
}

export default function LightCheckoutPage() {
    return (
        <Suspense fallback={
            <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <p style={{ color: 'var(--color-text-primary)', fontSize: 'var(--font-lg)' }}>
                    در حال بارگذاری...
                </p>
            </div>
        }>
            <LightCheckoutContent />
        </Suspense>
    );
}
