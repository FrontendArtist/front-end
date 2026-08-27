'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { useOrdersStore } from '@/store/useOrdersStore';
import DiscountCountdown from '@/components/ui/DiscountCountdown/DiscountCountdown';
import GradientBorderCard from '@/components/ui/GradientBorderCard/GradientBorderCard';
import styles from './CourseCard.module.scss';

/**
 * کامپوننت کارت دوره آموزشی همراه با پشتیبانی از تخفیف و شمارش معکوس
 */
const CourseCard = ({ course }) => {
  if (!course) return null;

  const {
    id,
    slug,
    image,
    title,
    price,
    originalPrice: rawOriginalPrice,
    discountPercent = 0,
    discountUntil,
    shortDescription
  } = course;

  const formattedPrice = (typeof price === "object" ? price?.toman : price) || 0;
  const originalPrice = rawOriginalPrice ?? (typeof price === "object" && price?.original ? price.original : formattedPrice);
  const hasDiscount = discountPercent > 0 && originalPrice > formattedPrice;

  const [isHydrated, setIsHydrated] = useState(false);

  const { data: session, status } = useSession();
  const { fetchOrders } = useOrdersStore();

  const isPurchased = useOrdersStore(state => {
    const allItems = state.orders.flatMap(order => {
      const items = order.attributes?.items || order.items;
      return Array.isArray(items) ? items : [];
    });
    return allItems.some(item => item.slug === slug || item.id === id);
  });

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  useEffect(() => {
    if (status === 'authenticated') {
      fetchOrders();
    }
  }, [status, fetchOrders]);

  return (
    <GradientBorderCard
      gradient="vertical"
      contentClassName={`${styles.courseCard} card`}
    >
      <div className={styles.imageWrapper}>
        <Image
          src={image.url}
          alt={image.alt || title}
          fill
          sizes="(max-width: 768px) 100vw, 50vw"
          className={styles.courseImage}
        />
        {isHydrated && isPurchased ? (
          <span className={styles.purchasedBadge}>خریداری شده</span>
        ) : hasDiscount ? (
          <div className={styles.topBadges}>
            <span className={styles.discountBadge}>٪{discountPercent} تخفیف</span>
            {discountUntil && (
              <DiscountCountdown targetDate={discountUntil} compact={true} />
            )}
          </div>
        ) : null}
      </div>
      <div className={styles.cardContent}>
        <h3 className={styles.cardTitle}>{title}</h3>
        <p className={styles.cardText}>{shortDescription}</p>

        {/* نمایش قیمت یا وضعیت رایگان */}
        <div className={styles.priceSection}>
          {isHydrated && isPurchased ? (
            <span className={styles.purchasedText}>✓ دانشجوی دوره هستید</span>
          ) : hasDiscount ? (
            <div className={styles.priceContainer}>
              <del className={styles.originalPrice}>{originalPrice.toLocaleString()} تومان</del>
              <span className={styles.discountPrice}>{formattedPrice.toLocaleString()} تومان</span>
            </div>
          ) : (
            <span className={styles.price}>
              {formattedPrice > 0 ? `${formattedPrice.toLocaleString()} تومان` : 'رایگان'}
            </span>
          )}
        </div>

        <Link href={`/courses/${slug}`} className={`${styles.ctaButton} card-button`}>
          {isHydrated && isPurchased ? 'مشاهده دوره' : 'بیشتر بدانید'}
        </Link>
      </div>
    </GradientBorderCard>
  );
};

export default CourseCard;