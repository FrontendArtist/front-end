'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useCartStore, selectTotalPrice, selectItemsCount } from '@/store/useCartStore';
import styles from './Cart.module.scss';

/**
 * صفحه سبد خرید
 * نمایش لیست کامل اقلام سبد خرید با قابلیت مدیریت تعداد و مشاهده فاکتور نهایی
 * 
 * ویژگی‌ها:
 * - جداسازی محصولات و دوره‌ها
 * - کنترلر تعداد برای محصولات
 * - حذف آیتم‌ها
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
    const totalPrice = useCartStore(selectTotalPrice);
    const itemsCount = useCartStore(selectItemsCount);

    /**
     * فرمت کردن قیمت به صورت فارسی با جداکننده هزارگان
     */
    const formatPrice = (price) => {
        return new Intl.NumberFormat('fa-IR').format(price);
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
            <div className={styles.loadingContainer}>
                <div className={styles.loader}></div>
            </div>
        );
    }

    /**
     * تفکیک آیتم‌ها به محصولات و دوره‌ها
     * این کار باعث می‌شود که بتوانیم هر دسته را جداگانه نمایش دهیم
     */
    const products = items.filter(item => item.type === 'product');
    const courses = items.filter(item => item.type === 'course');

    /**
     * Empty State - زمانی که سبد خرید خالی است
     */
    if (itemsCount === 0) {
        return (
            <div className={`${styles.cartPage} container`}>
                <div className={styles.emptyState}>
                    <div className={styles.emptyIcon}>
                        {/* آیکون سبد خرید خالی */}
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <circle cx="9" cy="21" r="1" />
                            <circle cx="20" cy="21" r="1" />
                            <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
                        </svg>
                    </div>
                    <h2 className={styles.emptyTitle}>سبد خرید شما خالی است</h2>
                    <p className={styles.emptyText}>
                        هنوز محصول یا دوره‌ای به سبد خرید خود اضافه نکرده‌اید.
                    </p>
                    <Link href="/products" className={styles.emptyButton}>
                        بازگشت به فروشگاه
                    </Link>
                </div>
            </div>
        );
    }

    /**
     * Main Cart View - زمانی که آیتمی در سبد وجود دارد
     * شامل لیست محصولات/دوره‌ها و Sidebar خلاصه سفارش
     */
    return (
        <div className={`${styles.cartPage} container`}>
            <h1 className={styles.pageTitle}>سبد خرید</h1>

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
                                                src={item.image}
                                                alt={item.title}
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

                    {/* بخش دوره‌ها */}
                    {courses.length > 0 && (
                        <div className={styles.section}>
                            <h2 className={styles.sectionTitle}>دوره‌های آموزشی ({courses.length})</h2>
                            <div className={styles.itemsList}>
                                {courses.map((item) => (
                                    <div key={item.id} className={styles.cartItem}>
                                        {/* تصویر دوره - لینک به صفحه جزئیات */}
                                        <Link href={`/courses/${item.slug}`} className={styles.itemImage}>
                                            <Image
                                                src={item.image}
                                                alt={item.title}
                                                fill
                                                sizes="(max-width: 768px) 100px, 120px"
                                                className={styles.image}
                                            />
                                        </Link>

                                        {/* اطلاعات دوره - لینک به صفحه جزئیات */}
                                        <Link href={`/courses/${item.slug}`} className={styles.itemInfo}>
                                            <h3 className={styles.itemTitle}>{item.title}</h3>
                                            <p className={styles.itemPrice}>
                                                {formatPrice(item.price)} تومان
                                            </p>
                                            <span className={styles.courseLabel}>دوره آموزشی</span>
                                        </Link>

                                        {/* فضای خالی به جای کنترلر تعداد */}
                                        <div className={styles.spacer}></div>

                                        {/* قیمت (دوره‌ها quantity همیشه 1 است) */}
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
                                                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                                            </svg>
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Sidebar: خلاصه سفارش */}
                <aside className={styles.sidebar}>
                    <div className={styles.summary}>
                        <h2 className={styles.summaryTitle}>خلاصه سفارش</h2>

                        {/* تعداد کل آیتم‌ها */}
                        <div className={styles.summaryRow}>
                            <span>تعداد اقلام:</span>
                            <strong>{itemsCount} مورد</strong>
                        </div>

                        {/* جمع جزء */}
                        <div className={styles.summaryRow}>
                            <span>جمع جزء:</span>
                            <strong>{formatPrice(totalPrice)} تومان</strong>
                        </div>

                        {/* خط جداکننده */}
                        <div className={styles.divider}></div>

                        {/* مجموع کل */}
                        <div className={styles.summaryTotal}>
                            <span>مجموع کل:</span>
                            <strong>{formatPrice(totalPrice)} تومان</strong>
                        </div>

                        {/* دکمه تسویه حساب */}
                        <button className={styles.checkoutButton}>
                            ادامه فرآیند خرید
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
