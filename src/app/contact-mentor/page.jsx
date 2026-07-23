/**
 * @file src/app/contact-mentor/page.jsx
 * @description صفحه ارسال پیام به استاد برای کاربران عادی — Client Component
 *
 * 🎯 Purpose:
 * کاربر لاگین‌شده از این صفحه می‌تواند فرم پیش‌نیاز را پر کند و
 * اولین پیام خود را به استاد ارسال کند.
 *
 * 🔐 Auth:
 * اگر کاربر لاگین نباشد به صفحه اصلی redirect می‌شود.
 *
 * 🔄 Flow:
 * 1. کاربر فرم PreChatForm را پر می‌کند
 * 2. پیام با type='instructor' و metaData ذخیره می‌شود
 * 3. پس از ارسال موفق، پیام تأیید نمایش داده می‌شود
 */

'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import PreChatForm from '@/components/chat/PreChatForm';
import styles from './contact-mentor.module.scss';

export default function ContactMentorPage() {
    const { data: session, status } = useSession();
    const router = useRouter();

    // پس از ارسال موفق، این state پر می‌شود تا صفحه تأیید نشان داده شود
    const [submittedMessage, setSubmittedMessage] = useState(null);

    // ─── Redirect اگر کاربر لاگین نباشد ────────────────────────────────────
    useEffect(() => {
        if (status === 'unauthenticated') {
            router.push('/');
        }
    }, [status, router]);

    // نمایش loading در حین بررسی session
    if (status === 'loading') {
        return (
            <div className={styles.page}>
                <div className={styles.loadingState}>
                    <div className={styles.spinner} aria-hidden="true" />
                    <span>در حال بارگذاری...</span>
                </div>
            </div>
        );
    }

    if (status === 'unauthenticated') return null;

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
                            onClick={() => router.push('/profile/messages')}
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
