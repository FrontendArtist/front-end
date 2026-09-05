'use client';

import { useEffect, Suspense } from 'react';
import { useSession } from 'next-auth/react';
import { useSearchParams } from 'next/navigation';
import MessagesList from '@/modules/profile/MessagesList';
import EmptyState from '@/components/ui/EmptyState/EmptyState';
import { useUserMessagesStore } from '@/store/useUserMessagesStore';
import styles from './messages.module.scss';

function MessagesContent() {
    const { data: session } = useSession();
    const searchParams = useSearchParams();
    const openParam = searchParams.get('open');
    const autoOpenMentor = openParam === 'mentor' || searchParams.get('mentor') === 'true';
    const autoOpenId = (!autoOpenMentor && openParam) ? openParam : null;

    const { messages, isLoading, error, fetchMessages, updateMessageInStore } = useUserMessagesStore();

    useEffect(() => {
        if (!session?.user?.jwt) return;
        fetchMessages(session.user.jwt, session.user?.id);
    }, [session?.user?.jwt, session?.user?.id, fetchMessages]);

    const handleUpdateMessage = (docId, updatedFields) => {
        updateMessageInStore(docId, updatedFields);
    };

    return (
        <div className={styles.messagesPage} dir="rtl">
            <div className={styles.messagesPage__header}>
                <h1 className={styles.messagesPage__title}>پیام‌های من</h1>
                <p className={styles.messagesPage__subtitle}>
                    لیست پیام‌هایی که از طریق فرم تماس یا ارتباط با استاد ارسال کرده‌اید
                </p>
            </div>

            {isLoading && (
                <div className={styles.messagesPage__loader}>
                    <div className={styles.messagesPage__spinner} />
                    <span>در حال بارگذاری...</span>
                </div>
            )}

            {!isLoading && error && (
                <div className={styles.messagesPage__error}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="10" />
                        <path d="M12 8v4M12 16h.01" />
                    </svg>
                    {error}
                </div>
            )}

            {!isLoading && !error && messages.length === 0 && (
                <EmptyState
                    title="پیامی وجود ندارد"
                    description="هنوز هیچ پیامی ارسال نکرده‌اید"
                    actionLabel="ارسال پیام"
                    actionHref="/contact"
                />
            )}

            {!isLoading && !error && messages.length > 0 && (
                <MessagesList
                    messages={messages}
                    onUpdateMessage={handleUpdateMessage}
                    autoOpenMentor={autoOpenMentor}
                    autoOpenId={autoOpenId}
                />
            )}
        </div>
    );
}

export default function MessagesPage() {
    return (
        <Suspense
            fallback={
                <div className={styles.messagesPage} dir="rtl">
                    <div className={styles.messagesPage__loader}>
                        <div className={styles.messagesPage__spinner} />
                        <span>در حال بارگذاری...</span>
                    </div>
                </div>
            }
        >
            <MessagesContent />
        </Suspense>
    );
}
