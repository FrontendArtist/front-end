'use client';

/**
 * src/components/profile/OrderReceiptUpload.jsx
 * ─────────────────────────────────────────────────────────────────────────────
 * کامپوننت کلاینت برای آپلود فیش پرداخت کارت‌به‌کارت.
 *
 * ورودی‌ها (Props):
 *  - orderId      {string}  Strapi v5 documentId سفارش
 *  - bankInfo     {object}  اطلاعات بانکی فروشگاه { bankName, cardNumber, accountHolder }
 *                           اگر null باشد، کامپوننت اطلاعات را خودش از API می‌خواند.
 *  - onSuccess    {fn}      callback پس از ثبت موفق فیش
 *
 * جریان داده:
 *  1. اطلاعات کارت بانکی از Strapi Single Type «bank-setting» نمایش داده می‌شود.
 *  2. کاربر تصویر فیش، شماره پیگیری و نام صاحب کارت را وارد می‌کند.
 *  3. اعتبارسنجی کلاینت (نوع فایل، حجم کمتر از 5MB، فیلدهای خالی).
 *  4. FormData به /api/orders/upload-receipt (API Proxy سرور) ارسال می‌شود.
 *  5. Proxy سرور توکن Strapi را به‌صورت امن استفاده کرده و نتیجه را برمی‌گرداند.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import styles from './OrderReceiptUpload.module.scss';

// ─── ثابت‌ها ──────────────────────────────────────────────────────────────────
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 مگابایت
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

// ─── آیکون‌های SVG inline (بدون نیاز به external library) ────────────────────
const IconBank = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
        stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="10" width="18" height="11" rx="2" />
        <path d="M3 10l9-7 9 7" />
        <line x1="12" y1="10" x2="12" y2="21" />
    </svg>
);

const IconUpload = () => (
    <svg width="40" height="40" viewBox="0 0 24 24" fill="none"
        stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
        <polyline points="17 8 12 3 7 8" />
        <line x1="12" y1="3" x2="12" y2="15" />
    </svg>
);

const IconCheck = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
        stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="20 6 9 17 4 12" />
    </svg>
);

const IconFile = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
        stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M13 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V9z" />
        <polyline points="13 2 13 9 20 9" />
    </svg>
);

const IconCopy = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
        stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="9" y="9" width="13" height="13" rx="2" />
        <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
    </svg>
);

const IconAlert = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
        stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="8" x2="12" y2="12" />
        <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
);

const IconSuccess = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
        stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 11.08V12a10 10 0 11-5.93-9.14" />
        <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
);

// ─── Sub-component: بج وضعیت پرداخت ─────────────────────────────────────────
const PaymentStatusBadge = ({ status }) => {
    const map = {
        pending_payment: { label: 'در انتظار پرداخت', cls: styles.badgeWarning },
        pending_verification: { label: 'در انتظار تأیید', cls: styles.badgePending },
        paid: { label: 'پرداخت تأیید شد', cls: styles.badgeSuccess },
        failed: { label: 'پرداخت ناموفق', cls: styles.badgeDanger },
    };
    const { label, cls } = map[status] ?? { label: status || 'نامشخص', cls: styles.badgeDefault };
    return <span className={`${styles.statusBadge} ${cls}`}>{label}</span>;
};

// ─── کامپوننت اصلی ────────────────────────────────────────────────────────────
export default function OrderReceiptUpload({ orderId, bankInfo: bankInfoProp = null, onSuccess }) {

    // ── State ──────────────────────────────────────────────────────────────────
    const [bankInfo, setBankInfo] = useState(bankInfoProp);   // اطلاعات کارت بانکی
    const [isBankLoading, setIsBankLoading] = useState(!bankInfoProp);  // لودینگ اطلاعات بانک
    const [bankError, setBankError] = useState(null);           // خطای دریافت اطلاعات بانک

    const [file, setFile] = useState(null);           // فایل تصویر انتخاب‌شده
    const [trackingNumber, setTrackingNumber] = useState('');           // کد پیگیری بانکی
    const [cardHolderName, setCardHolderName] = useState('');           // نام صاحب کارت

    const [isDragOver, setIsDragOver] = useState(false);          // حالت Drag روی dropzone
    const [isCopied, setIsCopied] = useState(false);          // حالت کپی شماره کارت
    const [isSubmitting, setIsSubmitting] = useState(false);          // حالت لودینگ دکمه ارسال
    const [errorMessage, setErrorMessage] = useState(null);           // خطای اعتبارسنجی / سرور
    const [successMessage, setSuccessMessage] = useState(null);         // پیام موفقیت
    const [isSubmitted, setIsSubmitted] = useState(false);          // آیا فرم قبلاً ارسال شده؟

    const fileInputRef = useRef(null);

    // ── دریافت اطلاعات بانکی از Strapi (در صورتی که از طریق prop داده نشده) ──
    useEffect(() => {
        // اگر bankInfo از طریق prop ارسال شده، نیازی به fetch نیست
        if (bankInfoProp) {
            setBankInfo(bankInfoProp);
            setIsBankLoading(false);
            return;
        }

        const fetchBankInfo = async () => {
            setIsBankLoading(true);
            setBankError(null);
            try {
                // این endpoint به /api/bank-settings در Next.js اشاره می‌کند
                // که یک proxy برای Strapi Single Type bank-setting است.
                // اگر proxy مستقیم وجود ندارد، به Strapi public endpoint مراجعه می‌کنیم.
                const strapiUrl = process.env.NEXT_PUBLIC_STRAPI_API_URL || 'http://localhost:1337';
                const res = await fetch(`${strapiUrl}/api/bank-setting`);

                if (!res.ok) throw new Error('دریافت اطلاعات بانکی با خطا مواجه شد.');

                const json = await res.json();
                // Strapi v5 Single Type data structure: { data: { bankName, cardNumber, accountHolder } }
                const data = json?.data;
                if (!data) throw new Error('اطلاعات بانکی موجود نیست.');

                setBankInfo({
                    bankName: data.bankName || '',
                    cardNumber: data.cardNumber || '',
                    accountHolder: data.accountHolder || '',
                });
            } catch (err) {
                console.error('[OrderReceiptUpload] fetchBankInfo error:', err);
                setBankError(err.message);
            } finally {
                setIsBankLoading(false);
            }
        };

        fetchBankInfo();
    }, [bankInfoProp]);

    // ── کپی شماره کارت ────────────────────────────────────────────────────────
    const handleCopyCard = useCallback(async () => {
        if (!bankInfo?.cardNumber) return;
        try {
            await navigator.clipboard.writeText(bankInfo.cardNumber);
            setIsCopied(true);
            // بازگشت به حالت عادی پس از 2 ثانیه
            setTimeout(() => setIsCopied(false), 2000);
        } catch {
            // Fallback برای مرورگرهایی که clipboard API ندارند
            console.warn('[OrderReceiptUpload] Clipboard API not available.');
        }
    }, [bankInfo?.cardNumber]);

    // ── اعتبارسنجی فایل ───────────────────────────────────────────────────────
    const validateFile = useCallback((selectedFile) => {
        if (!selectedFile) return 'لطفاً فایل تصویر فیش واریزی را انتخاب کنید.';
        if (!ALLOWED_MIME_TYPES.includes(selectedFile.type))
            return 'فرمت فایل پشتیبانی نمی‌شود. لطفاً تصویر JPEG، PNG یا WebP آپلود کنید.';
        if (selectedFile.size > MAX_FILE_SIZE_BYTES)
            return 'حجم فایل نباید از ۵ مگابایت بیشتر باشد.';
        return null; // بدون خطا
    }, []);

    // ── انتخاب فایل از اینپوت یا drag & drop ─────────────────────────────────
    const handleFileSelect = useCallback((selectedFile) => {
        const fileError = validateFile(selectedFile);
        if (fileError) {
            setErrorMessage(fileError);
            setFile(null);
            return;
        }
        setErrorMessage(null);
        setFile(selectedFile);
    }, [validateFile]);

    const handleFileInputChange = (e) => {
        handleFileSelect(e.target.files?.[0] ?? null);
    };

    // ── رویدادهای Drag & Drop ─────────────────────────────────────────────────
    const handleDragOver = (e) => { e.preventDefault(); setIsDragOver(true); };
    const handleDragLeave = (e) => { e.preventDefault(); setIsDragOver(false); };
    const handleDrop = (e) => {
        e.preventDefault();
        setIsDragOver(false);
        handleFileSelect(e.dataTransfer.files?.[0] ?? null);
    };

    // ── ارسال فرم ─────────────────────────────────────────────────────────────
    const handleSubmit = async (e) => {
        e.preventDefault();
        setErrorMessage(null);
        setSuccessMessage(null);

        // اعتبارسنجی سمت کلاینت — قبل از ارسال شبکه
        if (!trackingNumber.trim()) {
            setErrorMessage('لطفاً کد پیگیری واریز را وارد کنید.');
            return;
        }
        if (!cardHolderName.trim()) {
            setErrorMessage('لطفاً نام صاحب کارت واریز کننده را وارد کنید.');
            return;
        }
        const fileError = validateFile(file);
        if (fileError) {
            setErrorMessage(fileError);
            return;
        }

        setIsSubmitting(true);

        try {
            // ساخت FormData برای ارسال multipart به API Proxy
            const formData = new FormData();
            formData.append('orderId', orderId);
            formData.append('file', file, file.name);
            formData.append('trackingNumber', trackingNumber.trim());
            formData.append('cardHolderName', cardHolderName.trim());

            // ارسال به سرور-ساید proxy (توکن Strapi در سرور است، نه اینجا)
            const res = await fetch('/api/orders/upload-receipt', {
                method: 'POST',
                body: formData,
                // ✅ هیچ‌گاه Content-Type را دستی set نکنید — fetch آن را با boundary صحیح تنظیم می‌کند
            });

            const data = await res.json();

            if (!res.ok) {
                // پیام خطای فارسی از سرور را نمایش می‌دهیم
                throw new Error(data?.message || 'خطایی رخ داد. لطفاً دوباره تلاش کنید.');
            }

            // ── موفقیت ──────────────────────────────────────────────────────
            setSuccessMessage(data.message || 'فیش واریزی با موفقیت ثبت شد.');
            setIsSubmitted(true);

            // callback والد (مثلاً refresh لیست سفارشات)
            if (typeof onSuccess === 'function') {
                onSuccess(data.order);
            }

        } catch (err) {
            setErrorMessage(err.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    // ────────────────────────────────────────────────────────────────────────────
    // رندر
    // ────────────────────────────────────────────────────────────────────────────
    return (
        <div className={styles.receiptCard}>

            {/* ─── بخش ۱: اطلاعات بانکی فروشگاه ─────────────────────────── */}
            <section aria-label="اطلاعات حساب بانکی فروشگاه">
                <h2 className={styles.sectionTitle}>
                    <IconBank />
                    اطلاعات حساب بانکی فروشگاه
                </h2>

                {isBankLoading && (
                    <p className={styles.loadingState}>در حال دریافت اطلاعات بانکی…</p>
                )}

                {bankError && !isBankLoading && (
                    <div className={styles.error} role="alert">
                        <IconAlert />
                        {bankError}
                    </div>
                )}

                {bankInfo && !isBankLoading && (
                    <div className={styles.bankInfoBox}>
                        {/* نام بانک */}
                        {bankInfo.bankName && (
                            <p className={styles.bankName}>{bankInfo.bankName}</p>
                        )}

                        {/* شماره کارت + دکمه کپی */}
                        <div className={styles.cardNumberRow}>
                            <span className={styles.cardNumber} dir="ltr" aria-label="شماره کارت">
                                {bankInfo.cardNumber}
                            </span>
                            <button
                                type="button"
                                id="copy-card-number-btn"
                                className={`${styles.copyBtn} ${isCopied ? styles.copied : ''}`}
                                onClick={handleCopyCard}
                                aria-label="کپی شماره کارت"
                            >
                                {isCopied ? <IconCheck /> : <IconCopy />}
                                {isCopied ? 'کپی شد!' : 'کپی کارت'}
                            </button>
                        </div>

                        {/* نام صاحب حساب */}
                        {bankInfo.accountHolder && (
                            <p className={styles.accountHolder}>
                                به نام: <span>{bankInfo.accountHolder}</span>
                            </p>
                        )}
                    </div>
                )}
            </section>

            {/* ─── بخش ۲: فرم آپلود فیش ──────────────────────────────────── */}
            {/* اگر فرم قبلاً ارسال شده، فقط پیام موفقیت نمایش داده می‌شود */}
            {isSubmitted ? (
                <div className={styles.success} role="status">
                    <IconSuccess />
                    {successMessage}
                </div>
            ) : (
                <form
                    onSubmit={handleSubmit}
                    className={styles.form}
                    noValidate
                    aria-label="فرم ثبت فیش واریزی"
                >
                    {/* کد پیگیری */}
                    <div className={styles.inputGroup}>
                        <label htmlFor="trackingNumber" className={styles.label}>
                            کد پیگیری / مرجع بانک
                        </label>
                        <input
                            id="trackingNumber"
                            type="text"
                            className={styles.input}
                            value={trackingNumber}
                            onChange={(e) => setTrackingNumber(e.target.value)}
                            placeholder="مثال: ۱۲۳۴۵۶۷۸"
                            disabled={isSubmitting}
                            autoComplete="off"
                            dir="rtl"
                        />
                    </div>

                    {/* نام صاحب کارت */}
                    <div className={styles.inputGroup}>
                        <label htmlFor="cardHolderName" className={styles.label}>
                            نام صاحب کارت واریزکننده
                        </label>
                        <input
                            id="cardHolderName"
                            type="text"
                            className={styles.input}
                            value={cardHolderName}
                            onChange={(e) => setCardHolderName(e.target.value)}
                            placeholder="مثال: علی محمدی"
                            disabled={isSubmitting}
                            autoComplete="name"
                            dir="rtl"
                        />
                    </div>

                    {/* آپلود تصویر فیش — Drag & Drop Zone */}
                    <div className={styles.inputGroup}>
                        <span className={styles.label} id="receipt-upload-label">
                            تصویر فیش واریزی
                        </span>

                        {/* اینپوت واقعی — باید خارج از dropzone div باشد
                            تا click event آن به div بابل نکند و دوباره picker باز نشود */}
                        <input
                            ref={fileInputRef}
                            type="file"
                            id="receiptFile"
                            accept="image/jpeg,image/png,image/webp,image/gif"
                            onChange={handleFileInputChange}
                            onClick={(e) => e.stopPropagation()}
                            disabled={isSubmitting}
                            aria-hidden="true"
                            tabIndex={-1}
                            style={{ display: 'none' }}
                        />

                        {/* dropzone — کلیک یا drag & drop */}
                        <div
                            className={`
                                ${styles.dropzone}
                                ${isDragOver ? styles.dragOver : ''}
                                ${file ? styles.hasFile : ''}
                            `}
                            onDragOver={handleDragOver}
                            onDragLeave={handleDragLeave}
                            onDrop={handleDrop}
                            onClick={() => fileInputRef.current?.click()}
                            role="button"
                            tabIndex={0}
                            aria-labelledby="receipt-upload-label"
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                    e.preventDefault();
                                    fileInputRef.current?.click();
                                }
                            }}
                        >
                            {/* آیکون آپلود */}
                            <div className={styles.dropzoneIcon} aria-hidden>
                                <IconUpload />
                            </div>

                            {/* راهنمای متنی */}
                            <p className={styles.dropzoneText}>
                                {isDragOver
                                    ? 'فایل را اینجا رها کنید'
                                    : 'کلیک کنید یا تصویر را اینجا بکشید'}
                            </p>
                            <p className={styles.dropzoneHint}>
                                فرمت‌های مجاز: JPEG، PNG، WebP — حداکثر ۵ مگابایت
                            </p>
                        </div>

                        {/* نمایش نام فایل انتخاب‌شده */}
                        {file && (
                            <div className={styles.selectedFile} aria-live="polite">
                                <IconFile />
                                {file.name}
                            </div>
                        )}
                    </div>

                    {/* نمایش خطا */}
                    {errorMessage && (
                        <div className={styles.error} role="alert" aria-live="assertive">
                            <IconAlert />
                            {errorMessage}
                        </div>
                    )}

                    {/* دکمه ارسال */}
                    <button
                        type="submit"
                        id="submit-receipt-btn"
                        className={styles.submitButton}
                        disabled={isSubmitting}
                    >
                        {isSubmitting ? (
                            <>
                                <span className={styles.spinner} aria-hidden />
                                در حال ارسال…
                            </>
                        ) : (
                            'ثبت فیش واریزی'
                        )}
                    </button>
                </form>
            )}
        </div>
    );
}
