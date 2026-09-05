/**
 * @file src/app/contact-mentor/page.jsx
 * @description صفحه ارسال پیام به استاد برای کاربران عادی — Client Component
 *
 * 🎯 Purpose:
 * کاربر لاگین‌شده از این صفحه می‌تواند فرم پیش‌نیاز را پر کند و
 * اولین پیام خود را به استاد ارسال کند.
 *
 * 🔐 Auth:
 * از کامپوننت مشترک و ماژولار AuthForm برای لاگین استفاده می‌کند.
 */

'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import PreChatForm from '@/components/chat/PreChatForm';
import AuthForm from '@/components/auth/AuthForm';
import { getMyMentorMessages } from '@/lib/messagesApi';
import styles from './contact-mentor.module.scss';

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

    // ─── اگر لاگین نیست → کامپوننت مشترک AuthForm ────────────────────────
    if (status === 'unauthenticated') {
        return (
            <div className={styles.page}>
                <AuthForm
                    title="برای ارتباط با استاد لاگین شوید"
                    subtitle="برای ارسال پیام به استاد، ابتدا وارد حساب کاربری خود شوید."
                    icon={
                        <svg width="32" height="32" viewBox="0 0 24 24" fill="none"
                            stroke="currentColor" strokeWidth="1.8"
                            strokeLinecap="round" strokeLinejoin="round">
                            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                            <circle cx="12" cy="7" r="4" />
                        </svg>
                    }
                />
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
            <PreChatForm
                token={session.user.jwt}
                onSuccess={(newMessage) => setSubmittedMessage(newMessage)}
            />
        </div>
    );
}
