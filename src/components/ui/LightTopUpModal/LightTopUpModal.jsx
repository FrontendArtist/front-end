'use client';

import { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import { LIGHT_TO_TOMAN_RATE } from '@/lib/constants';
import styles from './LightTopUpModal.module.scss';

/**
 * مدال شارژ نور (واحد پولی مجازی سایت)
 *
 * جریان:
 * 1. کاربر مقدار نور را وارد می‌کند
 * 2. روش پرداخت انتخاب می‌کند
 * 3. دکمه «پرداخت» کلیک می‌شود
 * 4. شبیه‌سازی پرداخت (2 ثانیه)
 * 5. redirect به /payment-light/callback?status=success&amount=X
 *
 * @param {boolean}  isOpen     - وضعیت باز/بسته بودن مدال
 * @param {function} onClose    - callback برای بستن مدال
 * @param {number}   currentLight - موجودی فعلی نور
 */
export default function LightTopUpModal({ isOpen, onClose, currentLight = 0 }) {
    const router = useRouter();
    const [lightAmount, setLightAmount] = useState('');
    const [paymentMethod, setPaymentMethod] = useState('online'); // 'online' | 'card_to_card'
    const [isProcessing, setIsProcessing] = useState(false);
    const [errorMessage, setErrorMessage] = useState(null);

    // بستن با Escape
    useEffect(() => {
        if (!isOpen) return;
        const handleKey = (e) => { if (e.key === 'Escape') onClose(); };
        window.addEventListener('keydown', handleKey);
        return () => window.removeEventListener('keydown', handleKey);
    }, [isOpen, onClose]);

    // جلوگیری از scroll وقتی مدال باز است
    useEffect(() => {
        document.body.style.overflow = isOpen ? 'hidden' : '';
        return () => { document.body.style.overflow = ''; };
    }, [isOpen]);

    // ریست state هنگام بسته‌شدن مدال
    useEffect(() => {
        if (!isOpen) {
            setIsProcessing(false);
            setErrorMessage(null);
            setLightAmount('');
            setPaymentMethod('online');
        }
    }, [isOpen]);


    const formatNumber = (n) => new Intl.NumberFormat('fa-IR').format(n);

    const parsedAmount = parseInt(lightAmount, 10);
    const isValidAmount = !isNaN(parsedAmount) && parsedAmount > 0;
    const tomanEquivalent = isValidAmount ? parsedAmount * LIGHT_TO_TOMAN_RATE : 0;

    const quickAmounts = [10, 50, 100, 500, 1000, 5000];

    const handleQuickSelect = (amount) => {
        setLightAmount(String(amount));
        setErrorMessage(null);
    };

    const handleAmountChange = (e) => {
        const val = e.target.value.replace(/[^0-9]/g, '');
        setLightAmount(val);
        setErrorMessage(null);
    };

    const handlePayment = useCallback(async () => {
        if (!isValidAmount) {
            setErrorMessage('لطفاً مقدار نور را وارد کنید');
            return;
        }

        setIsProcessing(true);
        setErrorMessage(null);

        try {
            // شبیه‌سازی ایجاد تراکنش/انتقال (مطابق با روند checkout)
            await new Promise((res) => setTimeout(res, 1800));
            onClose();

            if (paymentMethod === 'card_to_card') {
                router.push(
                    `/payment-light/callback?status=success&source=card_to_card&amount=${parsedAmount}`
                );
            } else {
                router.push(
                    `/payment-light/callback?status=success&amount=${parsedAmount}`
                );
            }
        } catch (err) {
            setErrorMessage('خطا در فرایند پرداخت. لطفاً دوباره تلاش کنید.');
            setIsProcessing(false);
        }
    }, [isValidAmount, parsedAmount, paymentMethod, router, onClose]);

    if (!isOpen) return null;

    // createPortal: مدال را مستقیماً به document.body رندر می‌کند
    // تا از محدودیت backdrop-filter والدین (Navbar) خارج شود
    return createPortal(
        <div className={styles.overlay} onClick={onClose} role="dialog" aria-modal="true" aria-labelledby="light-modal-title">
            <div className={styles.modal} onClick={(e) => e.stopPropagation()}>

                {/* ── هدر مدال ────────────────────────────────────────────── */}
                <div className={styles.header}>
                    <div className={styles.headerTitle}>
                        <div className={styles.headerIcon}>
                            {/* آیکون نور / ستاره */}
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"
                                fill="none" stroke="currentColor" strokeWidth="2"
                                strokeLinecap="round" strokeLinejoin="round">
                                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                            </svg>
                        </div>
                        <h2 id="light-modal-title">شارژ نور</h2>
                    </div>
                    <button className={styles.closeBtn} onClick={onClose} aria-label="بستن">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"
                            fill="none" stroke="currentColor" strokeWidth="2">
                            <line x1="18" y1="6" x2="6" y2="18" />
                            <line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                    </button>
                </div>

                {/* ── موجودی فعلی ─────────────────────────────────────────── */}
                <div className={styles.balanceBox}>
                    <span className={styles.balanceLabel}>موجودی فعلی:</span>
                    <span className={styles.balanceValue}>
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"
                            fill="currentColor" strokeWidth="0">
                            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                        </svg>
                        {formatNumber(currentLight)} نور
                    </span>
                </div>

                {/* ── ورودی مقدار نور ─────────────────────────────────────── */}
                <div className={styles.inputGroup}>
                    <label className={styles.inputLabel} htmlFor="light-amount-input">
                        مقدار نور (تعداد)
                    </label>
                    <div className={styles.inputWrapper}>
                        <input
                            id="light-amount-input"
                            type="text"
                            inputMode="numeric"
                            className={styles.amountInput}
                            placeholder="مقدار نور را وارد کنید"
                            value={lightAmount}
                            onChange={handleAmountChange}
                            disabled={isProcessing}
                        />
                        <div className={styles.inputIcon}>
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"
                                fill="currentColor" strokeWidth="0">
                                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                            </svg>
                        </div>
                    </div>
                    {isValidAmount && (
                        <div className={styles.tomanEquivalent}>
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"
                                fill="none" stroke="currentColor" strokeWidth="2">
                                <circle cx="12" cy="12" r="10" />
                                <line x1="12" y1="8" x2="12" y2="12" />
                                <line x1="12" y1="16" x2="12.01" y2="16" />
                            </svg>
                            معادل {formatNumber(tomanEquivalent)} تومان
                        </div>
                    )}
                </div>

                {/* ── انتخاب سریع ─────────────────────────────────────────── */}
                <div className={styles.quickSection}>
                    <span className={styles.quickLabel}>انتخاب سریع</span>
                    <div className={styles.quickGrid}>
                        {quickAmounts.map((amount) => (
                            <button
                                key={amount}
                                className={`${styles.quickBtn} ${parsedAmount === amount ? styles.quickBtnActive : ''}`}
                                onClick={() => handleQuickSelect(amount)}
                                disabled={isProcessing}
                            >
                                {formatNumber(amount)} نور
                            </button>
                        ))}
                    </div>
                </div>

                {/* ── اطلاعیه ─────────────────────────────────────────────── */}
                <div className={styles.infoNote}>
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"
                        fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="10" />
                        <line x1="12" y1="16" x2="12" y2="12" />
                        <line x1="12" y1="8" x2="12.01" y2="8" />
                    </svg>
                    <p>
                        پس از پرداخت، نور به حساب شما اضافه می‌شود.
                        هر نور معادل {formatNumber(LIGHT_TO_TOMAN_RATE)} تومان است.
                    </p>
                </div>

                {/* ── انتخاب روش پرداخت (مشابه سبد خرید) ────────────────── */}
                <div className={styles.gatewaySection}>
                    <span className={styles.gatewayLabel}>روش پرداخت</span>
                    <div className={styles.gatewayList}>
                        <label
                            className={`${styles.gatewayItem} ${paymentMethod === 'online' ? styles.gatewayActive : ''}`}
                            htmlFor="pm-online"
                        >
                            <input
                                id="pm-online"
                                type="radio"
                                name="paymentMethod"
                                value="online"
                                checked={paymentMethod === 'online'}
                                onChange={() => setPaymentMethod('online')}
                                disabled={isProcessing}
                            />
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"
                                fill="none" stroke="currentColor" strokeWidth="2">
                                <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
                                <line x1="1" y1="10" x2="23" y2="10" />
                            </svg>
                            <span>پرداخت آنلاین</span>
                        </label>
                        <label
                            className={`${styles.gatewayItem} ${paymentMethod === 'card_to_card' ? styles.gatewayActive : ''}`}
                            htmlFor="pm-card-to-card"
                        >
                            <input
                                id="pm-card-to-card"
                                type="radio"
                                name="paymentMethod"
                                value="card_to_card"
                                checked={paymentMethod === 'card_to_card'}
                                onChange={() => setPaymentMethod('card_to_card')}
                                disabled={isProcessing}
                            />
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"
                                fill="none" stroke="currentColor" strokeWidth="2">
                                <rect x="2" y="5" width="20" height="14" rx="2" />
                                <path d="M2 10h20" />
                                <path d="M7 15h2" />
                                <path d="M11 15h4" />
                            </svg>
                            <span>پرداخت کارت به کارت</span>
                        </label>
                    </div>
                </div>

                {/* ── پیام خطا ────────────────────────────────────────────── */}
                {errorMessage && (
                    <div className={styles.errorBox} role="alert">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"
                            fill="none" stroke="currentColor" strokeWidth="2">
                            <circle cx="12" cy="12" r="10" />
                            <line x1="12" y1="8" x2="12" y2="12" />
                            <line x1="12" y1="16" x2="12.01" y2="16" />
                        </svg>
                        {errorMessage}
                    </div>
                )}

                {/* ── دکمه‌های عملیات ──────────────────────────────────────── */}
                <div className={styles.actions}>
                    <button
                        className={styles.cancelBtn}
                        onClick={onClose}
                        disabled={isProcessing}
                        id="light-modal-cancel"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"
                            fill="none" stroke="currentColor" strokeWidth="2">
                            <line x1="18" y1="6" x2="6" y2="18" />
                            <line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                        انصراف
                    </button>
                    <button
                        className={styles.payBtn}
                        onClick={handlePayment}
                        disabled={isProcessing || !isValidAmount}
                        id="light-modal-pay"
                    >
                        {isProcessing ? (
                            <>
                                <span className={styles.spinner} />
                                {paymentMethod === 'card_to_card'
                                    ? 'در حال ثبت درخواست...'
                                    : 'در حال انتقال به درگاه...'}
                            </>
                        ) : (
                            <>
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"
                                    fill="none" stroke="currentColor" strokeWidth="2">
                                    <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
                                    <line x1="1" y1="10" x2="23" y2="10" />
                                </svg>
                                پرداخت
                                {isValidAmount && (
                                    <span className={styles.payAmount}>
                                        {formatNumber(tomanEquivalent)} تومان
                                    </span>
                                )}
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
}
