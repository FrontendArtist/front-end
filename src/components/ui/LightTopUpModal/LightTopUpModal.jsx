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
 * 2. دکمه «ادامه و پرداخت» را می‌زند
 * 3. redirect به /checkout/light?amount=X
 * 4. صفحه /checkout/light مثل PaymentStep عمل می‌کند (انتخاب روش پرداخت، ثبت سفارش)
 *
 * @param {boolean}  isOpen       - وضعیت باز/بسته بودن مدال
 * @param {function} onClose      - callback برای بستن مدال
 * @param {number}   currentLight - موجودی فعلی نور
 */
export default function LightTopUpModal({ isOpen, onClose, currentLight = 0 }) {
    const router = useRouter();
    const [lightAmount, setLightAmount] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const [errorMessage, setErrorMessage] = useState(null);

    // بستن با Escape
    useEffect(() => {
        if (!isOpen) return;
        const handleKey = (e) => { if (e.key === 'Escape') onClose(); };
        window.addEventListener('keydown', handleKey);
        return () => window.removeEventListener('keydown', handleKey);
    }, [isOpen, onClose]);

    // جلوگیری از scroll
    useEffect(() => {
        document.body.style.overflow = isOpen ? 'hidden' : '';
        return () => { document.body.style.overflow = ''; };
    }, [isOpen]);

    // ریست state
    useEffect(() => {
        if (!isOpen) {
            setIsProcessing(false);
            setErrorMessage(null);
            setLightAmount('');
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

    // کلیک «ادامه» → redirect به صفحه پرداخت نور
    const handleContinue = useCallback(() => {
        if (!isValidAmount) {
            setErrorMessage('لطفاً مقدار نور را وارد کنید');
            return;
        }
        setIsProcessing(true);
        onClose();
        router.push(`/checkout/light?amount=${parsedAmount}`);
    }, [isValidAmount, parsedAmount, router, onClose]);

    if (!isOpen) return null;

    return createPortal(
        <div className={styles.overlay} onClick={onClose} role="dialog" aria-modal="true" aria-labelledby="light-modal-title">
            <div className={styles.modal} onClick={(e) => e.stopPropagation()}>

                {/* ── هدر ─────────────────────────────────────────────────── */}
                <div className={styles.header}>
                    <div className={styles.headerTitle}>
                        <div className={styles.headerIcon}>
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"
                                fill="none" stroke="currentColor" strokeWidth="2">
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

                {/* ── موجودی فعلی ──────────────────────────────────────────── */}
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

                {/* ── ورودی مقدار ──────────────────────────────────────────── */}
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
                            onKeyDown={(e) => { if (e.key === 'Enter') handleContinue(); }}
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

                {/* ── انتخاب سریع ──────────────────────────────────────────── */}
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

                {/* ── اطلاعیه ──────────────────────────────────────────────── */}
                <div className={styles.infoNote}>
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"
                        fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="10" />
                        <line x1="12" y1="16" x2="12" y2="12" />
                        <line x1="12" y1="8" x2="12.01" y2="8" />
                    </svg>
                    <p>
                        هر نور معادل {formatNumber(LIGHT_TO_TOMAN_RATE)} تومان است.
                        پس از پرداخت، نور به حساب شما اضافه می‌شود.
                    </p>
                </div>

                {/* ── خطا ──────────────────────────────────────────────────── */}
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

                {/* ── دکمه‌ها ───────────────────────────────────────────────── */}
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
                        onClick={handleContinue}
                        disabled={isProcessing || !isValidAmount}
                        id="light-modal-continue"
                    >
                        <>
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"
                                fill="none" stroke="currentColor" strokeWidth="2">
                                <polyline points="9 18 15 12 9 6" />
                            </svg>
                            <span>ادامه و پرداخت</span>
                            {isValidAmount && (
                                <span className={styles.payAmount}>
                                    {formatNumber(tomanEquivalent)} تومان
                                </span>
                            )}
                        </>
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
}
