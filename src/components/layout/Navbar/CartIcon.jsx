'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCartStore, selectTotalPrice, selectItemsCount } from '@/store/useCartStore';
import styles from './CartIcon.module.scss';

/**
 * آیکون سبد خرید با قابلیت نمایش Dropdown
 * این کامپوننت در Navbar استفاده می‌شود و اطلاعات سبد خرید را نمایش می‌دهد
 * 
 * نکته مهم Hydration:
 * از آنجایی که این کامپوننت به LocalStorage وابسته است و localStorage فقط در
 * سمت کلاینت در دسترس است، باید از یک الگوی خاص برای جلوگیری از خطای hydration استفاده کنیم.
 * در غیر این صورت، HTML رندر شده در سرور با HTML کلاینت مطابقت نخواهد داشت.
 */
export default function CartIcon() {
    const router = useRouter();

    /**
     * بررسی اینکه آیا کامپوننت در سمت کلاینت mount شده است یا خیر
     * این برای جلوگیری از خطای hydration mismatch ضروری است
     * 
     * چرا این کار لازم است؟
     * - Server: localStorage وجود ندارد، پس سبد خرید همیشه خالی است
     * - Client (قبل از mount): باید همان HTML سرور را نمایش دهد (سبد خالی)
     * - Client (بعد از mount): می‌تواند localStorage را بخواند و سبد واقعی را نمایش دهد
     * 
     * با استفاده از mounted state، اطمینان حاصل می‌کنیم که:
     * 1. در سرور و اولین رندر کلاینت، HTML یکسان است (بدون badge/dropdown)
     * 2. بعد از mount شدن، state واقعی سبد از localStorage خوانده می‌شود
     */
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        // بعد از mount شدن کامپوننت، این flag را true می‌کنیم
        // تا بتوانیم badge و dropdown را نمایش دهیم
        setMounted(true);
    }, []);

    /**
     * دریافت داده‌های سبد خرید از Zustand Store
     * استفاده از سلکتورها برای محاسبات بهینه و reactivity صحیح
     */
    const items = useCartStore((state) => state.items);
    const itemsCount = useCartStore(selectItemsCount);
    const totalPrice = useCartStore(selectTotalPrice);

    // مدیریت وضعیت نمایش Dropdown
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const closeTimerRef = useRef(null);

    /**
     * تشخیص اینکه آیا در حالت موبایل هستیم یا نه
     * در موبایل: کلیک روی آیکون dropdown را toggle می‌کند
     * در دسکتاپ: کلیک روی آیکون به صفحه /cart می‌رود
     */
    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
        // بررسی اندازه صفحه برای تشخیص موبایل
        const checkMobile = () => {
            setIsMobile(window.innerWidth < 1024); // lg breakpoint
        };

        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    /**
     * هندلر ورود موس به ناحیه آیکون (فقط در دسکتاپ)
     * اگر سبد خرید خالی نباشد، Dropdown را نمایش می‌دهد
     */
    const handleMouseEnter = () => {
        // در موبایل، hover کار نمی‌کند، فقط در دسکتاپ
        if (isMobile) return;

        // پاک کردن تایمر بستن (در صورت وجود)
        if (closeTimerRef.current) {
            clearTimeout(closeTimerRef.current);
        }

        // نمایش Dropdown فقط اگر کامپوننت mount شده و سبد خالی نباشد
        if (mounted && itemsCount > 0) {
            setIsDropdownOpen(true);
        }
    };

    /**
     * هندلر خروج موس از ناحیه آیکون (فقط در دسکتاپ)
     * با تاخیر 300 میلی‌ثانیه Dropdown را می‌بندد
     */
    const handleMouseLeave = () => {
        // در موبایل، hover کار نمی‌کند
        if (isMobile) return;

        // تنظیم تایمر برای بستن Dropdown با تاخیر
        closeTimerRef.current = setTimeout(() => {
            setIsDropdownOpen(false);
        }, 300);
    };

    /**
     * هندلر کلیک روی آیکون سبد خرید
     * رفتار متفاوت در موبایل و دسکتاپ:
     * - موبایل: toggle کردن dropdown (اگر آیتمی در سبد باشد)
     * - دسکتاپ: رفتن به صفحه /cart
     */
    const handleIconClick = () => {
        if (isMobile) {
            // در موبایل: toggle dropdown (فقط اگر آیتمی در سبد باشد)
            if (mounted && itemsCount > 0) {
                setIsDropdownOpen(prev => !prev);
            } else {
                // اگر سبد خالی است، به صفحه cart برود
                router.push('/cart');
            }
        } else {
            // در دسکتاپ: همیشه به صفحه cart برود
            router.push('/cart');
        }
    };

    /**
     * فرمت کردن قیمت به صورت فارسی با جداکننده هزارگان
     * @param {number} price - قیمت به عدد
     * @returns {string} - قیمت فرمت شده
     */
    const formatPrice = (price) => {
        return new Intl.NumberFormat('fa-IR').format(price);
    };

    /**
     * ساخت URL صحیح برای آیتم‌ها بر اساس نوع و اطلاعات دسته‌بندی
     * برای محصولات: از اطلاعات category استفاده می‌کند (اگر موجود باشد)
     * برای دوره‌ها: مسیر ساده /courses/{slug}
     * 
     * @param {Object} item - آیتم از سبد خرید
     * @returns {string} - مسیر URL برای آیتم
     */
    const constructItemUrl = (item) => {
        // برای دوره‌ها، مسیر ساده است
        if (item.type === 'course') {
            return `/courses/${item.slug}`;
        }

        // برای محصولات، بررسی می‌کنیم که آیا اطلاعات دسته‌بندی دارند یا خیر
        if (item.type === 'product') {
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
        }

        // Fallback (نباید به اینجا برسد)
        return `/${item.type}/${item.slug}`;
    };

    return (
        <div
            className={styles.cartContainer}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
        >
            {/* آیکون سبد خرید */}
            <button
                className={styles.iconButton}
                onClick={handleIconClick}
                aria-label="سبد خرید"
                title="سبد خرید"
            >
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    strokeWidth="2"
                    stroke="currentColor"
                    fill="none"
                >
                    <circle cx="9" cy="21" r="1" />
                    <circle cx="20" cy="21" r="1" />
                    <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
                </svg>

                {/* 
                    نمایش Badge تعداد آیتم‌ها
                    فقط زمانی نمایش داده می‌شود که:
                    1. کامپوننت mount شده باشد (mounted === true)
                    2. سبد خرید خالی نباشد (itemsCount > 0)
                    
                    این شرط mounted ضروری است تا از hydration mismatch جلوگیری کند
                */}
                {mounted && itemsCount > 0 && (
                    <span className={styles.badge}>
                        {itemsCount}
                    </span>
                )}
            </button>

            {/* 
                Dropdown منوی سبد خرید
                فقط زمانی رندر می‌شود که:
                1. کامپوننت mount شده باشد (mounted === true)
                2. سبد خرید خالی نباشد (itemsCount > 0)
                
                این الگو اطمینان می‌دهد که در سرور و اولین رندر کلاینت،
                هیچ dropdown-ای رندر نمی‌شود و HTML یکسان است
            */}
            {mounted && itemsCount > 0 && (
                <div className={`${styles.dropdown} ${isDropdownOpen ? styles.dropdownOpen : ''}`}>
                    {/* هدر Dropdown: نمایش تعداد آیتم‌ها */}
                    <div className={styles.dropdownHeader}>
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 24 24"
                            strokeWidth="2"
                            stroke="currentColor"
                            fill="none"
                        >
                            <circle cx="9" cy="21" r="1" />
                            <circle cx="20" cy="21" r="1" />
                            <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
                        </svg>
                        <span>سبد خرید شما ({itemsCount} آیتم)</span>
                    </div>

                    {/* لیست آیتم‌های سبد خرید - حداکثر 5 آیتم اول */}
                    <div className={styles.dropdownBody}>
                        {items.slice(0, 5).map((item) => (
                            <Link
                                key={item.id}
                                href={constructItemUrl(item)}
                                className={styles.cartItem}
                            >
                                {/* تصویر آیتم */}
                                <div className={styles.itemImage}>
                                    <img src={item.image} alt={item.title} />
                                </div>

                                {/* اطلاعات آیتم */}
                                <div className={styles.itemInfo}>
                                    <h4 className={styles.itemTitle}>{item.title}</h4>
                                    <div className={styles.itemMeta}>
                                        {/* نمایش تعداد فقط برای محصولات */}
                                        {item.type === 'product' && (
                                            <span className={styles.itemQuantity}>
                                                {item.quantity} عدد
                                            </span>
                                        )}
                                        {/* نمایش نوع برای دوره‌ها */}
                                        {item.type === 'course' && (
                                            <span className={styles.itemType}>دوره آموزشی</span>
                                        )}
                                    </div>
                                </div>

                                {/* قیمت آیتم */}
                                <div className={styles.itemPrice}>
                                    {formatPrice(item.price * item.quantity)} تومان
                                </div>
                            </Link>
                        ))}

                        {/* نمایش پیام در صورتی که بیش از 5 آیتم موجود باشد */}
                        {items.length > 5 && (
                            <div className={styles.moreItems}>
                                و {items.length - 5} آیتم دیگر...
                            </div>
                        )}
                    </div>

                    {/* فوتر Dropdown: نمایش مجموع قیمت و دکمه مشاهده سبد */}
                    <div className={styles.dropdownFooter}>
                        <div className={styles.totalPrice}>
                            <span>جمع کل:</span>
                            <strong>{formatPrice(totalPrice)} تومان</strong>
                        </div>
                        <Link href="/cart" className={styles.viewCartButton}>
                            مشاهده و تسویه حساب
                        </Link>
                    </div>
                </div>
            )}
        </div>
    );
}
