'use client';

import { useState } from 'react';
import MessageDetailModal from './MessageDetailModal';
import styles from './MessagesList.module.scss';

const statusMap = {
    open: { label: 'در انتظار پاسخ', className: 'open' },
    closed: { label: 'بسته شده', className: 'closed' },
    pending: { label: 'در انتظار', className: 'pending' },
    answered: { label: 'پاسخ داده شد', className: 'closed' },
};

export default function MessagesList({ messages = [], onUpdateMessage }) {
    const [selectedMessage, setSelectedMessage] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

    const handleOpen = (msg) => {
        setSelectedMessage(msg);
        setIsModalOpen(true);
    };

    const handleClose = () => {
        setIsModalOpen(false);
        setSelectedMessage(null);
    };

    const formatDate = (dateStr) => {
        if (!dateStr) return '';
        return new Date(dateStr).toLocaleDateString('fa-IR', {
            year: 'numeric', month: 'short', day: 'numeric',
        });
    };

    const getExcerpt = (text, max = 80) => {
        if (!text) return '';
        return text.length > max ? text.slice(0, max) + '…' : text;
    };

    return (
        <>
            <div className={styles.messagesList} dir="rtl">
                {messages.map((msg, index) => {
                    const status = statusMap[msg.status] || statusMap.open;
                    const hasReplies = Array.isArray(msg.replies) && msg.replies.length > 0;
                    const itemKey = msg.documentId || `${msg.id}-${msg.messageType || 'contact'}-${index}`;

                    return (
                        <button
                            key={itemKey}
                            className={styles.messagesList__item}
                            onClick={() => handleOpen(msg)}
                            type="button"
                        >
                            <div className={styles.messagesList__header}>
                                <h3 className={styles.messagesList__subject}>
                                    {msg.subject || 'بدون موضوع'}
                                </h3>
                                <span className={`${styles.messagesList__badge} ${styles[`messagesList__badge--${status.className}`]}`}>
                                    {status.label}
                                </span>
                            </div>

                            <p className={styles.messagesList__excerpt}>
                                {getExcerpt(msg.body)}
                            </p>

                            <div className={styles.messagesList__footer}>
                                <time className={styles.messagesList__date}>
                                    {formatDate(msg.createdAt)}
                                </time>
                                <span className={styles.messagesList__replyIndicator}>
                                    {hasReplies ? (
                                        <>
                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                                            </svg>
                                            {msg.replies.length} پاسخ
                                        </>
                                    ) : (
                                        <span className={styles['messagesList__replyIndicator--none']}>
                                            بدون پاسخ
                                        </span>
                                    )}
                                </span>
                            </div>
                        </button>
                    );
                })}
            </div>

            <MessageDetailModal
                message={selectedMessage}
                isOpen={isModalOpen}
                onClose={handleClose}
                onUpdateMessage={(updatedFields) => {
                    if (onUpdateMessage) {
                        onUpdateMessage(selectedMessage.documentId || String(selectedMessage.id), updatedFields);
                    }
                    setSelectedMessage((prev) =>
                        prev ? { ...prev, ...updatedFields } : null
                    );
                }}
            />
        </>
    );
}
