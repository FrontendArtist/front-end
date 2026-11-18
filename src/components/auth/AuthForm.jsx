'use client';

import { useState, useEffect } from 'react';
import { signIn, useSession, getSession } from 'next-auth/react';
import { validatePhoneNumber, normalizeDigits } from '@/lib/phoneUtils';
import styles from './AuthForm.module.scss';

const OTP_RESEND_SECONDS = 120;

const formatCountdown = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`.replace(/\d/g, (d) => '۰۱۲۳۴۵۶۷۸۹'[Number(d)]);
};

const mapAuthError = (err, fallback = 'خطایی رخ داد. لطفاً دوباره تلاش کنید.') => {
    const raw = typeof err === 'string' ? err : err?.message || '';
    if (!raw) return fallback;
    // اگر پیام از قبل فارسی است، مستقیماً نمایش داده شود
    if (/[\u0600-\u06FF]/.test(raw) && !/fetch|network|timeout|error|prisma|sql|econnrefused/i.test(raw)) {
        return raw;
    }
    const lower = raw.toLowerCase();
    if (lower.includes('failed to fetch') || lower.includes('network') || lower.includes('econnrefused')) {
        return 'خطا در برقراری ارتباط با سرور. لطفاً اتصال اینترنت خود را بررسی کنید.';
    }
    if (lower.includes('timeout')) {
        return 'پاسخ‌گویی سرور زمان‌بر شد. لطفاً دوباره تلاش کنید.';
    }
    return fallback;
};

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
    const [authStep, setAuthStep] = useState('phone'); // 'phone' | 'otp' | 'password' | 'register' | 'profile'
    const [phone, setPhone] = useState('');
    const [otp, setOtp] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [resendingOtp, setResendingOtp] = useState(false);
    const [otpTimer, setOtpTimer] = useState(0);
    const [error, setError] = useState('');

    const { update: updateSession } = useSession();

    useEffect(() => {
        if (authStep !== 'otp' || otpTimer <= 0) return;
        const id = setInterval(() => {
            setOtpTimer((prev) => (prev > 0 ? prev - 1 : 0));
        }, 1000);
        return () => clearInterval(id);
    }, [authStep, otpTimer]);

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

                setOtp('');
                setOtpTimer(OTP_RESEND_SECONDS);
                setAuthStep('otp');
            } else {
                if (checkData.userExists && checkData.hasPassword) {
                    setPassword('');
                    setAuthStep('password');
                } else {
                    setPassword('');
                    setConfirmPassword('');
                    setFirstName('');
                    setLastName('');
                    setAuthStep('register');
                }
            }
        } catch (err) {
            setError(mapAuthError(err, 'خطا در بررسی شماره موبایل. لطفاً دوباره تلاش کنید.'));
        } finally {
            setLoading(false);
        }
    };

    const handleResendOtp = async () => {
        if (otpTimer > 0 || resendingOtp || loading) return;
        setError('');
        setResendingOtp(true);
        try {
            const strapiUrl = process.env.NEXT_PUBLIC_STRAPI_API_URL || 'http://localhost:1337';
            const sendRes = await fetch(`${strapiUrl}/api/auth/otp/send`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ phoneNumber: phone }),
            });
            const sendData = await sendRes.json().catch(() => ({}));
            if (!sendRes.ok) {
                throw new Error(sendData?.error?.message || sendData?.error || 'خطا در ارسال مجدد کد تایید');
            }
            setOtp('');
            setOtpTimer(OTP_RESEND_SECONDS);
        } catch (err) {
            setError(mapAuthError(err, 'خطا در ارسال مجدد کد تایید. لطفاً دوباره تلاش کنید.'));
        } finally {
            setResendingOtp(false);
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

            // بررسی تکمیل بودن اطلاعات پروفایل
            const freshSession = await getSession();
            const userFirstName = freshSession?.user?.firstName || '';
            const userLastName = freshSession?.user?.lastName || '';

            if (!userFirstName.trim() || !userLastName.trim()) {
                setFirstName(userFirstName);
                setLastName(userLastName);
                setAuthStep('profile');
            } else {
                if (onSuccess) onSuccess();
            }
        } catch (err) {
            setError(mapAuthError(err, 'کد تایید نامعتبر یا منقضی شده است'));
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

            // بررسی تکمیل بودن اطلاعات پروفایل
            const freshSession = await getSession();
            const userFirstName = freshSession?.user?.firstName || '';
            const userLastName = freshSession?.user?.lastName || '';

            if (!userFirstName.trim() || !userLastName.trim()) {
                setFirstName(userFirstName);
                setLastName(userLastName);
                setAuthStep('profile');
            } else {
                if (onSuccess) onSuccess();
            }
        } catch (err) {
            setError(mapAuthError(err, 'خطا در ورود با رمز عبور. لطفاً دوباره تلاش کنید.'));
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

            // بررسی تکمیل بودن اطلاعات پروفایل بعد از ثبت‌نام
            const freshSession = await getSession();
            const userFirstName = freshSession?.user?.firstName || firstName.trim();
            const userLastName = freshSession?.user?.lastName || lastName.trim();

            if (!userFirstName.trim() || !userLastName.trim()) {
                setFirstName(userFirstName);
                setLastName(userLastName);
                setAuthStep('profile');
            } else {
                if (onSuccess) onSuccess();
            }
        } catch (err) {
            setError(mapAuthError(err, 'خطا در ثبت‌نام. لطفاً دوباره تلاش کنید.'));
        } finally {
            setLoading(false);
        }
    };

    const handleProfileSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (!firstName.trim()) {
            setError('لطفاً نام خود را وارد کنید');
            return;
        }
        if (!lastName.trim()) {
            setError('لطفاً نام خانوادگی خود را وارد کنید');
            return;
        }

        setLoading(true);

        try {
            const sessionData = await updateSession();
            const userId = sessionData?.user?.id;
            const jwt = sessionData?.user?.jwt;

            if (!userId || !jwt) throw new Error('خطا در دریافت اطلاعات کاربر');

            const strapiUrl = process.env.NEXT_PUBLIC_STRAPI_API_URL || 'http://localhost:1337';
            const res = await fetch(`${strapiUrl}/api/users/${userId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${jwt}`,
                },
                body: JSON.stringify({ firstName: firstName.trim(), lastName: lastName.trim() }),
            });

            if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                throw new Error(errData?.error?.message || 'خطا در ذخیره اطلاعات');
            }

            // آپدیت session با نام جدید
            await updateSession({ firstName: firstName.trim(), lastName: lastName.trim() });

            if (onSuccess) onSuccess();
        } catch (err) {
            setError(mapAuthError(err, 'خطا در ذخیره اطلاعات کاربری. لطفاً دوباره تلاش کنید.'));
        } finally {
            setLoading(false);
        }
    };

    const handleBackToPhone = () => {
        setAuthStep('phone');
        setOtp('');
        setOtpTimer(0);
        setPassword('');
        setConfirmPassword('');
        setFirstName('');
        setLastName('');
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

                    <form onSubmit={handlePhoneSubmit} className={styles.form} autoComplete="off">
                        <div className={styles.inputGroup}>
                            <label htmlFor="auth-phone" className={styles.label}>
                                شماره موبایل
                            </label>
                            <input
                                type="tel"
                                id="auth-phone"
                                name="phone_number_input"
                                autoComplete="off"
                                className={`${styles.input} ${styles.codeInput}`}
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

                    <form onSubmit={handleOTPSubmit} className={styles.form} autoComplete="off">
                        <div className={styles.inputGroup}>
                            <label htmlFor="auth-otp" className={styles.label}>کد تایید</label>
                            <input
                                type="text"
                                id="auth-otp"
                                name="otp_code_input"
                                autoComplete="one-time-code"
                                className={`${styles.input} ${styles.codeInput}`}
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

                        <div className={styles.otpActions}>
                            <button
                                type="button"
                                className={styles.resendButton}
                                onClick={handleResendOtp}
                                disabled={otpTimer > 0 || resendingOtp || loading}
                            >
                                {resendingOtp
                                    ? 'در حال ارسال مجدد...'
                                    : otpTimer > 0
                                        ? `ارسال مجدد کد تا ${formatCountdown(otpTimer)}`
                                        : 'ارسال مجدد کد تایید'}
                            </button>

                            <button
                                type="button"
                                className={styles.backButton}
                                onClick={handleBackToPhone}
                                disabled={loading || resendingOtp}
                            >
                                بازگشت به وارد کردن شماره
                            </button>
                        </div>
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

                    <form onSubmit={handlePasswordLogin} className={styles.form} autoComplete="off">
                        <div className={styles.inputGroup}>
                            <label htmlFor="auth-password" className={styles.label}>رمز عبور</label>
                            <div className={styles.passwordWrapper}>
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    id="auth-password"
                                    name="user_login_password"
                                    autoComplete="new-password"
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
                                    aria-label={showPassword ? 'مخفی‌سازی رمز عبور' : 'نمایش رمز عبور'}
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

                    <form onSubmit={handlePasswordRegister} className={styles.form} autoComplete="off">
                        <div className={styles.inputGroup}>
                            <label htmlFor="auth-fname" className={styles.label}>نام (اختیاری)</label>
                            <input
                                type="text"
                                id="auth-fname"
                                name="reg_first_name"
                                autoComplete="off"
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
                                name="reg_last_name"
                                autoComplete="off"
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
                                    name="reg_new_password"
                                    autoComplete="new-password"
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
                                    aria-label={showPassword ? 'مخفی‌سازی رمز عبور' : 'نمایش رمز عبور'}
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
                                name="reg_confirm_password"
                                autoComplete="new-password"
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

            {/* ── مرحله تکمیل پروفایل: نام و نام خانوادگی ── */}
            {authStep === 'profile' && (
                <div className={styles.content}>
                    <h2 className={styles.title}>تکمیل پروفایل</h2>
                    <p className={styles.description}>
                        برای ادامه، لطفاً نام و نام خانوادگی خود را وارد کنید
                    </p>

                    <form onSubmit={handleProfileSubmit} className={styles.form} autoComplete="off">
                        <div className={styles.inputGroup}>
                            <label htmlFor="profile-fname" className={styles.label}>نام</label>
                            <input
                                type="text"
                                id="profile-fname"
                                name="profile_first_name"
                                autoComplete="off"
                                className={styles.input}
                                placeholder="نام"
                                value={firstName}
                                onChange={(e) => setFirstName(e.target.value)}
                                disabled={loading}
                                autoFocus
                            />
                        </div>

                        <div className={styles.inputGroup}>
                            <label htmlFor="profile-lname" className={styles.label}>نام خانوادگی</label>
                            <input
                                type="text"
                                id="profile-lname"
                                name="profile_last_name"
                                autoComplete="off"
                                className={styles.input}
                                placeholder="نام خانوادگی"
                                value={lastName}
                                onChange={(e) => setLastName(e.target.value)}
                                disabled={loading}
                            />
                        </div>

                        {error && <div className={styles.error}>{error}</div>}

                        <button type="submit" className={styles.submitButton} disabled={loading}>
                            {loading ? 'در حال ذخیره...' : 'ذخیره و ورود به حساب'}
                        </button>
                    </form>
                </div>
            )}
        </div>
    );
}
