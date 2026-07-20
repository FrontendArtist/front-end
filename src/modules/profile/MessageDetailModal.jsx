'use client';

import React, { useState } from 'react';
import { useSession } from 'next-auth/react';
import Modal from '@/components/ui/Modal/Modal';
import { updateMyMessage } from '@/lib/messagesApi';
import styles from './MessageDetailModal.module.scss';

const statusMap = {
    open: { label: 'باز', className: 'open' },
    closed: { label: 'بسته', className: 'closed' },
    pending: { label: 'در انتظار', className: 'pending' },
};

export default function MessageDetailModal({ message, isOpen, onClose, onUpdateMessage }) {
    const { data: session } = useSession();
    const [replyText, setReplyText] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState(null);

    if (!message) return null;

    const status = statusMap[message.status] || statusMap.open;

    const formattedDate = (dateStr) => {
        if (!dateStr) return '';
        return new Date(dateStr).toLocaleDateString('fa-IR', {
            year: 'numeric', month: 'long', day: 'numeric',
            hour: '2-digit', minute: '2-digit',
        });
    };

    const handleSubmitReply = async (e) => {
        e.preventDefault();
        if (!replyText.trim() || isSubmitting || !session?.user?.jwt) return;

        setIsSubmitting(true);
        setError(null);

        const newReply = {
            body: replyText.trim(),
            isAdmin: false,
            createdAt: new Date().toISOString()
        };

        const existingReplies = Array.isArray(message.replies) ? message.replies : [];
        const updatedReplies = [...existingReplies, newReply];

        try {
            // When user replies, set status back to open and isRead to false (so admin knows it needs another answer/review)
            const payload = {
                replies: updatedReplies,
                status: 'open',
                isRead: false
            };

            await updateMyMessage(message.documentId || String(message.id), session.user.jwt, payload);

            if (onUpdateMessage) {
                onUpdateMessage(payload);
            }

            setReplyText('');
        } catch (err) {
            setError('خطا در ارسال پاسخ. لطفاً دوباره تلاش کنید.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={message.subject || 'جزئیات پیام'}>
            <div className={styles.messageDetail} dir="rtl">

                {/* وضعیت و تاریخ */}
                <div className={styles.messageDetail__meta}>
                    <span className={`${styles.messageDetail__badge} ${styles[`messageDetail__badge--${status.className}`]}`}>
                        {status.label}
                    </span>
                    <time className={styles.messageDetail__time}>
                        {formattedDate(message.createdAt)}
                    </time>
                </div>

                {/* پیام اصلی کاربر */}
                <div className={styles.messageDetail__thread}>
                    <div className={`${styles.messageDetail__bubble} ${styles['messageDetail__bubble--user']}`}>
                        <div className={styles.messageDetail__bubbleHeader}>
                            <span className={styles.messageDetail__author}>{message.name || 'شما'}</span>
                            <time className={styles.messageDetail__bubbleTime}>
                                {formattedDate(message.createdAt)}
                            </time>
                        </div>
                        <p className={styles.messageDetail__text}>{message.body}</p>
                    </div>

                    {/* پاسخ‌های گفتگو */}
                    {Array.isArray(message.replies) && message.replies.map((reply, index) => (
                        <div
                            key={index}
                            className={`${styles.messageDetail__bubble} ${reply.isAdmin
                                ? styles['messageDetail__bubble--admin']
                                : styles['messageDetail__bubble--user']
                                }`}
                        >
                            <div className={styles.messageDetail__bubbleHeader}>
                                <span className={styles.messageDetail__author}>
                                    {reply.isAdmin ? 'پشتیبانی' : (message.name || 'شما')}
                                </span>
                                <time className={styles.messageDetail__bubbleTime}>
                                    {formattedDate(reply.createdAt)}
                                </time>
                            </div>
                            <p className={styles.messageDetail__text}>{reply.body}</p>
                        </div>
                    ))}
                </div>

                {/* فرم ارسال پاسخ جدید کاربر */}
                {message.status !== 'closed' ? (
                    <form onSubmit={handleSubmitReply} className={styles.messageDetail__replyForm}>
                        <textarea
                            className={styles.messageDetail__replyTextarea}
                            placeholder="پاسخ خود را بنویسید..."
                            value={replyText}
                            onChange={(e) => setReplyText(e.target.value)}
                            disabled={isSubmitting}
                            rows="2"
                        />
                        <div className={styles.messageDetail__replySubmitWrapper}>
                            <button
                                type="submit"
                                className={styles.messageDetail__replySubmit}
                                disabled={!replyText.trim() || isSubmitting}
                            >
                                {isSubmitting ? 'در حال ارسال...' : 'ارسال پاسخ'}
                            </button>
                        </div>
                        {error && (
                            <span className={styles.messageDetail__replyError}>{error}</span>
                        )}
                    </form>
                ) : (
                    <div className={styles.messageDetail__closedAlert}>
                        این گفتگو بسته شده است و امکان ارسال پاسخ جدید وجود ندارد.
                    </div>
                )}
            </div>
        </Modal>
    );
}
