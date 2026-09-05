'use client';

/**
 * @file src/components/chat/InstructorChatPanel.jsx
 * @description داشبورد چت استاد — Client Component (UI جدید و مدرن)
 */

import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { updateInstructorMessage, deleteInstructorMessage, getInstructorMessages } from '@/lib/messagesApi';
import { uploadMedia } from '@/lib/client/admin/mediaClient';
import VoicePlayer from './VoicePlayer';
import VoiceRecorder from './VoiceRecorder';
import MentorFormEditor from './MentorFormEditor';
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

function getUserDisplayName(msg) {
    if (!msg) return 'کاربر ناشناس';

    const user = msg.user || {};
    const meta = parseMetaData(msg.metaData);

    const hasFirstName = Boolean(user.firstName && user.firstName.trim());
    const hasLastName = Boolean(user.lastName && user.lastName.trim());
    const hasFullName = Boolean(user.fullName && user.fullName.trim());

    // 1. فقط در صورتی از نام پروفایل استفاده کن که هم نام و هم نام خانوادگی کامل باشند
    if (hasFullName) {
        return user.fullName.trim();
    }
    if (hasFirstName && hasLastName) {
        return `${user.firstName.trim()} ${user.lastName.trim()}`;
    }

    // 2. اگر حتی یکی از (نام یا نام خانوادگی) در پروفایل خالی بود، نام واردشده در فیلد فرم را جایگزین کن
    const formName = meta.fullName || meta.name || meta.user_name || meta['نام'] || meta['نام و نام خانوادگی'] || meta.fullNameFa || msg.name;
    if (formName && typeof formName === 'string' && formName.trim()) return formName.trim();

    // 3. در غیر این صورت -> 'کاربر ناشناس'
    return 'کاربر ناشناس';
}

