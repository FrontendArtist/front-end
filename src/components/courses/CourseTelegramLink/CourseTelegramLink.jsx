'use client';

import React, { useMemo } from 'react';
import { useSession } from 'next-auth/react';
import { useOrdersStore } from '@/store/useOrdersStore';
import { isOrderPaid } from '@/lib/constants/orderConstants';
import styles from './CourseTelegramLink.module.scss';

/**
 * CourseTelegramLink Component
 * 
 * Displays the Telegram group link under buyDetail when the course is purchased
 * and has 'paid' status in orders or session.
 */
export default function CourseTelegramLink({
  telegramLink,
  courseId,
  courseSlug,
  documentId,
  initialHasPurchased = false,
}) {
  const { data: session } = useSession();
  const orders = useOrdersStore((state) => state.orders);

  // بررسی خرید کل دوره از سفارشات با وضعیت paid
  const isPurchasedInOrders = useMemo(() => {
    return orders.some((order) => {
      if (!isOrderPaid(order)) return false;

      const items = order.attributes?.items || order.items || [];
      return items.some(
        (item) =>
          item.slug === courseSlug ||
          String(item.id) === String(courseId) ||
          String(item.documentId) === String(documentId) ||
          String(item.courseId) === String(courseId)
      );
    });
  }, [orders, courseSlug, courseId, documentId]);

  // بررسی دسترسی کاربر به دوره از طریق سشن یا سفارشات سرور/کلاینت
  const enrolledCourses = session?.user?.enrolledCourses || [];
  const enrolledSlugs = session?.user?.enrolledSlugs || [];

  const isEnrolledInSession =
    enrolledCourses.includes(courseId) ||
    enrolledCourses.includes(documentId) ||
    enrolledCourses.includes(String(courseId)) ||
    (courseSlug && enrolledSlugs.includes(courseSlug));

  const hasPurchased = initialHasPurchased || isPurchasedInOrders || isEnrolledInSession;

  if (!hasPurchased || !telegramLink) {
    return null;
  }

  const validUrl = telegramLink.startsWith('http://') || telegramLink.startsWith('https://')
    ? telegramLink
    : `https://${telegramLink.replace(/^@/, 't.me/')}`;

  return (
    <div className={styles.telegramBox} aria-label="لینک گروه تلگرام دوره">
      <div className={styles.telegramHeader}>
        <span className={styles.telegramIcon}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 00-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.74-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .38z" />
          </svg>
        </span>
        <span className={styles.telegramLabel}>لینک گروه تلگرام :</span>
      </div>

      <a
        href={validUrl}
        target="_blank"
        rel="noopener noreferrer"
        className={styles.telegramLinkBtn}
      >
        <span>عضویت در گروه تلگرام دوره</span>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
          <polyline points="15 3 21 3 21 9"></polyline>
          <line x1="10" y1="14" x2="21" y2="3"></line>
        </svg>
      </a>
    </div>
  );
}
