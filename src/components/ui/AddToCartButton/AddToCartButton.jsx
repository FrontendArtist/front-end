'use client';

import { useState, useEffect } from 'react';
import { useCartStore } from '@/store/useCartStore';

/**
 * کامپوننت دکمه افزودن به سبد خرید (Client Component)
 * 
 * این کامپوننت برای استفاده در Server Component‌ها طراحی شده است.
 * منطق hydration-safe آن دقیقاً همانند CourseCard.jsx است:
 * - قبل از hydration: دکمه "ثبت‌نام در دوره" (فعال) نمایش داده می‌شود
 * - بعد از hydration و اگر دوره در سبد باشد: دکمه "موجود در سبد خرید" (غیرفعال)
 * - بعد از hydration و اگر دوره در سبد نباشد: دکمه "ثبت‌نام در دوره" (فعال)
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

    addItem({
      id,
      slug,
      title,
      price,
      image,
      type: 'course',
    });
  };

  // قبل از hydration یا وقتی دوره در سبد نیست: دکمه فعال
  if (!isHydrated || !isInCart) {
    return (
      <button
        className="card-button"
        onClick={handleAddToCart}
        aria-label={`افزودن ${title} به سبد خرید`}
      >
        افزودن به سبد خرید
      </button>
    );
  }

  // بعد از hydration و دوره در سبد است: دکمه غیرفعال
  return (
    <button
      className="card-button card-button--disabled"
      disabled
      aria-label={`${title} در سبد خرید موجود است`}
    >
      موجود در سبد خرید
    </button>
  );
}
