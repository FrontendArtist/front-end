'use client';

import { useState } from 'react';
import styles from './Users.module.scss';

export default function UserCommentItem({ comment, onUpdate, onDelete }) {
    const [loading, setLoading] = useState(false);

    const updateStatus = async (isApproved) => {
        if (!confirm(`آیا از ${isApproved ? 'تأیید' : 'رد'} این نظر اطمینان دارید؟`)) return;

        setLoading(true);
        try {
            const res = await fetch(`/api/admin/comments/${comment.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    documentId: comment.documentId,
                    isApproved
                }),
            });

            if (!res.ok) throw new Error('خطا در عملیات');

            // اگر رد شد (رد شدن مساوی است با حذف؟ معمولا فقط isApproved = false میشود یا حذف)
            // طبق معماری، می‌توانیم وضعیت تایید را فالس کنیم.
            onUpdate({ isApproved });

        } catch (err) {
            alert(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className={styles.commentItem}>
            <div className={styles.commentHeader}>
                <span className={`${styles.badge} ${comment.isApproved ? styles['badge--green'] : styles['badge--yellow']}`}>
                    {comment.isApproved ? 'تأیید شده' : 'در انتظار تأیید'}
                </span>
                <span className={styles.date}>
                    {new Intl.DateTimeFormat('fa-IR', { dateStyle: 'medium' }).format(new Date(comment.createdAt))}
                </span>
            </div>

            {comment.relatedTo && (
                <div className={styles.commentRelated}>
                    مربوط به {comment.relatedTo.type}: {comment.relatedTo.title}
                </div>
            )}

            <div className={styles.commentContent}>
                {comment.content}
            </div>

            <div className={styles.commentActions}>
                {!comment.isApproved && (
                    <button
                        className={styles.btnApprove}
                        disabled={loading}
                        onClick={() => updateStatus(true)}
                    >
                        {loading ? '...' : 'تأیید نظر'}
                    </button>
                )}
                {/* دکمه رد کردن نظر را دوباره مخفی میکند */}
                {comment.isApproved && (
                    <button
                        className={styles.btnReject}
                        disabled={loading}
                        onClick={() => updateStatus(false)}
                    >
                        {loading ? '...' : 'پنهان کردن (رد)'}
                    </button>
                )}
            </div>
        </div>
    );
}
