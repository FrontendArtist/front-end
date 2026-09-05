'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { useCartStore } from '@/store/useCartStore';
import { useOrdersStore } from '@/store/useOrdersStore';
import styles from './AddToCartButton.module.scss';

/**
 * کامپوننت دکمه افزودن به سبد خرید (Client Component)
 * 
 * این کامپوننت برای استفاده در Server Component‌ها طراحی شده است.
 * منطق hydration-safe آن:
 * - اگر سفارش کارت‌به‌کارت معلق باشد: دکمه وضعیت بررسی/ارسال فیش
 * - اگر در سبد باشد: دکمه "موجود در سبد خرید"
 * - در غیر اینصورت: دکمه "افزودن به سبد خرید"
 * 
 * @param {{ course: { id: string|number; slug: string; title: string; price: number; image: string; } }} props
 */
export default function AddToCartButton({ course }) {
  const { id, slug, title, price, image } = course;

  const [isHydrated, setIsHydrated] = useState(false);
  const { status } = useSession();
  const { fetchOrders } = useOrdersStore();

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  useEffect(() => {
    if (status === 'authenticated') {
      fetchOrders();
    }
  }, [status, fetchOrders]);

  const pendingOrder = useOrdersStore((state) => {
    return state.orders.find((order) => {
      const oStatus = (order.orderStatus || order.attributes?.orderStatus || '').trim().toLowerCase();
      const pStatus = (order.paymentStatus || order.attributes?.paymentStatus || '').trim().toLowerCase();
      const isPaid = oStatus === 'paid' || pStatus === 'paid' || ['shipped', 'delivered'].includes(oStatus);
      if (isPaid) return false;

      const isCardToCard = order.paymentMethod === 'card_to_card' || order.attributes?.paymentMethod === 'card_to_card';
      if (!isCardToCard) return false;

      const items = order.attributes?.items || order.items || [];
      return items.some((item) => {
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
  });

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

  // نمایش وضعیت سفارش معلق یا ردشده کارت‌به‌کارت
  if (isHydrated && pendingOrder) {
    const pStatus = (pendingOrder.paymentStatus || pendingOrder.attributes?.paymentStatus || '').trim().toLowerCase();
    const oStatus = (pendingOrder.orderStatus || pendingOrder.attributes?.orderStatus || '').trim().toLowerCase();
    const isVerification = pStatus === 'pending_verification';
    const isRejected = pStatus === 'failed' || oStatus === 'canceled';
    const targetUrl = `/profile/orders/${pendingOrder.documentId || pendingOrder.id}`;

    return (
      <Link
        href={targetUrl}
        className={`${styles.pendingButton} ${isRejected ? styles.rejectedPayment : !isVerification ? styles.pendingPayment : ''}`}
        title={isRejected ? 'پرداخت رد شد — برای ارسال مجدد فیش کلیک کنید' : isVerification ? 'سفارش شما در انتظار تأیید پرداخت توسط پشتیبانی است' : 'برای ارسال فیش واریز کلیک کنید'}
      >
        {isRejected ? (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="15" y1="9" x2="9" y2="15"></line>
            <line x1="9" y1="9" x2="15" y2="15"></line>
          </svg>
        ) : isVerification ? (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"></circle>
            <polyline points="12 6 12 12 16 14"></polyline>
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
            <polyline points="14 2 14 8 20 8"></polyline>
            <line x1="12" y1="18" x2="12" y2="12"></line>
            <line x1="9" y1="15" x2="15" y2="15"></line>
          </svg>
        )}
        <span>{isRejected ? 'پرداخت رد شد (ارسال مجدد فیش)' : isVerification ? 'در حال بررسی پرداخت' : 'منتظر ارسال فیش'}</span>
      </Link>
    );
  }

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
