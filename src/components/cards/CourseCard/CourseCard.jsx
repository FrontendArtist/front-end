'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { useAccountOrderItems } from '@/hooks/useAccountOrders';
import { isCoursePurchasedByUser } from '@/lib/courseAccessUtils';
import { isIranianPhoneNumber } from '@/lib/phoneUtils';
import DiscountCountdown from '@/components/ui/DiscountCountdown/DiscountCountdown';
import GradientBorderCard from '@/components/ui/GradientBorderCard/GradientBorderCard';
import PriceWithHint from '@/components/ui/PriceWithHint/PriceWithHint';
import styles from './CourseCard.module.scss';

/**
 * کامپوننت کارت دوره آموزشی همراه با پشتیبانی از تخفیف و شمارش معکوس
 */
const CourseCard = ({ course }) => {
  if (!course) return null;

  const { data: session, status } = useSession();

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

  const isForeign = Boolean(
    session?.user?.is_foreigner || 
    (session?.user?.phoneNumber && !isIranianPhoneNumber(session.user.phoneNumber))
  );

  const intlPrice = course.internationalPrice ? Number(course.internationalPrice) : null;
  const hasIntl = isForeign && intlPrice && intlPrice > 0;

  const formattedPrice = hasIntl ? intlPrice : (course.priceNoor ?? (typeof price === "object" ? (price?.noor ?? price?.toman) : price) ?? 0);
  const originalPrice = hasIntl ? intlPrice : (course.originalPriceNoor ?? rawOriginalPrice ?? (typeof price === "object" ? (price?.originalNoor ?? price?.original) : formattedPrice));
  const hasDiscount = !hasIntl && discountPercent > 0 && originalPrice > formattedPrice;

  const [isHydrated, setIsHydrated] = useState(false);

  const orders = useAccountOrderItems();
  const isPurchased = isCoursePurchasedByUser(course, { session, orders, checkChapters: true });

  useEffect(() => {
    setIsHydrated(true);
  }, []);

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
          <span className={styles.purchasedBadge}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
            شما دانشجوی دوره هستید
          </span>
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
        <Link href={`/courses/${slug}`} className={`${styles.ctaButton} card-button`}>
          {isHydrated && isPurchased ? 'مشاهده دوره' : 'بیشتر بدانید'}
        </Link>
      </div>
    </GradientBorderCard>
  );
};

export default CourseCard;
