'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useCartStore } from '@/store/useCartStore';
import styles from './CourseCard.module.scss';

/**
 * کامپوننت کارت دوره آموزشی با قابلیت اضافه کردن به سبد خرید
 * - اگر دوره در سبد نباشد: دکمه "افزودن به سبد خرید" نمایش داده می‌شود (فعال)
 * - اگر دوره در سبد باشد: دکمه "موجود در سبد خرید" نمایش داده می‌شود (غیرفعال)
 * توجه: دوره‌ها فقط یکبار قابل اضافه شدن هستند و امکان افزایش تعداد ندارند
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
 * 1. در سرور و اولین رندر کلاینت: همیشه دکمه "افزودن به سبد خرید" (فعال) نمایش داده می‌شود
 * 2. بعد از hydration: state واقعی سبد (دکمه فعال یا غیرفعال) نمایش داده می‌شود
 * 
 * @param {{
 * course: {
 * id: string | number;
 * slug: string;
 * image: { url: string; alt: string; };
 * title: string;
 * price: { toman: number; };
 * shortDescription?: string;
 * }
 * }} props
 */
const CourseCard = ({ course }) => {
  if (!course) return null;

  const { id, slug, image, title, price, shortDescription } = course;
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

  // دریافت داده‌های سبد خرید و تابع افزودن از Zustand Store
  const items = useCartStore((state) => state.items);
  const addItem = useCartStore((state) => state.addItem);

  // بررسی اینکه آیا این دوره در سبد خرید موجود است یا خیر
  const isInCart = items.some((item) => item.id === id);

  /**
   * هندلر افزودن دوره به سبد خرید
   * @param {Event} e - رویداد کلیک
   */
  const handleAddToCart = (e) => {
    // جلوگیری از رفتار پیش‌فرض لینک
    e.preventDefault();
    e.stopPropagation();

    // اگر دوره قبلاً در سبد است، عملیاتی انجام نمی‌دهیم
    if (isInCart) return;

    // ساخت آبجکت دوره برای افزودن به سبد
    const courseToAdd = {
      id,
      slug,
      title,
      price: formattedPrice,
      image: image.url,
      type: 'course', // نوع آیتم: دوره (quantity همیشه 1 خواهد بود)
    };

    // افزودن دوره به سبد خرید
    addItem(courseToAdd);
  };

  return (
    <div className={`${styles.courseCard} card`}>
      <div className={styles.imageWrapper}>
        <Image
          src={image.url}
          alt={image.alt || title}
          fill
          sizes="(max-width: 768px) 100vw, 50vw"
          className={styles.courseImage}
        />
      </div>
      <div className={styles.cardContent}>
        <h3 className={styles.cardTitle}>{title}</h3>
        <p className={styles.cardText}>{shortDescription}</p>

        {/* نمایش قیمت در صورت وجود */}
        {formattedPrice > 0 && (
          <div className={styles.priceSection}>
            <span className={styles.price}>{formattedPrice.toLocaleString()} تومان</span>
          </div>
        )}

        {/* نمایش شرطی دکمه بر اساس وضعیت hydration و سبد خرید */}
        <div className={styles.buttonSection}>
          {/* 
            منطق نمایش شرطی بر اساس hydration:
            
            1. اگر !isHydrated (سرور یا اولین رندر کلاینت):
               - همیشه دکمه فعال "افزودن به سبد خرید" نمایش داده می‌شود
               - این اطمینان می‌دهد که HTML سرور و کلاینت یکسان است
            
            2. اگر isHydrated && !isInCart (بعد از hydration و دوره در سبد نیست):
               - دکمه فعال "افزودن به سبد خرید" نمایش داده می‌شود
            
            3. اگر isHydrated && isInCart (بعد از hydration و دوره در سبد است):
               - دکمه غیرفعال "موجود در سبد خرید" نمایش داده می‌شود
          */}
          {!isHydrated || !isInCart ? (
            // دکمه افزودن به سبد (زمانی که hydrate نشده یا دوره در سبد نیست)
            <button
              className={`${styles.addToCartButton} card-button`}
              onClick={handleAddToCart}
              aria-label={`افزودن ${title} به سبد خرید`}
            >
              افزودن به سبد خرید
            </button>
          ) : (
            // دکمه غیرفعال (فقط زمانی که hydrate شده و دوره در سبد است)
            <button
              className={`${styles.disabledButton}`}
              disabled
              aria-label={`${title} در سبد خرید موجود است`}
            >
              موجود در سبد خرید
            </button>
          )}

          {/* لینک اطلاعات بیشتر */}
          <Link href={`/courses/${slug}`} className={`${styles.ctaButton} card-button`}>
            بیشتر بدانید
          </Link>
        </div>
      </div>
    </div>
  );
};

export default CourseCard;