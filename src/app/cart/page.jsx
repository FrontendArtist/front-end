'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Breadcrumb from '@/components/ui/BreadCrumb/Breadcrumb';
import CardSkeletonHorizontal from '@/components/ui/Skeleton/CardSkeletonHorizontal';
import DiscountCouponInput from '@/components/cart/DiscountCouponInput/DiscountCouponInput';
import EmptyCartState from '@/components/cart/EmptyCartState/EmptyCartState';
import PriceWithHint from '@/components/ui/PriceWithHint/PriceWithHint';
import { formatPrice } from '@/lib/formatters';
import {
    useCartStore,
    selectTotalPrice,
    selectCouponDiscount,
    selectCouponPending,
    selectFinalTotalPrice,
    selectItemsCount,
    selectItemLevelDiscount,
} from '@/store/useCartStore';
import useAuthStore from '@/store/authStore';
import { executeOnlinePayment, executeNoorCartPurchase } from '@/lib/checkoutService';
import usePaymentProcessing from '@/hooks/usePaymentProcessing';
import { checkPaymentConnection, invalidatePaymentConnection } from '@/lib/client/paymentConnection';
import styles from './Cart.module.scss';
import { prepareCourseCart, getCourseCartId, getExistingCourseCartId, getCourseCart } from '@/lib/courseCartApi';
import { previewCourseCart, sameCourseCartPrice } from '@/lib/courseCartPreviewApi';
import { getWalletBalanceWithByeMoney } from '@/lib/byeMoneyApi';

/**
 * صفحه سبد خرید
 * نمایش لیست کامل اقلام سبد خرید با قابلیت مدیریت تعداد و مشاهده فاکتور نهایی
 * 
 * ویژگی‌ها:
 * - جداسازی محصولات و دوره‌ها
 * - کنترلر تعداد برای محصولات
 * - حذف آیتم‌ها
 * - سیستم پیشرفته و امن کد تخفیف
 * - نمایش خلاصه سفارش در Sidebar
 * - Empty state برای سبد خالی
 * - Hydration safe
 */
