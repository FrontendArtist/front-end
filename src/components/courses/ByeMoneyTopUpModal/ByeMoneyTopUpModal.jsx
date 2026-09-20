'use client';

import { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useSession } from 'next-auth/react';
import { createTopUpRequestWithByeMoney } from '@/lib/byeMoneyApi';
import { setPendingPurchase, setPendingBasketPurchase } from '@/lib/pendingPurchaseManager';
import styles from './ByeMoneyTopUpModal.module.scss';

/**
 * مودال اختصاصی ثبت درخواست افزایش اعتبار (TopUp) در سامانه ByeMoney
 * 
 * ویژگی‌ها:
 * - پیش‌پر کردن کسری دقیق نور (shortfallInNoor) و معادل ریالی/تومانی
 * - پیوست لیست دوره‌های معلق خرید (pendingItems) جهت تکمیل خودکار سبد پس از تایید واریز
 * - استقلال کامل از مسیر قدیمی /checkout/light و عدم ایجاد سفارش استراپی
 * - نمایش مشخصات کارت بانکی و نگهداری کانتکست جهت تکمیل خودکار پس از تایید
 * 
 * @param {object} props
 * @param {boolean} props.isOpen
 * @param {function} props.onClose
 * @param {number} props.shortfallInNoor
 * @param {number} [props.shortfallInRial]
 * @param {number} [props.currentBalanceInNoor]
 * @param {number} [props.priceInNoor]
 * @param {object} [props.course]
 * @param {any[]} [props.pendingItems]
 * @param {any[]} [props.cartItems]
 * @param {function} [props.onRequestCreated]
 */
