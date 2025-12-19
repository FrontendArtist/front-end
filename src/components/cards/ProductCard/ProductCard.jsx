'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useCartStore } from '@/store/useCartStore';
import styles from './ProductCard.module.scss';

/**
 * کامپوننت کارت محصول با قابلیت اضافه کردن به سبد خرید
 * - اگر محصول در سبد نباشد: دکمه "افزودن به سبد" نمایش داده می‌شود
 * - اگر محصول در سبد باشد: کنترلر تعداد (+ / - / quantity) نمایش داده می‌شود
 * 
 * نکته مهم Hydration:
 * این کامپوننت به LocalStorage وابسته است (از طریق Zustand persist middleware).
 * برای جلوگیری از hydration mismatch، باید الگوی خاصی را دنبال کنیم:
 * 
 * چرا این مشکل پیش می‌آید؟
 * - Server: localStorage وجود ندارد، پس isInCart همیشه false است
 * - Client (اولین رندر): باید دقیقاً همان HTML سرور را تولید کند
 * - Client (بعد از hydration): می‌تواند localStorage را بخواند و state واقعی را نمایش دهد
 * 
 * راه حل:
 * با استفاده از isHydrated state، اطمینان حاصل می‌کنیم که:
 * 1. در سرور و اولین رندر کلاینت: همیشه دکمه "افزودن به سبد" نمایش داده می‌شود
 * 2. بعد از hydration: state واقعی سبد (کنترلر تعداد یا دکمه افزودن) نمایش داده می‌شود
 * 
 * @param {{
 * id: string | number;
 * slug: string;
 * image: { url: string; alt: string; };
 * title: string;
 * price: { toman: number; };
 * shortDescription?: string;
 * categories?: Array<{ slug: string; parent?: { slug: string } }>;
 * }} product - The product data to display.
 */
