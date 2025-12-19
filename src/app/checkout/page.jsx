'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useCartStore, selectTotalPrice, selectItemsCount } from '@/store/useCartStore';
import styles from './page.module.scss';

/**
 * صفحه تسویه حساب (Checkout)
 * 
 * ویژگی‌ها:
 * - Auth Guard: ریدایرکت به خانه اگر کاربر لاگین نباشد
 * - نمایش آدرس کاربر (از پروفایل)
 * - نمایش خلاصه سفارش (از سبد خرید)
 * - شبیه‌سازی پرداخت آنلاین (Mock Payment)
 * 
 * 🚨 MOCK LOGIC: منطق پرداخت فعلی Mock است و باید با Zarinpal جایگزین شود
 */
export default function CheckoutPage() {
    const { data: session, status } = useSession();
    const router = useRouter();

    // State برای آدرس کاربر
    const [address, setAddress] = useState(null);
    const [loadingAddress, setLoadingAddress] = useState(true);
    const [addressError, setAddressError] = useState('');

    // State برای شبیه‌سازی پرداخت (MOCK)
    const [isProcessingPayment, setIsProcessingPayment] = useState(false);

    // دریافت اطلاعات سبد خرید
    const items = useCartStore((state) => state.items);
    const totalPrice = useCartStore(selectTotalPrice);
    const itemsCount = useCartStore(selectItemsCount);

    /**
     * Auth Guard
     * اگر کاربر لاگین نباشد، به صفحه اصلی ریدایرکت می‌شود
     */
    useEffect(() => {
        if (status === 'unauthenticated') {
            router.push('/');
        }
    }, [status, router]);

    /**
     * دریافت اطلاعات آدرس کاربر از API
     */
    useEffect(() => {
        const fetchUserAddress = async () => {
            if (status !== 'authenticated') {
                setLoadingAddress(false);
                return;
            }

            try {
                const response = await fetch('/api/profile');

                if (!response.ok) {
                    throw new Error('خطا در دریافت اطلاعات آدرس');
                }

                const data = await response.json();
                setAddress(data.address || null);
            } catch (err) {
                setAddressError(err.message);
            } finally {
                setLoadingAddress(false);
            }
        };

        if (status === 'authenticated') {
            fetchUserAddress();
        }
    }, [status]);

    /**
     * 🚨 MOCK PAYMENT LOGIC
     * این تابع فعلاً پرداخت را شبیه‌سازی می‌کند
     * 
     * برای اتصال به Zarinpal:
     * 1. این تابع را با فراخوانی API Zarinpal جایگزین کنید
     * 2. دریافت Authority و ریدایرکت به درگاه Zarinpal
     * 3. تنظیم CallbackURL به /payment/callback
     */
    const handlePayment = async () => {
        // بررسی وجود آدرس
        if (!address || !address.fullAddress) {
            setAddressError('لطفاً ابتدا آدرس خود را در پروفایل تکمیل کنید');
            return;
        }

        // شروع Loading
        setIsProcessingPayment(true);

        // 🚨 MOCK: شبیه‌سازی تاخیر 2 ثانیه‌ای (در Zarinpal واقعی نیاز نیست)
        await new Promise(resolve => setTimeout(resolve, 2000));

        // 🚨 MOCK: ریدایرکت به صفحه نتیجه با وضعیت موفق
        // در Zarinpal واقعی، کاربر به درگاه بانک ریدایرکت می‌شود
        router.push('/payment/callback?status=success');
    };

    /**
     * فرمت کردن قیمت به فارسی با جداکننده هزارگان
     */
    const formatPrice = (price) => {
        return new Intl.NumberFormat('fa-IR').format(price);
    };

    // Loading State برای Auth Check - با Skeleton UI
    if (status === 'loading') {
        return (
            <div className={`${styles.checkoutPage} container`}>
                <div className={styles.skeletonTitle}></div>

                <div className={styles.checkoutGrid}>
                    {/* Skeleton برای ستون اصلی */}
                    <div className={styles.mainColumn}>
                        <div className={styles.skeletonSection}>
                            <div className={styles.skeletonHeader}></div>
                            <div className={styles.skeletonCard}></div>
                        </div>
                        <div className={styles.skeletonSection}>
                            <div className={styles.skeletonHeader}></div>
                            <div className={styles.skeletonCard}></div>
                        </div>
                    </div>

                    {/* Skeleton برای Sidebar */}
                    <div className={styles.sidebar}>
                        <div className={styles.skeletonSummary}>
                            <div className={styles.skeletonHeader}></div>
                            <div className={styles.skeletonRow}></div>
                            <div className={styles.skeletonRow}></div>
                            <div className={styles.skeletonButton}></div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // اگر کاربر لاگین نباشد، چیزی نمایش نده (ریدایرکت می‌شود)
    if (status === 'unauthenticated') {
        return null;
    }

    // بررسی سبد خرید خالی
    if (itemsCount === 0) {
        return (
            <div className={`${styles.checkoutPage} container`}>
                <div className={styles.emptyState}>
                    <div className={styles.emptyIcon}>
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <circle cx="9" cy="21" r="1" />
                            <circle cx="20" cy="21" r="1" />
                            <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
                        </svg>
                    </div>
                    <h2 className={styles.emptyTitle}>سبد خرید شما خالی است</h2>
                    <p className={styles.emptyText}>
                        برای تسویه حساب، ابتدا باید محصولی به سبد خرید اضافه کنید.
                    </p>
                    <Link href="/products" className={styles.emptyButton}>
                        مشاهده محصولات
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className={`${styles.checkoutPage} container`}>
            <h1 className={styles.pageTitle}>تسویه حساب</h1>

            <div className={styles.checkoutGrid}>
                {/* بخش اصلی: آدرس و اطلاعات */}
                <div className={styles.mainColumn}>

                    {/* بخش آدرس تحویل */}
                    <div className={styles.section}>
                        <div className={styles.sectionHeader}>
                            <h2 className={styles.sectionTitle}>آدرس تحویل</h2>
                            <Link href="/profile" className={styles.editLink}>
                                ویرایش آدرس
                            </Link>
                        </div>

                        {loadingAddress ? (
                            <div className={styles.addressCard}>
                                <div className={styles.addressLoading}>در حال بارگذاری آدرس...</div>
                            </div>
                        ) : address && address.fullAddress ? (
                            <div className={styles.addressCard}>
                                {/* نام گیرنده */}
                                {address.recipientName && (
                                    <div className={styles.addressRow}>
                                        <span className={styles.addressLabel}>گیرنده:</span>
                                        <span className={styles.addressValue}>{address.recipientName}</span>
                                    </div>
                                )}

                                {/* شماره تماس گیرنده */}
                                {address.recipientPhone && (
                                    <div className={styles.addressRow}>
                                        <span className={styles.addressLabel}>تلفن:</span>
                                        <span className={styles.addressValue} dir="ltr">{address.recipientPhone}</span>
                                    </div>
                                )}

                                {/* استان و شهر */}
                                {(address.province || address.city) && (
                                    <div className={styles.addressRow}>
                                        <span className={styles.addressLabel}>شهر:</span>
                                        <span className={styles.addressValue}>
                                            {address.city}{address.province && `, ${address.province}`}
                                        </span>
                                    </div>
                                )}

                                {/* آدرس کامل */}
                                <div className={styles.addressRow}>
                                    <span className={styles.addressLabel}>آدرس:</span>
                                    <span className={styles.addressValue}>{address.fullAddress}</span>
                                </div>

                                {/* کد پستی */}
                                {address.postalCode && (
                                    <div className={styles.addressRow}>
                                        <span className={styles.addressLabel}>کد پستی:</span>
                                        <span className={styles.addressValue} dir="ltr">{address.postalCode}</span>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className={styles.addressCard}>
                                <div className={styles.noAddress}>
                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                                        <polyline points="9 22 9 12 15 12 15 22" />
                                    </svg>
                                    <p>هنوز آدرسی ثبت نکرده‌اید</p>
                                    <Link href="/profile" className={styles.addAddressButton}>
                                        افزودن آدرس
                                    </Link>
                                </div>
                            </div>
                        )}

                        {addressError && (
                            <div className={styles.error}>{addressError}</div>
                        )}
                    </div>

                    {/* بخش اقلام سفارش */}
                    <div className={styles.section}>
                        <h2 className={styles.sectionTitle}>اقلام سفارش ({itemsCount} مورد)</h2>
                        <div className={styles.itemsList}>
                            {items.map((item) => (
                                <div key={item.id} className={styles.orderItem}>
                                    <div className={styles.itemInfo}>
                                        <h4 className={styles.itemTitle}>{item.title}</h4>
                                        <p className={styles.itemMeta}>
                                            {item.type === 'product' ? 'محصول' : 'دوره آموزشی'}
                                            {item.quantity > 1 && ` × ${item.quantity}`}
                                        </p>
                                    </div>
                                    <div className={styles.itemPrice}>
                                        {formatPrice(item.price * item.quantity)} تومان
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                </div>

                {/* Sidebar: خلاصه سفارش */}
                <aside className={styles.sidebar}>
                    <div className={styles.summary}>
                        <h2 className={styles.summaryTitle}>خلاصه سفارش</h2>

                        <div className={styles.summaryRow}>
                            <span>تعداد اقلام:</span>
                            <strong>{itemsCount} مورد</strong>
                        </div>

                        <div className={styles.summaryRow}>
                            <span>جمع جزء:</span>
                            <strong>{formatPrice(totalPrice)} تومان</strong>
                        </div>

                        <div className={styles.divider}></div>

                        <div className={styles.summaryTotal}>
                            <span>مبلغ قابل پرداخت:</span>
                            <strong>{formatPrice(totalPrice)} تومان</strong>
                        </div>

                        {/* دکمه پرداخت */}
                        <button
                            onClick={handlePayment}
                            className={styles.paymentButton}
                            disabled={isProcessingPayment || !address || !address.fullAddress}
                        >
                            {isProcessingPayment ? (
                                <>
                                    <span className={styles.spinner}></span>
                                    در حال انتقال به درگاه پرداخت...
                                </>
                            ) : (
                                'پرداخت آنلاین'
                            )}
                        </button>

                        {/* پیام امنیت */}
                        <p className={styles.securityNote}>
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                                <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                            </svg>
                            پرداخت امن و مطمئن
                        </p>
                    </div>
                </aside>
            </div>
        </div>
    );
}
