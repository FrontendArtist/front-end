'use client';

/**
 * @file src/components/admin/Users/AdminNoorGiftModal/AdminNoorGiftModal.jsx
 * @description مودال مستقل هدیه نور (تکی و گروهی) در پنل مدیریت
 *
 * مشخصات:
 * - کاملاً مجزا از مودال شارژ کارت‌به‌کارت
 * - تک‌مرحله‌ای همراه با پیش‌نمایش زنده جمع کل و مبلغ به حروف
 * - شناسه کاربران صرفاً documentId
 * - سقف حداکثر ۱۰۰ کاربر با اعمال قفل درون مودال
 * - تبدیل ارقام فارسی/عربی به لاتین و اعتبارسنجی عدد صحیح مثبت
 * - ثبات Idempotency-Key فقط در تلاش مجدد عین همان درخواست و نوسازی آن با تغییر محتوا
 * - مدیریت خطای ۴۰۰ با invalidUsers و دکمه حذف دسته‌جمعی کاربران نامعتبر
 * - مدیریت شفاف خطای ۴۰۹ (تداخل کلید) و ۴۰۳ (عدم مجوز Noor.Gift)
 * - تفکیک کد پیگیری دسته در خروجی موفقیت همراه با کپی آسان
 * - نمایش نام و نام خانوادگی به جای شناسه خارجی در جدول خروجی
 * - فارسی‌سازی وضعیت اعطا
 */

import { useState, useRef, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useSession } from 'next-auth/react';
import { Gift, X, AlertCircle, CheckCircle2, AlertTriangle, Copy, Check } from 'lucide-react';
import { sendNoorGiftWithByeMoney } from '@/lib/byeMoneyApi';
import { numberToPersianWords } from '@/utils/numberToPersianWords';
import AdminBadge from '@/components/admin/Shared/AdminBadge';
import styles from './AdminNoorGiftModal.module.scss';

