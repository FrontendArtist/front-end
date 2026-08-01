'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useCartStore } from '@/store/useCartStore';
import GradientBorderCard from '@/components/ui/GradientBorderCard/GradientBorderCard';
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

  const { id, slug, image, title, price, shortDescription, categories, stock, isAvailable } = product;
  const formattedPrice = (typeof price === "object" ? price?.toman : price) || 0;

  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  const addItem = useCartStore((state) => state.addItem);
  const updateQuantity = useCartStore((state) => state.updateQuantity);
  const removeItem = useCartStore((state) => state.removeItem);

  const cartItem = useCartStore((state) => state.items.find((item) => item.id === id));
  const isInCart = isHydrated && !!cartItem;
  const currentQuantity = cartItem?.quantity || 0;

  const isOutOfStock = isAvailable === false || (typeof stock === 'number' && stock <= 0);
  const isMaxStockReached = typeof stock === 'number' && currentQuantity >= stock;

  const handleAddToCart = (e) => {
    e.preventDefault();
    e.stopPropagation();

    if (isOutOfStock) return;

    let categorySlug = null;
    let subcategorySlug = null;

    if (categories && Array.isArray(categories) && categories.length > 0) {
      const subcategory = categories.find(cat => cat.parent && cat.parent.slug);
      if (subcategory && subcategory.parent) {
        categorySlug = subcategory.parent.slug;
        subcategorySlug = subcategory.slug;
      } else {
        const rootCategory = categories.find(cat => !cat.parent);
        if (rootCategory) {
          categorySlug = rootCategory.slug;
        }
      }
    }

    const productToAdd = {
      id,
      slug,
      title,
      price: formattedPrice,
      image: image?.url || '/images/placeholder.png',
      type: 'product',
      stock: typeof stock === 'number' ? stock : null,
      categorySlug,
      subcategorySlug,
    };

    addItem(productToAdd);
  };

  const handleIncrement = (e) => {
    e.preventDefault();
    e.stopPropagation();

    if (isMaxStockReached) return;
    updateQuantity(id, currentQuantity + 1);
  };

  const handleDecrement = (e) => {
    e.preventDefault();
    e.stopPropagation();

    if (currentQuantity > 1) {
      updateQuantity(id, currentQuantity - 1);
    } else {
      removeItem(id);
    }
  };

  const constructProductUrl = () => {
    if (!categories || !Array.isArray(categories) || categories.length === 0) {
      return `/product/${slug}`;
    }

    const subcategory = categories.find(cat => cat.parent && cat.parent.slug);
    if (subcategory && subcategory.parent) {
      return `/products/${subcategory.parent.slug}/${subcategory.slug}/${slug}`;
    }

    const rootCategory = categories.find(cat => !cat.parent);
    if (rootCategory) {
      return `/products/${rootCategory.slug}/${slug}`;
    }

    return `/product/${slug}`;
  };

  const productUrl = constructProductUrl();

  return (
    <GradientBorderCard
      as={Link}
      wrapperProps={{ href: productUrl }}
      gradient="vertical"
      contentClassName={`${styles.productCard} card vertical-gradient`}
    >
      <div className={styles.imageWrapper}>
        <Image
          src={image?.url || '/images/placeholder.png'}
          alt={image?.alt || title}
          fill
          sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
          className={styles.productImage}
        />
      </div>
      <div className={styles.cardContent}>
        <h3 className={`${styles.cardTitle} card-title`}>{title}</h3>
        <div className={styles.footer}>
          {formattedPrice > 0 && <span className={styles.price}>{formattedPrice.toLocaleString()}<br/> تومان</span>}

          {isOutOfStock ? (
            <button
              className={`${styles.addToCartButton} card-button`}
              disabled
              style={{ opacity: 0.6, cursor: 'not-allowed', backgroundColor: '#e53e3e' }}
            >
              ناموجود
            </button>
          ) : !isHydrated || !isInCart ? (
            <button
              className={`${styles.addToCartButton} card-button`}
              onClick={handleAddToCart}
              aria-label={`افزودن ${title} به سبد خرید`}
            >
              خرید
            </button>
          ) : (
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
                disabled={isMaxStockReached}
                aria-label="افزایش تعداد"
                style={isMaxStockReached ? { opacity: 0.5, cursor: 'not-allowed' } : {}}
              >
                +
              </button>
            </div>
          )}
        </div>
      </div>
    </GradientBorderCard>
  );
};

export default ProductCard;