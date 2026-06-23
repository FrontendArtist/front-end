'use client';

/**
 * @file src/components/admin/Users/UserCommentItem.jsx
 * @description کامپوننت مدیریت یک کامنت در پنل ادمین
 *
 * قابلیت‌ها:
 *  - تأیید / رد کامنت (PUT /api/admin/comments/:id)
 *  - پاسخ دادن inline (POST /api/admin/comments)
 *  - لینک مستقیم به صفحه زنده (مقاله، محصول یا دوره)
 */

import { useState } from 'react';
import Link from 'next/link';
import { Check, X, MessageSquare, ExternalLink, Send, Loader2 } from 'lucide-react';
import styles from './Users.module.scss';

export default function UserCommentItem({ comment, onUpdate }) {
    const [approving, setApproving] = useState(false);
    const [replying, setReplying] = useState(false);
    const [replyText, setReplyText] = useState('');
    const [replyLoading, setReplyLoading] = useState(false);
    const [localApproved, setLocalApproved] = useState(comment.isApproved);

    /* ── ساخت لینک صفحه زنده ──────────────────────────────────────────────── */
    const getLiveLink = () => {
        if (comment.product?.slug)
            return `/products/${comment.product.slug}#comment-${comment.id}`;
        if (comment.article?.slug)
            return `/articles/${comment.article.slug}#comment-${comment.id}`;
        if (comment.course?.slug)
            return `/courses/${comment.course.slug}#comment-${comment.id}`;
        return null;
    };

    const liveLink = getLiveLink();

    /* ── تأیید / رد کامنت ─────────────────────────────────────────────────── */
    const handleToggleApprove = async (newVal) => {
        setApproving(true);
        try {
            const res = await fetch(`/api/admin/comments/${comment.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ documentId: comment.documentId, isApproved: newVal }),
            });

            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                throw new Error(err.error || 'خطا در عملیات');
            }

            setLocalApproved(newVal);
            onUpdate?.({ ...comment, isApproved: newVal });
        } catch (err) {
            alert(err.message);
        } finally {
            setApproving(false);
        }
    };

    /* ── ارسال پاسخ ────────────────────────────────────────────────────────── */
    const handleReply = async () => {
        if (!replyText.trim()) return;
        setReplyLoading(true);
        try {
            const payload = {
                content: replyText.trim(),
                isApproved: true,
                comment_parent: comment.documentId,
                // انتقال ID رابطه‌ها تا پاسخ در صفحه صحیح نمایش داده شود
                ...(comment.product?.documentId && { product: comment.product.documentId }),
                ...(comment.article?.documentId && { article: comment.article.documentId }),
                ...(comment.course?.documentId && { course: comment.course.documentId }),
            };

            const res = await fetch('/api/admin/comments', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                throw new Error(err.error || 'خطا در ارسال پاسخ');
            }

            setReplyText('');
            setReplying(false);
        } catch (err) {
            alert(err.message);
        } finally {
            setReplyLoading(false);
        }
    };

    /* ── نام محتوای مرتبط ──────────────────────────────────────────────────── */
    const relatedLabel = comment.product?.title
        ? `محصول: ${comment.product.title}`
        : comment.article?.title
            ? `مقاله: ${comment.article.title}`
            : comment.course?.title
                ? `دوره: ${comment.course.title}`
                : null;

    return (
        <div className={styles.commentItem}>
            {/* ─── هدر: وضعیت + تاریخ ──────────────────────────────────── */}
            <div className={styles.commentHeader}>
                <span
                    className={`${styles.badge} ${localApproved ? styles['badge--green'] : styles['badge--yellow']
                        }`}
                >
                    {localApproved ? 'تأیید شده' : 'در انتظار تأیید'}
                </span>
                <span className={styles.date}>
                    {new Intl.DateTimeFormat('fa-IR', { dateStyle: 'medium' }).format(
                        new Date(comment.createdAt)
                    )}
                </span>
            </div>

            {/* ─── نام کاربر ──────────────────────────────────────────── */}
            {comment.user?.username && (
                <div className={styles.commentRelated} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ opacity: 0.7 }}>کاربر:</span>
                    <strong>{comment.user.username}</strong>
                </div>
            )}

            {/* ─── محتوای مرتبط ───────────────────────────────────────── */}
            {relatedLabel && (
                <div className={styles.commentRelated}>{relatedLabel}</div>
            )}

            {/* ─── متن کامنت ──────────────────────────────────────────── */}
            <div className={styles.commentContent}>{comment.content}</div>

            {/* ─── دکمه‌های عملیات ─────────────────────────────────────── */}
            <div className={styles.commentActions}>
                {/* تأیید */}
                {!localApproved && (
                    <button
                        className={styles.btnApprove}
                        disabled={approving}
                        onClick={() => handleToggleApprove(true)}
                        title="تأیید کامنت"
                    >
                        {approving
                            ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />
                            : <Check size={14} />
                        }
                        تأیید
                    </button>
                )}

                {/* رد / پنهان کردن */}
                {localApproved && (
                    <button
                        className={styles.btnReject}
                        disabled={approving}
                        onClick={() => handleToggleApprove(false)}
                        title="پنهان کردن کامنت"
                    >
                        {approving
                            ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />
                            : <X size={14} />
                        }
                        رد
                    </button>
                )}

                {/* پاسخ */}
                <button
                    className={`${styles.btnAction} ${styles.btnReply}`}
                    onClick={() => setReplying((v) => !v)}
                    title="پاسخ دادن"
                >
                    <MessageSquare size={14} />
                    پاسخ
                </button>

                {/* مشاهده در سایت */}
                {liveLink && (
                    <Link
                        href={liveLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`${styles.btnAction} ${styles.btnLive}`}
                        title="مشاهده در سایت"
                    >
                        <ExternalLink size={14} />
                        مشاهده در سایت
                    </Link>
                )}
            </div>

            {/* ─── باکس پاسخ inline ────────────────────────────────────── */}
            {replying && (
                <div className={styles.replyBox}>
                    <textarea
                        className={styles.replyTextarea}
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        placeholder="پاسخ ادمین را بنویسید..."
                        rows={3}
                        disabled={replyLoading}
                    />
                    <div className={styles.replyBoxActions}>
                        <button
                            className={styles.btnApprove}
                            onClick={handleReply}
                            disabled={replyLoading || !replyText.trim()}
                        >
                            {replyLoading
                                ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />
                                : <Send size={14} />
                            }
                            ارسال پاسخ
                        </button>
                        <button
                            className={styles.btnAction}
                            onClick={() => { setReplying(false); setReplyText(''); }}
                            disabled={replyLoading}
                        >
                            انصراف
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
