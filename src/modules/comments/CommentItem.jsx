'use client';

import { useState } from 'react';
import styles from './CommentItem.module.scss';

/**
 * CommentItem - Recursive component for rendering individual comments
 * * فیکس: ارسال documentId به جای ID عددی برای ایجاد رابطه در Strapi v5
 */
const CommentItem = ({ comment, onReply, depth = 0 }) => {
    const MAX_DEPTH = 3;
    const [showReplies, setShowReplies] = useState(true);

    if (!comment) {
        return null;
    }

    // Extract comment data
    const {
        id,
        // ✅ فیکس: documentId را به صورت صریح استخراج می‌کنیم
        documentId, 
        content = '',
        rating = 0,
        user = { username: 'کاربر مهمان' },
        createdAt,
        replies = []
    } = comment;

    // Format timestamp to Persian date
    const formattedDate = createdAt
        ? new Date(createdAt).toLocaleDateString('fa-IR', {
              year: 'numeric',
              month: 'long',
              day: 'numeric'
          })
        : '';

    // Get first letter of username for avatar
    const avatarLetter = user.username ? user.username.charAt(0) : 'ک';

    // Render star rating (1-5 stars)
    const renderStars = () => {
        return Array.from({ length: 5 }, (_, index) => (
            <span
                key={index}
                className={`${styles.star} ${index < rating ? styles.filled : ''}`}
            >
                ★
            </span>
        ));
    };

    // Handle reply button click
    const handleReplyClick = () => {
        if (onReply && documentId) {
            // ✅✅✅ فیکس اصلی: ارسال documentId به جای ID عددی
            // documentId همان شناسه رشته‌ای (مثل k1oy...) است که Strapi v5 برای ریلیشن نیاز دارد.
            onReply(documentId); 
        }
    };

    return (
        <div className={styles.commentItem} data-depth={depth}>
            {/* Comment Header: User info and timestamp */}
            <div className={styles.commentHeader}>
                <div className={styles.userInfo}>
                    <div className={styles.avatar}>{avatarLetter}</div>
                    <span className={styles.username}>{user.username}</span>
                </div>
                <time className={styles.timestamp}>{formattedDate}</time>
            </div>

            {/* Comment Body: Rating and content */}
            <div className={styles.commentBody}>
                {/* Star Rating Display */}
                {rating > 0 && (
                    <div className={styles.rating}>
                        {renderStars()}
                    </div>
                )}

                {/* Comment Content */}
                <p className={styles.content}>{content}</p>
            </div>

            {/* Comment Actions: Reply button */}
            <div className={styles.commentActions}>
                {depth < MAX_DEPTH && (
                    <button
                        type="button"
                        onClick={handleReplyClick}
                        className={styles.replyButton}
                        aria-label={`پاسخ به نظر ${user.username}`}
                    >
                        <span>↩</span>
                        <span>پاسخ</span>
                    </button>
                )}

                {replies.length > 0 && (
                    <button
                        type="button"
                        onClick={() => setShowReplies(!showReplies)}
                        className={styles.replyButton}
                        aria-label={showReplies ? 'مخفی کردن پاسخ‌ها' : 'نمایش پاسخ‌ها'}
                    >
                        <span>{showReplies ? '▼' : '◀'}</span>
                        <span>{replies.length} پاسخ</span>
                    </button>
                )}
            </div>

            {/* Nested Replies */}
            {showReplies && replies.length > 0 && (
                <div className={styles.replies}>
                    {depth < MAX_DEPTH ? (
                        replies.map((reply) => (
                            <CommentItem
                                key={reply.id}
                                comment={reply}
                                onReply={onReply}
                                depth={depth + 1}
                            />
                        ))
                    ) : (
                        <div className={styles.maxDepthReached}>
                            حداکثر عمق نمایش پاسخ‌ها ({MAX_DEPTH} سطح)
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default CommentItem;