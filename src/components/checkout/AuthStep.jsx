'use client';

import { useState, useEffect } from 'react';
import { useSession, signIn } from 'next-auth/react';
import styles from './AuthStep.module.scss';

/**
 * مرحله 2: احراز هویت
 * نمایش فرم OTP inline یا پیام success اگر لاگین است
 * 
 * @param {function} onNext - callback برای رفتن به مرحله بعد
 */
export default function AuthStep({ onNext }) {
    const { data: session, status } = useSession();
    const [authStep, setAuthStep] = useState('phone'); // 'phone' | 'otp'
    const [phone, setPhone] = useState('');
    const [otp, setOtp] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    // اگر کاربر لاگین است، به مرحله بعد برود
    useEffect(() => {
        if (status === 'authenticated') {
            // کمی تأخیر برای نمایش پیام موفقیت
            const timer = setTimeout(() => {
                onNext();
            }, 1500);
            return () => clearTimeout(timer);
        }
    }, [status, onNext]);

    const handlePhoneSubmit = async (e) => {
        e.preventDefault();
        setError('');

        // Validation
        if (!phone || phone.length < 11) {
            setError('شماره موبایل معتبر نیست');
            return;
        }

        setLoading(true);

        try {
            const strapiUrl = process.env.NEXT_PUBLIC_STRAPI_API_URL || 'http://localhost:1337';
            const response = await fetch(`${strapiUrl}/api/auth/otp/send`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ phoneNumber: phone }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'خطا در ارسال کد تایید');
            }

            // Success - move to OTP step
            setAuthStep('otp');
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleOTPSubmit = async (e) => {
        e.preventDefault();
        setError('');

        // Validation
        if (!otp || otp.length !== 6) {
            setError('کد تایید باید ۶ رقم باشد');
            return;
        }

        setLoading(true);

        try {
            const result = await signIn('otp-login', {
                phoneNumber: phone,
                otpCode: otp,
                redirect: false,
            });

            if (result?.error) {
                throw new Error('کد تایید نامعتبر است');
            }

            // Success - session will update automatically
            // onNext will be called by useEffect
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleBackToPhone = () => {
        setAuthStep('phone');
        setOtp('');
        setError('');
    };

    // نمایش Loading هنگام چک کردن سشن
    if (status === 'loading') {
        return (
            <div className={styles.authStep}>
                <div className={styles.loadingState}>
                    <div className={styles.spinner}></div>
                    <p>در حال بررسی وضعیت...</p>
                </div>
            </div>
        );
    }

    // اگر لاگین است، پیام موفقیت نمایش بده
    if (status === 'authenticated') {
        return (
            <div className={styles.authStep}>
                <div className={styles.successState}>
                    <div className={styles.successIcon}>
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                            <polyline points="22 4 12 14.01 9 11.01" />
                        </svg>
                    </div>
                    <h2 className={styles.successTitle}>شما وارد شده‌اید!</h2>
                    <p className={styles.successMessage}>
                        خوش آمدید، در حال انتقال به مرحله بعد...
                    </p>
                </div>
            </div>
        );
    }

    // فرم ورود
    return (
        <div className={styles.authStep}>
            <h2 className={styles.title}>ورود / ثبت‌نام</h2>
            <p className={styles.subtitle}>برای ادامه خرید، لطفاً وارد شوید</p>

            {authStep === 'phone' ? (
                <form onSubmit={handlePhoneSubmit} className={styles.form}>
                    <div className={styles.inputGroup}>
                        <label htmlFor="phone" className={styles.label}>شماره موبایل</label>
                        <input
                            type="tel"
                            id="phone"
                            className={styles.input}
                            placeholder="09123456789"
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            disabled={loading}
                            maxLength={11}
                            dir="ltr"
                        />
                    </div>

                    {error && <div className={styles.error}>{error}</div>}

                    <button type="submit" className={styles.submitButton} disabled={loading}>
                        {loading ? 'در حال ارسال...' : 'دریافت کد تایید'}
                    </button>
                </form>
            ) : (
                <form onSubmit={handleOTPSubmit} className={styles.form}>
                    <div className={styles.phoneDisplay}>
                        کد ۶ رقمی ارسال شده به شماره <strong>{phone}</strong> را وارد کنید
                    </div>

                    <div className={styles.inputGroup}>
                        <label htmlFor="otp" className={styles.label}>کد تایید</label>
                        <input
                            type="text"
                            id="otp"
                            className={styles.input}
                            placeholder="123456"
                            value={otp}
                            onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                            disabled={loading}
                            maxLength={6}
                            dir="ltr"
                            autoFocus
                        />
                    </div>

                    {error && <div className={styles.error}>{error}</div>}

                    <button type="submit" className={styles.submitButton} disabled={loading}>
                        {loading ? 'در حال تایید...' : 'تایید و ورود'}
                    </button>

                    <button
                        type="button"
                        className={styles.backButton}
                        onClick={handleBackToPhone}
                        disabled={loading}
                    >
                        بازگشت به وارد کردن شماره
                    </button>
                </form>
            )}
        </div>
    );
}