export default function ByeMoneyTopUpModal({
  isOpen,
  onClose,
  shortfallInNoor = 0,
  shortfallInRial = 0,
  currentBalanceInNoor = 0,
  priceInNoor = 0,
  course,
  pendingItems = [],
  cartItems = [],
  onRequestCreated,
}) {
  const { data: session } = useSession();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdRequestData, setCreatedRequestData] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [isCopied, setIsCopied] = useState(false);
  const [bankInfo, setBankInfo] = useState({
    bankName: 'بانک ملی ایران',
    cardNumber: '۶۰۳۷-۹۹۷۵-۱۲۳۴-۵۶۷۸',
    accountHolder: 'موسسه آموزشی خاک تا افلاک',
  });

  // دریافت اطلاعات بانکی پویا از تنظیمات سامانه
  useEffect(() => {
    if (!isOpen) return;
    const fetchBankInfo = async () => {
      try {
        const strapiUrl = process.env.NEXT_PUBLIC_STRAPI_API_URL || 'http://localhost:1337';
        const res = await fetch(`${strapiUrl}/api/bank-setting`);
        if (res.ok) {
          const json = await res.json();
          const data = json?.data;
          if (data) {
            setBankInfo({
              bankName: data.bankName || 'بانک ملی ایران',
              cardNumber: data.cardNumber || '۶۰۳۷-۹۹۷۵-۱۲۳۴-۵۶۷۸',
              accountHolder: data.accountHolder || 'موسسه آموزشی خاک تا افلاک',
            });
          }
        }
      } catch {
        // fallback to default
      }
    };
    fetchBankInfo();
  }, [isOpen]);

  // بستن با کلید Escape
  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose]);

  // جلوگیری از اسکرول صفحه زیرین
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
      setCreatedRequestData(null);
      setErrorMessage('');
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const formatNumber = (n) => new Intl.NumberFormat('fa-IR').format(n || 0);

  const calculatedToman = shortfallInRial
    ? Math.round(shortfallInRial / 10)
    : shortfallInNoor * 1000;

  const handleCreateTopUp = async () => {
    if (!session?.user?.jwt) {
      setErrorMessage('نشست کاربری شما نامعتبر است. لطفاً مجدداً وارد شوید.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage('');

    try {
      // تعیین آیتم‌های معلق: اگر pendingItems پاس داده شده باشد، ارسال می‌شود؛ در غیر اینصورت از course می‌سازیم
      let resolvedPendingItems = [];
      if (Array.isArray(pendingItems) && pendingItems.length > 0) {
        resolvedPendingItems = pendingItems;
      } else if (course) {
        resolvedPendingItems = [{
          externalCourseId: course.documentId || course.id,
          courseTitle: course.title,
          courseSlug: course.slug,
          priceInNoor: priceInNoor || course.priceInNoor || 0,
        }];
      }

      const result = await createTopUpRequestWithByeMoney({
        amountInNoor: shortfallInNoor,
        pendingItems: resolvedPendingItems,
        pendingPurchaseItem: resolvedPendingItems[0] || null,
        jwt: session.user.jwt,
      });

      if (result.success && result.data) {
        setCreatedRequestData(result.data);

        // ۱. ذخیره کانتکست سبد چندآیتمی در sessionStorage
        const extIds = Array.isArray(cartItems) && cartItems.length > 0
          ? cartItems.map(c => c.documentId || c.externalCourseId || c.id)
          : (course?.documentId ? [course.documentId] : []);

        if (extIds.length > 0) {
          setPendingBasketPurchase({
            externalCourseIds: extIds,
            pendingItems: resolvedPendingItems,
            items: cartItems?.length > 0 ? cartItems : (course ? [course] : []),
            priceInNoor,
            shortfallInNoor,
            shortfallInRial,
            currentBalanceInNoor,
            topUpRequested: true,
            topUpRequestId: result.data.topUpRequestId,
            clientReferenceId: result.data.clientReferenceId,
          });
        }

        // ۲. ذخیره کانتکست تک‌دوره برای سازگاری عقبگرد
        if (course?.documentId) {
          setPendingPurchase(course.documentId, {
            courseSlug: course.slug,
            courseTitle: course.title,
            priceInNoor,
            shortfallInNoor,
            shortfallInRial,
            currentBalanceInNoor,
            topUpRequested: true,
            topUpRequestId: result.data.topUpRequestId,
            clientReferenceId: result.data.clientReferenceId,
          });
        }

        if (onRequestCreated) {
          onRequestCreated(result.data);
        }
      } else {
        setErrorMessage(result.error || 'خطا در ثبت درخواست شارژ.');
      }
    } catch (err) {
      console.error('[ByeMoneyTopUpModal Error]:', err);
      setErrorMessage('خطای غیرمنتظره در ارتباط با سامانه پرداخت.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopyCardNumber = useCallback(async (cardNum) => {
    if (!cardNum) return;
    try {
      const raw = cardNum.replace(/[^0-9]/g, '');
      await navigator.clipboard.writeText(raw);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch {
      // fallback
    }
  }, []);

  if (!isOpen) return null;

  return createPortal(
    <div
      className={styles.overlay}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="byemoney-topup-title"
    >
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        {/* هدر مودال */}
        <div className={styles.header}>
          <div className={styles.headerTitle}>
            <div className={styles.headerIcon}>
              <svg viewBox="0 0 24 24" fill="currentColor">
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
              </svg>
            </div>
            <h2 id="byemoney-topup-title">
              {createdRequestData ? 'مشخصات واریز کارت‌به‌کارت' : 'افزایش موجودی نور و رزرو دوره'}
            </h2>
          </div>
          <button className={styles.closeBtn} onClick={onClose} aria-label="بستن">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className={styles.body}>
          {/* بنر اتصال به دوره معلق یا سبد دوره‌های معلق */}
          {cartItems && cartItems.length > 0 ? (
            <div className={styles.courseNotice}>
              <div className={styles.noticeIcon}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="16" x2="12" y2="12" />
                  <line x1="12" y1="8" x2="12.01" y2="8" />
                </svg>
              </div>
              <div className={styles.noticeText}>
                این شارژ جهت تکمیل خودکار خرید <strong>{cartItems.length} دوره آموزشی</strong> با قیمت قفل‌شده <strong>{formatNumber(priceInNoor)} نور</strong> تنظیم شده است.
              </div>
            </div>
          ) : course ? (
            <div className={styles.courseNotice}>
              <div className={styles.noticeIcon}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="16" x2="12" y2="12" />
                  <line x1="12" y1="8" x2="12.01" y2="8" />
                </svg>
              </div>
              <div className={styles.noticeText}>
                این شارژ جهت تکمیل خودکار خرید دوره <strong>«{course.title}»</strong> با قیمت قفل‌شده <strong>{formatNumber(priceInNoor)} نور</strong> تنظیم شده است.
              </div>
            </div>
          ) : null}

          {/* حالت ۱: قبل از ثبت درخواست (خلاصه ارقام و تایید) */}
          {!createdRequestData && (
            <>
              <div className={styles.amountSummaryCard}>
                <div className={styles.summaryRow}>
                  <span>موجودی فعلی شما:</span>
                  <span className={styles.summaryValue}>{formatNumber(currentBalanceInNoor)} نور</span>
                </div>
                <div className={styles.summaryRow}>
                  <span>{cartItems?.length > 1 ? 'مجموع قیمت دوره‌ها:' : 'قیمت نهایی دوره:'}</span>
                  <span className={styles.summaryValue}>{formatNumber(priceInNoor)} نور</span>
                </div>
                <div className={styles.summaryRow}>
                  <span className={styles.highlightShortfall}>کسری دقیق برای واریز:</span>
                  <span className={`${styles.summaryValue} ${styles.highlightShortfall}`}>
                    {formatNumber(shortfallInNoor)} نور ({formatNumber(calculatedToman)} تومان)
                  </span>
                </div>
              </div>

              <p className={styles.instructionsNote}>
                پس از کلیک روی دکمه زیر، مشخصات حساب بانکی جهت واریز کارت‌به‌کارت نمایش داده می‌شود و این سبد به عنوان خرید در صف شما قفل خواهد شد.
              </p>

              {errorMessage && (
                <div className={styles.errorBox} role="alert">
                  {errorMessage}
                </div>
              )}

              <div className={styles.actions}>
                <button
                  type="button"
                  className={styles.secondaryBtn}
                  onClick={onClose}
                  disabled={isSubmitting}
                >
                  انصراف
                </button>
                <button
                  type="button"
                  className={styles.primaryBtn}
                  onClick={handleCreateTopUp}
                  disabled={isSubmitting || shortfallInNoor <= 0}
                >
                  {isSubmitting ? (
                    <>
                      <span className={styles.spinner} />
                      <span>در حال ثبت درخواست...</span>
                    </>
                  ) : (
                    <>
                      <span>ثبت درخواست و دریافت شماره کارت</span>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="9 18 15 12 9 6" />
                      </svg>
                    </>
                  )}
                </button>
              </div>
            </>
          )}

          {/* حالت ۲: پس از ثبت درخواست (نمایش کارت بانکی و اطلاعات واریز) */}
          {createdRequestData && (
            <>
              <div className={styles.bankCardSection}>
                <div className={styles.bankHeader}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="2" y="5" width="20" height="14" rx="2" />
                    <line x1="2" y1="10" x2="22" y2="10" />
                  </svg>
                  <span>اطلاعات کارت جهت واریز</span>
                </div>

                {createdRequestData.clientReferenceId && (
                  <div className={styles.bankRow}>
                    <span className={styles.label}>کد پیگیری درخواست:</span>
                    <span className={styles.value} style={{ fontFamily: 'monospace', letterSpacing: '1px', color: '#ffd15c' }}>
                      {createdRequestData.clientReferenceId}
                    </span>
                  </div>
                )}

                <div className={styles.bankRow}>
                  <span className={styles.label}>بانک مقصد:</span>
                  <span className={styles.value}>{bankInfo?.bankName || createdRequestData.bankInfo?.bankName || 'بانک ملی ایران'}</span>
                </div>

                <div className={styles.bankRow}>
                  <span className={styles.label}>صاحب حساب:</span>
                  <span className={styles.value}>{bankInfo?.accountHolder || createdRequestData.bankInfo?.accountHolder || 'موسسه خاک تا افلاک'}</span>
                </div>

                <div className={styles.bankRow}>
                  <span className={styles.label}>مبلغ واریز:</span>
                  <span className={styles.value}>
                    {formatNumber(createdRequestData.amountInToman || calculatedToman)} تومان ({formatNumber(shortfallInNoor)} نور)
                  </span>
                </div>

                <div className={styles.cardNumberRow}>
                  <span className={styles.cardNumber}>
                    {bankInfo?.cardNumber || createdRequestData.bankInfo?.cardNumber || '۶۰۳۷-۹۹۷۵-۱۲۳۴-۵۶۷۸'}
                  </span>
                  <button
                    type="button"
                    className={`${styles.copyBtn} ${isCopied ? styles.copied : ''}`}
                    onClick={() => handleCopyCardNumber(bankInfo?.cardNumber || createdRequestData.bankInfo?.cardNumber || '6037997512345678')}
                  >
                    {isCopied ? 'کپی شد!' : 'کپی کارت'}
                  </button>
                </div>
              </div>

              <div className={styles.successNote}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                  <polyline points="22 4 12 14.01 9 11.01" />
                </svg>
                <span>
                  درخواست شما با کد پیگیری <strong>{createdRequestData.clientReferenceId || createdRequestData.topUpRequestId}</strong> ثبت شد. به محض تایید واریز کارت‌به‌کارت توسط ادمین، {cartItems?.length > 1 ? 'سبد دوره‌های قفل‌شده' : 'دوره قفل‌شده'} به صورت خودکار برای شما خریداری و فعال خواهد شد.
                </span>
              </div>

              <div className={styles.actions}>
                <button
                  type="button"
                  className={styles.primaryBtn}
                  onClick={onClose}
                >
                  {cartItems?.length > 1 ? 'متوجه شدم و بازگشت به تسویه‌حساب' : 'متوجه شدم و بازگشت'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
