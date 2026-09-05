'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { validatePhoneNumber, normalizeDigits } from '@/lib/phoneUtils';
import styles from './AuthForm.module.scss';

/**
 * کامپوننت مشترک و مستقل فرم احراز هویت
 * قابل استفاده در مودال لاگین، صفحه ارتباط با استاد، صفحه تسویه‌حساب و ...
 */
export default function AuthForm({
    title = 'ورود / ثبت‌نام',
    subtitle = 'شماره موبایل خود را وارد کنید',
    icon = null,
    onSuccess,
    className = '',
}) {
    const [authStep, setAuthStep] = useState('phone'); // 'phone' | 'otp' | 'password' | 'register'
    const [phone, setPhone] = useState('');
    const [otp, setOtp] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handlePhoneSubmit = async (e) => {
        e.preventDefault();
        setError('');

        const validation = validatePhoneNumber(phone);
        if (!validation.valid) {
            setError(validation.message);
            return;
        }

        const cleanPhone = validation.formatted;
        setPhone(cleanPhone);
        setLoading(true);

        try {
            const strapiUrl = process.env.NEXT_PUBLIC_STRAPI_API_URL || 'http://localhost:1337';
            const checkRes = await fetch(`${strapiUrl}/api/auth/check-phone`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ phoneNumber: cleanPhone }),
            });

            const checkData = await checkRes.json();
            if (!checkRes.ok) {
                throw new Error(checkData?.error?.message || checkData?.error || 'خطا در بررسی شماره');
            }

            if (checkData.isIranian) {
                const sendRes = await fetch(`${strapiUrl}/api/auth/otp/send`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ phoneNumber: cleanPhone }),
                });

                const sendData = await sendRes.json();
                if (!sendRes.ok) {
                    throw new Error(sendData?.error?.message || sendData?.error || 'خطا در ارسال کد تایید');
                }

                setAuthStep('otp');
            } else {
                if (checkData.userExists && checkData.hasPassword) {
                    setAuthStep('password');
                } else {
                    setAuthStep('register');
                }
            }
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleOTPSubmit = async (e) => {
        e.preventDefault();
        setError('');

        const cleanOtp = normalizeDigits(otp);
        if (!cleanOtp || cleanOtp.length !== 6) {
            setError('کد تایید باید ۶ رقم باشد');
            return;
        }

        setLoading(true);

        try {
            const result = await signIn('otp-login', {
                phoneNumber: phone,
                otpCode: cleanOtp,
                redirect: false,
            });

            if (result?.error) {
                throw new Error('کد تایید نامعتبر یا منقضی شده است');
            }

            if (onSuccess) onSuccess();
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handlePasswordLogin = async (e) => {
        e.preventDefault();
        setError('');

        if (!password) {
            setError('لطفاً رمز عبور خود را وارد کنید');
            return;
        }

        setLoading(true);

        try {
            const result = await signIn('password-login', {
                phoneNumber: phone,
                password: password,
                isRegister: 'false',
                redirect: false,
            });

            if (result?.error) {
                throw new Error('رمز عبور وارد شده نادرست است');
            }

            if (onSuccess) onSuccess();
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handlePasswordRegister = async (e) => {
        e.preventDefault();
        setError('');

        if (!password || password.length < 6) {
            setError('رمز عبور باید حداقل ۶ کاراکتر باشد');
            return;
        }

        if (password !== confirmPassword) {
            setError('تکرار رمز عبور با رمز عبور مطابقت ندارد');
            return;
        }

        setLoading(true);

        try {
            const result = await signIn('password-login', {
                phoneNumber: phone,
                password: password,
                isRegister: 'true',
                firstName: firstName.trim(),
                lastName: lastName.trim(),
                redirect: false,
            });

            if (result?.error) {
                throw new Error(result.error);
            }

            if (onSuccess) onSuccess();
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleBackToPhone = () => {
        setAuthStep('phone');
        setOtp('');
        setPassword('');
        setConfirmPassword('');
        setError('');
    };

    return (
        <div className={`${styles.card} ${className}`.trim()}>
            {icon && <div className={styles.iconWrapper}>{icon}</div>}

            {/* ── مرحله ۱: شماره تلفن ── */}
            {authStep === 'phone' && (
                <div className={styles.content}>
                    <h2 className={styles.title}>{title}</h2>
                    <p className={styles.description}>{subtitle}</p>

                    <form onSubmit={handlePhoneSubmit} className={styles.form}>
                        <div className={styles.inputGroup}>
                            <label htmlFor="auth-phone" className={styles.label}>
                                شماره موبایل
                            </label>
                            <input
                                type="tel"
                                id="auth-phone"
                                className={styles.input}
                                placeholder="09123456789"
                                value={phone}
                                onChange={(e) => setPhone(e.target.value)}
                                disabled={loading}
                                dir="ltr"
                                autoFocus
                            />
                        </div>

                        {error && <div className={styles.error}>{error}</div>}

                        <button type="submit" className={styles.submitButton} disabled={loading}>
                            {loading ? 'در حال بررسی...' : 'ادامه'}
                        </button>
                    </form>
                </div>
            )}

            {/* ── مرحله ۲ (شماره ایرانی): کد تایید پیامکی ── */}
            {authStep === 'otp' && (
                <div className={styles.content}>
                    <h2 className={styles.title}>تایید شماره موبایل</h2>
                    <p className={styles.description}>
                        کد ۶ رقمی ارسال شده به شماره <span className={styles.phoneDisplay}>{phone}</span> را وارد کنید
                    </p>

                    <form onSubmit={handleOTPSubmit} className={styles.form}>
                        <div className={styles.inputGroup}>
                            <label htmlFor="auth-otp" className={styles.label}>کد تایید</label>
                            <input
                                type="text"
                                id="auth-otp"
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
                </div>
            )}

            {/* ── مرحله ۳ (شماره خارجی ثبت‌شده): ورود با رمز عبور ── */}
            {authStep === 'password' && (
                <div className={styles.content}>
                    <h2 className={styles.title}>ورود با رمز عبور</h2>
                    <p className={styles.description}>
                        رمز عبور حساب شماره <span className={styles.phoneDisplay}>{phone}</span> را وارد کنید
                    </p>

                    <form onSubmit={handlePasswordLogin} className={styles.form}>
                        <div className={styles.inputGroup}>
                            <label htmlFor="auth-password" className={styles.label}>رمز عبور</label>
                            <div className={styles.passwordWrapper}>
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    id="auth-password"
                                    className={styles.input}
                                    placeholder="رمز عبور"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    disabled={loading}
                                    dir="ltr"
                                    autoFocus
                                />
                                <button
                                    type="button"
                                    className={styles.eyeButton}
                                    onClick={() => setShowPassword(!showPassword)}
                                    tabIndex={-1}
                                >
                                    {showPassword ? (
                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                                            <line x1="1" y1="1" x2="23" y2="23" />
                                        </svg>
                                    ) : (
                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                                            <circle cx="12" cy="12" r="3" />
                                        </svg>
                                    )}
                                </button>
                            </div>
                        </div>

                        {error && <div className={styles.error}>{error}</div>}

                        <button type="submit" className={styles.submitButton} disabled={loading}>
                            {loading ? 'در حال ورود...' : 'ورود به حساب'}
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
                </div>
            )}

            {/* ── مرحله ۴ (شماره خارجی جدید): ثبت‌نام با رمز عبور ── */}
            {authStep === 'register' && (
                <div className={styles.content}>
                    <h2 className={styles.title}>ثبت‌نام کاربر بین‌الملل</h2>
                    <p className={styles.description}>
                        تعیین رمز عبور برای شماره <span className={styles.phoneDisplay}>{phone}</span>
                    </p>

                    <form onSubmit={handlePasswordRegister} className={styles.form}>
                        <div className={styles.inputGroup}>
                            <label htmlFor="auth-fname" className={styles.label}>نام (اختیاری)</label>
                            <input
                                type="text"
                                id="auth-fname"
                                className={styles.input}
                                placeholder="نام"
                                value={firstName}
                                onChange={(e) => setFirstName(e.target.value)}
                                disabled={loading}
                            />
                        </div>

                        <div className={styles.inputGroup}>
                            <label htmlFor="auth-lname" className={styles.label}>نام خانوادگی (اختیاری)</label>
                            <input
                                type="text"
                                id="auth-lname"
                                className={styles.input}
                                placeholder="نام خانوادگی"
                                value={lastName}
                                onChange={(e) => setLastName(e.target.value)}
                                disabled={loading}
                            />
                        </div>

                        <div className={styles.inputGroup}>
                            <label htmlFor="auth-reg-pass" className={styles.label}>رمز عبور (حداقل ۶ کاراکتر)</label>
                            <div className={styles.passwordWrapper}>
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    id="auth-reg-pass"
                                    className={styles.input}
                                    placeholder="رمز عبور"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    disabled={loading}
                                    dir="ltr"
                                />
                                <button
                                    type="button"
                                    className={styles.eyeButton}
                                    onClick={() => setShowPassword(!showPassword)}
                                    tabIndex={-1}
                                >
                                    {showPassword ? (
                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                                            <line x1="1" y1="1" x2="23" y2="23" />
                                        </svg>
                                    ) : (
                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                                            <circle cx="12" cy="12" r="3" />
                                        </svg>
                                    )}
                                </button>
                            </div>
                        </div>

                        <div className={styles.inputGroup}>
                            <label htmlFor="auth-reg-confirm" className={styles.label}>تکرار رمز عبور</label>
                            <input
                                type={showPassword ? 'text' : 'password'}
                                id="auth-reg-confirm"
                                className={styles.input}
                                placeholder="تکرار رمز عبور"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                disabled={loading}
                                dir="ltr"
                            />
                        </div>

                        {error && <div className={styles.error}>{error}</div>}

                        <button type="submit" className={styles.submitButton} disabled={loading}>
                            {loading ? 'در حال ثبت‌نام...' : 'ثبت‌نام و ورود'}
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
                </div>
            )}
        </div>
    );
}
