'use client';

import React from 'react';
import Modal from '@/components/ui/Modal/Modal';
import { User, Mail, Calendar, Info, Trash2, FileText } from 'lucide-react';
import styles from './Messages.module.scss';

/**
 * MessageReadModal Component
 * Displays the full contact message details and body.
 */
export default function MessageReadModal({ isOpen, onClose, message, onDelete, isDeleting = false }) {
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

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="جزئیات پیام تماس">
            <div className={styles.modalDetails}>
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
                            وضعیت پیام
                        </span>
                        <span className={styles.value}>
                            <span className={`${styles.badge} ${message.isRead ? styles['badge--read'] : styles['badge--unread']}`}>
                                {message.isRead ? 'خوانده شده' : 'خوانده نشده'}
                            </span>
                        </span>
                    </div>
                </div>

                <div className={styles.messageBodyBox}>
                    <span className={styles.label}>متن پیام</span>
                    <div className={styles.bodyText}>
                        {message.body}
                    </div>
                </div>

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