export default function CartPage() {
    /**
     * Hydration Fix
     * برای جلوگیری از مشکل عدم تطابق سرور و کلاینت
     * تا زمانی که کامپوننت mount نشده، چیزی نمایش نمی‌دهیم
     */
    const [isHydrated, setIsHydrated] = useState(false);

    useEffect(() => {
        setIsHydrated(true);
    }, []);

    const router = useRouter();
    const { data: session, status } = useSession();
    const openAuthModal = useAuthStore((state) => state.openAuthModal);

    const [isProcessing, setIsProcessing] = usePaymentProcessing();
    const [errorMessage, setErrorMessage] = useState(null);
    const [isCheckingVpn, setIsCheckingVpn] = useState(false);
    const [checkoutPreview, setCheckoutPreview] = useState(null);
    const [previewRevision, setPreviewRevision] = useState(0);
    const [walletPreview, setWalletPreview] = useState(null);
    const paymentLock = useRef(false);
    const walletRequest = useRef(0);

    // دریافت داده‌ها و توابع از Store
    const items = useCartStore((state) => state.items);
    const courseCartRevision = useCartStore((state) => state.courseCartRevision);
    const updateQuantity = useCartStore((state) => state.updateQuantity);
    const removeItem = useCartStore((state) => state.removeItemManually);
    const appliedCoupon = useCartStore((state) => state.appliedCoupon);
    const totalPrice = useCartStore(selectTotalPrice);
    const couponDiscount = useCartStore(selectCouponDiscount);
    const couponPending = useCartStore(selectCouponPending);
    const itemLevelDiscount = useCartStore(selectItemLevelDiscount);
    const finalTotalPrice = useCartStore(selectFinalTotalPrice);
    const itemsCount = useCartStore(selectItemsCount);
    const removalError = useCartStore((state) => state.removalError);

    // آیا محصول فیزیکی نیازمند آدرس پستی در سبد وجود دارد؟
    const hasPhysicalProducts = items.some((item) => item.type === 'product');

    // فقط دوره کامل در قرارداد خرید سبد پشتیبانی می‌شود.
    const isCourseCartEligible = items.length > 0 && items.every(item => item.type === 'course');
    const courseIdsKey = JSON.stringify(items.map(item => item.documentId || item.externalCourseId));
    const couponCode = appliedCoupon?.code || null;
    const previewKey = JSON.stringify([session?.user?.id, session?.user?.jwt, courseIdsKey, couponCode, courseCartRevision, previewRevision]);
    const preview = checkoutPreview?.key === previewKey ? checkoutPreview : null;
    const isPreviewLoading = isCourseCartEligible && status === 'authenticated' && !preview;
    const balance = (walletPreview && session?.user?.jwt && walletPreview.jwt === session.user.jwt) ? walletPreview.balance : null;
    const shortfall = balance == null || !preview?.data ? null : Math.ceil(Math.max(0, preview.data.priceInNoor - balance));
    const needsOnlinePayment = shortfall > 0;
    const currentPreviewKey = useRef(previewKey);
    currentPreviewKey.current = previewKey;
    useEffect(() => {
        currentPreviewKey.current = previewKey;
        return () => { currentPreviewKey.current = null; };
    }, [previewKey]);

    useEffect(() => {
        if (!isCourseCartEligible || status !== 'authenticated' || !session?.user?.jwt) return;
        let active = true;
        const requestId = ++walletRequest.current;
        const jwt = session.user.jwt;
        getWalletBalanceWithByeMoney({ jwt }).then(result => {
            if (active && walletRequest.current === requestId) setWalletPreview({ jwt, balance: result.success ? result.balance : null });
        });
        return () => { active = false; };
    }, [isCourseCartEligible, status, session?.user?.jwt, previewRevision]);

    useEffect(() => {
        if (!isCourseCartEligible || status !== 'authenticated') return;
        if (!session?.user?.jwt) {
            setCheckoutPreview({ key: previewKey, error: 'نشست شما معتبر نیست. لطفاً دوباره وارد حساب شوید.' });
            return;
        }
        const externalCourseIds = JSON.parse(courseIdsKey);
        if (externalCourseIds.some(id => !id)) {
            setCheckoutPreview({ key: previewKey, error: 'شناسه دوره در سبد معتبر نیست. دوره را حذف و دوباره اضافه کنید.' });
            return;
        }
        const controller = new AbortController();
        const existingId = getExistingCourseCartId(session.user.id, externalCourseIds, couponCode, courseCartRevision);
        const loadPreview = async () => {
            if (existingId) {
                try {
                    const existing = await getCourseCart(existingId, session.user.jwt, controller.signal);
                    if (['Paid', 'AwaitingTopUp'].includes(existing.status) ||
                        (existing.status === 'Ready' && new Date(existing.expiresAtUtc).getTime() > Date.now())) return existing;
                } catch (error) {
                    if (controller.signal.aborted || error.code !== 'CART_NOT_FOUND') throw error;
                }
            }
            return previewCourseCart({ externalCourseIds, couponCode }, session.user.jwt, controller.signal);
        };
        loadPreview()
            .then(data => {
                if (controller.signal.aborted) return;
                if (couponCode && !['Failed', 'Expired'].includes(data.status)) {
                    useCartStore.getState().applyCoupon({ code: couponCode,
                        discountAmount: data.couponDiscountInNoor, awaitingQuote: false });
                }
                if (['Failed', 'Expired'].includes(data.status)) {
                    setCheckoutPreview({ key: previewKey, error: 'پرداخت سبد تکمیل نشده است. برای بررسی امکان پرداخت مجدد روی همین سبد، بررسی دوباره را بزنید.' });
                } else setCheckoutPreview({ key: previewKey, data });
            })
            .catch(error => {
                if (!controller.signal.aborted) setCheckoutPreview({ key: previewKey, error: error.message });
            });
        return () => controller.abort();
    }, [isCourseCartEligible, courseIdsKey, couponCode, session?.user?.jwt, status, previewKey]);

    /**
     * شروع پرداخت برای دوره‌های آموزشی
     */
    const handleStartPayment = async () => {
        if (paymentLock.current) return;
        paymentLock.current = true;
        const paymentKey = previewKey;
        setIsProcessing(true);
        if (errorMessage && errorMessage.includes('فیلترشکن')) {
            invalidatePaymentConnection();
        }
        setErrorMessage(null);
        try {
            if (isCourseCartEligible) {
                if (['Paid', 'AwaitingTopUp'].includes(preview?.data?.status)) {
                    router.push('/checkout/result?source=noor&cartId=' + encodeURIComponent(preview.data.cartId));
                    return;
                }
                if (!preview || !session?.user?.jwt) throw new Error('ابتدا منتظر بررسی قیمت سبد بمانید.');
                const externalCourseIds = JSON.parse(courseIdsKey);
                const data = await prepareCourseCart({
                    cartId: getCourseCartId(session.user.id, externalCourseIds, couponCode, courseCartRevision),
                    externalCourseIds, couponCode,
                }, session.user.jwt);
                if (currentPreviewKey.current !== paymentKey) return;
                if (['Paid', 'AwaitingTopUp'].includes(data.status)) {
                    router.push('/checkout/result?source=noor&cartId=' + encodeURIComponent(data.cartId));
                    return;
                }
                if (data.status !== 'Ready') throw new Error('سبد برای پرداخت آماده نیست. دوباره تلاش کنید.');
                walletRequest.current += 1;
                setWalletPreview({ jwt: session.user.jwt, balance: data.balanceInNoor });
                setCheckoutPreview({ key: paymentKey, data });
                if (couponCode) useCartStore.getState().applyCoupon({ code: couponCode,
                    discountAmount: data.couponDiscountInNoor, awaitingQuote: false });
                if (!preview.data || !sameCourseCartPrice(preview.data, data)) {
                    setErrorMessage(preview.data
                        ? 'قیمت یا تخفیف سبد تغییر کرده است. مبلغ به‌روز را بررسی کنید و برای تأیید دوباره دکمه پرداخت را بزنید.'
                        : 'مبلغ معتبر سبد دریافت شد. آن را بررسی کنید و برای تأیید دکمه پرداخت را بزنید.');
                    return;
                }
                await executeNoorCartPurchase({
                    cartId: data.cartId,
                    jwt: session?.user?.jwt,
                    router,
                    payOnline: data.shortfallInNoor > 0,
                });
            } else {
                await executeOnlinePayment({
                    items,
                    finalTotalPrice,
                    appliedCoupon,
                    couponDiscount,
                    shippingAddress: null,
                    router,
                });
            }
        } catch (err) {
            if (currentPreviewKey.current !== paymentKey) return;
            console.error('Payment Error:', err);
            setErrorMessage(err.message || 'خطا در فرآیند پرداخت. لطفاً مجدداً تلاش کنید.');
        } finally {
            paymentLock.current = false;
            setIsProcessing(false);
        }
    };

    /**
     * بررسی مجدد اتصال و وضعیت فیلترشکن
     */
    const handleRecheckVpn = async () => {
        if (isCheckingVpn) return;
        setIsCheckingVpn(true);
        try {
            const result = await checkPaymentConnection({ refresh: true });
            if (result?.isVpn === false) {
                setErrorMessage(null);
            } else if (result?.isVpn === true) {
                setErrorMessage('فیلترشکن شما روشن است');
            } else {
                setErrorMessage(null);
            }
        } catch {
            setErrorMessage(null);
        } finally {
            setIsCheckingVpn(false);
        }
    };

    /**
     * هندلر اصلی دکمه ادامه خرید / پرداخت
     */
    const handleProceed = () => {
        if (hasPhysicalProducts) {
            // برای محصول فیزیکی نیاز به آدرس در /checkout داریم
            if (status === 'authenticated') {
                router.push('/checkout');
            } else {
                openAuthModal(() => {
                    router.push('/checkout');
                });
            }
        } else {
            // برای دوره‌های آموزشی، مستقیماً پرداخت آنلاین انجام می‌شود
            if (status === 'authenticated') {
                handleStartPayment();
            } else {
                openAuthModal(() => {
                    handleStartPayment();
                });
            }
        }
    };

    /**
     * هندلر افزایش تعداد محصول
     */
    const handleIncrement = (itemId, currentQuantity) => {
        updateQuantity(itemId, currentQuantity + 1);
    };

    /**
     * هندلر کاهش تعداد محصول
     * اگر تعداد به 0 برسد، آیتم حذف می‌شود
     */
    const handleDecrement = (itemId, currentQuantity) => {
        if (currentQuantity > 1) {
            updateQuantity(itemId, currentQuantity - 1);
        } else {
            removeItem(itemId);
        }
    };

    /**
     * هندلر حذف آیتم از سبد
     */
    const handleRemove = (itemId) => {
        removeItem(itemId);
    };

    /**
     * ساخت URL صحیح برای محصولات بر اساس اطلاعات دسته‌بندی
     * اگر اطلاعات category موجود باشد، URL کامل با دسته‌بندی می‌سازد
     * در غیر این صورت، از مسیر قدیمی استفاده می‌کند (که redirect می‌شود)
     * 
     * @param {Object} item - آیتم محصول از سبد خرید
     * @returns {string} - مسیر URL برای محصول
     */
    const constructProductUrl = (item) => {
        // اگر اطلاعات دسته‌بندی موجود نیست، از مسیر قدیمی استفاده می‌کنیم
        if (!item.categorySlug) {
            return `/product/${item.slug}`;
        }

        // اگر زیردسته هم موجود باشد
        if (item.subcategorySlug) {
            return `/products/${item.categorySlug}/${item.subcategorySlug}/${item.slug}`;
        }

        // فقط دسته اصلی موجود است
        return `/products/${item.categorySlug}/${item.slug}`;
    };

    // تا زمان hydration، loading نمایش می‌دهیم
    if (!isHydrated) {
        return (
            <div className={styles.cartPage}>
                <div className={styles.container}>
                    <div style={{ marginBottom: '24px' }}>
                        <div style={{ width: '150px', height: '24px', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: '4px' }}></div>
                    </div>
                    <div className={styles.cartGrid}>
                        <div className={styles.itemsColumn}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                <CardSkeletonHorizontal />
                                <CardSkeletonHorizontal />
                                <CardSkeletonHorizontal />
                            </div>
                        </div>
                        <aside className={styles.sidebar}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '24px' }}>
                                <div style={{ width: '100%', height: '24px', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: '4px' }}></div>
                                <div style={{ width: '100%', height: '1px', backgroundColor: 'rgba(255,255,255,0.1)' }}></div>
                                <div style={{ width: '70%', height: '24px', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: '4px' }}></div>
                                <div style={{ width: '100%', height: '48px', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: '8px', marginTop: '16px' }}></div>
                            </div>
                        </aside>
                    </div>
                </div>
            </div>
        );
    }

    /**
     * تفکیک آیتم‌ها به محصولات و دوره‌ها
     * این کار باعث می‌شود که بتوانیم هر دسته را جداگانه نمایش دهیم
     */
    /**
     * تفکیک آیتم‌ها به محصولات و دوره‌ها/فصل‌ها
     * این کار باعث می‌شود که بتوانیم هر دسته را جداگانه نمایش دهیم
     */
    const products = items.filter((item) => item.type === 'product');
    const coursesAndChapters = items.filter(
        (item) => item.type === 'course' || item.type === 'chapter'
    );

    const breadcrumbItems = [
        { label: 'خانه', href: '/' },
        { label: 'سبد خرید' }
    ];

    /**
     * Empty State - زمانی که سبد خرید خالی است
     */
    if (itemsCount === 0) {
        return (
            <div className={styles.cartPage}>
                <div className={styles.container}>
                    <Breadcrumb items={breadcrumbItems} />
                    {removalError && <p role="alert">{removalError}</p>}
                    <EmptyCartState
                        title="سبد خرید شما خالی است"
                        description="هنوز محصول یا دوره‌ای به سبد خرید خود اضافه نکرده‌اید."
                        buttonText="بازگشت به فروشگاه"
                        buttonHref="/products"
                    />
                </div>
            </div>
        );
    }

    /**
     * Main Cart View - زمانی که آیتمی در سبد وجود دارد
     * شامل لیست محصولات/دوره‌ها و Sidebar خلاصه سفارش
     */
    return (
        <div className={styles.cartPage}>
            <div className={styles.container}>
                {removalError && <p role="alert">{removalError}</p>}
                <Breadcrumb items={breadcrumbItems} />

                <div className={styles.cartGrid}>
                {/* ستون اصلی: لیست آیتم‌ها */}
                <div className={styles.itemsColumn}>

                    {/* بخش محصولات */}
                    {products.length > 0 && (
                        <div className={styles.section}>
                            <h2 className={styles.sectionTitle}>محصولات ({products.length})</h2>
                            <div className={styles.itemsList}>
                                {products.map((item) => (
                                    <div key={item.id} className={styles.cartItem}>
                                        {/* تصویر محصول - لینک به صفحه جزئیات */}
                                        <Link href={constructProductUrl(item)} className={styles.itemImage}>
                                            <Image
                                                src={item.image || '/images/forempties2.png'}
                                                alt={item.title || 'تصویر محصول'}
                                                fill
                                                sizes="(max-width: 768px) 100px, 120px"
                                                className={styles.image}
                                            />
                                        </Link>

                                        {/* اطلاعات محصول - لینک به صفحه جزئیات */}
                                        <Link href={constructProductUrl(item)} className={styles.itemInfo}>
                                            <h3 className={styles.itemTitle}>{item.title}</h3>
                                            <div className={styles.itemPrice}>
                                                <PriceWithHint price={item.price} size="sm" />
                                            </div>
                                        </Link>

                                        {/* کنترلر تعداد */}
                                        <div className={styles.quantityController}>
                                            <button
                                                onClick={() => handleDecrement(item.id, item.quantity)}
                                                className={styles.quantityButton}
                                                aria-label="کاهش تعداد"
                                            >
                                                -
                                            </button>
                                            <span className={styles.quantityDisplay}>{item.quantity}</span>
                                            <button
                                                onClick={() => handleIncrement(item.id, item.quantity)}
                                                className={styles.quantityButton}
                                                disabled={typeof item.stock === 'number' && item.quantity >= item.stock}
                                                style={typeof item.stock === 'number' && item.quantity >= item.stock ? { opacity: 0.5, cursor: 'not-allowed' } : {}}
                                                aria-label="افزایش تعداد"
                                            >
                                                +
                                            </button>
                                        </div>

                                        {/* قیمت کل (قیمت × تعداد) */}
                                        <div className={styles.itemTotal}>
                                            <PriceWithHint price={(Number(item.price) || 0) * (Number(item.quantity) || 1)} size="sm" />
                                        </div>

                                        {/* دکمه حذف */}
                                        <button
                                            onClick={() => handleRemove(item.id)}
                                            className={styles.removeButton}
                                            aria-label="حذف از سبد"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                <polyline points="3 6 5 6 21 6"></polyline>
                                                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                                            </svg>
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* بخش دوره‌ها و فصل‌های آموزشی */}
                    {coursesAndChapters.length > 0 && (
                        <div className={styles.section}>
                            <h2 className={styles.sectionTitle}>
                                دوره‌ها و فصل‌های آموزشی ({coursesAndChapters.length})
                            </h2>
                            <div className={styles.itemsList}>
                                {coursesAndChapters.map((item) => {
                                    const quote = isCourseCartEligible ? preview?.data?.courses?.find(course =>
                                        course.externalCourseId === (item.documentId || item.externalCourseId)) : null;
                                    // سهم کوپن فقط در خلاصهٔ سبد نمایش داده می‌شود؛ قیمت ردیف پیش از کوپن است.
                                    const price = isCourseCartEligible ? (quote ? quote.priceInNoor + (quote.couponDiscountInNoor ?? 0) : undefined) : item.price;
                                    const coursePageSlug = item.slug ? item.slug.split('-chapter-')[0] : '';
                                    const itemHref = item.type === 'chapter' ? `/courses/${coursePageSlug}` : `/courses/${item.slug}`;

                                    return (
                                        <div key={item.id} className={styles.cartItem}>
                                            {/* تصویر دوره/فصل - لینک به صفحه جزئیات */}
                                            <Link href={itemHref} className={styles.itemImage}>
                                                <Image
                                                    src={item.image || '/images/forempties2.png'}
                                                    alt={item.title}
                                                    fill
                                                    sizes="(max-width: 768px) 100px, 120px"
                                                    className={styles.image}
                                                />
                                            </Link>

                                            {/* اطلاعات دوره/فصل - لینک به صفحه جزئیات */}
                                            <Link href={itemHref} className={styles.itemInfo}>
                                                <h3 className={styles.itemTitle}>{quote?.title || item.title}</h3>
                                                <p className={styles.itemPrice}>
                                                    {price == null ? 'در انتظار بررسی قیمت' : <PriceWithHint price={price} size="sm" />}
                                                </p>
                                                <span className={styles.courseLabel}>
                                                    {item.type === 'chapter' ? 'فصل آموزشی' : 'دوره آموزشی'}
                                                </span>
                                            </Link>

                                            {/* فضای خالی به جای کنترلر تعداد */}
                                            <div className={styles.spacer}></div>

                                            {/* قیمت */}
                                            <div className={styles.itemTotal}>
                                                {price == null ? 'در انتظار بررسی قیمت' : <PriceWithHint price={price} size="sm" />}
                                            </div>

                                            {/* دکمه حذف */}
                                            <button
                                                onClick={() => handleRemove(item.id)}
                                                className={styles.removeButton}
                                                aria-label="حذف از سبد"
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                    <polyline points="3 6 5 6 21 6"></polyline>
                                                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2 2v2"></path>
                                                </svg>
                                            </button>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>

                {/* Sidebar: خلاصه سفارش */}
                <aside className={styles.sidebar}>
                    <h2 className={styles.summaryTitle}>خلاصه سفارش</h2>
                    <div className={styles.summary}>

                        {/* تعداد کل آیتم‌ها */}
                        <div className={styles.summaryRow}>
                            <span>تعداد اقلام:</span>
                            <strong>{itemsCount} مورد</strong>
                        </div>

                        {/* جمع کل خرید */}
                        <div className={styles.summaryRow}>
                            <span>جمع جزء سبد خرید:</span>
                            {isCourseCartEligible && !preview?.data ? 'در انتظار بررسی قیمت' :
                                <PriceWithHint price={preview?.data?.originalTotalInNoor ?? totalPrice} size="sm" />}
                        </div>

                        {/* سود تخفیف خود محصولات در صورت وجود */}
                        {(preview?.data?.itemDiscountInNoor ?? (isCourseCartEligible ? 0 : itemLevelDiscount)) > 0 && (
                            <div className={styles.summaryRow} style={{ color: '#4ade80' }}>
                                <span>تخفیف شگفت‌انگیز:</span>
                                <PriceWithHint price={preview?.data?.itemDiscountInNoor ?? itemLevelDiscount} size="sm" />
                            </div>
                        )}

                        <div className={styles.divider}></div>

                        {/* بخش کد تخفیف */}
                        <div className={styles.couponSection}>
                            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-text-primary)' }}>کد تخفیف:</span>
                            <DiscountCouponInput />
                        </div>

                        {/* نمایش ردیف تخفیف کوپن در صورت اعمال */}
                        {(preview?.data?.couponDiscountInNoor ?? (isCourseCartEligible ? 0 : couponDiscount)) > 0 && (
                            <div className={styles.summaryRow} style={{ color: '#86efac' }}>
                                <span>تخفیف کوپن ({appliedCoupon?.code}):</span>
                                <span style={{ direction: 'ltr', display: 'inline-flex' }}>
                                    - <PriceWithHint price={preview?.data?.couponDiscountInNoor ?? couponDiscount} size="sm" hideHint={true} />
                                </span>
                            </div>
                        )}

                        <div className={styles.divider}></div>

                        {/* مجموع نهایی قابل پرداخت */}
                        <div className={styles.summaryTotal}>
                            <span>مبلغ قابل پرداخت:</span>
                            {isCourseCartEligible && !preview?.data ? 'در انتظار بررسی قیمت' :
                                <PriceWithHint price={preview?.data?.priceInNoor ?? finalTotalPrice} size="md" />}
                        </div>

                        {isCourseCartEligible && preview?.data && (
                            <div className={styles.walletCard}>
                                {preview.data.status === 'AwaitingTopUp' && (
                                    <p role="status">نتیجهٔ پرداخت قبلی در حال بررسی است. پس از تأیید ناموفق‌بودن پرداخت، امکان پرداخت مجدد همین سبد فعال می‌شود.</p>
                                )}
                                <div className={styles.walletCardRow}>
                                    <span>موجودی کیف پول:</span>
                                    <strong>{balance == null ? 'در دسترس نیست؛ هنگام پرداخت بررسی می‌شود' : `${formatPrice(balance)} نور`}</strong>
                                </div>
                                {needsOnlinePayment && (
                                    <>
                                        <div className={`${styles.walletCardRow} ${styles.onlinePayRow}`}>
                                            <span>کسری موجودی:</span>
                                            <strong>{formatPrice(shortfall)} نور</strong>
                                        </div>
                                        <div className={styles.walletCardNotice}>
                                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                <circle cx="12" cy="12" r="10"></circle>
                                                <line x1="12" y1="16" x2="12" y2="12"></line>
                                                <line x1="12" y1="8" x2="12.01" y2="8"></line>
                                            </svg>
                                            <span>فقط کسری موجودی پرداخت می‌شود؛ دوره‌ها پس از پرداخت خودکار فعال خواهند شد.</span>
                                        </div>
                                    </>
                                )}
                            </div>
                        )}
                        {isCourseCartEligible && preview?.error && (
                            <div className={styles.previewError} role="alert">
                                <p>{preview.error}</p>
                                <button type="button" onClick={() => setPreviewRevision(value => value + 1)}>بررسی دوباره</button>
                            </div>
                        )}

                        {errorMessage && (
                            <div style={{
                                padding: '10px 14px',
                                backgroundColor: 'rgba(239, 68, 68, 0.15)',
                                border: '1px solid #ef4444',
                                borderRadius: '8px',
                                color: '#fca5a5',
                                fontSize: '0.85rem',
                                marginTop: '10px',
                                lineHeight: '1.5',
                                ...(errorMessage.includes('فیلترشکن') ? {
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    gap: '12px',
                                    textAlign: 'right',
                                } : {
                                    textAlign: 'center',
                                }),
                            }}>
                                {errorMessage.includes('فیلترشکن') ? (
                                    <>
                                        <span>فیلترشکن شما روشن است</span>
                                        <button
                                            type="button"
                                            onClick={handleRecheckVpn}
                                            disabled={isCheckingVpn}
                                            style={{
                                                padding: '4px 10px',
                                                fontSize: '0.8rem',
                                                backgroundColor: 'rgba(239, 68, 68, 0.25)',
                                                border: '1px solid #ef4444',
                                                borderRadius: '6px',
                                                color: '#fef2f2',
                                                cursor: isCheckingVpn ? 'wait' : 'pointer',
                                                whiteSpace: 'nowrap',
                                                opacity: isCheckingVpn ? 0.7 : 1,
                                                transition: 'opacity 0.2s',
                                                flexShrink: 0,
                                            }}
                                        >
                                            {isCheckingVpn ? 'در حال بررسی...' : 'بررسی مجدد'}
                                        </button>
                                    </>
                                ) : (
                                    errorMessage
                                )}
                            </div>
                        )}

                        {/* پیام هشدار خاموش بودن VPN برای پرداخت آنلاین شتاب */}
                        {!hasPhysicalProducts && (!isCourseCartEligible || needsOnlinePayment) && finalTotalPrice > 0 && (
                            <div className={styles.vpnNotice}>
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                                    <line x1="12" y1="8" x2="12" y2="12" />
                                    <line x1="12" y1="16" x2="12.01" y2="16" />
                                </svg>
                                <span>
                                    <strong>توجه:</strong> پیش از اتصال به درگاه بانکی، لطفاً <strong>فیلترشکن (VPN)</strong> خود را خاموش کنید.
                                </span>
                            </div>
                        )}

                        {/* دکمه پرداخت یا ادامه تسویه حساب */}
                        <button
                            type="button"
                            onClick={handleProceed}
                            disabled={isProcessing || (couponPending && !(isCourseCartEligible && preview?.error)) || isPreviewLoading}
                            className={styles.checkoutButton}
                        >
                            {isProcessing ? (
                                isCourseCartEligible ? 'در حال پردازش خرید...' : 'در حال اتصال به درگاه پرداخت...'
                            ) : isPreviewLoading ? (
                                'در حال بررسی قیمت...'
                            ) : preview?.data?.status === 'AwaitingTopUp' ? (
                                'پیگیری وضعیت پرداخت'
                            ) : isCourseCartEligible && preview?.error ? (
                                'بررسی و ادامه پرداخت'
                            ) : hasPhysicalProducts ? (
                                'ثبت آدرس و ادامه خرید '
                            ) : (preview?.data?.priceInNoor ?? finalTotalPrice) === 0 ? (
                                'ثبت‌نام و دسترسی رایگان '
                            ) : isCourseCartEligible ? (
                                balance == null ? 'ادامه پرداخت' : (needsOnlinePayment ? 'پرداخت آنلاین و خرید' : 'خرید با کیف پول نور')
                            ) : (
                                'پرداخت آنلاین شتاب '
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
        </div>
    );
}
