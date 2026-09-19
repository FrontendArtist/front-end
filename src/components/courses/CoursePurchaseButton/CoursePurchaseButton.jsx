'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import useAuthStore from '@/store/authStore';
import { useCartStore } from '@/store/useCartStore';
import {
  purchaseCourseWithByeMoney,
  checkCoursePurchaseStatusWithByeMoney,
} from '@/lib/byeMoneyApi';
import {
  getPendingPurchase,
  setPendingPurchase,
  clearPendingPurchase,
} from '@/lib/pendingPurchaseManager';
import ByeMoneyTopUpModal from '../ByeMoneyTopUpModal/ByeMoneyTopUpModal';
import styles from './CoursePurchaseButton.module.scss';

/**
 * دکمه خرید تکی دوره با واحد پولی نور از طریق سامانه ByeMoney
 * با پشتیبانی جامع از قرارداد ساختاریافته کسری موجودی، انتقال مستقیم به صفحه روش پرداخت،
 * و بازاعتبارسنجی خودکار وضعیت در رویداد فوکوس/ویزیبیلیتی پنجره.
 * 
 * @param {{ course: { id: string|number; documentId: string; slug: string; title: string; price: any; priceInNoor?: number } }} props
 */
export default function CoursePurchaseButton({ course }) {
  const router = useRouter();
  const { data: session, status } = useSession();
  const openAuthModal = useAuthStore((state) => state.openAuthModal);
  const removeItem = useCartStore((state) => state.removeItem);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [purchaseStatus, setPurchaseStatus] = useState('idle'); // 'idle' | 'loading' | 'success' | 'pending_access' | 'insufficient_balance' | 'already_owned' | 'error'
  const [errorMessage, setErrorMessage] = useState('');
  const [insufficientDetails, setInsufficientDetails] = useState(null);
  const [isTopUpModalOpen, setIsTopUpModalOpen] = useState(false);
  const [existingOrderId, setExistingOrderId] = useState(null);

  // حالت فال‌بک نادر: خرید هنوز خودکار تکمیل نشده یا نیاز به کلیک مجدد جهت نمایش خطای تازه دارد
  const [fallbackRetryNeeded, setFallbackRetryNeeded] = useState(false);
  const [isRetryingFallback, setIsRetryingFallback] = useState(false);

  // گارد جلوگیری از اجرای همزمان چک وضعیت
  const isCheckingStatusRef = useRef(false);

  const formatNumber = (n) => new Intl.NumberFormat('fa-IR').format(n || 0);

  /**
   * بازاعتبارسنجی وضعیت دوره هنگام بازگشت به صفحه (Window Focus / Visibility Change)
   */
  const revalidatePurchaseStatus = useCallback(async () => {
    if (!course?.documentId || status !== 'authenticated' || !session?.user?.jwt) return;
    if (isCheckingStatusRef.current) return;

    // بررسی اینکه آیا کانتکست خرید معلق برای این دوره در مرورگر ثبت شده است یا خیر
    const pending = getPendingPurchase(course.documentId);
    if (!pending) return;

    isCheckingStatusRef.current = true;

    try {
      const checkResult = await checkCoursePurchaseStatusWithByeMoney({
        externalCourseId: course.documentId,
        jwt: session.user.jwt,
      });

      if (checkResult.isEnrolled) {
        // ۱. مسیر عادی و مورد انتظار (Normal path):
        // خرید در بک‌اند با قیمت قفل‌شده خودکار نهایی شده است.
        // نمایش مستقیم وضعیت موفقیت بدون نیاز به کلیک دکمه و پاکسازی کانتکست معلق.
        clearPendingPurchase(course.documentId);
        setFallbackRetryNeeded(false);
        setPurchaseStatus('success');
        removeItem(course.id);
        router.refresh();
      } else if (pending.topUpRequested) {
        // ۲. مسیر نادر (Rare fallback):
        // شارژ هنوز تایید نشده یا وضعیت نهایی نشده است، یا دوره حین انتظار ناموجود شده است.
        // نمایش دکمه «تکمیل خرید دوره» جهت تلاش مجدد یک‌کلیکه و برطرف‌سازی خطای تازه.
        setFallbackRetryNeeded(true);
      }
    } catch (err) {
      console.warn('[CoursePurchaseButton Revalidation Error]:', err);
    } finally {
      isCheckingStatusRef.current = false;
    }
  }, [course?.documentId, course?.id, session?.user?.jwt, status, removeItem, router]);

  // ثبت شنونده‌های رویداد بازگشت به صفحه
  useEffect(() => {
    // بررسی اینکه آیا از قبل سفارشی برای این دوره در جریان است
    const pending = getPendingPurchase(course?.documentId);
    if (pending?.orderId) {
      setExistingOrderId(pending.orderId);
    }

    // بررسی وضعیت بلافاصله پس از بارگذاری اولیه کامپوننت
    revalidatePurchaseStatus();

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        revalidatePurchaseStatus();
      }
    };

    const handleWindowFocus = () => {
      revalidatePurchaseStatus();
    };

    window.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleWindowFocus);

    return () => {
      window.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleWindowFocus);
    };
  }, [revalidatePurchaseStatus, course?.documentId]);

  /**
   * اقدام به خرید تکی دوره از ByeMoney
   */
  const handlePurchase = async () => {
    // ۱. بررسی احراز هویت
    if (status !== 'authenticated' || !session?.user?.jwt) {
      openAuthModal();
      return;
    }

    // ۲. بررسی وجود documentId
    if (!course?.documentId) {
      setPurchaseStatus('error');
      setErrorMessage('شناسه یکتای دوره (documentId) معتبر نیست.');
      return;
    }

    // ۳. بررسی اینکه آیا قبلاً سفارشی در جریان برای این دوره ثبت شده یا خیر
    const pending = getPendingPurchase(course.documentId);
    if (pending?.orderId) {
      router.push(`/profile/orders/${pending.orderId}`);
      return;
    }

    // ۴. گارد Double-Submit
    if (isSubmitting) return;

    setIsSubmitting(true);
    setPurchaseStatus('loading');
    setErrorMessage('');

    try {
      const result = await purchaseCourseWithByeMoney({
        externalCourseId: course.documentId,
        jwt: session.user.jwt,
      });

      if (result.success) {
        // حذف دوره از سبد خرید محلی
        removeItem(course.id);
        clearPendingPurchase(course.documentId);
        setFallbackRetryNeeded(false);

        if (result.data?.status === 'NotificationFailed') {
          setPurchaseStatus('pending_access');
        } else {
          setPurchaseStatus('success');
          router.refresh();
        }
      } else if (result.conflict) {
        // دوره از قبل خریداری شده است
        removeItem(course.id);
        clearPendingPurchase(course.documentId);
        setFallbackRetryNeeded(false);
        setPurchaseStatus('already_owned');
      } else if (result.insufficientBalance && result.insufficientDetails) {
        // حالت کسری موجودی نور با جزئیات ساختاریافته جدید
        setPendingPurchase(course.documentId, {
          courseSlug: course.slug,
          courseTitle: course.title,
          shortfallInNoor: result.insufficientDetails.shortfallInNoor,
          shortfallInRial: result.insufficientDetails.shortfallInRial,
          currentBalanceInNoor: result.insufficientDetails.currentBalanceInNoor,
          priceInNoor: result.insufficientDetails.priceInNoor,
        });

        setPurchaseStatus('insufficient_balance');
        setInsufficientDetails(result.insufficientDetails);
        setErrorMessage(result.error || 'موجودی کیف پول برای خرید این دوره کافی نیست.');

        // انتقال مستقیم به صفحه روش پرداخت طبق انتخاب کاربر
        const shortfall = result.insufficientDetails.shortfallInNoor || 0;
        const targetUrl = `/checkout/light?amount=${shortfall}&documentId=${encodeURIComponent(course.documentId || '')}&courseId=${encodeURIComponent(course.documentId || course.id || '')}&courseTitle=${encodeURIComponent(course.title || '')}&courseSlug=${encodeURIComponent(course.slug || '')}`;
        router.push(targetUrl);
      } else if (result.unauthorized) {
        setPurchaseStatus('idle');
        openAuthModal();
      } else {
        // خطای عمومی، ۴۰۴ یا سایر خطاها
        setPurchaseStatus('error');
        setErrorMessage(result.error || 'خطایی در ثبت سفارش رخ داد.');
      }
    } catch (err) {
      console.error('[CoursePurchaseButton Error]:', err);
      setPurchaseStatus('error');
      setErrorMessage('خطای غیرمنتظره در برقراری ارتباط با سامانه پرداخت.');
    } finally {
      setIsSubmitting(false);
    }
  };

  /**
   * هندلر تلاش مجدد یک‌کلیکه (مسیر نادر Fallback)
   * فراخوانی خرید مجدد تا اگر آیتم کلاً ناموجود شده باشد، خطای تازه نمایان شود نه شکست بی‌صدا
   */
  const handleManualRetry = async () => {
    if (isRetryingFallback) return;

    setIsRetryingFallback(true);
    setErrorMessage('');

    try {
      const result = await purchaseCourseWithByeMoney({
        externalCourseId: course.documentId,
        jwt: session.user.jwt,
      });

      if (result.success) {
        clearPendingPurchase(course.documentId);
        setFallbackRetryNeeded(false);
        removeItem(course.id);

        if (result.data?.status === 'NotificationFailed') {
          setPurchaseStatus('pending_access');
        } else {
          setPurchaseStatus('success');
          router.refresh();
        }
      } else if (result.insufficientBalance && result.insufficientDetails) {
        setPendingPurchase(course.documentId, {
          courseSlug: course.slug,
          courseTitle: course.title,
          shortfallInNoor: result.insufficientDetails.shortfallInNoor,
          shortfallInRial: result.insufficientDetails.shortfallInRial,
          currentBalanceInNoor: result.insufficientDetails.currentBalanceInNoor,
          priceInNoor: result.insufficientDetails.priceInNoor,
        });
        setPurchaseStatus('insufficient_balance');
        setInsufficientDetails(result.insufficientDetails);
        setErrorMessage(result.error || 'موجودی کیف پول برای خرید این دوره کافی نیست.');
        const shortfall = result.insufficientDetails.shortfallInNoor || 0;
        const targetUrl = `/checkout/light?amount=${shortfall}&courseId=${encodeURIComponent(course.documentId || course.id || '')}&courseTitle=${encodeURIComponent(course.title || '')}&courseSlug=${encodeURIComponent(course.slug || '')}`;
        router.push(targetUrl);
      } else if (result.notFound || result.conflict) {
        // اگر دوره ناموجود شده یا قبلاً ثبت شده، کانتکست را پاک می‌کنیم
        clearPendingPurchase(course.documentId);
        setFallbackRetryNeeded(false);
        if (result.conflict) {
          setPurchaseStatus('already_owned');
        } else {
          setPurchaseStatus('error');
          setErrorMessage(result.error || 'این دوره دیگر برای خرید در دسترس نیست.');
        }
      } else {
        setPurchaseStatus('error');
        setErrorMessage(result.error || 'خطا در نهایی‌سازی خرید دوره.');
      }
    } catch {
      setPurchaseStatus('error');
      setErrorMessage('خطای غیرمنتظره در اتصال به سامانه پرداخت.');
    } finally {
      setIsRetryingFallback(false);
    }
  };

  // ۱. حالت موفقیت آنی و کامل (یا پس از تکمیل خودکار)
  if (purchaseStatus === 'success') {
    return (
      <div className={styles.purchaseContainer}>
        <div className={styles.enrolledBadge}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
          <span>خرید با موفقیت انجام شد! شما دانشجوی این دوره هستید.</span>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.purchaseContainer}>
      {/* حالت سفارش قبلی در جریان: جهت جلوگیری از رزرو مجدد */}
      {existingOrderId && (
        <div className={`${styles.statusCard} ${styles.pendingAccessCard}`}>
          <div className={styles.cardHeader}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
            <span>سفارش این دوره در انتظار پیگیری است</span>
          </div>
          <p>
            شما قبلاً سفارش این دوره را ثبت کرده‌اید. برای ارسال فیش واریزی یا پیگیری وضعیت تأیید روی دکمه زیر کلیک کنید.
          </p>
          <div className={styles.actions}>
            <button
              type="button"
              className={styles.btnPrimaryAction}
              onClick={() => router.push(`/profile/orders/${existingOrderId}`)}
            >
              <span>مشاهده سفارش و ارسال فیش واریزی</span>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* دکمه اصلی خرید با نور */}
      {!existingOrderId &&
        purchaseStatus !== 'already_owned' &&
        purchaseStatus !== 'pending_access' &&
        purchaseStatus !== 'insufficient_balance' &&
        !fallbackRetryNeeded && (
          <button
            type="button"
            className={styles.purchaseBtn}
            onClick={handlePurchase}
            disabled={isSubmitting}
            aria-label={`خرید دوره ${course.title} با نور`}
          >
            {isSubmitting ? (
              <>
                <span className={styles.spinner} />
                <span>در حال پردازش خرید...</span>
              </>
            ) : (
              <>
                <svg viewBox="0 0 24 24" fill="currentColor" strokeWidth="0">
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                </svg>
                <span>خرید دوره با نور</span>
              </>
            )}
          </button>
        )}

      {/* حالت b: مالی موفق با دسترسی معلق (NotificationFailed در وب‌هوک اولیه) */}
      {purchaseStatus === 'pending_access' && (
        <div className={`${styles.statusCard} ${styles.pendingAccessCard}`}>
          <div className={styles.cardHeader}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
            <span>پرداخت با موفقیت انجام شد</span>
          </div>
          <p>
            پرداخت با موفقیت انجام شد؛ فعال‌سازی دسترسی شما در سامانه در حال تکمیل است و تا دقایقی دیگر برقرار خواهد شد.
          </p>
          <div className={styles.actions}>
            <button
              type="button"
              className={styles.btnSecondaryAction}
              onClick={() => router.refresh()}
            >
              تازه‌سازی صفحه
            </button>
          </div>
        </div>
      )}

      {/* حالت مالکیت قبلی */}
      {purchaseStatus === 'already_owned' && (
        <div className={styles.enrolledBadge}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
          <span>شما قبلاً این دوره را تهیه کرده‌اید و به آن دسترسی دارید.</span>
        </div>
      )}

      {/* حالت کسری موجودی نور (Insufficient Balance) بر اساس قرارداد ساختاریافته */}
      {purchaseStatus === 'insufficient_balance' && insufficientDetails && (
        <div className={`${styles.statusCard} ${styles.insufficientCard}`}>
          <div className={styles.cardHeader}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <span>موجودی نور کافی نیست</span>
          </div>

          {/* تفکیک ارقام مالی: موجودی فعلی، قیمت، و کسری دقیق */}
          <div className={styles.balanceBreakdown}>
            <div className={styles.breakdownRow}>
              <span>موجودی فعلی شما:</span>
              <strong>{formatNumber(insufficientDetails.currentBalanceInNoor)} نور</strong>
            </div>
            <div className={styles.breakdownRow}>
              <span>هزینه دوره:</span>
              <strong>{formatNumber(insufficientDetails.priceInNoor)} نور</strong>
            </div>
            <div className={styles.breakdownRowHighlight}>
              <span>کسری برای واریز:</span>
              <strong>
                {formatNumber(insufficientDetails.shortfallInNoor)} نور
                <span className={styles.rialEquivalent}>
                  ({formatNumber(insufficientDetails.shortfallInToman)} تومان / {formatNumber(insufficientDetails.shortfallInRial)} ریال)
                </span>
              </strong>
            </div>
          </div>

          {/* دکمه اقدام جهت هدایت به صفحه روش پرداخت و کارت‌به‌کارت */}
          <div className={styles.actions}>
            <button
              type="button"
              className={styles.btnPrimaryAction}
              onClick={() => {
                const shortfall = insufficientDetails.shortfallInNoor || 0;
                router.push(
                  `/checkout/light?amount=${shortfall}&courseId=${encodeURIComponent(course.documentId || course.id || '')}&courseTitle=${encodeURIComponent(course.title || '')}&courseSlug=${encodeURIComponent(course.slug || '')}`
                );
              }}
            >
              <span>انتقال به صفحه روش پرداخت و واریز کارت‌به‌کارت</span>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* حالت مسیر نادر Fallback: خرید هنگام بازگشت خودکار نهایی نشده است */}
      {fallbackRetryNeeded && purchaseStatus !== 'success' && (
        <div className={`${styles.statusCard} ${styles.fallbackCard}`}>
          <div className={styles.cardHeader}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
            <span>خرید دوره در انتظار نهایی‌سازی</span>
          </div>
          <p>
            درخواست افزایش اعتبار شما ثبت شده است. برای نهایی‌سازی خرید دوره با قیمت قفل‌شده روی دکمه زیر کلیک کنید.
          </p>
          <div className={styles.actions}>
            <button
              type="button"
              className={styles.btnPrimaryAction}
              onClick={handleManualRetry}
              disabled={isRetryingFallback}
            >
              {isRetryingFallback ? (
                <>
                  <span className={styles.spinner} />
                  <span>در حال بررسی و نهایی‌سازی...</span>
                </>
              ) : (
                <>
                  <span>تکمیل خرید دوره</span>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* حالت خطای عمومی یا ناموجود شدن دوره */}
      {purchaseStatus === 'error' && (
        <div className={`${styles.statusCard} ${styles.errorCard}`}>
          <div className={styles.cardHeader}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="15" y1="9" x2="9" y2="15" />
              <line x1="9" y1="9" x2="15" y2="15" />
            </svg>
            <span>خطا در پردازش خرید دوره</span>
          </div>
          <p>{errorMessage}</p>
          <div className={styles.actions}>
            <button
              type="button"
              className={styles.btnSecondaryAction}
              onClick={() => {
                setPurchaseStatus('idle');
                setFallbackRetryNeeded(false);
              }}
            >
              تلاش مجدد
            </button>
          </div>
        </div>
      )}

      {/* مودال اختصاصی افزایش اعتبار کارت‌به‌کارت ByeMoney */}
      <ByeMoneyTopUpModal
        isOpen={isTopUpModalOpen}
        onClose={() => {
          setIsTopUpModalOpen(false);
          const pending = getPendingPurchase(course?.documentId);
          if (pending?.topUpRequested) {
            setFallbackRetryNeeded(true);
            setPurchaseStatus('idle');
          }
        }}
        shortfallInNoor={insufficientDetails?.shortfallInNoor || 0}
        shortfallInRial={insufficientDetails?.shortfallInRial || 0}
        currentBalanceInNoor={insufficientDetails?.currentBalanceInNoor || 0}
        priceInNoor={insufficientDetails?.priceInNoor || 0}
        course={course}
        onRequestCreated={() => {
          setFallbackRetryNeeded(true);
          setPurchaseStatus('idle');
        }}
      />
    </div>
  );
}
