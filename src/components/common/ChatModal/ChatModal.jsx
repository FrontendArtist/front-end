'use client';

/**
 * @file src/components/common/ChatModal/ChatModal.jsx
 * @description پنجره مودال چت مشترک و ماژولار (مورد استفاده در پنل کاربر و پنل مدیریت)
 */

import React, { useState, useEffect, useRef } from 'react';
import { User, Mail, Calendar, Trash2, Send, X } from 'lucide-react';
import styles from './ChatModal.module.scss';

const statusMap = {
    open: { label: 'در انتظار پاسخ', className: 'open' },
    closed: { label: 'بسته شده', className: 'closed' },
    pending: { label: 'در حال بررسی', className: 'pending' },
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

export default function ChatModal({
    isOpen,
    onClose,
    message,
    isAdmin = false,
    onSendReply,
    onStatusChange,
    onDelete,
    isDeleting = false,
    error: externalError = null,
}) {
    const [replyText, setReplyText] = useState('');
    const [selectedStatus, setSelectedStatus] = useState(message?.status || 'open');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [internalError, setInternalError] = useState(null);
    const messagesEndRef = useRef(null);

    // همگام‌سازی وضعیت در صورت تغییر پیام
    useEffect(() => {
        if (message) {
            setSelectedStatus(message.status || 'open');
            setReplyText('');
            setInternalError(null);
        }
    }, [message]);

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

    const handleStatusSelectChange = async (e) => {
        const newStatus = e.target.value;
        setSelectedStatus(newStatus);

        if (onStatusChange) {
            try {
                await onStatusChange(newStatus);
            } catch (err) {
                setInternalError(err.message || 'خطا در تغییر وضعیت');
            }
        }
    };

    const handleSubmitReply = async (e) => {
        if (e) e.preventDefault();

        const trimmed = replyText.trim();
        const statusChanged = selectedStatus !== message.status;

        // در پنل مدیریت اگر فقط وضعیت تغییر کرده یا متن پاسخ وارد شده، قابل ارسال است
        if (isAdmin) {
            if (!trimmed && !statusChanged) return;
        } else {
            if (!trimmed) return;
        }

        if (isSubmitting) return;

        setIsSubmitting(true);
        setInternalError(null);

        try {
            if (onSendReply) {
                await onSendReply({
                    body: trimmed,
                    status: selectedStatus,
                });
            }
            setReplyText('');
        } catch (err) {
            setInternalError(err.message || 'خطا در ارسال پاسخ. لطفاً دوباره تلاش کنید.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleReplyKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSubmitReply();
        }
    };

    const displayError = externalError || internalError;

    return (
        <div className={styles.overlay} dir="rtl" role="dialog" aria-modal="true">
            <div className={styles.chatWindow}>

                {/* ─── Header ─────────────────────────────────────────────────── */}
                <div className={styles.chatHeader}>
                    <div className={styles.chatHeader__topBar}>
                        <div className={styles.chatHeader__info}>
                            <h2 className={styles.chatHeader__title}>
                                {message.subject || 'گفتگوی پیام‌ها'}
                            </h2>
                            <div className={styles.chatHeader__meta}>
                                <span className={`${styles.badge} ${styles[`badge--${status.className}`]}`}>
                                    {status.label}
                                </span>
                                <time className={styles.chatHeader__date}>
                                    <Calendar size={13} style={{ marginLeft: '4px', verticalAlign: 'middle' }} />
                                    {formatDate(message.createdAt)}
                                </time>
                            </div>
                        </div>

                        <div className={styles.chatHeader__actions}>
                            {/* دکمه حذف برای مدیر */}
                            {isAdmin && onDelete && (
                                <button
                                    type="button"
                                    onClick={() => onDelete(message.documentId || message.id)}
                                    className={styles.chatHeader__deleteBtn}
                                    disabled={isDeleting}
                                    title="حذف پیام"
                                >
                                    <Trash2 size={16} />
                                    {isDeleting ? 'در حال حذف...' : 'حذف'}
                                </button>
                            )}

                            {/* دکمه بستن (ضبدر) */}
                            <button
                                onClick={onClose}
                                className={styles.chatHeader__closeBtn}
                                aria-label="بستن گفتگو"
                            >
                                <X size={20} />
                            </button>
                        </div>
                    </div>

                    {/* زیرعنوان اطلاعات فرستنده (در صورت وجود نام یا اطلاعات تماس) */}
                    {(message.name || message.contactInfo) && (
                        <div className={styles.chatHeader__senderDetails}>
                            {message.name && (
                                <div className={styles.senderTag}>
                                    <User size={14} style={{ color: 'var(--color-gold)' }} />
                                    <span>فرستنده:</span>
                                    <strong>{message.name}</strong>
                                </div>
                            )}
                            {message.contactInfo && (
                                <div className={styles.senderTag}>
                                    <Mail size={14} style={{ color: 'var(--color-title-hover)' }} />
                                    <span>اطلاعات تماس:</span>
                                    <strong className={styles.contactLtr}>{message.contactInfo}</strong>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* ─── Stream / Messages ─────────────────────────────────────── */}
                <div className={styles.messagesStream} aria-live="polite">

                    {/* پیام اول (شروع‌کننده) */}
                    <div className={`${styles.bubble} ${styles['bubble--user']}`}>
                        <div className={styles.bubble__header}>
                            <span>{message.name || 'کاربر'} (پیام اولیه)</span>
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
                        
                        let authorLabel = 'کاربر';
                        if (isInstructor) {
                            authorLabel = 'استاد';
                        } else if (reply.isAdmin) {
                            authorLabel = isAdmin ? 'پشتیبانی (شما)' : 'پشتیبانی';
                        } else {
                            authorLabel = isAdmin ? (message.name || 'کاربر') : 'شما';
                        }

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
                {(!isClosed || isAdmin) ? (
                    <form onSubmit={handleSubmitReply} className={styles.replyArea}>
                        <textarea
                            value={replyText}
                            onChange={(e) => setReplyText(e.target.value)}
                            onKeyDown={handleReplyKeyDown}
                            placeholder={isAdmin ? "پاسخ مدیریت را بنویسید... (Enter برای ارسال)" : "پاسخ خود را بنویسید... (Enter برای ارسال)"}
                            className={styles.replyArea__input}
                            rows={1}
                            disabled={isSubmitting}
                            aria-label="پاسخ به گفتگو"
                        />

                        {isAdmin ? (
                            <div className={styles.replyArea__adminControls}>
                                <select
                                    className={styles.statusSelect}
                                    value={selectedStatus}
                                    onChange={handleStatusSelectChange}
                                    disabled={isSubmitting}
                                    title="تغییر وضعیت پیام"
                                >
                                    <option value="open">باز (پاسخ داده نشده)</option>
                                    <option value="pending">در حال بررسی</option>
                                    <option value="closed">بسته شده / حل شده</option>
                                </select>

                                <button
                                    type="submit"
                                    disabled={(!replyText.trim() && selectedStatus === message.status) || isSubmitting}
                                    className={styles.replyArea__sendBtn}
                                    aria-label="ارسال پاسخ"
                                >
                                    {isSubmitting ? (
                                        <span className={styles.spinner} aria-hidden="true" />
                                    ) : (
                                        <>
                                            <Send size={16} />
                                            <span>ثبت پاسخ</span>
                                        </>
                                    )}
                                </button>
                            </div>
                        ) : (
                            <button
                                type="submit"
                                disabled={!replyText.trim() || isSubmitting}
                                className={styles.replyArea__sendBtn}
                                aria-label="ارسال پاسخ"
                            >
                                {isSubmitting ? (
                                    <span className={styles.spinner} aria-hidden="true" />
                                ) : (
                                    <Send size={18} />
                                )}
                            </button>
                        )}
                    </form>
                ) : (
                    <div className={styles.closedBanner}>
                        این گفتگو بسته شده است و امکان ارسال پاسخ جدید وجود ندارد.
                    </div>
                )}

                {displayError && (
                    <div className={styles.errorAlert} role="alert">
                        {displayError}
                    </div>
                )}
            </div>
        </div>
    );
}
