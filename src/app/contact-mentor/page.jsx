/**
 * @file src/app/contact-mentor/page.jsx
 * @description صفحه ارسال پیام به استاد برای کاربران عادی — Client Component
 *
 * 🎯 Purpose:
 * کاربر لاگین‌شده از این صفحه می‌تواند فرم پیش‌نیاز را پر کند و
 * اولین پیام خود را به استاد ارسال کند.
 *
 * 🔐 Auth:
 * اگر کاربر لاگین نباشد، فرم لاگین inline در همین صفحه نمایش داده می‌شود.
 *
 * 🔄 Flow:
 * 1. کاربر لاگین نیست → فرم لاگین inline نمایش داده می‌شود
 * 2. پس از لاگین موفق، فرم PreChatForm نمایش داده می‌شود
 * 3. پیام با type='instructor' و metaData ذخیره می‌شود
 * 4. پس از ارسال موفق، پیام تأیید نمایش داده می‌شود
 */

'use client';

import { useState, useEffect } from 'react';
import { useSession, signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import PreChatForm from '@/components/chat/PreChatForm';
import { getMyMentorMessages } from '@/lib/messagesApi';
import styles from './contact-mentor.module.scss';

// ─── Inline Login Form ────────────────────────────────────────────────────────
function InlineLoginForm() {
    const [step, setStep] = useState('phone'); // 'phone' | 'otp'
    const [phone, setPhone] = useState('');
    const [otp, setOtp] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handlePhoneSubmit = async (e) => {
        e.preventDefault();
        setError('');
        if (!phone || phone.length < 11) {
            setError('شماره موبایل معتبر نیست');
            return;
        }
        setLoading(true);
        try {
            const strapiUrl = process.env.NEXT_PUBLIC_STRAPI_API_URL || 'http://localhost:1337';
            const response = await fetch(`${strapiUrl}/api/auth/otp/send`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ phoneNumber: phone }),
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'خطا در ارسال کد تایید');
            setStep('otp');
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleOTPSubmit = async (e) => {
        e.preventDefault();
        setError('');
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
            if (result?.error) throw new Error('کد تایید نامعتبر است');
            // session automatically refreshes — page re-renders with PreChatForm
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className={styles.authBox}>
            {/* ── Header ── */}
            <div className={styles.authBox__header}>
                <div className={styles.authBox__icon} aria-hidden="true">
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none"
                        stroke="currentColor" strokeWidth="1.8"
                        strokeLinecap="round" strokeLinejoin="round">
                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                        <circle cx="12" cy="7" r="4" />
                    </svg>
                </div>
                <h1 className={styles.authBox__title}>برای ارتباط با استاد لاگین شوید</h1>
                <p className={styles.authBox__subtitle}>
                    برای ارسال پیام به استاد، ابتدا وارد حساب کاربری خود شوید.
                </p>
            </div>

            {/* ── Phone Step ── */}
            {step === 'phone' && (
                <form onSubmit={handlePhoneSubmit} className={styles.authBox__form}>
                    <div className={styles.authBox__field}>
                        <label htmlFor="cm-phone" className={styles.authBox__label}>
                            شماره موبایل
                        </label>
                        <input
                            type="tel"
                            id="cm-phone"
                            className={styles.authBox__input}
                            placeholder="09123456789"
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            disabled={loading}
                            maxLength={11}
                            dir="ltr"
                            autoComplete="tel"
                        />
                    </div>
                    {error && <div className={styles.authBox__error} role="alert">{error}</div>}
                    <button
                        type="submit"
                        className={styles.authBox__submit}
                        disabled={loading}
                        id="cm-phone-submit"
                    >
                        {loading ? 'در حال ارسال...' : 'دریافت کد تایید'}
                    </button>
                </form>
            )}

            {/* ── OTP Step ── */}
            {step === 'otp' && (
                <form onSubmit={handleOTPSubmit} className={styles.authBox__form}>
                    <p className={styles.authBox__otpHint}>
                        کد ۶ رقمی ارسال شده به{' '}
                        <span className={styles.authBox__phoneDisplay}>{phone}</span>{' '}
                        را وارد کنید
                    </p>
                    <div className={styles.authBox__field}>
                        <label htmlFor="cm-otp" className={styles.authBox__label}>
                            کد تایید
                        </label>
                        <input
                            type="text"
                            id="cm-otp"
                            className={styles.authBox__input}
                            placeholder="123456"
                            value={otp}
                            onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                            disabled={loading}
                            maxLength={6}
                            dir="ltr"
                            autoComplete="one-time-code"
                            inputMode="numeric"
                        />
                    </div>
                    {error && <div className={styles.authBox__error} role="alert">{error}</div>}
                    <button
                        type="submit"
                        className={styles.authBox__submit}
                        disabled={loading}
                        id="cm-otp-submit"
                    >
                        {loading ? 'در حال تایید...' : 'تایید و ورود'}
                    </button>
                    <button
                        type="button"
                        className={styles.authBox__back}
                        onClick={() => { setStep('phone'); setOtp(''); setError(''); }}
                        disabled={loading}
                        id="cm-otp-back"
                    >
                        بازگشت به وارد کردن شماره
                    </button>
                </form>
            )}
        </div>
    );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function ContactMentorPage() {
    const { data: session, status } = useSession();
    const router = useRouter();

    const [submittedMessage, setSubmittedMessage] = useState(null);
    const [isCheckingHistory, setIsCheckingHistory] = useState(true);

    useEffect(() => {
        if (status === 'loading') return;

        if (status === 'unauthenticated') {
            setIsCheckingHistory(false);
            return;
        }

        if (status === 'authenticated' && session?.user?.jwt) {
            let isMounted = true;

            const checkMentorHistory = async () => {
                try {
                    const res = await getMyMentorMessages(session.user.jwt);
                    const mentorMsgs = res?.data || [];

                    if (!isMounted) return;

                    if (mentorMsgs.length > 0) {
                        // کاربر قبلاً پیام به استاد ارسال کرده است → هدایت به پیام‌ها با باز شدن چت استاد
                        router.replace('/profile/messages?open=mentor');
                        return;
                    }
                } catch (err) {
                    console.error('Failed to check mentor chat history:', err);
                } finally {
                    if (isMounted) {
                        setIsCheckingHistory(false);
                    }
                }
            };

            checkMentorHistory();

            return () => {
                isMounted = false;
            };
        }
    }, [status, session?.user?.jwt, router]);

    // نمایش loading در حین بررسی session یا بررسی تاریخچه پیام‌ها
    if (status === 'loading' || (status === 'authenticated' && isCheckingHistory)) {
        return (
            <div className={styles.page}>
                <div className={styles.loadingState}>
                    <div className={styles.spinner} aria-hidden="true" />
                    <span>در حال بارگذاری...</span>
                </div>
            </div>
        );
    }

    // ─── اگر لاگین نیست → فرم لاگین inline ────────────────────────────────
    if (status === 'unauthenticated') {
        return (
            <div className={styles.page}>
                <InlineLoginForm />
            </div>
        );
    }

    // ─── پس از ارسال موفق ────────────────────────────────────────────────────
    if (submittedMessage) {
        return (
            <div className={styles.page}>
                <div className={styles.successCard} role="alert" aria-live="polite">
                    <div className={styles.successCard__icon}>
                        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                            <polyline points="22 4 12 14.01 9 11.01" />
                        </svg>
                    </div>
                    <h2 className={styles.successCard__title}>پیام شما ارسال شد!</h2>
                    <p className={styles.successCard__desc}>
                        پیام شما با موفقیت برای استاد ارسال شد. لطفاً منتظر پاسخ باشید.
                        می‌توانید وضعیت پیام را از پنل کاربری خود پیگیری کنید.
                    </p>
                    <div className={styles.successCard__actions}>
                        <button
                            onClick={() => router.push('/profile/messages?open=mentor')}
                            className={styles.successCard__btn}
                            id="contact-mentor-goto-messages"
                        >
                            مشاهده پیام‌های من
                        </button>
                        <button
                            onClick={() => setSubmittedMessage(null)}
                            className={styles.successCard__btnSecondary}
                            id="contact-mentor-send-another"
                        >
                            ارسال پیام جدید
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className={styles.page}>
            {/* PreChatForm با توکن کاربر و callback موفقیت */}
            <PreChatForm
                token={session.user.jwt}
                onSuccess={(newMessage) => setSubmittedMessage(newMessage)}
            />
        </div>
    );
}
