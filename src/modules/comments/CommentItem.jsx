'use client';

import { useState } from 'react';
import {
    Calendar,
    Star,
    Reply,
    ChevronDown,
    ChevronUp,
    ShieldCheck,
    MessageSquare,
    CornerDownLeft
} from 'lucide-react';
import styles from './CommentItem.module.scss';

/**
 * CommentItem - Recursive component for rendering individual comments
 * Standardizes nested replies to eliminate box-in-box clutter.
 */
const CommentItem = ({ comment, onReply, depth = 0, parentAuthor = null }) => {
    const MAX_DEPTH = 3;
    const [showReplies, setShowReplies] = useState(true);

    if (!comment) {
        return null;
    }

    const {
        id,
        documentId,
        name,
        content = '',
        rating = 0,
        user = { username: 'کاربر مهمان' },
        createdAt,
        replies = []
    } = comment;

    const displayUsername = name || user.username || 'کاربر مهمان';

    const formattedDate = createdAt
        ? new Date(createdAt).toLocaleDateString('fa-IR', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        })
        : '';

    const avatarLetter = displayUsername ? displayUsername.charAt(0).toUpperCase() : 'ک';

    const renderStars = () => {
        return Array.from({ length: 5 }, (_, index) => (
            <Star
                key={index}
                className={`${styles.star} ${index < rating ? styles.filled : ''}`}
                fill={index < rating ? 'currentColor' : 'none'}
            />
        ));
    };

    const handleReplyClick = () => {
        if (onReply && (documentId || id)) {
            onReply(documentId || id);
        }
    };

    const isAdmin = displayUsername.includes('مدیر') || displayUsername.includes('طرح الهی') || user.role === 'admin';
    const isReply = depth > 0;
    const isAlreadyAdminText = displayUsername.trim() === 'مدیریت' || displayUsername.trim() === 'مدیر';

    return (
        <div
            className={`${styles.commentNode} ${isReply ? styles.isReply : styles.isMainComment}`}
            data-depth={depth}
        >
            <div className={styles.commentContentWrapper}>
                <div className={styles.commentHeader}>
                    <div className={styles.userInfo}>
                        <div className={`${styles.avatar} ${isAdmin ? styles.adminAvatar : ''}`}>
                            {avatarLetter}
                        </div>
                        <div className={styles.userMeta}>
                            <div className={styles.usernameRow}>
                                {isAlreadyAdminText ? (
                                    <span className={styles.adminBadge}>
                                        <ShieldCheck className={styles.badgeIcon} />
                                        مدیریت
                                    </span>
                                ) : (
                                    <>
                                        <span className={styles.username}>{displayUsername}</span>
                                        {isAdmin && (
                                            <span className={styles.adminBadge}>
                                                <ShieldCheck className={styles.badgeIcon} />
                                                مدیریت
                                            </span>
                                        )}
                                    </>
                                )}

                            </div>
                            {formattedDate && (
                                <time className={styles.timestamp}>
                                    <Calendar className={styles.timeIcon} />
                                    <span>{formattedDate}</span>
                                </time>
                            )}
                        </div>
                    </div>

                    {rating > 0 && depth === 0 && (
                        <div className={styles.ratingBadge}>
                            <div className={styles.stars}>{renderStars()}</div>
                            <span className={styles.ratingNum}>{rating}</span>
                        </div>
                    )}
                </div>

                <div className={styles.commentBody}>
                    <p className={styles.content}>{content}</p>
                </div>

                <div className={styles.commentFooter}>
                    {depth < MAX_DEPTH && (
                        <button
                            type="button"
                            onClick={handleReplyClick}
                            className={styles.replyBtn}
                            aria-label={`پاسخ به ${displayUsername}`}
                        >
                            <Reply className={styles.replyIcon} />
                            <span>پاسخ</span>
                        </button>
                    )}

                    {replies.length > 0 && (
                        <button
                            type="button"
                            onClick={() => setShowReplies(!showReplies)}
                            className={styles.toggleRepliesBtn}
                            aria-label={showReplies ? 'مخفی کردن پاسخ‌ها' : 'نمایش پاسخ‌ها'}
                        >
                            {showReplies ? (
                                <ChevronUp className={styles.chevronIcon} />
                            ) : (
                                <ChevronDown className={styles.chevronIcon} />
                            )}
                            <span>{replies.length} پاسخ</span>
                        </button>
                    )}
                </div>
            </div>

            {/* Threaded Nested Replies */}
            {showReplies && replies.length > 0 && (
                <div className={styles.repliesContainer}>
                    {depth < MAX_DEPTH ? (
                        replies.map((reply) => (
                            <CommentItem
                                key={reply.id || reply.documentId}
                                comment={reply}
                                onReply={onReply}
                                depth={depth + 1}
                                parentAuthor={displayUsername}
                            />
                        ))
                    ) : (
                        <div className={styles.maxDepthReached}>
                            <MessageSquare className={styles.maxDepthIcon} />
                            <span>ادامه پاسخ‌ها به سقف مجاز رسید</span>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default CommentItem;