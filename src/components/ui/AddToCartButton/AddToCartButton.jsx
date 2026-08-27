'use client';

import { useState, useEffect } from 'react';
import { useCartStore } from '@/store/useCartStore';
import styles from './AddToCartButton.module.scss';

/**
 * کامپوننت دکمه افزودن به سبد خرید (Client Component)
 * 
 * این کامپوننت برای استفاده در Server Component‌ها طراحی شده است.
 * منطق hydration-safe آن دقیقاً همانند CourseCard.jsx است:
 * - قبل از hydration: دکمه "افزودن به سبد خرید" (فعال) نمایش داده می‌شود
 * - بعد از hydration و اگر دوره در سبد باشد: دکمه "موجود در سبد خرید" (غیرفعال)
 * - بعد از hydration و اگر دوره در سبد نباشد: دکمه "افزودن به سبد خرید" (فعال)
 * 
 * @param {{ course: { id: string|number; slug: string; title: string; price: number; image: string; } }} props
 */
export default function AddToCartButton({ course }) {
  const { id, slug, title, price, image } = course;

  /**
   * state برای تشخیص hydration
   * مقدار اولیه false است تا با رندر سرور یکسان باشد
   */
  const [isHydrated, setIsHydrated] = useState(false);

  // بعد از mount شدن، hydration را true می‌کنیم
  useEffect(() => {
    setIsHydrated(true);
  }, []);

  const addItem = useCartStore((state) => state.addItem);

  // بررسی وجود دوره در سبد (فقط بعد از hydration معتبر است)
  const isInCart =
    useCartStore((state) => state.items.some((item) => item.id === id)) &&
    isHydrated;

  const handleAddToCart = () => {
    if (isInCart) return;

    const formattedPrice = (typeof price === 'object' ? price?.toman : price) || 0;
    const numOriginal = course.originalPrice ?? (typeof price === 'object' && price?.original ? price.original : formattedPrice);

    const courseImageUrl = (typeof image === 'string' && image.trim() !== '')
      ? image
      : (image?.url || course.media?.url || '/images/forempties2.png');

    addItem({
      id,
      slug,
      title,
      price: formattedPrice,
      originalPrice: numOriginal,
      discountPercent: course.discountPercent || 0,
      image: courseImageUrl,
      type: 'course',
    });
  };

  const CartIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="9" cy="21" r="1"></circle>
      <circle cx="20" cy="21" r="1"></circle>
      <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
    </svg>
  );

  const CheckIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12"></polyline>
    </svg>
  );

  // قبل از hydration یا وقتی دوره در سبد نیست: دکمه فعال
  if (!isHydrated || !isInCart) {
    return (
      <button
        className={styles.addToCartBtn}
        onClick={handleAddToCart}
        aria-label={`افزودن ${title} به سبد خرید`}
      >
        <CartIcon />
        افزودن به سبد خرید
      </button>
    );
  }

  // بعد از hydration و دوره در سبد است: دکمه غیرفعال
  return (
    <button
      className={`${styles.addToCartBtn} ${styles.disabled}`}
      disabled
      aria-label={`${title} در سبد خرید موجود است`}
    >
      <CheckIcon />
      موجود در سبد خرید
    </button>
  );
}
