'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { useOrdersStore } from '@/store/useOrdersStore';
import { isOrderPaid } from '@/lib/constants/orderConstants';
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
    const paidOrders = state.orders.filter(isOrderPaid);

    const allItems = paidOrders.flatMap(order => {
      const items = order.attributes?.items || order.items;
      return Array.isArray(items) ? items : [];
    });

    return allItems.some(item => {
      // ۱. بررسی خرید کل دوره
      const isDirectCourseMatch =
        item.slug === slug ||
        String(item.id) === String(id) ||
        String(item.courseId) === String(id) ||
        (course.documentId && String(item.documentId) === String(course.documentId));

      if (isDirectCourseMatch) return true;

      // ۲. بررسی خرید حداقل یکی از فصل‌های این دوره
      const isChapterItem =
        item.type === 'chapter' ||
        Boolean(item.chapterId) ||
        (typeof item.slug === 'string' && item.slug.includes('-chapter-'));

      if (isChapterItem) {
        // تطابق دوره والد بر اساس courseId یا اسلاگ
        const parentCourseMatches =
          String(item.courseId) === String(id) ||
          (course.documentId && String(item.courseId) === String(course.documentId)) ||
          (slug && typeof item.slug === 'string' && item.slug.startsWith(`${slug}-chapter-`));

        if (parentCourseMatches) return true;

        // تطابق با شناسه فصل‌ها در صورت وجود آرایه chapters در آبجکت دوره
        if (Array.isArray(course.chapters) && course.chapters.length > 0) {
          const rawItemChapterId = item.chapterId || (item.id && String(item.id).replace('chapter-', ''));
          return course.chapters.some(ch => String(ch.id) === String(rawItemChapterId));
        }
      }

      return false;
    });
  });

  const isPurchased = isPurchasedInOrders;

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