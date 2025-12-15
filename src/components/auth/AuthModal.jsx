'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import useAuthStore from '@/store/authStore';
import styles from './AuthModal.module.scss';

export default function AuthModal() {
    const { isAuthModalOpen, authStep, phoneNumber, closeAuthModal, setAuthStep, setPhoneNumber } = useAuthStore();

    const [phone, setPhone] = useState('');
    const [otp, setOtp] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

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
            setPhoneNumber(phone);
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
                phoneNumber: phoneNumber,
                otpCode: otp,
                redirect: false,
            });

            if (result?.error) {
                throw new Error('کد تایید نامعتبر است');
            }

            // Success - close modal
            closeAuthModal();
            setPhone('');
            setOtp('');
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

    const handleClose = () => {
        closeAuthModal();
        setPhone('');
        setOtp('');
        setError('');
    };

    if (!isAuthModalOpen) return null;

    return (
        <div className={styles.overlay} onClick={handleClose}>
            <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
                <button className={styles.closeButton} onClick={handleClose}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                </button>

                {authStep === 'phone' ? (
                    <div className={styles.content}>
                        <h2 className={styles.title}>ورود / ثبت‌نام</h2>
                        <p className={styles.description}>شماره موبایل خود را وارد کنید</p>

                        <form onSubmit={handlePhoneSubmit}>
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
                    </div>
                ) : (
                    <div className={styles.content}>
                        <h2 className={styles.title}>تایید شماره موبایل</h2>
                        <p className={styles.description}>
                            کد ۶ رقمی ارسال شده به شماره <span className={styles.phoneDisplay}>{phoneNumber}</span> را وارد کنید
                        </p>

                        <form onSubmit={handleOTPSubmit}>
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
            </div>
        </div>
    );
}
