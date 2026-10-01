'use client';

import { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useDisplayRate } from '@/context/DisplayRateContext';
import { useLightStore } from '@/store/useLightStore';
import { createTopUpRequestWithByeMoney } from '@/lib/byeMoneyApi';
import styles from './LightTopUpModal.module.scss';

/**
 * مدال شارژ نور (واحد پولی دیجیتال سایت)
 *
 * جریان:
 * 1. کاربر مقدار نور را وارد می‌کند (معادل تومانی بر مبنای نرخ لحظه‌ای بای‌مانی نمایش داده می‌شود)
 * 2. دکمه «ثبت درخواست شارژ» را می‌زند
 * 3. ثبت رسمی درخواست در سامانه ByeMoney (POST /api/topup/requests)
 * 4. هدایت به صفحه نتیجه و پیگیری واریز کارت به کارت
 *
 * @param {boolean}  isOpen       - وضعیت باز/بسته بودن مدال
 * @param {function} onClose      - callback برای بستن مدال
 * @param {number}   currentLight - موجودی فعلی نور
 */
export default function LightTopUpModal({ isOpen, onClose, currentLight = 0 }) {
    const router = useRouter();
    const { data: session, status: authStatus } = useSession();
    const { tomanPerNoor } = useDisplayRate();
    const storeBalance = useLightStore((state) => state.lightBalance);
    const effectiveLight = storeBalance !== null ? storeBalance : currentLight;
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
    const tomanEquivalent = (isValidAmount && tomanPerNoor && tomanPerNoor > 0)
        ? Math.round(parsedAmount * tomanPerNoor)
        : null;

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

    // کلیک ثبت درخواست شارژ → فراخوانی رسمی بای‌مانی
    const handleContinue = useCallback(async () => {
        if (!isValidAmount) {
            setErrorMessage('لطفاً مقدار نور را وارد کنید');
            return;
        }

        if (authStatus === 'unauthenticated' || !session?.user?.jwt) {
            onClose();
            router.push('/auth/login?callbackUrl=' + encodeURIComponent(window.location.href));
            return;
        }

        setIsProcessing(true);
        setErrorMessage(null);

        try {
            const topUpRes = await createTopUpRequestWithByeMoney({
                amountInNoor: parsedAmount,
                pendingItems: [],
                jwt: session.user.jwt,
            });

            if (!topUpRes.success || !topUpRes.data) {
                throw new Error(topUpRes.error || 'خطا در ثبت درخواست شارژ در سامانه مالی.');
            }

            const { topUpRequestId, clientReferenceId } = topUpRes.data;
            onClose();

            let redirectUrl = `/payment/callback?status=success&source=card_to_card&orderType=light_topup&lightAmount=${parsedAmount}`;
            if (topUpRequestId) redirectUrl += `&topUpId=${encodeURIComponent(topUpRequestId)}`;
            if (clientReferenceId) redirectUrl += `&refNum=${encodeURIComponent(clientReferenceId)}`;
            router.push(redirectUrl);
        } catch (err) {
            console.error('[LightTopUp Error]:', err);
            setErrorMessage(err.message || 'خطا در برقراری ارتباط با سامانه مالی.');
            setIsProcessing(false);
        }
    }, [isValidAmount, parsedAmount, authStatus, session, router, onClose]);

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
                    <button
                        className={styles.closeBtn}
                        onClick={onClose}
                        aria-label="بستن"
                        id="light-modal-close"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"
                            fill="none" stroke="currentColor" strokeWidth="2">
                            <line x1="18" y1="6" x2="6" y2="18" />
                            <line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                    </button>
                </div>

                {/* ── موجودی فعلی ─────────────────────────────────────────── */}
                <div className={styles.currentBalance}>
                    <span className={styles.balanceLabel}>موجودی فعلی شما:</span>
                    <span className={styles.balanceValue}>
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"
                            fill="currentColor" strokeWidth="0">
                            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                        </svg>
                        {formatNumber(effectiveLight)} نور
                    </span>
                </div>

                {/* ── ورودی مقدار ─────────────────────────────────────────── */}
                <div className={styles.inputSection}>
                    <label htmlFor="light-amount-input" className={styles.inputLabel}>
                        مقدار نور مورد نظر را وارد کنید:
                    </label>
                    <div className={styles.inputWrapper}>
                        <input
                            id="light-amount-input"
                            type="text"
                            inputMode="numeric"
                            className={styles.input}
                            placeholder="مثلاً ۱۰۰"
                            value={lightAmount}
                            onChange={handleAmountChange}
                            disabled={isProcessing}
                            autoFocus
                        />
                        <div className={styles.inputSuffix}>
                            <span>نور</span>
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"
                                fill="currentColor" strokeWidth="0">
                                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                            </svg>
                        </div>
                    </div>
                    {isValidAmount && tomanEquivalent !== null && (
                        <div className={styles.tomanEquivalent}>
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"
                                fill="none" stroke="currentColor" strokeWidth="2">
                                <circle cx="12" cy="12" r="10" />
                                <line x1="12" y1="8" x2="12" y2="12" />
                                <line x1="12" y1="16" x2="12.01" y2="16" />
                            </svg>
                            معادل تقریبی {formatNumber(tomanEquivalent)} تومان
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
                        {tomanPerNoor
                            ? `هر نور در حال حاضر معادل ${formatNumber(tomanPerNoor)} تومان است. ثبت درخواست شارژ مستقیماً در سامانه مالی بای‌مانی ثبت می‌شود.`
                            : 'ثبت درخواست شارژ مستقیماً در سامانه مالی بای‌مانی ثبت می‌شود.'}
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
                        {isProcessing ? (
                            <span>در حال ثبت درخواست...</span>
                        ) : (
                            <>
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"
                                    fill="none" stroke="currentColor" strokeWidth="2">
                                    <polyline points="9 18 15 12 9 6" />
                                </svg>
                                <span>ثبت درخواست شارژ</span>
                                {tomanEquivalent !== null && (
                                    <span className={styles.payAmount}>
                                        ({formatNumber(tomanEquivalent)} تومان)
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
