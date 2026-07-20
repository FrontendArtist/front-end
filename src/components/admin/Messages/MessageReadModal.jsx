'use strict';

import React, { useState, useEffect } from 'react';
import Modal from '@/components/ui/Modal/Modal';
import { User, Mail, Calendar, Info, Trash2, FileText, Send } from 'lucide-react';
import styles from './Messages.module.scss';

/**
 * MessageReadModal Component
 * Displays the full contact message details, chat history, and reply section for admins.
 */
export default function MessageReadModal({ isOpen, onClose, message, onUpdateMessage, onDelete, isDeleting = false }) {
    const [replyText, setReplyText] = useState('');
    const [status, setStatus] = useState('open');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState(null);

    // Sync status with message when selected message changes
    useEffect(() => {
        if (message) {
            setStatus(message.status || 'open');
            setError(null);
            setReplyText('');
        }
    }, [message]);

    if (!message) return null;

    // Format shamsi date
    const formatDate = (dateString) => {
        try {
            return new Intl.DateTimeFormat('fa-IR', {
                dateStyle: 'medium',
                timeStyle: 'short',
            }).format(new Date(dateString));
        } catch {
            return '—';
        }
    };

    const statusMap = {
        open: { label: 'باز (پاسخ داده نشده)', colorClass: 'badge--unread' },
        pending: { label: 'در حال بررسی (پاسخ داده شده)', colorClass: 'badge--read' },
        closed: { label: 'بسته شده / حل شده', colorClass: 'badge--read' },
    };

    const isChanged = replyText.trim() !== '' || status !== message.status;

    const handleSubmitReply = async (e) => {
        e.preventDefault();
        if (!isChanged || isSubmitting) return;

        setIsSubmitting(true);
        setError(null);

        const existingReplies = Array.isArray(message.replies) ? message.replies : [];
        let updatedReplies = [...existingReplies];

        // Only append reply if text is actually entered
        if (replyText.trim()) {
            updatedReplies.push({
                body: replyText.trim(),
                isAdmin: true,
                createdAt: new Date().toISOString()
            });
        }

        try {
            const res = await fetch(`/api/admin/contact-messages/${message.documentId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    replies: updatedReplies,
                    status: status,
                    isRead: true
                }),
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data?.error || 'خطا در ذخیره‌سازی اطلاعات');
            }

            // Update local state in table
            if (onUpdateMessage) {
                onUpdateMessage({
                    replies: updatedReplies,
                    status: status,
                    isRead: true
                });
            }

            setReplyText('');
        } catch (err) {
            setError(err.message || 'بروز خطا هنگام ثبت پاسخ. لطفاً مجدداً امتحان کنید.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const currentStatusConfig = statusMap[message.status] || statusMap.open;

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="جزئیات و پاسخ به پیام تماس">
            <div className={styles.modalDetails}>

                {/* بخش اول: اطلاعات فرستنده */}
                <div className={styles.detailsGrid}>
                    <div className={styles.detailItem}>
                        <span className={styles.label}>
                            <User size={14} style={{ marginLeft: '4px', verticalAlign: 'middle' }} />
                            نام فرستنده
                        </span>
                        <span className={styles.value}>{message.name}</span>
                    </div>

                    <div className={styles.detailItem}>
                        <span className={styles.label}>
                            <Mail size={14} style={{ marginLeft: '4px', verticalAlign: 'middle' }} />
                            اطلاعات تماس
                        </span>
                        <span className={`${styles.value} ${styles.valueLtr}`}>{message.contactInfo}</span>
                    </div>

                    <div className={styles.detailItem} style={{ gridColumn: 'span 2' }}>
                        <span className={styles.label}>
                            <FileText size={14} style={{ marginLeft: '4px', verticalAlign: 'middle' }} />
                            موضوع پیام
                        </span>
                        <span className={styles.value}>{message.subject || 'بدون موضوع'}</span>
                    </div>

                    <div className={styles.detailItem}>
                        <span className={styles.label}>
                            <Calendar size={14} style={{ marginLeft: '4px', verticalAlign: 'middle' }} />
                            تاریخ ارسال
                        </span>
                        <span className={styles.value}>{formatDate(message.createdAt)}</span>
                    </div>

                    <div className={styles.detailItem}>
                        <span className={styles.label}>
                            <Info size={14} style={{ marginLeft: '4px', verticalAlign: 'middle' }} />
                            وضعیت فعلی
                        </span>
                        <span className={styles.value}>
                            <span className={`${styles.badge} ${styles[currentStatusConfig.colorClass]}`}>
                                {currentStatusConfig.label}
                            </span>
                        </span>
                    </div>
                </div>

                {/* بخش دوم: رشته گفتگو (پیام اصلی + پاسخ‌ها) */}
                <div className={styles.messageBodyBox}>
                    <span className={styles.label}>رشته گفتگو</span>
                    <div className={styles.messageThread}>
                        {/* پیام اصلی */}
                        <div className={`${styles.chatBubble} ${styles['chatBubble--user']}`}>
                            <div className={styles.bubbleHeader}>
                                <span className={styles.bubbleAuthor}>{message.name} (پیام اولیه)</span>
                                <span className={styles.bubbleTime}>{formatDate(message.createdAt)}</span>
                            </div>
                            <p className={styles.bubbleText}>{message.body}</p>
                        </div>

                        {/* پاسخ‌های گفتگو */}
                        {Array.isArray(message.replies) && message.replies.map((reply, index) => (
                            <div
                                key={index}
                                className={`${styles.chatBubble} ${reply.isAdmin ? styles['chatBubble--admin'] : styles['chatBubble--user']}`}
                            >
                                <div className={styles.bubbleHeader}>
                                    <span className={styles.bubbleAuthor}>
                                        {reply.isAdmin ? 'پشتیبانی (شما)' : message.name}
                                    </span>
                                    <span className={styles.bubbleTime}>{formatDate(reply.createdAt)}</span>
                                </div>
                                <p className={styles.bubbleText}>{reply.body}</p>
                            </div>
                        ))}
                    </div>
                </div>

                {/* بخش سوم: فرم ارسال پاسخ و مدیریت وضعیت */}
                <form onSubmit={handleSubmitReply} className={styles.replyForm}>
                    <div className={styles.messageBodyBox}>
                        <label htmlFor="adminReplyText" className={styles.label}>ثبت پاسخ جدید (اختیاری)</label>
                        <textarea
                            id="adminReplyText"
                            className={styles.replyTextarea}
                            placeholder="پاسخ خود را اینجا بنویسید..."
                            value={replyText}
                            onChange={(e) => setReplyText(e.target.value)}
                            disabled={isSubmitting}
                        />
                    </div>

                    <div className={styles.statusSelector}>
                        <span>تغییر وضعیت پیام:</span>
                        <select
                            className={styles.statusSelect}
                            value={status}
                            onChange={(e) => setStatus(e.target.value)}
                            disabled={isSubmitting}
                        >
                            <option value="open">باز (پاسخ داده نشده)</option>
                            <option value="pending">در حال بررسی (پاسخ داده شده)</option>
                            <option value="closed">بسته شده / حل شده</option>
                        </select>

                        <button
                            type="submit"
                            className={styles.btnSubmitReply}
                            disabled={!isChanged || isSubmitting}
                        >
                            <Send size={14} style={{ marginLeft: '4px' }} />
                            {isSubmitting ? 'در حال ثبت...' : 'ارسال پاسخ و بروزرسانی'}
                        </button>
                    </div>

                    {error && (
                        <div className={styles.statusMessage} style={{ color: 'var(--color-error)', fontSize: 'var(--font-sm)', marginTop: '0.5rem' }}>
                            {error}
                        </div>
                    )}
                </form>

                {/* دکمه‌های کلی modal */}
                <div className={styles.modalActions}>
                    {onDelete && (
                        <button
                            type="button"
                            className={styles.btnDeleteModal}
                            onClick={() => onDelete(message.documentId)}
                            disabled={isDeleting}
                        >
                            <Trash2 size={16} style={{ marginLeft: '6px', verticalAlign: 'middle', display: 'inline' }} />
                            {isDeleting ? 'در حال حذف...' : 'حذف پیام'}
                        </button>
                    )}
                    <button
                        type="button"
                        className={styles.btnCloseModal}
                        onClick={onClose}
                    >
                        بستن
                    </button>
                </div>
            </div>
        </Modal>
    );
}
