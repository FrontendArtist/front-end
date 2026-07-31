'use client';

import { useState, useEffect, useMemo } from 'react';
import { useSession } from 'next-auth/react';
import {
    MessageSquare,
    Send,
    Star,
    User,
    Sparkles,
    CheckCircle2,
    AlertCircle,
    X,
    Loader2,
    PenTool,
    MessageCircle,
    CornerDownLeft
} from 'lucide-react';
import CommentItem from './CommentItem';
import { submitComment, getComments } from '@/lib/commentsApi';
import styles from './CommentsSection.module.scss';

/**
 * CommentsSection - Modern & Premium component for displaying and submitting comments
 * 
 * @param {Object} props
 * @param {string} props.entityType - Type of entity: 'article' | 'product' | 'course' | 'user'
 * @param {number|string} props.entityId - ID of the entity
 * @param {Array} props.initialComments - SSR-fetched comments (optional)
 */
const CommentsSection = ({ entityType, entityId, initialComments = [] }) => {
    const { data: session } = useSession();

    // State management
    const [comments, setComments] = useState(initialComments);
    const [isLoading, setIsLoading] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [replyingTo, setReplyingTo] = useState(null); // stores comment documentId/id
    const [submitStatus, setSubmitStatus] = useState('idle'); // 'idle' | 'success' | 'error'
    const [errorMessage, setErrorMessage] = useState('');

    // Form data
    const [name, setName] = useState('');
    const [content, setContent] = useState('');
    const [rating, setRating] = useState(0);
    const [hoveredRating, setHoveredRating] = useState(0);

    // Auto-fill name if user is logged in
    useEffect(() => {
        if (session?.user?.name && !name) {
            setName(session.user.name);
        }
    }, [session]);

    // Calculate total comment count recursively
    const totalCommentsCount = useMemo(() => {
        const getCount = (items) => {
            if (!Array.isArray(items)) return 0;
            return items.reduce((acc, item) => acc + 1 + getCount(item.replies), 0);
        };
        return getCount(comments);
    }, [comments]);

    // Calculate average rating
    const ratingStats = useMemo(() => {
        if (!Array.isArray(comments) || comments.length === 0) return { avg: 0, count: 0 };

        let totalRating = 0;
        let ratedCount = 0;

        const processRatings = (items) => {
            items.forEach((item) => {
                if (item.rating && item.rating > 0) {
                    totalRating += Number(item.rating);
                    ratedCount += 1;
                }
                if (item.replies && item.replies.length > 0) {
                    processRatings(item.replies);
                }
            });
        };

        processRatings(comments);

        return {
            avg: ratedCount > 0 ? (totalRating / ratedCount).toFixed(1) : 0,
            count: ratedCount
        };
    }, [comments]);

    // Find author name of the comment being replied to
    const replyingAuthorName = useMemo(() => {
        if (!replyingTo) return null;

        const findComment = (items) => {
            for (const item of items) {
                if (item.documentId === replyingTo || item.id === replyingTo) {
                    return item.name || item.user?.username || 'کاربر';
                }
                if (item.replies && item.replies.length > 0) {
                    const found = findComment(item.replies);
                    if (found) return found;
                }
            }
            return null;
        };

        return findComment(comments) || 'کاربر';
    }, [replyingTo, comments]);

    // Validation limits
    const MIN_CONTENT_LENGTH = 10;
    const MAX_CONTENT_LENGTH = 1000;
    const contentLength = content.trim().length;
    const isContentValid = contentLength >= MIN_CONTENT_LENGTH && contentLength <= MAX_CONTENT_LENGTH;
    const isNameValid = name.trim().length >= 2;
    const isFormValid = isContentValid && rating > 0 && isNameValid;

    const ratingLabels = {
        1: 'خیلی ضعیف',
        2: 'ضعیف',
        3: 'متوسط',
        4: 'خوب',
        5: 'عالی'
    };

    const handleRatingClick = (value) => {
        setRating(value);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!session) {
            setErrorMessage('برای ثبت نظر ابتدا باید وارد حساب کاربری خود شوید');
            setSubmitStatus('error');
            return;
        }

        if (!isFormValid) {
            setErrorMessage('لطفاً تمام فیلدهای الزامی (امتیاز، نام و متن نظر) را پر کنید');
            setSubmitStatus('error');
            return;
        }

        setIsSubmitting(true);
        setSubmitStatus('idle');
        setErrorMessage('');

        try {
            const commentData = {
                name: name.trim(),
                content: content.trim(),
                rating,
                entityType,
                entityId,
                parentId: replyingTo
            };

            await submitComment(commentData);

            setSubmitStatus('success');
            setContent('');
            setRating(0);
            setReplyingTo(null);

            setTimeout(() => {
                setSubmitStatus('idle');
            }, 6000);

        } catch (error) {
            console.error('Error submitting comment:', error);
            setErrorMessage(error.message || 'خطا در ارسال نظر. لطفاً دوباره تلاش کنید.');
            setSubmitStatus('error');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleReply = (commentId) => {
        setReplyingTo(commentId);
        const formElement = document.getElementById('comment-form');
        if (formElement) {
            formElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    };

    const handleCancelReply = () => {
        setReplyingTo(null);
    };

    const renderStarRating = () => {
        return Array.from({ length: 5 }, (_, index) => {
            const starValue = index + 1;
            const activeValue = hoveredRating || rating;
            const isActive = starValue <= activeValue;

            return (
                <button
                    key={starValue}
                    type="button"
                    className={`${styles.starButton} ${isActive ? styles.active : ''}`}
                    onClick={() => handleRatingClick(starValue)}
                    onMouseEnter={() => setHoveredRating(starValue)}
                    onMouseLeave={() => setHoveredRating(0)}
                    aria-label={`امتیاز ${starValue} ستاره`}
                >
                    <Star className={styles.starIcon} fill={isActive ? 'currentColor' : 'none'} />
                </button>
            );
        });
    };

    return (
        <section className={styles.commentsSection} id="comments">
            {/* Header Section */}
            <header className={styles.header}>
                <div className={styles.headerTitleGroup}>
                    <div className={styles.iconBadge}>
                        <MessageSquare className={styles.headerIcon} />
                    </div>
                    <div>
                        <h2 className={styles.title}>دیدگاه‌ها و نظرات</h2>
                        <p className={styles.description}>
                            نظرات و تجربیات خود را با دیگران به اشتراک بگذارید
                        </p>
                    </div>
                </div>

                {ratingStats.count > 0 && (
                    <div className={styles.overallRatingBadge}>
                        <div className={styles.ratingScore}>{ratingStats.avg}</div>
                        <div className={styles.ratingStars}>
                            {Array.from({ length: 5 }, (_, i) => (
                                <Star
                                    key={i}
                                    className={`${styles.smallStar} ${i < Math.round(ratingStats.avg) ? styles.filled : ''}`}
                                    fill={i < Math.round(ratingStats.avg) ? 'currentColor' : 'none'}
                                />
                            ))}
                        </div>
                        <span className={styles.ratingCount}>({ratingStats.count} امتیاز ثبت‌شده)</span>
                    </div>
                )}
            </header>

            {/* Comment Form */}
            <form
                id="comment-form"
                className={styles.submitForm}
                onSubmit={handleSubmit}
            >
                <div className={styles.formHeader}>
                    <div className={styles.formTitle}>
                        <PenTool className={styles.formTitleIcon} />
                        <span>{replyingTo ? 'ارسال پاسخ به دیدگاه' : 'ثبت دیدگاه جدید'}</span>
                    </div>
                    {session?.user && (
                        <div className={styles.userBadge}>
                            <User className={styles.userBadgeIcon} />
                            <span>وارد شده به عنوان: <strong>{session.user.name || session.user.email}</strong></span>
                        </div>
                    )}
                </div>

                {/* Replying Banner */}
                {replyingTo && (
                    <div className={styles.replyingToBar}>
                        <div className={styles.replyingToInfo}>
                            <CornerDownLeft className={styles.replyIcon} />
                            <span>در حال پاسخ به دیدگاه <strong>{replyingAuthorName}</strong></span>
                        </div>
                        <button
                            type="button"
                            className={styles.cancelReplyBtn}
                            onClick={handleCancelReply}
                            title="انصراف از پاسخ"
                        >
                            <X className={styles.cancelIcon} />
                            <span>انصراف</span>
                        </button>
                    </div>
                )}

                {/* Success Alert */}
                {submitStatus === 'success' && (
                    <div className={styles.successMessage}>
                        <CheckCircle2 className={styles.alertIcon} />
                        <div>
                            <strong>دیدگاه شما با موفقیت ثبت شد!</strong>
                            <p>نظر شما پس از بررسی و تأیید مدیریت در سایت قرار خواهد گرفت.</p>
                        </div>
                    </div>
                )}

                {/* Error Alert */}
                {submitStatus === 'error' && (
                    <div className={styles.errorMessage}>
                        <AlertCircle className={styles.alertIcon} />
                        <span>{errorMessage}</span>
                    </div>
                )}

                <div className={styles.formGrid}>
                    {/* Rating Input */}
                    <div className={styles.formGroup}>
                        <label className={styles.label}>
                            امتیاز شما
                            <span className={styles.required}>*</span>
                        </label>
                        <div className={styles.starRatingContainer}>
                            <div className={styles.starInput}>
                                {renderStarRating()}
                            </div>
                            <span className={styles.ratingTextLabel}>
                                {(hoveredRating || rating) > 0
                                    ? ratingLabels[hoveredRating || rating]
                                    : ''}
                            </span>
                        </div>
                    </div>

                    {/* Name Input */}
                    <div className={styles.formGroup}>
                        <label htmlFor="comment-name" className={styles.label}>
                            نام شما
                            <span className={styles.required}>*</span>
                        </label>
                        <div className={styles.inputWrapper}>
                            <User className={styles.inputIcon} />
                            <input
                                id="comment-name"
                                type="text"
                                className={styles.inputStyle}
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="نام و نام خانوادگی..."
                                disabled={isSubmitting}
                                maxLength={50}
                            />
                        </div>
                    </div>
                </div>

                {/* Content Input */}
                <div className={styles.formGroup}>
                    <label htmlFor="comment-content" className={styles.label}>
                        متن دیدگاه
                        <span className={styles.required}>*</span>
                    </label>
                    <div className={styles.textareaWrapper}>
                        <textarea
                            id="comment-content"
                            className={styles.textarea}
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                            placeholder="دیدگاه، پرسش یا پیشنهاد خود را وارد کنید... (حداقل ۱۰ کاراکتر)"
                            disabled={isSubmitting}
                            maxLength={MAX_CONTENT_LENGTH}
                        />
                    </div>
                    <div className={styles.charCountRow}>
                        <div className={`${styles.charCount} ${!isContentValid && contentLength > 0 ? styles.error : ''}`}>
                            {contentLength} / {MAX_CONTENT_LENGTH} کاراکتر
                            {contentLength > 0 && contentLength < MIN_CONTENT_LENGTH && (
                                <span className={styles.minWarning}> (حداقل {MIN_CONTENT_LENGTH} کاراکتر نیاز است)</span>
                            )}
                        </div>
                    </div>
                </div>

                {/* Submit Button */}
                <button
                    type="submit"
                    className={styles.submitButton}
                    disabled={!isFormValid || isSubmitting}
                >
                    {isSubmitting ? (
                        <>
                            <Loader2 className={styles.spinnerIcon} />
                            <span>در حال ارسال...</span>
                        </>
                    ) : (
                        <>
                            <Send className={styles.sendIcon} />
                            <span>ثبت دیدگاه</span>
                        </>
                    )}
                </button>
            </form>

            {/* Comments List */}
            <div className={styles.commentsListContainer}>
                <div className={styles.commentsListHeader}>
                    <div className={styles.commentsCountBadge}>
                        <MessageCircle className={styles.countIcon} />
                        <span>نظرات کاربران</span>
                        <span className={styles.countPill}>{totalCommentsCount}</span>
                    </div>
                </div>

                {isLoading ? (
                    <div className={styles.loading}>
                        <Loader2 className={styles.spinnerIconLarge} />
                        <p>در حال بارگذاری نظرات...</p>
                    </div>
                ) : comments.length === 0 ? (
                    <div className={styles.emptyState}>
                        <div className={styles.emptyIconWrapper}>
                            <Sparkles className={styles.emptyIcon} />
                        </div>
                        <h3 className={styles.emptyTitle}>هنوز نظری ثبت نشده است</h3>
                        <p className={styles.emptySubtext}>اولین نفری باشید که دیدگاه خود را به اشتراک می‌گذارد!</p>
                    </div>
                ) : (
                    <div className={styles.commentsTree}>
                        {comments.map((comment) => (
                            <CommentItem
                                key={comment.id || comment.documentId}
                                comment={comment}
                                onReply={handleReply}
                                depth={0}
                            />
                        ))}
                    </div>
                )}
            </div>
        </section>
    );
};

export default CommentsSection;
