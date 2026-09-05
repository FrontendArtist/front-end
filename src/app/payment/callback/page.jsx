'use client';

import { useEffect, useState, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useCartStore } from '@/store/useCartStore';
import { useOrdersStore } from '@/store/useOrdersStore';
import styles from './page.module.scss';

/**
 * کامپوننت داخلی برای دسترسی به SearchParams
 * باید داخل Suspense قرار گیرد
 */
function PaymentCallbackContent() {
    const searchParams = useSearchParams();
    const [mounted, setMounted] = useState(false);
    const [bankInfo, setBankInfo] = useState(null);
    const [isBankLoading, setIsBankLoading] = useState(false);
    const [bankError, setBankError] = useState(null);
    const [isCopied, setIsCopied] = useState(false);

    useEffect(() => {
        setMounted(true);
        // پاکسازی سبد خرید وقتی status=success است
        const statusParam = searchParams.get('status');
        const sourceParam = searchParams.get('source');

        if (statusParam === 'success') {
            useCartStore.getState().clearCart();
            useOrdersStore.setState({ hasFetched: false, orders: [] });
        }

        // دریافت اطلاعات بانکی برای سفارش‌های کارت‌به‌کارت
        if (sourceParam === 'card_to_card') {
            const fetchBankInfo = async () => {
                setIsBankLoading(true);
                setBankError(null);
                try {
                    const strapiUrl = process.env.NEXT_PUBLIC_STRAPI_API_URL || 'http://localhost:1337';
                    const res = await fetch(`${strapiUrl}/api/bank-setting`);

                    if (!res.ok) throw new Error('دریافت اطلاعات بانکی با خطا مواجه شد.');

                    const json = await res.json();
                    const data = json?.data;
                    if (!data) throw new Error('اطلاعات بانکی موجود نیست.');

                    setBankInfo({
                        bankName: data.bankName || '',
                        cardNumber: data.cardNumber || '',
                        accountHolder: data.accountHolder || '',
                    });
                } catch (err) {
                    console.error('[PaymentCallback] fetchBankInfo error:', err);
                    setBankError(err.message);
                } finally {
                    setIsBankLoading(false);
                }
            };

            fetchBankInfo();
        }
    }, [searchParams]);

    const handleCopyCard = useCallback(async () => {
        if (!bankInfo?.cardNumber) return;
        try {
            const rawNumber = bankInfo.cardNumber.replace(/\s+/g, '');
            await navigator.clipboard.writeText(rawNumber);
            setIsCopied(true);
            setTimeout(() => setIsCopied(false), 2000);
        } catch {
            // fallback
        }
    }, [bankInfo]);

    // قبل از mount، لودر نمایش داده می‌شود
    if (!mounted) {
        return (
            <div className={styles.loadingContainer}>
                <div className={styles.loader}>در حال بارگذاری...</div>
            </div>
        );
    }

    const status = searchParams.get('status');
    const source = searchParams.get('source'); // 'card_to_card' | 'light_topup' | null
    const orderId = searchParams.get('orderId'); // Strapi documentId
    const lightAmount = Number(searchParams.get('lightAmount') || '0');
    const orderType = searchParams.get('orderType');

    // ─── حالت موفقیت ──────────────────────────────────────────────────────────
    if (status === 'success') {
        const isFree = source === 'free';
        const isCardToCard = source === 'card_to_card';
        const isLightTopup = source === 'light_topup';
        const isLightCardToCard = isCardToCard && orderType === 'light_topup';
        const primaryHref = isFree
            ? '/profile/purchases'
            : isCardToCard && orderId
                ? `/profile/orders/${orderId}`
                : isLightTopup ? '/profile'
                    : '/profile/orders';

        return (
            <div className={`${styles.callbackPage} ${isCardToCard ? styles.pending : styles.success} container`}>
                <div className={styles.card}>

                    {/* ── آیکون ──────────────────────────────────────────────── */}
                    <div className={styles.icon}>
                        {isCardToCard ? (
                            /* ساعت — در انتظار پرداخت */
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"
                                fill="none" stroke="currentColor" strokeWidth="2"
                                strokeLinecap="round" strokeLinejoin="round">
                                <circle cx="12" cy="12" r="10" />
                                <polyline points="12 6 12 12 16 14" />
                            </svg>
                        ) : isLightTopup ? (
                            /* ستاره — شارژ نور */
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"
                                fill="currentColor" stroke="none">
                                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                            </svg>
                        ) : (
                            /* تیک سبز — پرداخت موفق / سفارش رایگان */
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"
                                fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                                <polyline points="22 4 12 14.01 9 11.01" />
                            </svg>
                        )}
                    </div>

                    {/* ── عنوان و پیام ────────────────────────────────────────── */}
                    {isFree ? (
                        <>
                            <h1 className={styles.title}>سفارش شما با موفقیت ثبت شد! 🎉</h1>
                            <p className={styles.message}>
                                سفارش رایگان شما تأیید شد و دوره‌ها/محصولات بلافاصله به حساب شما افزوده شدند.
                            </p>
                            <div className={styles.infoBox}>
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"
                                    fill="none" stroke="currentColor" strokeWidth="2">
                                    <circle cx="12" cy="12" r="10" />
                                    <line x1="12" y1="16" x2="12" y2="12" />
                                    <line x1="12" y1="8" x2="12.01" y2="8" />
                                </svg>
                                <p>
                                    دسترسی به دوره‌ها و محتوای آموزشی اکنون برای شما فعال است. می‌توانید از بخش خریدهای من مستقیماً به آن‌ها دسترسی داشته باشید.
                                </p>
                            </div>
                        </>
                    ) : isCardToCard ? (
                        <>
                            <h1 className={styles.title}>در انتظار پرداخت</h1>
                            <p className={styles.message}>
                                سفارش شما ثبت شد. برای تکمیل خرید، مبلغ را به کارت فروشگاه واریز کرده و فیش آن را ارسال کنید.
                            </p>

                            {/* ── کارت اطلاعات بانکی ─────────────────────────────── */}
                            <div className={styles.bankCard}>
                                <div className={styles.bankCardHeader}>
                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <rect x="2" y="5" width="20" height="14" rx="2" />
                                        <path d="M2 10h20" />
                                        <path d="M7 15h2" />
                                        <path d="M11 15h4" />
                                    </svg>
                                    <span>اطلاعات حساب بانکی فروشگاه</span>
                                </div>
                                <div className={styles.bankCardBody}>
                                    {isBankLoading && (
                                        <div className={styles.bankLoading}>در حال دریافت اطلاعات بانکی...</div>
                                    )}
                                    {bankError && !isBankLoading && !bankInfo && (
                                        <div className={styles.bankErrorMsg}>{bankError}</div>
                                    )}
                                    {bankInfo && !isBankLoading && (
                                        <>
                                            {bankInfo.bankName && (
                                                <div className={styles.bankRow}>
                                                    <span className={styles.bankLabel}>بانک</span>
                                                    <span className={styles.bankValue}>{bankInfo.bankName}</span>
                                                </div>
                                            )}
                                            {bankInfo.cardNumber && (
                                                <div className={styles.bankRow}>
                                                    <span className={styles.bankLabel}>شماره کارت</span>
                                                    <div className={styles.cardNumberWrapper}>
                                                        <span className={styles.bankCardNumber}>{bankInfo.cardNumber}</span>
                                                        <button
                                                            type="button"
                                                            className={`${styles.copyBtn} ${isCopied ? styles.copied : ''}`}
                                                            onClick={handleCopyCard}
                                                            aria-label="کپی شماره کارت"
                                                        >
                                                            {isCopied ? (
                                                                <>
                                                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                                                        <polyline points="20 6 9 17 4 12" />
                                                                    </svg>
                                                                    <span>کپی شد!</span>
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                                                                        <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
                                                                    </svg>
                                                                    <span>کپی</span>
                                                                </>
                                                            )}
                                                        </button>
                                                    </div>
                                                </div>
                                            )}
                                            {bankInfo.accountHolder && (
                                                <div className={styles.bankRow}>
                                                    <span className={styles.bankLabel}>به نام</span>
                                                    <span className={styles.bankValue}>{bankInfo.accountHolder}</span>
                                                </div>
                                            )}
                                        </>
                                    )}
                                </div>
                            </div>

                            <div className={styles.infoBox}>
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"
                                    fill="none" stroke="currentColor" strokeWidth="2">
                                    <circle cx="12" cy="12" r="10" />
                                    <line x1="12" y1="16" x2="12" y2="12" />
                                    <line x1="12" y1="8" x2="12.01" y2="8" />
                                </svg>
                                <p>
                                    برای ارسال فیش واریزی بر روی دکمه زیر کلیک کنید.
                                    تصویر فیش و کد پیگیری را در صفحه سفارش آپلود کنید.
                                </p>
                            </div>
                        </>
                    ) : isLightTopup ? (
                        <>
                            <h1 className={styles.title}>شارژ نور موفق! ✨</h1>
                            {lightAmount > 0 && (
                                <p className={styles.message}>
                                    <strong>{new Intl.NumberFormat('fa-IR').format(lightAmount)} نور</strong> با موفقیت به کیف پول شما افزوده شد.
                                </p>
                            )}
                            <div className={styles.infoBox}>
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"
                                    fill="none" stroke="currentColor" strokeWidth="2">
                                    <circle cx="12" cy="12" r="10" />
                                    <line x1="12" y1="16" x2="12" y2="12" />
                                    <line x1="12" y1="8" x2="12.01" y2="8" />
                                </svg>
                                <p>
                                    موجودی نور شما به‌روزرسانی شد. می‌توانید از نور در خریدهای بعدی استفاده کنید.
                                </p>
                            </div>
                        </>
                    ) : (
                        <>
                            <h1 className={styles.title}>پرداخت موفق!</h1>
                            <p className={styles.message}>
                                سفارش شما با موفقیت ثبت شد و پرداخت انجام گردید.
                            </p>
                            <div className={styles.infoBox}>
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"
                                    fill="none" stroke="currentColor" strokeWidth="2">
                                    <circle cx="12" cy="12" r="10" />
                                    <line x1="12" y1="16" x2="12" y2="12" />
                                    <line x1="12" y1="8" x2="12.01" y2="8" />
                                </svg>
                                <p>
                                    اطلاعات کامل سفارش و رسید پرداخت به ایمیل شما ارسال خواهد شد.
                                    همچنین می‌توانید وضعیت سفارش را در پروفایل خود مشاهده کنید.
                                </p>
                            </div>
                        </>
                    )}

                    {/* ── دکمه‌های عملیات ─────────────────────────────────────── */}
                    <div className={styles.actions}>
                        <Link href={primaryHref} className={styles.primaryButton}>
                            {isFree ? 'مشاهده دوره‌ها و محصولات من'
                                : isCardToCard ? 'ارسال فیش واریزی'
                                    : isLightTopup ? 'مشاهده پروفایل'
                                        : 'مشاهده سفارش‌ها'}
                        </Link>
                        <Link href="/products" className={styles.secondaryButton}>
                            بازگشت به فروشگاه
                        </Link>
                    </div>
                </div>
            </div>
        );
    }


    /**
     * حالت خطا - پرداخت ناموفق
     */
    if (status === 'failed') {
        return (
            <div className={`${styles.callbackPage} ${styles.failure} container`}>
                <div className={styles.card}>
                    {/* آیکون خطا */}
                    <div className={styles.icon}>
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <circle cx="12" cy="12" r="10" />
                            <line x1="15" y1="9" x2="9" y2="15" />
                            <line x1="9" y1="9" x2="15" y2="15" />
                        </svg>
                    </div>

                    <h1 className={styles.title}>پرداخت ناموفق</h1>

                    <p className={styles.message}>
                        متأسفانه پرداخت شما با موفقیت انجام نشد.
                    </p>

                    <div className={styles.infoBox}>
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <circle cx="12" cy="12" r="10" />
                            <line x1="12" y1="16" x2="12" y2="12" />
                            <line x1="12" y1="8" x2="12.01" y2="8" />
                        </svg>
                        <p>
                            دلایل احتمالی: موجودی کافی نبودن، لغو تراکنش توسط کاربر، یا خطای موقت بانک.
                            لطفاً مجدداً تلاش کنید یا با پشتیبانی تماس بگیرید.
                        </p>
                    </div>

                    {/* دکمه‌های عملیات */}
                    <div className={styles.actions}>
                        <Link href="/checkout" className={styles.primaryButton}>
                            تلاش مجدد
                        </Link>
                        <Link href="/cart" className={styles.secondaryButton}>
                            بازگشت به سبد خرید
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    /**
     * وضعیت نامشخص - اگر status معتبر نباشد
     */
    return (
        <div className={`${styles.callbackPage} container`}>
            <div className={styles.card}>
                <div className={styles.icon}>
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="10" />
                        <line x1="12" y1="8" x2="12" y2="12" />
                        <line x1="12" y1="16" x2="12.01" y2="16" />
                    </svg>
                </div>

                <h1 className={styles.title}>خطا در دریافت اطلاعات</h1>

                <p className={styles.message}>
                    اطلاعات پرداخت نامعتبر است.
                </p>

                <div className={styles.actions}>
                    <Link href="/cart" className={styles.primaryButton}>
                        بازگشت به سبد خرید
                    </Link>
                </div>
            </div>
        </div>
    );
}

/**
 * صفحه نتیجه پرداخت (Payment Callback)
 * 
 * ویژگی‌ها:
 * - دریافت وضعیت پرداخت از URL Query Parameters
 * - نمایش UI موفقیت (سبز) یا خطا (قرمز)
 * - پاکسازی سبد خرید در صورت موفقیت
 * - نمایش شماره سفارش Mock
 * 
 * 🚨 MOCK LOGIC: فعلاً شماره سفارش Mock تولید می‌شود
 * در اتصال به Zarinpal واقعی، باید:
 * 1. Authority از URL دریافت شود
 * 2. API Verify فراخوانی شود
 * 3. RefID واقعی از Zarinpal دریافت و نمایش داده شود
 */
export default function PaymentCallbackPage() {
    return (
        <Suspense fallback={
            <div className={styles.loadingContainer}>
                <div className={styles.loader}>در حال بارگذاری...</div>
            </div>
        }>
            <PaymentCallbackContent />
        </Suspense>
    );
}
