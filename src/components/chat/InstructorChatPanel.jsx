'use client';

/**
 * @file src/components/chat/InstructorChatPanel.jsx
 * @description داشبورد چت استاد — Client Component (UI جدید و مدرن)
 */

import { useState, useMemo, useRef, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { updateInstructorMessage } from '@/lib/messagesApi';
import styles from './InstructorChatPanel.module.scss';

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatDate(isoDate) {
    if (!isoDate) return '';
    try {
        return new Date(isoDate).toLocaleDateString('fa-IR', {
            month: 'short',
            day: 'numeric',
        });
    } catch {
        return '';
    }
}

function formatTime(isoDate) {
    if (!isoDate) return '';
    try {
        return new Date(isoDate).toLocaleTimeString('fa-IR', {
            hour: '2-digit',
            minute: '2-digit',
        });
    } catch {
        return '';
    }
}

function parseMetaData(metaData) {
    if (!metaData) return {};
    try {
        return typeof metaData === 'string' ? JSON.parse(metaData) : metaData;
    } catch {
        return {};
    }
}

function getInitial(user) {
    if (!user) return '؟';
    const name = user.username || user.email || user.phoneNumber || '';
    return name.charAt(0).toUpperCase() || '؟';
}

const MARITAL_LABELS = {
    single: 'مجرد',
    married: 'متاهل',
    divorced: 'مطلقه',
    widowed: 'بیوه',
};

// ─── Main Component ──────────────────────────────────────────────────────────

export default function InstructorChatPanel({ initialMessages = [], currentUser }) {
    const [messages, setMessages] = useState(initialMessages);
    const [selectedId, setSelectedId] = useState(null);
    const [mobileView, setMobileView] = useState('list'); // 'list' | 'chat'
    const [searchQuery, setSearchQuery] = useState('');
    const [reply, setReply] = useState('');
    const [isSending, setIsSending] = useState(false);

    const messagesEndRef = useRef(null);

    const { data: session } = useSession();
    const token = session?.user?.jwt || currentUser?.jwt;

    const selectedMessage = useMemo(
        () => messages.find(
            (m) => m.documentId === selectedId || String(m.id) === String(selectedId)
        ) || null,
        [messages, selectedId]
    );

    const filteredMessages = useMemo(() => {
        if (!searchQuery.trim()) return messages;
        const q = searchQuery.toLowerCase();
        return messages.filter((m) => {
            const user = m.user || {};
            const name = (user.username || user.email || user.phoneNumber || '').toLowerCase();
            const subject = (m.subject || '').toLowerCase();
            return name.includes(q) || subject.includes(q);
        });
    }, [messages, searchQuery]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [selectedId, selectedMessage?.replies?.length]);

    function handleSelectThread(id) {
        setSelectedId(id);
        setReply('');
        setMobileView('chat');
    }

    function handleBackToList() {
        setMobileView('list');
        setSelectedId(null);
    }

    async function handleSendReply() {
        if (!reply.trim() || !selectedMessage || isSending) return;

        const replyText = reply.trim();
        setReply('');
        setIsSending(true);

        try {
            const existingReplies = selectedMessage.replies || [];
            const newReply = {
                body: replyText,
                createdAt: new Date().toISOString(),
                sender: 'instructor',
                isAdmin: true,
            };
            const updatedReplies = [...existingReplies, newReply];

            await updateInstructorMessage(
                selectedMessage.documentId || selectedMessage.id,
                token,
                { replies: updatedReplies, status: 'answered' }
            );

            setMessages((prev) =>
                prev.map((m) =>
                    (m.documentId === selectedId || String(m.id) === String(selectedId))
                        ? { ...m, replies: updatedReplies, status: 'answered' }
                        : m
                )
            );
        } catch {
            setReply(replyText);
        } finally {
            setIsSending(false);
        }
    }

    function handleReplyKeyDown(e) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendReply();
        }
    }

    const meta = parseMetaData(selectedMessage?.metaData);

    return (
        <div className={styles.panel}>

            {/* ════════════════════════════════════════════════════════════════
                SIDEBAR — لیست چت‌ها
            ════════════════════════════════════════════════════════════════ */}
            <aside
                className={`${styles.sidebar} ${mobileView === 'chat' ? styles['sidebar--hidden'] : ''}`}
                aria-label="لیست مکالمات"
            >
                <div className={styles.sidebar__header}>
                    <div className={styles.sidebar__titleRow}>
                        <h2 className={styles.sidebar__title}>
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                            </svg>
                            مکالمات سالکان
                        </h2>
                        <span className={styles.sidebar__countBadge}>
                            {messages.length}
                        </span>
                    </div>

                    <div className={styles.sidebar__search}>
                        <span className={styles.sidebar__searchIcon} aria-hidden="true">
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
                            </svg>
                        </span>
                        <input
                            id="mentor-search"
                            type="search"
                            placeholder="جستجوی نام یا موضوع..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className={styles.sidebar__searchInput}
                            aria-label="جستجو در مکالمات"
                        />
                    </div>
                </div>

                <div className={styles.sidebar__list} role="list">
                    {filteredMessages.length === 0 ? (
                        <div className={styles.sidebar__empty}>
                            <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2">
                                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                            </svg>
                            <p>هیچ مکالمه‌ای یافت نشد</p>
                        </div>
                    ) : (
                        filteredMessages.map((msg) => {
                            const user = msg.user || {};
                            const isActive =
                                msg.documentId === selectedId ||
                                String(msg.id) === String(selectedId);
                            const isAnswered = msg.status === 'answered' || msg.status === 'closed';

                            return (
                                <div
                                    key={msg.documentId || msg.id}
                                    role="listitem"
                                    onClick={() => handleSelectThread(msg.documentId || String(msg.id))}
                                    className={`${styles.chatItem} ${isActive ? styles['chatItem--active'] : ''}`}
                                    aria-current={isActive ? 'true' : undefined}
                                >
                                    <div className={styles.chatItem__avatar} aria-hidden="true">
                                        {getInitial(user)}
                                    </div>

                                    <div className={styles.chatItem__content}>
                                        <p className={styles.chatItem__name}>
                                            {user.username || user.email || user.phoneNumber || 'کاربر ناشناس'}
                                        </p>
                                        <p className={styles.chatItem__preview}>
                                            {msg.subject || msg.body?.slice(0, 40) || '—'}
                                        </p>
                                    </div>

                                    <div className={styles.chatItem__meta}>
                                        <span className={styles.chatItem__date}>
                                            {formatDate(msg.createdAt)}
                                        </span>
                                        <span
                                            className={`${styles.badge} ${isAnswered ? styles['badge--closed'] : styles['badge--open']}`}
                                        >
                                            {isAnswered ? 'پاسخ داده شد' : 'در انتظار'}
                                        </span>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            </aside>

            {/* ════════════════════════════════════════════════════════════════
                CHAT MAIN — پنجره چت
            ════════════════════════════════════════════════════════════════ */}
            <main
                className={`${styles.chatMain} ${mobileView === 'list' ? styles['chatMain--hidden'] : ''}`}
                aria-label="پنجره چت"
            >
                {selectedMessage ? (
                    <>
                        {/* ── Header چت ── */}
                        <div className={styles.chatHeader}>
                            <button
                                className={styles.chatHeader__back}
                                onClick={handleBackToList}
                                aria-label="بازگشت به لیست"
                            >
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <polyline points="9 18 15 12 9 6" />
                                </svg>
                            </button>

                            <div className={styles.chatHeader__avatar}>
                                {getInitial(selectedMessage.user)}
                            </div>

                            <div className={styles.chatHeader__info}>
                                <h3 className={styles.chatHeader__name}>
                                    {selectedMessage.user?.username ||
                                        selectedMessage.user?.email ||
                                        selectedMessage.user?.phoneNumber ||
                                        'کاربر ناشناس'}
                                </h3>
                                <p className={styles.chatHeader__subject}>
                                    {selectedMessage.subject || 'درخواست مشاوره'}
                                </p>
                            </div>

                            <span
                                className={`${styles.badge} ${selectedMessage.status === 'answered' || selectedMessage.status === 'closed'
                                    ? styles['badge--closed']
                                    : styles['badge--open']
                                    }`}
                            >
                                {selectedMessage.status === 'answered' || selectedMessage.status === 'closed'
                                    ? 'پاسخ داده شد'
                                    : 'در انتظار پاسخ'}
                            </span>
                        </div>

                        {/* ── Panel متادیتا سالک ── */}
                        {Object.keys(meta).length > 0 && (
                            <div className={styles.metaPanel} aria-label="اطلاعات پیش‌نیاز سالک">
                                {meta.age && (
                                    <span className={styles.metaPanel__item}>
                                        <span className={styles.metaPanel__label}>سن:</span>
                                        <span className={styles.metaPanel__value}>{meta.age} سال</span>
                                    </span>
                                )}
                                {meta.maritalStatus && (
                                    <span className={styles.metaPanel__item}>
                                        <span className={styles.metaPanel__label}>تاهل:</span>
                                        <span className={styles.metaPanel__value}>
                                            {MARITAL_LABELS[meta.maritalStatus] || meta.maritalStatus}
                                        </span>
                                    </span>
                                )}
                                {meta.job && (
                                    <span className={styles.metaPanel__item}>
                                        <span className={styles.metaPanel__label}>شغل:</span>
                                        <span className={styles.metaPanel__value}>{meta.job}</span>
                                    </span>
                                )}
                                {meta.spiritualBackground && (
                                    <span className={styles.metaPanel__item} title={meta.spiritualBackground}>
                                        <span className={styles.metaPanel__label}>سابقه معنوی:</span>
                                        <span className={styles.metaPanel__value}>
                                            {meta.spiritualBackground.length > 50
                                                ? meta.spiritualBackground.slice(0, 50) + '...'
                                                : meta.spiritualBackground}
                                        </span>
                                    </span>
                                )}
                            </div>
                        )}

                        {/* ── لیست پیام‌ها و replies ── */}
                        <div className={styles.messages} aria-live="polite">

                            {/* پیام اصلی سالک */}
                            <div className={`${styles.bubble} ${styles['bubble--user']}`}>
                                <div className={styles.bubble__header}>
                                    <span>سالک</span>
                                </div>
                                <div className={styles.bubble__text}>
                                    {selectedMessage.body}
                                </div>
                                <time className={styles.bubble__time}>
                                    {formatTime(selectedMessage.createdAt)}
                                </time>
                            </div>

                            {/* replies (پاسخ‌های thread) */}
                            {Array.isArray(selectedMessage.replies) &&
                                selectedMessage.replies.map((rep, idx) => {
                                    const isInstructor = rep.sender === 'instructor' || rep.isAdmin;
                                    return (
                                        <div
                                            key={idx}
                                            className={`${styles.bubble} ${isInstructor ? styles['bubble--instructor'] : styles['bubble--user']}`}
                                        >
                                            <div className={styles.bubble__header}>
                                                <span>{isInstructor ? 'استاد' : 'سالک'}</span>
                                            </div>
                                            <div className={styles.bubble__text}>{rep.body}</div>
                                            <time className={styles.bubble__time}>
                                                {formatTime(rep.createdAt)}
                                            </time>
                                        </div>
                                    );
                                })}

                            <div ref={messagesEndRef} aria-hidden="true" />
                        </div>

                        {/* ── ناحیه ارسال پاسخ ── */}
                        <div className={styles.replyArea}>
                            <textarea
                                id="mentor-reply-input"
                                value={reply}
                                onChange={(e) => setReply(e.target.value)}
                                onKeyDown={handleReplyKeyDown}
                                placeholder="پاسخ خود را بنویسید... (Enter برای ارسال)"
                                className={styles.replyArea__input}
                                rows={1}
                                aria-label="پاسخ به سالک"
                                disabled={isSending}
                            />
                            <button
                                id="mentor-send-reply"
                                onClick={handleSendReply}
                                disabled={!reply.trim() || isSending}
                                className={styles.replyArea__send}
                                aria-label="ارسال پاسخ"
                            >
                                {isSending ? (
                                    <span className={styles.spinner} aria-hidden="true" />
                                ) : (
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <line x1="22" y1="2" x2="11" y2="13" />
                                        <polygon points="22 2 15 22 11 13 2 9 22 2" />
                                    </svg>
                                )}
                            </button>
                        </div>
                    </>
                ) : (
                    <div className={styles.chatPlaceholder}>
                        <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                        </svg>
                        <h3>یک مکالمه را انتخاب کنید</h3>
                        <p>برای مشاهده اطلاعات سالک و پاسخ به مشاوره، از سایدبار یک چت را انتخاب کنید.</p>
                    </div>
                )}
            </main>
        </div>
    );
}