export default function AdminNoorGiftModal({
  users = [],
  onClose,
  onSuccess,
}) {
  const { data: session } = useSession();
  const [mounted, setMounted] = useState(false);

  // پالایش اولیه: فقط کاربرانی که documentId دارند مجاز هستند
  const initialValidUsers = useMemo(() => {
    const list = Array.isArray(users) ? users : [users];
    return list.filter((u) => Boolean(u && u.documentId));
  }, [users]);

  const [currentUsers, setCurrentUsers] = useState(initialValidUsers);
  const [amountNoor, setAmountNoor] = useState('');
  const [reason, setReason] = useState('');
  const [step, setStep] = useState('form'); // 'form' | 'success'
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [invalidUsers, setInvalidUsers] = useState([]);
  const [resultData, setResultData] = useState(null);
  const [copiedBatchId, setCopiedBatchId] = useState(false);

  const idempotencyKeyRef = useRef(null);
  const lastSentPayloadRef = useRef(null);

  const generateKey = () =>
    typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : `idemp-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

  // تولید کلید اولیه هنگام باز شدن مودال
  useEffect(() => {
    setMounted(true);
    idempotencyKeyRef.current = generateKey();
    lastSentPayloadRef.current = null;
  }, []);

  // قفل اسکرول بدنه
  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, []);

  // بستن با Escape
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && !loading) {
        onClose?.();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [loading, onClose]);

  // تبدیل ارقام فارسی و عربی به لاتین و فیلتر فقط عدد
  const handleAmountChange = (e) => {
    const raw = e.target.value;
    const latin = raw
      .replace(/[۰-۹]/g, (d) => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d))
      .replace(/[٠-٩]/g, (d) => '٠١٢٣٤٥٦٧٨٩'.indexOf(d))
      .replace(/\D/g, '');
    setAmountNoor(latin);
  };

  const handleRemoveUser = (docId) => {
    setCurrentUsers((prev) => prev.filter((u) => u.documentId !== docId));
  };

  const handleRemoveInvalidUsers = () => {
    if (!invalidUsers.length) return;
    const invalidDocIds = new Set(invalidUsers.map((u) => u.externalUserId));
    setCurrentUsers((prev) => prev.filter((u) => !invalidDocIds.has(u.documentId)));
    setInvalidUsers([]);
    setError(null);
  };

  const numericAmount = Number(amountNoor);
  const isAmountValid = Number.isInteger(numericAmount) && numericAmount > 0;
  const isReasonValid = Boolean(reason.trim());
  const isOverLimit = currentUsers.length > 100;
  const hasUsers = currentUsers.length > 0;
  const totalGiftNoor = isAmountValid ? currentUsers.length * numericAmount : 0;
  const wordsAmount = isAmountValid ? numberToPersianWords(numericAmount) : '';

  const invalidDocIdSet = useMemo(
    () => new Set(invalidUsers.map((u) => u.externalUserId)),
    [invalidUsers]
  );

  const handleFinalSubmit = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    setError(null);
    setInvalidUsers([]);

    if (!hasUsers) {
      setError('هیچ کاربری با شناسه معتبر برای دریافت هدیه انتخاب نشده است.');
      return;
    }
    if (isOverLimit) {
      setError(`تعداد کاربران (${currentUsers.length}) بیشتر از سقف مجاز ۱۰۰ نفر است. لطفاً تعداد را کاهش دهید.`);
      return;
    }
    if (!isAmountValid) {
      setError('مقدار نور باید یک عدد صحیح مثبت باشد.');
      return;
    }
    if (!isReasonValid) {
      setError('علت ثبت هدیه اجباری است.');
      return;
    }

    const jwt = session?.user?.jwt;
    if (!jwt) {
      setError('نشست کاربری شما نامعتبر یا منقضی شده است. لطفاً مجدداً وارد شوید.');
      return;
    }

    const cleanReason = reason.trim();
    const targetDocIds = currentUsers.map((u) => u.documentId).filter(Boolean);

    // محاسبه اثر انگشت پارامترهای ارسالی
    const currentPayloadSignature = JSON.stringify({
      userIds: [...targetDocIds].sort(),
      amount: numericAmount,
      reason: cleanReason,
    });

    // قانون Idempotency-Key
    let keyToUse = idempotencyKeyRef.current;
    if (!keyToUse || lastSentPayloadRef.current !== currentPayloadSignature) {
      keyToUse = generateKey();
      idempotencyKeyRef.current = keyToUse;
      lastSentPayloadRef.current = currentPayloadSignature;
    }

    setLoading(true);

    try {
      const res = await sendNoorGiftWithByeMoney({
        externalUserIds: targetDocIds,
        amountNoor: numericAmount,
        reason: cleanReason,
        idempotencyKey: keyToUse,
        jwt,
      });

      if (!res.success) {
        if (res.status === 409) {
          setError('درخواستی با همین کلید ولی محتوای متفاوت ثبت شده است؛ لطفاً فرم را دوباره باز کنید.');
          return;
        }

        if (res.status === 400 && Array.isArray(res.invalidUsers) && res.invalidUsers.length > 0) {
          setInvalidUsers(res.invalidUsers);
          setError('یک یا چند کاربر نامعتبر هستند. هیچ هدیه‌ای ثبت نشد؛ می‌توانید کاربران مشکل‌دار را حذف و دوباره تلاش کنید.');
          return;
        }

        setError(res.error || 'خطا در ثبت هدیه نور در سامانه بای‌مانی.');
        return;
      }

      // موفقیت کامل
      setResultData(res.data);
      setStep('success');
      onSuccess?.(res.data);
    } catch (err) {
      setError('خطای غیرمنتظره در برقراری ارتباط با سرور.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyBatchId = () => {
    if (resultData?.batchId && typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(resultData.batchId);
      setCopiedBatchId(true);
      setTimeout(() => setCopiedBatchId(false), 2500);
    }
  };

  if (!mounted) return null;

  return createPortal(
    <div
      className={styles.backdrop}
      onClick={(e) => {
        if (e.target === e.currentTarget && !loading) {
          onClose?.();
        }
      }}
    >
      <div className={styles.modal} role="dialog" aria-modal="true">
        {/* Header */}
        <div className={styles.header}>
          <div className={styles.header__titleWrap}>
            <div className={styles.header__icon}>
              <Gift size={20} />
            </div>
            <h2 className={styles.header__title}>
              {step === 'success' ? 'نتیجه ثبت هدیه نور' : 'هدیه نور به کاربران'}
            </h2>
          </div>
          <button
            type="button"
            className={styles.header__closeBtn}
            onClick={onClose}
            disabled={loading}
            aria-label="بستن"
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className={styles.body}>
          {error && (
            <div className={`${styles.alertBox} ${styles['alertBox--error']}`}>
              <AlertCircle size={18} style={{ flexShrink: 0 }} />
              <div>{error}</div>
            </div>
          )}

          {/* فرم ثبت هدیه */}
          {step === 'form' && (
            <>
              {isOverLimit && (
                <div className={`${styles.alertBox} ${styles['alertBox--warning']}`}>
                  <AlertTriangle size={18} style={{ flexShrink: 0 }} />
                  <div>
                    تعداد کاربران انتخاب‌شده ({new Intl.NumberFormat('fa-IR').format(currentUsers.length)} نفر) بیشتر از سقف مجاز ۱۰۰ نفر است. لطفاً تعدادی از کاربران را حذف کنید.
                  </div>
                </div>
              )}

              {/* بخش خطای ۴۰۰ با invalidUsers */}
              {invalidUsers.length > 0 && (
                <div className={styles.invalidNotice}>
                  <div className={styles.invalidNotice__title}>
                    هیچ هدیه‌ای ثبت نشد. کاربران زیر دارای اشکال هستند:
                  </div>
                  <ul className={styles.invalidNotice__list}>
                    {invalidUsers.map((iu, idx) => (
                      <li key={idx}>
                        شناسه: {iu.externalUserId} — {iu.reason || 'نامعتبر'}
                      </li>
                    ))}
                  </ul>
                  <button
                    type="button"
                    className={styles.invalidNotice__cleanBtn}
                    onClick={handleRemoveInvalidUsers}
                  >
                    حذف کاربران مشکل‌دار ({invalidUsers.length}) از انتخاب و تلاش مجدد
                  </button>
                </div>
              )}

              {/* لیست کاربران انتخاب‌شده */}
              <div className={styles.recipientsBox}>
                <div className={styles.recipientsBox__header}>
                  <span>دریافت‌کنندگان هدیه:</span>
                  <span className={styles.recipientsBox__count}>
                    {new Intl.NumberFormat('fa-IR').format(currentUsers.length)} کاربر
                  </span>
                </div>
                <div className={styles.recipientsBox__list}>
                  {currentUsers.map((user) => {
                    const isInvalid = invalidDocIdSet.has(user.documentId);
                    const displayName = [user.firstName, user.lastName].filter(Boolean).join(' ') || user.username || user.documentId;
                    return (
                      <span
                        key={user.documentId}
                        className={`${styles.recipientsBox__tag} ${isInvalid ? styles['recipientsBox__tag--invalid'] : ''}`}
                        title={user.username ? `@${user.username}` : user.documentId}
                      >
                        {displayName}
                        <button
                          type="button"
                          className={styles.recipientsBox__removeTagBtn}
                          onClick={() => handleRemoveUser(user.documentId)}
                          title="حذف از این لیست"
                          disabled={loading}
                        >
                          <X size={12} />
                        </button>
                      </span>
                    );
                  })}
                  {!hasUsers && (
                    <span style={{ fontSize: 'var(--font-xs)', color: 'var(--color-text-secondary)' }}>
                      هیچ کاربری با شناسه معتبر در لیست وجود ندارد.
                    </span>
                  )}
                </div>
              </div>

              {/* فیلد مقدار نور */}
              <div className={styles.field}>
                <label className={styles.field__label} htmlFor="gift-amount-input">
                  مقدار نور برای هر کاربر <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input
                  id="gift-amount-input"
                  type="text"
                  inputMode="numeric"
                  className={styles.field__input}
                  placeholder="مثال: ۵۰"
                  value={amountNoor}
                  onChange={handleAmountChange}
                  disabled={loading}
                />
                {isAmountValid && wordsAmount && (
                  <div className={styles.amountWords}>
                    به حروف: {wordsAmount} نور
                  </div>
                )}
              </div>

              {/* فیلد علت هدیه */}
              <div className={styles.field}>
                <label className={styles.field__label} htmlFor="gift-reason-input">
                  علت ثبت هدیه <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <textarea
                  id="gift-reason-input"
                  className={styles.field__textarea}
                  placeholder="علت هدیه را شرح دهید (مثلاً: مناسبت عید، تشویقی، پاداش فعالیت و...)"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  disabled={loading}
                />
              </div>

              {/* پیش‌نمایش زنده محاسبه جمع کل در فرم */}
              {hasUsers && isAmountValid && (
                <div className={styles.liveSummaryCard}>
                  <div className={styles.liveSummaryCard__row}>
                    <span>تعداد دریافت‌کنندگان:</span>
                    <span>{new Intl.NumberFormat('fa-IR').format(currentUsers.length)} کاربر</span>
                  </div>
                  <div className={styles.liveSummaryCard__row}>
                    <span>مقدار نور به ازای هر کاربر:</span>
                    <span>
                      {new Intl.NumberFormat('fa-IR').format(numericAmount)} نور {wordsAmount ? `(${wordsAmount})` : ''}
                    </span>
                  </div>
                  <div className={`${styles.liveSummaryCard__row} ${styles.liveSummaryCard__total}`}>
                    <span>جمع کل نور اهدایی:</span>
                    <span>{new Intl.NumberFormat('fa-IR').format(totalGiftNoor)} نور</span>
                  </div>
                </div>
              )}
            </>
          )}

          {/* مرحله نتیجه ثبت هدیه */}
          {step === 'success' && resultData && (
            <>
              <div className={`${styles.alertBox} ${styles['alertBox--success']}`}>
                <CheckCircle2 size={18} style={{ flexShrink: 0 }} />
                <div>هدیه نور با موفقیت به کاربران اعطا شد.</div>
              </div>

              {resultData.batchId && (
                <div className={styles.batchTrackingBox}>
                  <div className={styles.batchTrackingBox__info}>
                    <span className={styles.batchTrackingBox__label}>کد پیگیری دسته:</span>
                    <span className={styles.batchTrackingBox__code} title={resultData.batchId}>
                      {resultData.batchId}
                    </span>
                  </div>
                  <button
                    type="button"
                    className={styles.batchTrackingBox__copyBtn}
                    onClick={handleCopyBatchId}
                    title="کپی شناسه دسته"
                  >
                    {copiedBatchId ? <Check size={14} color="#10b981" /> : <Copy size={14} />}
                    {copiedBatchId ? 'کپی شد' : 'کپی شناسه'}
                  </button>
                </div>
              )}

              <div className={styles.confirmSummary}>
                <div className={styles.confirmSummary__row}>
                  <span>تعداد کل دریافت‌کنندگان:</span>
                  <span className={styles.confirmSummary__value}>
                    {new Intl.NumberFormat('fa-IR').format(resultData.totalRecipients || currentUsers.length)} نفر
                  </span>
                </div>
                <div className={styles.confirmSummary__row}>
                  <span>جمع کل نور اعطا شده:</span>
                  <span className={styles.confirmSummary__value}>
                    {new Intl.NumberFormat('fa-IR').format(resultData.totalAmountNoor || totalGiftNoor)} نور
                  </span>
                </div>
              </div>

              {Array.isArray(resultData.recipients) && resultData.recipients.length > 0 && (
                <div className={styles.resultsTableWrap}>
                  <table className={styles.resultsTable}>
                    <thead>
                      <tr>
                        <th>کاربر</th>
                        <th>وضعیت</th>
                        <th>موجودی هدیه جدید</th>
                      </tr>
                    </thead>
                    <tbody>
                      {resultData.recipients.map((r, idx) => {
                        const targetUser = currentUsers.find((u) => u.documentId === r.externalUserId);
                        const fullName = [targetUser?.firstName, targetUser?.lastName].filter(Boolean).join(' ');
                        const displayName = fullName || targetUser?.username || r.externalUserId;
                        const subText = fullName ? (targetUser?.username ? `@${targetUser.username}` : null) : (targetUser?.username !== r.externalUserId ? r.externalUserId : null);

                        return (
                          <tr key={r.externalUserId || idx}>
                            <td>
                              <div className={styles.userCellName}>{displayName}</div>
                              {subText && <div className={styles.userCellSub}>{subText}</div>}
                            </td>
                            <td>
                              <AdminBadge status={r.status || 'granted'} />
                            </td>
                            <td>
                              {r.newGiftBalance !== undefined && r.newGiftBalance !== null
                                ? `${new Intl.NumberFormat('fa-IR').format(r.newGiftBalance)} نور`
                                : 'نامشخص'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className={styles.footer}>
          {step === 'form' && (
            <>
              <button
                type="button"
                className={styles.btnSecondary}
                onClick={onClose}
                disabled={loading}
              >
                انصراف
              </button>
              <button
                type="button"
                className={styles.btnPrimary}
                onClick={handleFinalSubmit}
                disabled={loading || !hasUsers || isOverLimit || !isAmountValid || !isReasonValid}
              >
                {loading ? 'در حال ارسال هدیه...' : 'تأیید و ارسال هدیه'}
              </button>
            </>
          )}

          {step === 'success' && (
            <button
              type="button"
              className={styles.btnPrimary}
              onClick={onClose}
            >
              بستن
            </button>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
