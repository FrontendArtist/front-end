'use client';

import { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useDisplayRate } from '@/context/DisplayRateContext';
import { useLightStore } from '@/store/useLightStore';
import styles from './LightTopUpModal.module.scss';

/**
 * مدال شارژ نور (واحد پولی دیجیتال سایت)
 *
 * جریان:
 * 1. کاربر مقدار نور را وارد می‌کند (معادل تومانی بر مبنای نرخ لحظه‌ای بای‌مانی نمایش داده می‌شود)
 * 2. دکمه «پرداخت آنلاین» را می‌زند
 * 3. دریافت توکن پرداخت درگاه سامان کیش (POST /api/payment/request با paymentType: 'light_topup')
 *    که مستقیماً در بای‌مانی ثبت و آماده پرداخت شتابی می‌شود (مستقل از orders استراپی)
 * 4. هدایت خودکار به درگاه پرداخت شاپرک (SEP)
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

    const quickAmounts = [100000, 500000, 1000000, 5000000, 10000000, 50000000];

    const handleQuickSelect = (amount) => {
        setLightAmount(String(amount));
        setErrorMessage(null);
    };

    const handleAmountChange = (e) => {
        const val = e.target.value.replace(/[^0-9]/g, '');
        setLightAmount(val);
        setErrorMessage(null);
    };

    // کلیک «پرداخت آنلاین» → دریافت توکن و هدایت مستقیم به درگاه پرداخت شاپرک
    const handlePayOnline = useCallback(async () => {
        if (!isValidAmount) {
            setErrorMessage('لطفاً مقدار نور را وارد کنید');
            return;
        }

        if (authStatus !== 'authenticated' || !session?.user?.jwt) {
            onClose();
            router.push('/auth/login?callbackUrl=' + encodeURIComponent(window.location.href));
            return;
        }

        setIsProcessing(true);
        setErrorMessage(null);

        try {
            // بررسی اتصال فیلترشکن (VPN) جهت جلوگیری از خطای درگاه شاپرک
            try {
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 800);
                const vpnRes = await fetch('/api/check-vpn', { cache: 'no-store', signal: controller.signal });
                clearTimeout(timeoutId);
                if (vpnRes.ok) {
                    const vpnData = await vpnRes.json();
                    if (vpnData?.success && vpnData?.isVpn) {
                        throw new Error('فیلترشکن (VPN) شما روشن است! درگاه‌های پرداخت اینترنتی شاپرک دسترسی با فیلترشکن را مسدود می‌کنند. لطفاً فیلترشکن خود را خاموش کرده و مجدداً دکمه پرداخت را بزنید.');
                    }
                }
            } catch (vpnErr) {
                if (vpnErr.message?.includes('فیلترشکن')) {
                    throw vpnErr;
                }
            }

            const tokenRes = await fetch('/api/payment/request', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ paymentType: 'light_topup', amountNoor: parsedAmount }),
            });

            const tokenData = await tokenRes.json().catch(() => ({}));
            if (!tokenRes.ok || !tokenData.success || !tokenData.token) {
                const message = tokenData.message || tokenData.error;
                if (tokenRes.status === 401) {
                    throw new Error('نشست شما منقضی شده است. لطفاً دوباره وارد حساب کاربری شوید.');
                }
                if (tokenRes.status === 400 || tokenRes.status === 422) {
                    throw new Error(message || 'درخواست شارژ آنلاین معتبر نیست. مبلغ را بررسی کنید و دوباره تلاش کنید.');
                }
                throw new Error(message || 'در حال حاضر دریافت درگاه پرداخت ممکن نیست. لطفاً کمی بعد دوباره تلاش کنید.');
            }

            // هدایت خودکار به فرم پرداخت شاپرک
            const form = document.createElement('form');
            form.method = 'POST';
            form.action = tokenData.gatewayUrl || 'https://sep.shaparak.ir/OnlinePG/OnlinePG';
            form.style.display = 'none';

            const tokenInput = document.createElement('input');
            tokenInput.type = 'hidden';
            tokenInput.name = 'Token';
            tokenInput.value = tokenData.token;
            form.appendChild(tokenInput);

            document.body.appendChild(form);
            form.submit();
        } catch (error) {
            console.error('[LightTopUpModal] Payment Error:', error);
            setErrorMessage(error.message || 'ارتباط با درگاه پرداخت برقرار نشد. اتصال اینترنت را بررسی و دوباره تلاش کنید.');
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
                            placeholder="مثلاً ۱۰۰,۰۰۰"
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
                            ? `هر نور در حال حاضر معادل ${formatNumber(tomanPerNoor)} تومان است. پس از پرداخت، نور به حساب شما اضافه می‌شود.`
                            : 'پس از پرداخت، نور به حساب شما اضافه می‌شود.'}
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
                        onClick={handlePayOnline}
                        disabled={isProcessing || !isValidAmount}
                        id="light-modal-pay-online"
                    >
                        {isProcessing ? (
                            <>
                                <span className={styles.spinner} />
                                <span>در حال انتقال به درگاه بانکی...</span>
                            </>
                        ) : (
                            <>
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"
                                    fill="none" stroke="currentColor" strokeWidth="2">
                                    <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
                                    <line x1="1" y1="10" x2="23" y2="10" />
                                </svg>
                                <span>پرداخت آنلاین</span>
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
