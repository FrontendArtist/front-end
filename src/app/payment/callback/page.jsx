'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
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
    const router = useRouter();
    const [isHydrated, setIsHydrated] = useState(false);

    // دریافت وضعیت پرداخت از URL
    const status = searchParams.get('status');

    // 🚨 MOCK: تولید شماره سفارش Mock
    // در Zarinpal واقعی، این شماره از API دریافت می‌شود
    const mockOrderId = `MOCK_${Date.now()}`;

    /**
     * Hydration Fix
     */
    useEffect(() => {
        setIsHydrated(true);
    }, []);

    /**
     * 🚨 MOCK LOGIC: پاکسازی سبد خرید در صورت موفقیت
     * 
     * در Zarinpal واقعی:
     * 1. ابتدا باید Verify API فراخوانی شود
     * 2. اگر Verify موفق بود، سبد خرید پاک می‌شود
     * 3. سفارش در دیتابیس ثبت می‌شود
     */
    useEffect(() => {
        if (isHydrated && status === 'success') {
            // پاکسازی سبد خرید
            useCartStore.getState().clearCart();
            // بازنشانی حافظه کش سفارش‌ها تا در ورود بعدی به پروفایل مجدداً فچ شوند
            useOrdersStore.setState({ hasFetched: false, orders: [] });
        }
    }, [isHydrated, status]);

    // نمایش Loading تا Hydration کامل شود
    if (!isHydrated) {
        return (
            <div className={styles.loadingContainer}>
                <div className={styles.loader}>در حال بارگذاری...</div>
            </div>
        );
    }

    /**
     * حالت موفقیت - پرداخت موفق
     */
    if (status === 'success') {
        return (
            <div className={`${styles.callbackPage} ${styles.success} container`}>
                <div className={styles.card}>
                    {/* آیکون موفقیت */}
                    <div className={styles.icon}>
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                            <polyline points="22 4 12 14.01 9 11.01" />
                        </svg>
                    </div>

                    <h1 className={styles.title}>پرداخت موفق!</h1>

                    <p className={styles.message}>
                        سفارش شما با موفقیت ثبت شد و پرداخت انجام گردید.
                    </p>

                    {/* شماره سفارش Mock */}
                    <div className={styles.orderInfo}>
                        <div className={styles.orderRow}>
                            <span className={styles.label}>شماره سفارش:</span>
                            <span className={styles.value} dir="ltr">{mockOrderId}</span>
                        </div>
                    </div>

                    <div className={styles.infoBox}>
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <circle cx="12" cy="12" r="10" />
                            <line x1="12" y1="16" x2="12" y2="12" />
                            <line x1="12" y1="8" x2="12.01" y2="8" />
                        </svg>
                        <p>
                            اطلاعات کامل سفارش و رسید پرداخت به ایمیل شما ارسال خواهد شد.
                            همچنین می‌توانید وضعیت سفارش را در پروفایل خود مشاهده کنید.
                        </p>
                    </div>

                    {/* دکمه‌های عملیات */}
                    <div className={styles.actions}>
                        <Link href="/profile/orders" className={styles.primaryButton}>
                            مشاهده سفارش‌ها
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
