'use client';

/**
 * @file src/components/admin/Users/AdminAssistedTopUpModal/AdminAssistedTopUpModal.jsx
 * @description پاپ‌آپ ثبت شارژ کارت‌به‌کارت توسط ادمین به‌نیابت از یک کاربر مشخص (کاربر ناتوان)
 *
 * مشخصات:
 * - کاربر ذینفع: فقط نمایشی (از context ردیف جدول)
 * - فیلد مبلغ ریالی
 * - آپلود تصویر رسید/فیش: اجباری (بدون امکان ثبت بدون آن)
 * - شناسه تراکنش خارجی: اختیاری
 * - اتصال مستقیم به اندپوینت ByeMoney: POST /api/admin/topups/assisted (بدون نیاز به تایید دوم)
 */

import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useSession } from 'next-auth/react';
import { CreditCard, UploadCloud, Trash2, X, AlertCircle, CheckCircle2 } from 'lucide-react';
import { createAdminAssistedTopUpWithByeMoney, getConversionRateWithByeMoney } from '@/lib/byeMoneyApi';
import styles from './AdminAssistedTopUpModal.module.scss';

export default function AdminAssistedTopUpModal({ user, conversionRate: initialConversionRate, onClose, onSuccess }) {
  const { data: session } = useSession();
  const fileInputRef = useRef(null);

  const [mounted, setMounted] = useState(false);
  const [amountRial, setAmountRial] = useState('');
  const [conversionRate, setConversionRate] = useState(initialConversionRate || 0);
  const [rateLoading, setRateLoading] = useState(!initialConversionRate);
  const [rateError, setRateError] = useState(null);
  const [receiptFile, setReceiptFile] = useState(null);
  const [receiptPreview, setReceiptPreview] = useState(null);
  const [externalTransactionId, setExternalTransactionId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // قفل اسکرول پس‌زمینه هنگام باز بودن مودال
  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, []);

  // بستن مودال با کلید Escape
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && !loading) {
        onClose?.();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [loading, onClose]);

  // استعلام نرخ تبدیل رسمی مستقیماً از دیتابیس ByeMoney
  useEffect(() => {
    let isMounted = true;
    if (!initialConversionRate || initialConversionRate <= 0) {
      setRateLoading(true);
      getConversionRateWithByeMoney({ jwt: session?.user?.jwt })
        .then((res) => {
          if (!isMounted) return;
          if (res.success && res.rialPerNoor > 0) {
            setConversionRate(res.rialPerNoor);
            setRateError(null);
          } else {
            setRateError(res.error || 'خطا در واکشی نرخ رسمی از پایگاه داده بای‌مانی.');
          }
        })
        .catch((err) => {
          if (isMounted) setRateError(err.message || 'خطا در ارتباط با سرور مالی.');
        })
        .finally(() => {
          if (isMounted) setRateLoading(false);
        });
    } else {
      setConversionRate(initialConversionRate);
      setRateLoading(false);
      setRateError(null);
    }
    return () => {
      isMounted = false;
    };
  }, [initialConversionRate, session?.user?.jwt]);

  const rawAmount = Number(amountRial);
  const amountToman = rawAmount > 0 ? Math.floor(rawAmount / 10) : 0;
  const estimatedNoor = rawAmount > 0 && conversionRate > 0 ? rawAmount / conversionRate : 0;
  const formattedNoor = Number.isInteger(estimatedNoor)
    ? new Intl.NumberFormat('fa-IR').format(estimatedNoor)
    : new Intl.NumberFormat('fa-IR', { maximumFractionDigits: 4 }).format(estimatedNoor);

  if (!mounted || !user) return null;

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('فرمت فایل نامعتبر است. لطفاً یک تصویر (JPG, PNG, WebP) انتخاب کنید.');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setError('حجم تصویر فیش نباید بیشتر از ۱۰ مگابایت باشد.');
      return;
    }

    setError(null);
    setReceiptFile(file);

    const reader = new FileReader();
    reader.onload = (ev) => {
      setReceiptPreview(ev.target.result);
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveReceipt = () => {
    setReceiptFile(null);
    setReceiptPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (!rawAmount || rawAmount <= 0) {
      setError('لطفاً مبلغ ریالی معتبر وارد کنید.');
      return;
    }

    if (!conversionRate || conversionRate <= 0) {
      setError('نرخ رسمی تبدیل ریال به نور از پایگاه داده دریافت نشده است. ثبت عملیات غیرمجاز است.');
      return;
    }

    if (!receiptFile) {
      setError('آپلود تصویر رسید/فیش واریزی الزامی است.');
      return;
    }

    const jwt = session?.user?.jwt;
    if (!jwt) {
      setError('نشست کاربری شما نامعتبر یا منقضی شده است. لطفاً مجدداً وارد شوید.');
      return;
    }

    setLoading(true);

    try {
      const beneficiaryExternalUserId = user.documentId || String(user.id);

      const res = await createAdminAssistedTopUpWithByeMoney({
        beneficiaryExternalUserId,
        amountRial: rawAmount,
        receipt: receiptFile,
        externalTransactionId: externalTransactionId.trim() || undefined,
        jwt,
      });

      if (!res.success) {
        throw new Error(res.error || 'خطا در ثبت شارژ در سامانه مالی بای‌مانی.');
      }

      if (onSuccess) {
        onSuccess({
          user,
          amountNoor: res.data?.amountNoor || estimatedNoor,
          clientReferenceId: res.data?.clientReferenceId,
          topUpRequestId: res.data?.topUpRequestId,
        });
      }

      onClose();
    } catch (err) {
      console.error('[AdminAssistedTopUpModal] Error:', err);
      setError(err.message || 'خطای غیرمنتظره در ثبت شارژ کارت‌به‌کارت.');
    } finally {
      setLoading(false);
    }
  };

  const modalContent = (
    <div className={styles.backdrop} onClick={onClose} role="dialog" aria-modal="true">
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        {/* سرصفحه */}
        <div className={styles.header}>
          <div className={styles.header__titleWrap}>
            <div className={styles.header__icon}>
              <CreditCard size={20} />
            </div>
            <h2 className={styles.header__title}>ثبت شارژ کارت‌به‌کارت به‌نیابت از کاربر</h2>
          </div>
          <button className={styles.header__closeBtn} onClick={onClose} aria-label="بستن">
            <X size={18} />
          </button>
        </div>

        {/* فرم */}
        <form onSubmit={handleSubmit}>
          <div className={styles.body}>
            {/* ۱. کانتکست کاربر ذینفع (فقط نمایشی) */}
            <div className={styles.beneficiaryCard}>
              <span className={styles.beneficiaryCard__label}>کاربر ذینفع (دریافت‌کننده شارژ):</span>
              <div className={styles.beneficiaryCard__row}>
                <span className={styles.beneficiaryCard__name}>
                  {user.fullName || (user.firstName || user.lastName ? `${user.firstName || ''} ${user.lastName || ''}`.trim() : user.username)}
                </span>
                <span className={styles.beneficiaryCard__phone}>
                  {user.phoneNumber || 'شماره موبایل ثبت نشده'}
                </span>
              </div>
              <div className={styles.beneficiaryCard__id}>
                شناسه: {user.documentId || user.id}
              </div>
            </div>

            {/* ۲. مبلغ به ریال */}
            <div className={styles.formGroup}>
              <label className={styles.formGroup__label}>
                مبلغ شارژ (ریال) <span className={styles.formGroup__required}>*</span>
              </label>
              <input
                type="number"
                min="10000"
                step="10000"
                value={amountRial}
                onChange={(e) => {
                  setAmountRial(e.target.value);
                  setError(null);
                }}
                placeholder="مثال: 50000000"
                dir="ltr"
                required
                className={styles.formGroup__input}
              />
              {rawAmount > 0 && (
                <div className={styles.formGroup__hint}>
                  مبلغ ورودی: <strong>{new Intl.NumberFormat('fa-IR').format(rawAmount)} ریال</strong> ({new Intl.NumberFormat('fa-IR').format(amountToman)} تومان) — معادل <strong>{formattedNoor} نور</strong> (بر پایه هر نور = {new Intl.NumberFormat('fa-IR').format(conversionRate)} ریال)
                </div>
              )}
            </div>

            {/* ۳. آپلود رسید/فیش واریزی (اجباری) */}
            <div className={styles.formGroup}>
              <label className={styles.formGroup__label}>
                تصویر رسید / فیش واریزی <span className={styles.formGroup__required}>* (الزامی)</span>
              </label>

              {receiptPreview ? (
                <div className={styles.previewContainer}>
                  <img src={receiptPreview} alt="رسید واریزی" className={styles.previewContainer__img} />
                  <button
                    type="button"
                    onClick={handleRemoveReceipt}
                    className={styles.previewContainer__removeBtn}
                    title="حذف و انتخاب مجدد"
                  >
                    <Trash2 size={14} />
                    حذف فیش
                  </button>
                </div>
              ) : (
                <div className={styles.uploadArea} onClick={() => fileInputRef.current?.click()}>
                  <UploadCloud size={32} className={styles.uploadArea__icon} />
                  <div className={styles.uploadArea__text}>برای انتخاب فیش کلیک کنید</div>
                  <div className={styles.uploadArea__subtext}>
                    فرمت‌های مجاز: JPG, PNG, WebP (حداکثر ۱۰ مگابایت)
                  </div>
                </div>
              )}

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                onChange={handleFileChange}
              />
            </div>

            {/* ۴. شناسه تراکنش خارجی (اختیاری) */}
            <div className={styles.formGroup}>
              <label className={styles.formGroup__label}>
                شناسه تراکنش خارجی / شماره پیگیری بانکی (اختیاری)
              </label>
              <input
                type="text"
                value={externalTransactionId}
                onChange={(e) => setExternalTransactionId(e.target.value)}
                placeholder="مثال: TRX-9842104"
                dir="ltr"
                className={styles.formGroup__input}
              />
            </div>

            {/* وضعیت نرخ تبدیل بای‌مانی */}
            {rateLoading && (
              <div className={styles.rateNotice}>
                <AlertCircle size={16} />
                <span>در حال دریافت نرخ رسمی تبدیل از پایگاه داده سامانه مالی...</span>
              </div>
            )}
            {rateError && (
              <div className={styles.errorBanner}>
                <AlertCircle size={18} />
                <span>{rateError} (عملیات شارژ تا دریافت نرخ موثق غیرفعال است)</span>
              </div>
            )}

            {/* پیام خطا */}
            {error && (
              <div className={styles.errorBanner}>
                <AlertCircle size={18} />
                <span>{error}</span>
              </div>
            )}
          </div>

          {/* پاورقی و دکمه‌ها */}
          <div className={styles.footer}>
            <button
              type="button"
              className={styles.footer__cancelBtn}
              onClick={onClose}
              disabled={loading}
            >
              انصراف
            </button>
            <button
              type="submit"
              className={styles.footer__submitBtn}
              disabled={loading || rateLoading || !!rateError || !conversionRate || conversionRate <= 0 || !rawAmount || rawAmount <= 0 || !receiptFile}
            >
              {loading ? (
                'در حال ثبت در بای‌مانی...'
              ) : (
                <>
                  <CheckCircle2 size={18} />
                  ثبت و اعمال شارژ
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
