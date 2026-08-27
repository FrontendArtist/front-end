'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useCartStore } from '@/store/useCartStore';
import DiscountCountdown from '@/components/ui/DiscountCountdown/DiscountCountdown';
import GradientBorderCard from '@/components/ui/GradientBorderCard/GradientBorderCard';
import styles from './ProductCard.module.scss';

/**
 * کامپوننت کارت محصول با قابلیت اضافه کردن به سبد خرید و نمایش تخفیف و تایمر شمارش معکوس
 */
const ProductCard = ({ product }) => {
  if (!product) return null;

  const {
    id,
    slug,
    image,
    title,
    price,
    originalPrice: rawOriginalPrice,
    discountPercent = 0,
    discountUntil,
    shortDescription,
    categories,
    stock,
    isAvailable
  } = product;

  const formattedPrice = (typeof price === "object" ? price?.toman : price) || 0;
  const originalPrice = rawOriginalPrice ?? (typeof price === "object" && price?.original ? price.original : formattedPrice);
  const hasDiscount = discountPercent > 0 && originalPrice > formattedPrice;

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
      originalPrice: hasDiscount ? originalPrice : formattedPrice,
      discountPercent: hasDiscount ? discountPercent : 0,
      image: (typeof image === 'string' && image.trim() !== '') ? image : (image?.url || '/images/forempties2.png'),
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

  const CartIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="9" cy="21" r="1"></circle>
      <circle cx="20" cy="21" r="1"></circle>
      <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
    </svg>
  );

  const PlusIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="5" x2="12" y2="19"></line>
      <line x1="5" y1="12" x2="19" y2="12"></line>
    </svg>
  );

  const MinusIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="5" y1="12" x2="19" y2="12"></line>
    </svg>
  );

  const TrashIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6"></polyline>
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
    </svg>
  );

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
        {hasDiscount && (
          <div className={styles.topBadges}>
            <span className={styles.discountBadge}>
              ٪{discountPercent} تخفیف
            </span>
            {discountUntil && (
              <DiscountCountdown targetDate={discountUntil} compact={true} />
            )}
          </div>
        )}
      </div>

      <div className={styles.cardContent}>
        <h3 className={`${styles.cardTitle} card-title`}>{title}</h3>

        <div className={styles.footer}>
          {hasDiscount ? (
            <div className={styles.priceContainer}>
              <del className={styles.originalPrice}>{originalPrice.toLocaleString()} تومان</del>
              <span className={styles.discountPrice}>{formattedPrice.toLocaleString()} تومان</span>
            </div>
          ) : (
            formattedPrice > 0 && (
              <span className={styles.price}>{formattedPrice.toLocaleString()}<br/> تومان</span>
            )
          )}

          {isOutOfStock ? (
            <button
              className={styles.addToCartButton}
              disabled
              style={{ color: '#ffffff73', background: '#ffffff0d', borderColor: '#ffffff1f', boxShadow: 'none' }}
            >
              ناموجود
            </button>
          ) : !isHydrated || !isInCart ? (
            <button
              className={styles.addToCartButton}
              onClick={handleAddToCart}
              aria-label={`افزودن ${title} به سبد خرید`}
            >
              <CartIcon />
              خرید
            </button>
          ) : (
            <div className={styles.quantityController}>
              <button
                className={styles.quantityButton}
                onClick={handleIncrement}
                disabled={isMaxStockReached}
                aria-label="افزایش تعداد"
                title={isMaxStockReached ? "حداکثر موجودی" : "افزایش"}
              >
                <PlusIcon />
              </button>
              <span className={styles.quantityDisplay}>{currentQuantity}</span>
              <button
                className={styles.quantityButton}
                onClick={handleDecrement}
                aria-label={currentQuantity === 1 ? "حذف از سبد خرید" : "کاهش تعداد"}
                title={currentQuantity === 1 ? "حذف" : "کاهش"}
              >
                {currentQuantity === 1 ? <TrashIcon /> : <MinusIcon />}
              </button>
            </div>
          )}
        </div>
      </div>
    </GradientBorderCard>
  );
};

export default ProductCard;