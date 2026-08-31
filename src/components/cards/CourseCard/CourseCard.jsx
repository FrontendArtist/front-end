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

  const isPurchasedInOrders = useOrdersStore(state => {
    const paidOrders = state.orders.filter(order => {
      const oStatus = (order.orderStatus || order.attributes?.orderStatus || '').trim().toLowerCase();
      const pStatus = (order.paymentStatus || order.attributes?.paymentStatus || '').trim().toLowerCase();
      return oStatus === 'paid' || pStatus === 'paid' || ['shipped', 'delivered'].includes(oStatus);
    });

    const allItems = paidOrders.flatMap(order => {
      const items = order.attributes?.items || order.items;
      return Array.isArray(items) ? items : [];
    });

    return allItems.some(item => {
      // اگر آیتم صرفاً یک فصل باشد، نباید کل دوره به عنوان خریداری‌شده علامت بخورد
      if (item.type === 'chapter' || item.chapterId || item.slug?.includes('-chapter-')) {
        return false;
      }
      return (
        item.slug === slug ||
        String(item.id) === String(id) ||
        String(item.courseId) === String(id) ||
        (course.documentId && String(item.documentId) === String(course.documentId))
      );
    });
  });

  const enrolledCourses = session?.user?.enrolledCourses || [];
  const enrolledSlugs = session?.user?.enrolledSlugs || [];
  const isEnrolledInSession =
    enrolledCourses.includes(id) ||
    enrolledCourses.includes(String(id)) ||
    enrolledCourses.includes(Number(id)) ||
    (course.documentId && enrolledCourses.includes(course.documentId)) ||
    (slug && enrolledSlugs.includes(slug));

  const isPurchased = isPurchasedInOrders || isEnrolledInSession;

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
        <Link href={`/courses/${slug}`} className={`${styles.ctaButton} card-button`}>
          {isHydrated && isPurchased ? 'مشاهده دوره' : 'بیشتر بدانید'}
        </Link>
      </div>
    </GradientBorderCard>
  );
};

export default CourseCard;