function getInitial(msg) {
    const name = getUserDisplayName(msg);
    if (!name || name === 'کاربر ناشناس') return '؟';
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
    const [isFormEditorOpen, setIsFormEditorOpen] = useState(false);
    const [isRecordingVoice, setIsRecordingVoice] = useState(false);
    const [editingReplyIndex, setEditingReplyIndex] = useState(null);
    const [editingReplyText, setEditingReplyText] = useState('');
    const [isSavingEdit, setIsSavingEdit] = useState(false);
    const [editError, setEditError] = useState(null);
    const [deleteConfirmTarget, setDeleteConfirmTarget] = useState(null); // { type: 'reply', index } | { type: 'thread' }
    const [isDeleting, setIsDeleting] = useState(false);

    const messagesContainerRef = useRef(null);

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
            const name = getUserDisplayName(m).toLowerCase();
            const subject = (m.subject || '').toLowerCase();
            return name.includes(q) || subject.includes(q);
        });
    }, [messages, searchQuery]);

    // ─── Polling 5 ثانیه‌ای فقط در زمان باز بودن صفحه و اکتیو بودن زبانه ───
    useEffect(() => {
        if (!token) return;

        const fetchLatest = async () => {
            if (document.visibilityState !== 'visible') return;
            try {
                const res = await getInstructorMessages(token);
                if (res?.data) {
                    setMessages(res.data);
                }
            } catch {
                // silent fail on background poll
            }
        };

        const intervalId = setInterval(fetchLatest, 5000);
        return () => clearInterval(intervalId);
    }, [token]);

    function handleSelectThread(id) {
        setSelectedId(id);
        setReply('');
        setIsRecordingVoice(false);
        setEditingReplyIndex(null);
        setEditingReplyText('');
        setEditError(null);
        setDeleteConfirmTarget(null);
        setMobileView('chat');
    }

    function handleBackToList() {
        setMobileView('list');
        setSelectedId(null);
        setIsRecordingVoice(false);
        setEditingReplyIndex(null);
        setEditingReplyText('');
        setEditError(null);
        setDeleteConfirmTarget(null);
    }

    function handleStartEditReply(index, currentText) {
        setEditingReplyIndex(index);
        setEditingReplyText(currentText);
        setEditError(null);
    }

    function handleCancelEditReply() {
        setEditingReplyIndex(null);
        setEditingReplyText('');
        setEditError(null);
    }

    async function handleSaveEditReply(index) {
        if (!editingReplyText.trim() || !selectedMessage || isSavingEdit) return;

        const trimmed = editingReplyText.trim();
        setIsSavingEdit(true);
        setEditError(null);

        try {
            const existingReplies = [...(selectedMessage.replies || [])];
            if (!existingReplies[index]) return;

            existingReplies[index] = {
                ...existingReplies[index],
                body: trimmed,
                isEdited: true,
                updatedAt: new Date().toISOString(),
            };

            await updateInstructorMessage(
                selectedMessage.documentId || selectedMessage.id,
                token,
                { replies: existingReplies }
            );

            setMessages((prev) =>
                prev.map((m) =>
                    (m.documentId === selectedId || String(m.id) === String(selectedId))
                        ? { ...m, replies: existingReplies }
                        : m
                )
            );

            setEditingReplyIndex(null);
            setEditingReplyText('');
        } catch (err) {
            setEditError('خطا در ذخیره ویرایش پیام. لطفاً مجدداً تلاش کنید.');
        } finally {
            setIsSavingEdit(false);
        }
    }

    function handleEditKeyDown(e, index) {
        if (e.key === 'Escape') {
            e.preventDefault();
            handleCancelEditReply();
        } else if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSaveEditReply(index);
        }
    }

    async function handleDeleteReply(index) {
        if (!selectedMessage || isDeleting) return;

        setIsDeleting(true);
        try {
            const existingReplies = [...(selectedMessage.replies || [])];
            if (!existingReplies[index]) return;

            existingReplies.splice(index, 1);

            const hasInstructorReply = existingReplies.some((r) => r.sender === 'instructor' || r.isAdmin);
            const newStatus = hasInstructorReply ? 'answered' : 'open';

            await updateInstructorMessage(
                selectedMessage.documentId || selectedMessage.id,
                token,
                { replies: existingReplies, status: newStatus }
            );

            setMessages((prev) =>
                prev.map((m) =>
                    (m.documentId === selectedId || String(m.id) === String(selectedId))
                        ? { ...m, replies: existingReplies, status: newStatus }
                        : m
                )
            );

            setDeleteConfirmTarget(null);
        } catch (err) {
            console.error('Failed to delete reply:', err);
            alert('خطا در حذف پیام. لطفاً دوباره تلاش کنید.');
        } finally {
            setIsDeleting(false);
        }
    }

    async function handleDeleteThread() {
        if (!selectedMessage || isDeleting) return;

        setIsDeleting(true);
        try {
            await deleteInstructorMessage(selectedMessage.documentId || selectedMessage.id, token);
            setMessages((prev) =>
                prev.filter((m) => m.documentId !== selectedId && String(m.id) !== String(selectedId))
            );
            setSelectedId(null);
            setMobileView('list');
            setDeleteConfirmTarget(null);
        } catch (err) {
            console.error('Failed to delete thread:', err);
            alert('خطا در حذف مکالمه. لطفاً دوباره تلاش کنید.');
        } finally {
            setIsDeleting(false);
        }
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
            setTimeout(() => {
                if (messagesContainerRef.current) {
                    messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
                }
            }, 50);
        } catch {
            setReply(replyText);
        } finally {
            setIsSending(false);
        }
    }

    async function handleSendVoiceReply(audioBlob, duration) {
        if (!audioBlob || !selectedMessage || isSending) return;

        setIsSending(true);
        try {
            const formData = new FormData();
            formData.append('path', 'media/voices');
            const extension = audioBlob.type.includes('ogg') ? 'ogg' : audioBlob.type.includes('mp4') ? 'mp4' : 'webm';
            const filename = `voice_mentor_${Date.now()}.${extension}`;
            formData.append('files', audioBlob, filename);

            const uploadRes = await uploadMedia(formData);
            const uploadedFile = Array.isArray(uploadRes) ? uploadRes[0] : uploadRes;
            const audioUrl = uploadedFile?.url || uploadedFile?.data?.[0]?.url || '';

            if (!audioUrl) {
                throw new Error('بارگذاری فایل صوتی ناموفق بود.');
            }

            const existingReplies = selectedMessage.replies || [];
            const newReply = {
                body: reply.trim() || '',
                audioUrl: audioUrl,
                duration: duration || 0,
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

            setReply('');
            setIsRecordingVoice(false);

            setTimeout(() => {
                if (messagesContainerRef.current) {
                    messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
                }
            }, 50);
        } catch (err) {
            console.error('Failed to send voice message:', err);
            alert(err.message || 'خطا در ارسال وویس');
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
        <>
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

                {/* ── دکمه ویرایش فرم ── */}
                <div className={styles.sidebar__editFormBtn}>
                    <button
                        type="button"
                        id="mentor-edit-form-btn"
                        className={styles.editFormButton}
                        onClick={() => setIsFormEditorOpen(true)}
                        title="ویرایش سوالات فرم پیش‌نیاز سالک"
                    >
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                        </svg>
                        ویرایش فرم سالکان
                    </button>
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
                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                                            <circle cx="12" cy="7" r="4" />
                                        </svg>
                                    </div>

                                    <div className={styles.chatItem__content}>
                                        <p className={styles.chatItem__name}>
                                            {getUserDisplayName(msg)}
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

                            <div className={styles.chatHeader__avatar} aria-hidden="true">
                                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                                    <circle cx="12" cy="7" r="4" />
                                </svg>
                            </div>

                            <div className={styles.chatHeader__info}>
                                <h3 className={styles.chatHeader__name}>
                                    {getUserDisplayName(selectedMessage)}
                                </h3>
                                <p className={styles.chatHeader__subject}>
                                    {selectedMessage.subject || 'درخواست مشاوره'}
                                </p>
                            </div>

                            <div className={styles.chatHeader__actions}>
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

                                <button
                                    type="button"
                                    className={styles.chatHeader__deleteBtn}
                                    onClick={() => setDeleteConfirmTarget({ type: 'thread' })}
                                    title="حذف کل مکالمه"
                                    aria-label="حذف مکالمه"
                                >
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <polyline points="3 6 5 6 21 6" />
                                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                                        <line x1="10" y1="11" x2="10" y2="17" />
                                        <line x1="14" y1="11" x2="14" y2="17" />
                                    </svg>
                                </button>
                            </div>
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
                        <div ref={messagesContainerRef} className={styles.messages} aria-live="polite">

                            {/* پیام اصلی سالک */}
                            <div className={`${styles.bubble} ${styles['bubble--user']}`}>
                                <div className={styles.bubble__header}>
                                    <span>سالک</span>
                                </div>
                                {selectedMessage.audioUrl && (
                                    <div className={styles.bubble__audioWrap}>
                                        <VoicePlayer audioUrl={selectedMessage.audioUrl} duration={selectedMessage.duration} isSelf={false} />
                                    </div>
                                )}
                                {selectedMessage.body && (
                                    <div className={styles.bubble__text}>
                                        {selectedMessage.body}
                                    </div>
                                )}
                                <time className={styles.bubble__time}>
                                    {formatTime(selectedMessage.createdAt)}
                                </time>
                            </div>

                            {/* replies (پاسخ‌های thread) */}
                            {Array.isArray(selectedMessage.replies) &&
                                selectedMessage.replies.map((rep, idx) => {
                                    const isInstructor = rep.sender === 'instructor' || rep.isAdmin;
                                    const isEditing = editingReplyIndex === idx;

                                    return (
                                        <div
                                            key={idx}
                                            className={`${styles.bubble} ${isInstructor ? styles['bubble--instructor'] : styles['bubble--user']}`}
                                        >
                                            <div className={styles.bubble__header}>
                                                <span>{isInstructor ? 'استاد (شما)' : 'سالک'}</span>

                                                {isInstructor && !isEditing && (
                                                    <div className={styles.bubble__actions}>
                                                        <button
                                                            type="button"
                                                            className={styles.bubble__editBtn}
                                                            onClick={() => handleStartEditReply(idx, rep.body)}
                                                            title="ویرایش پیام"
                                                            aria-label="ویرایش پیام"
                                                        >
                                                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                                                                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                                                            </svg>
                                                        </button>

                                                        <button
                                                            type="button"
                                                            className={styles.bubble__deleteBtn}
                                                            onClick={() => setDeleteConfirmTarget({ type: 'reply', index: idx })}
                                                            title="حذف پیام"
                                                            aria-label="حذف پیام"
                                                        >
                                                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                                <polyline points="3 6 5 6 21 6" />
                                                                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                                                            </svg>
                                                        </button>
                                                    </div>
                                                )}
                                            </div>

                                            {/* نمایش پلیر صوتی در صورت وجود وویس */}
                                            {rep.audioUrl && (
                                                <div className={styles.bubble__audioWrap}>
                                                    <VoicePlayer
                                                        audioUrl={rep.audioUrl}
                                                        duration={rep.duration}
                                                        isSelf={isInstructor}
                                                    />
                                                </div>
                                            )}

                                            {isEditing ? (
                                                <div className={styles.bubble__editContainer}>
                                                    <textarea
                                                        value={editingReplyText}
                                                        onChange={(e) => setEditingReplyText(e.target.value)}
                                                        onKeyDown={(e) => handleEditKeyDown(e, idx)}
                                                        className={styles.bubble__editTextarea}
                                                        rows={3}
                                                        autoFocus
                                                        disabled={isSavingEdit}
                                                        placeholder="متن پیام را ویرایش کنید..."
                                                    />
                                                    {editError && (
                                                        <p className={styles.bubble__editError}>{editError}</p>
                                                    )}
                                                    <div className={styles.bubble__editActions}>
                                                        <button
                                                            type="button"
                                                            className={styles.bubble__saveBtn}
                                                            onClick={() => handleSaveEditReply(idx)}
                                                            disabled={!editingReplyText.trim() || isSavingEdit}
                                                        >
                                                            {isSavingEdit ? (
                                                                <span className={styles.editSpinner} aria-hidden="true" />
                                                            ) : (
                                                                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                                                    <polyline points="20 6 9 17 4 12" />
                                                                </svg>
                                                            )}
                                                            ذخیره
                                                        </button>
                                                        <button
                                                            type="button"
                                                            className={styles.bubble__cancelBtn}
                                                            onClick={handleCancelEditReply}
                                                            disabled={isSavingEdit}
                                                        >
                                                            انصراف
                                                        </button>
                                                    </div>
                                                </div>
                                            ) : (
                                                rep.body ? <div className={styles.bubble__text}>{rep.body}</div> : null
                                            )}

                                            <time className={styles.bubble__time}>
                                                {formatTime(rep.createdAt || rep.updatedAt)}
                                            </time>
                                        </div>
                                    );
                                })}

                        </div>

                        {/* ── ناحیه ارسال پاسخ یا ضبط وویس ── */}
                        <div className={styles.replyAreaContainer}>
                            {isRecordingVoice ? (
                                <VoiceRecorder
                                    onSendVoice={handleSendVoiceReply}
                                    onCancel={() => setIsRecordingVoice(false)}
                                    isSending={isSending}
                                />
                            ) : (
                                <div className={styles.replyArea}>
                                    <button
                                        type="button"
                                        id="mentor-mic-btn"
                                        className={styles.replyArea__micBtn}
                                        onClick={() => setIsRecordingVoice(true)}
                                        title="ضبط و ارسال پیام صوتی (وویس)"
                                        aria-label="ضبط پیام صوتی"
                                        disabled={isSending}
                                    >
                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                                            <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                                            <line x1="12" y1="19" x2="12" y2="23" />
                                            <line x1="8" y1="23" x2="16" y2="23" />
                                        </svg>
                                    </button>

                                    <textarea
                                        id="mentor-reply-input"
                                        value={reply}
                                        onChange={(e) => setReply(e.target.value)}
                                        onKeyDown={handleReplyKeyDown}
                                        placeholder="پاسخ خود را بنویسید... (یا وویس ضبط کنید)"
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
                            )}
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

        {/* ── مودال ویرایش فرم ── */}
        <MentorFormEditor
            token={token}
            isOpen={isFormEditorOpen}
            onClose={() => setIsFormEditorOpen(false)}
        />

        {/* ── مودال تایید حذف ── */}
        {deleteConfirmTarget && (
            <div className={styles.modalOverlay} onClick={() => !isDeleting && setDeleteConfirmTarget(null)}>
                <div className={styles.confirmModal} onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
                    <div className={styles.confirmModal__icon}>
                        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="3 6 5 6 21 6" />
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                            <line x1="10" y1="11" x2="10" y2="17" />
                            <line x1="14" y1="11" x2="14" y2="17" />
                        </svg>
                    </div>

                    <h3 className={styles.confirmModal__title}>
                        {deleteConfirmTarget.type === 'thread' ? 'حذف کل مکالمه' : 'حذف پیام'}
                    </h3>

                    <p className={styles.confirmModal__desc}>
                        {deleteConfirmTarget.type === 'thread'
                            ? 'آیا از حذف کامل این گفتگو و تمامی پیام‌های آن اطمینان دارید؟ این عملیات غیرقابل بازگشت است.'
                            : 'آیا از حذف این پیام اطمینان دارید؟ پیام به طور کامل پاک خواهد شد.'}
                    </p>

                    <div className={styles.confirmModal__actions}>
                        <button
                            type="button"
                            className={styles.confirmModal__deleteBtn}
                            onClick={() => {
                                if (deleteConfirmTarget.type === 'thread') {
                                    handleDeleteThread();
                                } else {
                                    handleDeleteReply(deleteConfirmTarget.index);
                                }
                            }}
                            disabled={isDeleting}
                        >
                            {isDeleting ? (
                                <span className={styles.editSpinner} aria-hidden="true" />
                            ) : (
                                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <polyline points="3 6 5 6 21 6" />
                                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                                </svg>
                            )}
                            <span>بله، حذف شود</span>
                        </button>

                        <button
                            type="button"
                            className={styles.confirmModal__cancelBtn}
                            onClick={() => setDeleteConfirmTarget(null)}
                            disabled={isDeleting}
                        >
                            انصراف
                        </button>
                    </div>
                </div>
            </div>
        )}
    </>
    );
}