const ProductCard = ({ product }) => {
  if (!product) return null;

  const { id, slug, image, title, price, shortDescription, categories } = product;
  const formattedPrice = (typeof price === "object" ? price?.toman : price) || 0;

  /**
   * state برای تشخیص اینکه آیا کامپوننت hydrate شده است یا خیر
   * این برای جلوگیری از hydration mismatch ضروری است
   * 
   * مراحل:
   * 1. مقدار اولیه: false (همخوان با رندر سرور)
   * 2. بعد از mount شدن: true (حالا می‌توانیم state واقعی سبد را نمایش دهیم)
   */
  const [isHydrated, setIsHydrated] = useState(false);

  /**
   * بعد از mount شدن کامپوننت در کلاینت، isHydrated را true می‌کنیم
   * این useEffect فقط یکبار اجرا می‌شود (dependency array خالی)
   */
  useEffect(() => {
    setIsHydrated(true);
  }, []);

  // دریافت داده‌های سبد خرید و توابع مرتبط از Zustand Store
  const addItem = useCartStore((state) => state.addItem);
  const updateQuantity = useCartStore((state) => state.updateQuantity);
  const removeItem = useCartStore((state) => state.removeItem);

  // بررسی اینکه آیا این محصول در سبد خرید موجود است یا خیر
  // استفاده از selector برای reactivity بهتر
  const cartItem = useCartStore((state) => state.items.find((item) => item.id === id));
  const isInCart = isHydrated && !!cartItem;
  const currentQuantity = cartItem?.quantity || 0;

  /**
   * هندلر افزودن محصول به سبد خرید
   * @param {Event} e - رویداد کلیک
   */
  const handleAddToCart = (e) => {
    // جلوگیری از انتقال به صفحه جزئیات محصول
    e.preventDefault();
    e.stopPropagation();

    // استخراج اطلاعات دسته‌بندی برای ساخت URL صحیح در سبد خرید
    let categorySlug = null;
    let subcategorySlug = null;

    if (categories && Array.isArray(categories) && categories.length > 0) {
      // اولویت 1: یافتن زیر‌دسته (دسته‌ای که parent دارد)
      const subcategory = categories.find(cat => cat.parent && cat.parent.slug);
      if (subcategory && subcategory.parent) {
        categorySlug = subcategory.parent.slug;
        subcategorySlug = subcategory.slug;
      } else {
        // اولویت 2: یافتن دسته اصلی (بدون parent)
        const rootCategory = categories.find(cat => !cat.parent);
        if (rootCategory) {
          categorySlug = rootCategory.slug;
        }
      }
    }

    // ساخت آبجکت محصول برای افزودن به سبد
    const productToAdd = {
      id,
      slug,
      title,
      price: formattedPrice,
      image: image.url,
      type: 'product', // نوع آیتم: محصول
      categorySlug, // اطلاعات دسته‌بندی برای ساخت URL صحیح
      subcategorySlug, // اطلاعات زیر دسته‌بندی
    };

    // افزودن محصول به سبد خرید
    addItem(productToAdd);
  };

  /**
   * هندلر افزایش تعداد محصول در سبد خرید
   * @param {Event} e - رویداد کلیک
   */
  const handleIncrement = (e) => {
    e.preventDefault();
    e.stopPropagation();

    // افزایش تعداد محصول
    updateQuantity(id, currentQuantity + 1);
  };

  /**
   * هندلر کاهش تعداد محصول در سبد خرید
   * اگر تعداد به 0 برسد، محصول از سبد حذف می‌شود
   * @param {Event} e - رویداد کلیک
   */
  const handleDecrement = (e) => {
    e.preventDefault();
    e.stopPropagation();

    if (currentQuantity > 1) {
      // کاهش تعداد محصول
      updateQuantity(id, currentQuantity - 1);
    } else {
      // اگر تعداد 1 باشد، محصول را از سبد حذف می‌کنیم
      removeItem(id);
    }
  };

  /**
   * تشخیص مسیر کانونیکال بر اساس categories
   * اولویت‌بندی:
   * 1. اولین زیر‌دسته (دسته‌ای با parent)
   * 2. اولین دسته اصلی (بدون parent)
   * 3. Fallback به مسیر قدیمی (که redirect می‌شود)
   */
  const constructProductUrl = () => {
    if (!categories || !Array.isArray(categories) || categories.length === 0) {
      // Fallback: مسیر قدیمی که به canonical redirect می‌شود
      return `/product/${slug}`;
    }

    // اولویت 1: یافتن زیر‌دسته (دسته‌ای که parent دارد)
    const subcategory = categories.find(cat => cat.parent && cat.parent.slug);
    if (subcategory && subcategory.parent) {
      return `/products/${subcategory.parent.slug}/${subcategory.slug}/${slug}`;
    }

    // اولویت 2: یافتن دسته اصلی (بدون parent)
    const rootCategory = categories.find(cat => !cat.parent);
    if (rootCategory) {
      return `/products/${rootCategory.slug}/${slug}`;
    }

    // اولویت 3: Fallback اگر ساختار داده غیرمنتظره باشد
    return `/product/${slug}`;
  };

  const productUrl = constructProductUrl();

  return (
    <Link href={productUrl} className={`${styles.productCard} card vertical-gradient`}>
      <div className={styles.imageWrapper}>
        <Image
          src={image.url}
          alt={image.alt || title}
          fill
          sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
          className={styles.productImage}
        />
      </div>
      <div className={styles.cardContent}>
        <h3 className={`${styles.cardTitle} card-title`}>{title}</h3>
        {/* {shortDescription && <p className={`${styles.cardText} card-text`}>{shortDescription}</p>} */}
        <div className={styles.footer}>
          {formattedPrice > 0 && <span className={styles.price}>{formattedPrice.toLocaleString()} تومان</span>}

          {/* 
            منطق نمایش شرطی بر اساس hydration:
            
            1. اگر !isHydrated (سرور یا اولین رندر کلاینت):
               - همیشه دکمه "افزودن به سبد" نمایش داده می‌شود
               - این اطمینان می‌دهد که HTML سرور و کلاینت یکسان است
            
            2. اگر isHydrated && !isInCart (بعد از hydration و محصول در سبد نیست):
               - دکمه "افزودن به سبد" نمایش داده می‌شود
            
            3. اگر isHydrated && isInCart (بعد از hydration و محصول در سبد است):
               - کنترلر تعداد نمایش داده می‌شود
          */}
          {!isHydrated || !isInCart ? (
            // دکمه افزودن به سبد (زمانی که hydrate نشده یا محصول در سبد نیست)
            <button
              className={`${styles.addToCartButton} card-button`}
              onClick={handleAddToCart}
              aria-label={`افزودن ${title} به سبد خرید`}
            >
              افزودن به سبد
            </button>
          ) : (
            // کنترلر تعداد (فقط زمانی که hydrate شده و محصول در سبد است)
            <div className={styles.quantityController}>
              <button
                className={styles.quantityButton}
                onClick={handleDecrement}
                aria-label="کاهش تعداد"
              >
                -
              </button>
              <span className={styles.quantityDisplay}>{currentQuantity}</span>
              <button
                className={styles.quantityButton}
                onClick={handleIncrement}
                aria-label="افزایش تعداد"
              >
                +
              </button>
            </div>
          )}
        </div>
      </div>
    </Link>
  );
};

export default ProductCard;