'use client';

/**
 * @file src/modules/profile/MessageDetailModal.jsx
 * @description پنجره چت اختصاصی کاربر (SPA Chat View)
 *
 * 🎯 Purpose:
 * جایگزین مدال کوچک با یک رابط کاربری کامل و مدرن چت (مشابه چت استاد).
 * با کلیک روی ضبدر یا کلید Escape بسته‌می‌شود.
 */

import React, { useState, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { updateMyMessage, updateInstructorMessage } from '@/lib/messagesApi';
import styles from './MessageDetailModal.module.scss';

const statusMap = {
    open: { label: 'در انتظار پاسخ', className: 'open' },
    closed: { label: 'بسته شده', className: 'closed' },
    pending: { label: 'در انتظار', className: 'pending' },
    answered: { label: 'پاسخ داده شد', className: 'answered' },
};

function formatDate(dateStr) {
    if (!dateStr) return '';
    try {
        return new Date(dateStr).toLocaleDateString('fa-IR', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
        });
    } catch {
        return '';
    }
}

function formatTime(dateStr) {
    if (!dateStr) return '';
    try {
        return new Date(dateStr).toLocaleTimeString('fa-IR', {
            hour: '2-digit',
            minute: '2-digit',
        });
    } catch {
        return '';
    }
}

export default function MessageDetailModal({ message, isOpen, onClose, onUpdateMessage }) {
    const { data: session } = useSession();
    const [replyText, setReplyText] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState(null);
    const messagesEndRef = useRef(null);

    // بستن با کلید Escape
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape' && isOpen) {
                onClose();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, onClose]);

    // Auto-scroll به انتهای گفتگو
    useEffect(() => {
        if (isOpen) {
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }
    }, [isOpen, message?.replies?.length]);

    if (!isOpen || !message) return null;

    const status = statusMap[message.status] || statusMap.open;
    const isClosed = message.status === 'closed';

    const handleSubmitReply = async (e) => {
        e.preventDefault();
        if (!replyText.trim() || isSubmitting || !session?.user?.jwt) return;

        setIsSubmitting(true);
        setError(null);

        const newReply = {
            body: replyText.trim(),
            isAdmin: false,
            sender: 'user',
            createdAt: new Date().toISOString()
        };

        const existingReplies = Array.isArray(message.replies) ? message.replies : [];
        const updatedReplies = [...existingReplies, newReply];

        try {
            const payload = {
                replies: updatedReplies,
                status: 'open',
                isRead: false
            };

            const isInstructorThread = message.messageType === 'instructor' || message.type === 'instructor';
            if (isInstructorThread) {
                await updateInstructorMessage(message.documentId || String(message.id), session.user.jwt, payload);
            } else {
                await updateMyMessage(message.documentId || String(message.id), session.user.jwt, payload);
            }

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

    const handleReplyKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSubmitReply(e);
        }
    };

    return (
        <div className={styles.overlay} dir="rtl" role="dialog" aria-modal="true">
            <div className={styles.chatWindow}>

                {/* ─── Header ─────────────────────────────────────────────────── */}
                <div className={styles.chatHeader}>
                    <div className={styles.chatHeader__info}>
                        <h2 className={styles.chatHeader__title}>
                            {message.subject || 'گفتگوی مشاوره'}
                        </h2>
                        <div className={styles.chatHeader__meta}>
                            <span className={`${styles.badge} ${styles[`badge--${status.className}`]}`}>
                                {status.label}
                            </span>
                            <time className={styles.chatHeader__date}>
                                {formatDate(message.createdAt)}
                            </time>
                        </div>
                    </div>

                    {/* دکمه بستن (ضبدر) */}
                    <button
                        onClick={onClose}
                        className={styles.chatHeader__closeBtn}
                        aria-label="بستن گفتگو"
                    >
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="18" y1="6" x2="6" y2="18" />
                            <line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                    </button>
                </div>

                {/* ─── Stream / Messages ─────────────────────────────────────── */}
                <div className={styles.messagesStream} aria-live="polite">

                    {/* پیام اول کاربر */}
                    <div className={`${styles.bubble} ${styles['bubble--user']}`}>
                        <div className={styles.bubble__header}>
                            <span>شما</span>
                            <time className={styles.bubble__time}>
                                {formatTime(message.createdAt)}
                            </time>
                        </div>
                        <div className={styles.bubble__text}>
                            {message.body}
                        </div>
                    </div>

                    {/* لیست پاسخ‌ها */}
                    {Array.isArray(message.replies) && message.replies.map((reply, index) => {
                        const isInstructor = reply.sender === 'instructor';
                        const isStaff = reply.isAdmin || isInstructor;
                        const authorLabel = isInstructor ? 'استاد' : (reply.isAdmin ? 'پشتیبانی' : 'شما');

                        return (
                            <div
                                key={index}
                                className={`${styles.bubble} ${isStaff
                                    ? styles['bubble--staff']
                                    : styles['bubble--user']
                                    }`}
                            >
                                <div className={styles.bubble__header}>
                                    <span>{authorLabel}</span>
                                    <time className={styles.bubble__time}>
                                        {formatTime(reply.createdAt)}
                                    </time>
                                </div>
                                <div className={styles.bubble__text}>
                                    {reply.body}
                                </div>
                            </div>
                        );
                    })}

                    <div ref={messagesEndRef} aria-hidden="true" />
                </div>

                {/* ─── Reply Form Bar ─────────────────────────────────────────── */}
                {!isClosed ? (
                    <form onSubmit={handleSubmitReply} className={styles.replyArea}>
                        <textarea
                            value={replyText}
                            onChange={(e) => setReplyText(e.target.value)}
                            onKeyDown={handleReplyKeyDown}
                            placeholder="پاسخ خود را بنویسید... (Enter برای ارسال)"
                            className={styles.replyArea__input}
                            rows={1}
                            disabled={isSubmitting}
                            aria-label="پاسخ به گفتگو"
                        />
                        <button
                            type="submit"
                            disabled={!replyText.trim() || isSubmitting}
                            className={styles.replyArea__sendBtn}
                            aria-label="ارسال پاسخ"
                        >
                            {isSubmitting ? (
                                <span className={styles.spinner} aria-hidden="true" />
                            ) : (
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <line x1="22" y1="2" x2="11" y2="13" />
                                    <polygon points="22 2 15 22 11 13 2 9 22 2" />
                                </svg>
                            )}
                        </button>
                    </form>
                ) : (
                    <div className={styles.closedBanner}>
                        این گفتگو بسته شده است و امکان ارسال پاسخ جدید وجود ندارد.
                    </div>
                )}

                {error && (
                    <div className={styles.errorAlert} role="alert">
                        {error}
                    </div>
                )}
            </div>
        </div>
    );
}
