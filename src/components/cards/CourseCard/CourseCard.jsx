'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { useOrdersStore } from '@/store/useOrdersStore';
import GradientBorderCard from '@/components/ui/GradientBorderCard/GradientBorderCard';
import styles from './CourseCard.module.scss';

/**
 * کامپوننت کارت دوره آموزشی
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
        {isHydrated && isPurchased && (
          <span className={styles.purchasedBadge}>خریداری شده</span>
        )}
      </div>
      <div className={styles.cardContent}>
        <h3 className={styles.cardTitle}>{title}</h3>
        <p className={styles.cardText}>{shortDescription}</p>

        {/* نمایش قیمت یا وضعیت رایگان */}
        <div className={styles.priceSection}>
          {isHydrated && isPurchased ? (
            <span className={styles.purchasedText}>دانشجوی دوره هستید</span>
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