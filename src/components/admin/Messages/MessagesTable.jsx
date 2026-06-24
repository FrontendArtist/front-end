'use client';

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { Eye, Trash2, Mail, MailOpen, AlertCircle, Info, Search } from 'lucide-react';
import styles from './Messages.module.scss';
import MessageReadModal from './MessageReadModal';

const PAGE_SIZE = 15;
const TOAST_ICONS = { success: '✅', error: '❌', info: 'ℹ️' };

function useToast() {
    const [toasts, setToasts] = useState([]);

    const addToast = useCallback((message, type = 'success') => {
        const id = Date.now();
        setToasts((prev) => [...prev, { id, message, type }]);
        setTimeout(() => {
            setToasts((prev) => prev.filter((t) => t.id !== id));
        }, 3500);
    }, []);

    return { toasts, addToast };
}

export default function MessagesTable({ initialMessages }) {
    const { toasts, addToast } = useToast();

    // ── Local state ──────────────────────────────────────────────────────────
    const [messages, setMessages] = useState(initialMessages || []);
    const [searchQuery, setSearchQuery] = useState('');
    const [filterType, setFilterType] = useState('all'); // 'all' | 'read' | 'unread'
    const [currentPage, setCurrentPage] = useState(1);
    const [selectedMessage, setSelectedMessage] = useState(null);
    const [deleteTarget, setDeleteTarget] = useState(null);
    const [isDeleting, setIsDeleting] = useState(false);

    // ── Fetch Details & Mark as Read ─────────────────────────────────────────
    const handleOpenMessage = async (message) => {
        setSelectedMessage(message);

        // If it's already read, no need to call API
        if (message.isRead) return;

        try {
            // Call next.js API proxy route to update isRead: true for this message
            const res = await fetch(`/api/admin/contact-messages/${message.documentId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ isRead: true }),
            });

            if (!res.ok) {
                throw new Error('API failed');
            }

            // Immediately reflect marking as read locally
            setMessages((prev) =>
                prev.map((m) =>
                    m.documentId === message.documentId ? { ...m, isRead: true } : m
                )
            );
        } catch (error) {
            console.error('Failed to mark message as read:', error);
            // Non-blocking error, we still let user see the message
        }
    };

    // ── Single message delete handler ─────────────────────────────────────────
    const handleDeleteMessage = async (documentId) => {
        setIsDeleting(true);
        try {
            const res = await fetch(`/api/admin/contact-messages/${documentId}`, {
                method: 'DELETE',
            });

            if (!res.ok) {
                throw new Error('Delete API failed');
            }

            // Successfully deleted
            setMessages((prev) => prev.filter((m) => m.documentId !== documentId));
            addToast('پیام تماس با موفقیت حذف شد', 'success');

            // Close modal/confirm overlay if open
            setSelectedMessage(null);
            setDeleteTarget(null);
        } catch (error) {
            console.error('Failed to delete message:', error);
            addToast('خطا در حذف پیام تماس', 'error');
        } finally {
            setIsDeleting(false);
        }
    };

    // ── Filter and Search ────────────────────────────────────────────────────
    const filteredMessages = useMemo(() => {
        return messages.filter((m) => {
            // Apply search filter (name, info, subject, body content)
            const q = searchQuery.trim().toLowerCase();
            const textMatch = !q ? true : (
                m.name?.toLowerCase().includes(q) ||
                m.contactInfo?.toLowerCase().includes(q) ||
                m.subject?.toLowerCase().includes(q) ||
                m.body?.toLowerCase().includes(q)
            );

            // Apply select/filter tabs (all, read, unread)
            if (filterType === 'read') {
                return textMatch && m.isRead === true;
            }
            if (filterType === 'unread') {
                return textMatch && m.isRead === false;
            }
            return textMatch;
        });
    }, [messages, searchQuery, filterType]);

    // Reset current page when filters change
    useEffect(() => {
        setCurrentPage(1);
    }, [searchQuery, filterType]);

    // ── Pagination ───────────────────────────────────────────────────────────
    const pageCount = Math.max(1, Math.ceil(filteredMessages.length / PAGE_SIZE));
    const paginated = useMemo(() => {
        const startIndex = (currentPage - 1) * PAGE_SIZE;
        return filteredMessages.slice(startIndex, startIndex + PAGE_SIZE);
    }, [filteredMessages, currentPage]);

    const pages = Array.from({ length: pageCount }, (_, i) => i + 1);

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
        <>
            <div className={styles.tableWrapper}>
                {/* ── Table Toolbar Actions ───────────────────────────────────── */}
                <div className={styles.tableActions}>
                    <input
                        type="search"
                        placeholder="جستجو در پیام‌ها (نام، ایمیل، موبایل، موضوع، متن)..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className={styles.searchBar}
                        aria-label="جستجوی پیام‌ها"
                    />

                    <div className={styles.filterTabs}>
                        <button
                            type="button"
                            className={`${styles.filterBtn} ${filterType === 'all' ? styles['filterBtn--active'] : ''}`}
                            onClick={() => setFilterType('all')}
                        >
                            همه پیام‌ها
                        </button>
                        <button
                            type="button"
                            className={`${styles.filterBtn} ${filterType === 'unread' ? styles['filterBtn--active'] : ''}`}
                            onClick={() => setFilterType('unread')}
                        >
                            خوانده نشده (
                            {messages.filter((m) => !m.isRead).length}
                            )
                        </button>
                        <button
                            type="button"
                            className={`${styles.filterBtn} ${filterType === 'read' ? styles['filterBtn--active'] : ''}`}
                            onClick={() => setFilterType('read')}
                        >
                            خوانده شده
                        </button>
                    </div>
                </div>

                {/* ── Messages Table ────────────────────────────────────────── */}
                {paginated.length === 0 ? (
                    <div className={styles.emptyState}>
                        <AlertCircle size={28} style={{ opacity: 0.5, marginBottom: '8px' }} />
                        <p>هیچ پیام تماسی یافت نشد.</p>
                    </div>
                ) : (
                    <table className={styles.table}>
                        <thead>
                            <tr>
                                <th>#</th>
                                <th>فرستنده</th>
                                <th>موضوع</th>
                                <th>اطلاعات تماس</th>
                                <th>تاریخ ارسال</th>
                                <th>وضعیت</th>
                                <th>عملیات</th>
                            </tr>
                        </thead>
                        <tbody>
                            {paginated.map((msg, index) => {
                                const rowNumber = (currentPage - 1) * PAGE_SIZE + index + 1;
                                return (
                                    <tr
                                        key={msg.documentId}
                                        onClick={() => handleOpenMessage(msg)}
                                        className={`${styles.row} ${!msg.isRead ? styles['row--unread'] : ''}`}
                                    >
                                        <td>{new Intl.NumberFormat('fa-IR').format(rowNumber)}</td>
                                        <td>{msg.name}</td>
                                        <td>
                                            <div className={styles.subjectText} title={msg.subject}>
                                                {msg.subject || 'بدون موضوع'}
                                            </div>
                                        </td>
                                        <td className={styles.contactInfoText}>{msg.contactInfo}</td>
                                        <td>{formatDate(msg.createdAt)}</td>
                                        <td>
                                            <span
                                                className={`${styles.badge} ${msg.isRead ? styles['badge--read'] : styles['badge--unread']}`}
                                            >
                                                {msg.isRead ? 'خوانده‌شده' : 'خوانده‌نشده'}
                                            </span>
                                        </td>
                                        <td onClick={(e) => e.stopPropagation()}>
                                            <div style={{ display: 'flex', gap: '4px' }}>
                                                <button
                                                    type="button"
                                                    className={styles.btnAction}
                                                    onClick={() => handleOpenMessage(msg)}
                                                    title="مشاهده پیام"
                                                >
                                                    <Eye size={14} style={{ marginLeft: '4px', verticalAlign: 'middle', display: 'inline' }} />
                                                    مشاهده
                                                </button>
                                                <button
                                                    type="button"
                                                    className={styles.btnDelete}
                                                    onClick={() => setDeleteTarget(msg)}
                                                    title="حذف پیام"
                                                >
                                                    <Trash2 size={14} style={{ marginLeft: '4px', verticalAlign: 'middle', display: 'inline' }} />
                                                    حذف
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                )}

                {/* ── Table Pagination ───────────────────────────────────────── */}
                {pageCount > 1 && (
                    <div className={styles.pagination} style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem', marginTop: '1.5rem', direction: 'rtl' }}>
                        <button
                            type="button"
                            className={styles.filterBtn}
                            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                            disabled={currentPage === 1}
                            style={{ opacity: currentPage === 1 ? 0.5 : 1, cursor: currentPage === 1 ? 'not-allowed' : 'pointer' }}
                        >
                            « قبلی
                        </button>
                        {pages.map((p) => (
                            <button
                                key={p}
                                type="button"
                                className={`${styles.filterBtn} ${currentPage === p ? styles['filterBtn--active'] : ''}`}
                                onClick={() => setCurrentPage(p)}
                            >
                                {new Intl.NumberFormat('fa-IR').format(p)}
                            </button>
                        ))}
                        <button
                            type="button"
                            className={styles.filterBtn}
                            onClick={() => setCurrentPage((p) => Math.min(pageCount, p + 1))}
                            disabled={currentPage === pageCount}
                            style={{ opacity: currentPage === pageCount ? 0.5 : 1, cursor: currentPage === pageCount ? 'not-allowed' : 'pointer' }}
                        >
                            بعدی »
                        </button>
                    </div>
                )}
            </div>

            {/* ─── Delete Confirmation Modal ────────────────────────────── */}
            {deleteTarget && (
                <div className={styles.confirmOverlay} onClick={() => !isDeleting && setDeleteTarget(null)}>
                    <div className={styles.confirmBox} onClick={(e) => e.stopPropagation()}>
                        <h3>حذف پیام تماس</h3>
                        <p>
                            آیا از حذف پیام ارسال شده از طرف <strong>«{deleteTarget.name}»</strong> با موضوع <strong>«{deleteTarget.subject || 'بدون موضوع'}»</strong> اطمینان دارید؟
                            این عمل غیرقابل بازگشت است.
                        </p>
                        <div className={styles.confirmBox__buttons}>
                            <button
                                type="button"
                                className={styles.confirmBox__cancel}
                                onClick={() => setDeleteTarget(null)}
                                disabled={isDeleting}
                            >
                                انصراف
                            </button>
                            <button
                                type="button"
                                className={styles.confirmBox__confirm}
                                onClick={() => handleDeleteMessage(deleteTarget.documentId)}
                                disabled={isDeleting}
                            >
                                {isDeleting ? 'در حال حذف...' : 'بله، حذف کن'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ─── Toast Notifications ───────────────────────────────────── */}
            <div className={styles.toastContainer} aria-live="polite">
                {toasts.map((t) => (
                    <div
                        key={t.id}
                        className={`${styles.toast} ${styles[`toast--${t.type}`]}`}
                        role="alert"
                    >
                        <span>{TOAST_ICONS[t.type]}</span>
                        {t.message}
                    </div>
                ))}
            </div>

            {/* ─── Message Detail Read Modal ────────────────────────────── */}
            {selectedMessage && (
                <MessageReadModal
                    isOpen={!!selectedMessage}
                    onClose={() => setSelectedMessage(null)}
                    message={selectedMessage}
                    onDelete={(id) => {
                        // Close info modal and open confirm delete modal
                        setDeleteTarget(selectedMessage);
                        setSelectedMessage(null);
                    }}
                />
            )}
        </>
    );
}
