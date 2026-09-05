'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import Breadcrumb from '@/components/ui/BreadCrumb/Breadcrumb';
import CardSkeletonHorizontal from '@/components/ui/Skeleton/CardSkeletonHorizontal';
import DiscountCouponInput from '@/components/cart/DiscountCouponInput/DiscountCouponInput';
import EmptyCartState from '@/components/cart/EmptyCartState/EmptyCartState';
import { formatPrice } from '@/lib/formatters';
import {
    useCartStore,
    selectTotalPrice,
    selectCouponDiscount,
    selectFinalTotalPrice,
    selectItemsCount,
    selectItemLevelDiscount,
} from '@/store/useCartStore';
import styles from './Cart.module.scss';

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

    // دریافت داده‌ها و توابع از Store
    const items = useCartStore((state) => state.items);
    const updateQuantity = useCartStore((state) => state.updateQuantity);
    const removeItem = useCartStore((state) => state.removeItem);
    const appliedCoupon = useCartStore((state) => state.appliedCoupon);
    const totalPrice = useCartStore(selectTotalPrice);
    const couponDiscount = useCartStore(selectCouponDiscount);
    const itemLevelDiscount = useCartStore(selectItemLevelDiscount);
    const finalTotalPrice = useCartStore(selectFinalTotalPrice);
    const itemsCount = useCartStore(selectItemsCount);

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
                                            <p className={styles.itemPrice}>
                                                {formatPrice(item.price)} تومان
                                            </p>
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
                                            {formatPrice(item.price * item.quantity)} تومان
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
                                                <h3 className={styles.itemTitle}>{item.title}</h3>
                                                <p className={styles.itemPrice}>
                                                    {formatPrice(item.price)} تومان
                                                </p>
                                                <span className={styles.courseLabel}>
                                                    {item.type === 'chapter' ? 'فصل آموزشی' : 'دوره آموزشی'}
                                                </span>
                                            </Link>

                                            {/* فضای خالی به جای کنترلر تعداد */}
                                            <div className={styles.spacer}></div>

                                            {/* قیمت */}
                                            <div className={styles.itemTotal}>
                                                {formatPrice(item.price)} تومان
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
                            <strong>{formatPrice(totalPrice)} تومان</strong>
                        </div>

                        {/* سود تخفیف خود محصولات در صورت وجود */}
                        {itemLevelDiscount > 0 && (
                            <div className={styles.summaryRow} style={{ color: '#4ade80' }}>
                                <span>تخفیف شگفت‌انگیز:</span>
                                <strong>
                                    {formatPrice(itemLevelDiscount)} تومان
                                </strong>
                            </div>
                        )}

                        <div className={styles.divider}></div>

                        {/* بخش کد تخفیف */}
                        <div className={styles.couponSection}>
                            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-text-primary)' }}>کد تخفیف:</span>
                            <DiscountCouponInput />
                        </div>

                        {/* نمایش ردیف تخفیف کوپن در صورت اعمال */}
                        {couponDiscount > 0 && (
                            <div className={styles.summaryRow} style={{ color: '#86efac' }}>
                                <span>تخفیف کوپن ({appliedCoupon?.code}):</span>
                                <strong>-{formatPrice(couponDiscount)} تومان</strong>
                            </div>
                        )}

                        <div className={styles.divider}></div>

                        {/* مجموع نهایی قابل پرداخت */}
                        <div className={styles.summaryTotal}>
                            <span>مبلغ قابل پرداخت:</span>
                            <strong style={{ color: '#ffd166', fontSize: '1.15rem' }}>
                                {formatPrice(finalTotalPrice)} تومان
                            </strong>
                        </div>

                        {/* دکمه تسویه حساب */}
                        <Link href="/checkout" className={styles.checkoutButton}>
                            ادامه فرآیند خرید
                        </Link>

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
