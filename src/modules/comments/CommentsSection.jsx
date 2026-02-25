'use client';

import { useState, useEffect } from 'react';
import CommentItem from './CommentItem';
import { submitComment, getComments } from '@/lib/commentsApi';
import styles from './CommentsSection.module.scss';

/**
 * CommentsSection - Main component for displaying and submitting comments
 * 
 * Features:
 * - Display list of approved comments with threading
 * - Submit new comments with star rating
 * - Reply to existing comments
 * - Server-side initial data with client-side interactions
 * - Moderation workflow (pending approval message)
 * 
 * @param {Object} props
 * @param {string} props.entityType - Type of entity: 'article' | 'product' | 'course' | 'user'
 * @param {number} props.entityId - ID of the entity
 * @param {Array} props.initialComments - SSR-fetched comments (optional)
 */
const CommentsSection = ({ entityType, entityId, initialComments = [] }) => {
    // State management
    const [comments, setComments] = useState(initialComments);
    const [isLoading, setIsLoading] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [replyingTo, setReplyingTo] = useState(null);
    const [submitStatus, setSubmitStatus] = useState('idle'); // 'idle' | 'success' | 'error'
    const [errorMessage, setErrorMessage] = useState('');

    // Form data
    const [content, setContent] = useState('');
    const [rating, setRating] = useState(0);
    const [hoveredRating, setHoveredRating] = useState(0);

    // Character count for validation
    const MIN_CONTENT_LENGTH = 10;
    const MAX_CONTENT_LENGTH = 1000;
    const contentLength = content.trim().length;
    const isContentValid = contentLength >= MIN_CONTENT_LENGTH && contentLength <= MAX_CONTENT_LENGTH;
    const isFormValid = isContentValid && rating > 0;

    /**
     * Handle star rating selection
     */
    const handleRatingClick = (value) => {
        setRating(value);
    };

    /**
     * Handle form submission
     */
    const handleSubmit = async (e) => {
        e.preventDefault();

        // Validation
        if (!isFormValid) {
            setErrorMessage('لطفاً تمام فیلدهای الزامی را پر کنید');
            setSubmitStatus('error');
            return;
        }

        setIsSubmitting(true);
        setSubmitStatus('idle');
        setErrorMessage('');

        try {
            // Prepare comment data
            const commentData = {
                content: content.trim(),
                rating,
                entityType,
                entityId,
                parentId: replyingTo
            };

            // Submit comment
            await submitComment(commentData);

            // Show success message
            setSubmitStatus('success');

            // Reset form
            setContent('');
            setRating(0);
            setReplyingTo(null);

            // Auto-hide success message after 5 seconds
            setTimeout(() => {
                setSubmitStatus('idle');
            }, 5000);

        } catch (error) {
            console.error('Error submitting comment:', error);
            setErrorMessage(error.message || 'خطا در ارسال نظر. لطفاً دوباره تلاش کنید.');
            setSubmitStatus('error');
        } finally {
            setIsSubmitting(false);
        }
    };

    /**
     * Handle reply button click
     */
    const handleReply = (commentId) => {
        setReplyingTo(commentId);
        // Scroll to form
        const formElement = document.getElementById('comment-form');
        if (formElement) {
            formElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    };

    /**
     * Cancel reply
     */
    const handleCancelReply = () => {
        setReplyingTo(null);
    };

    /**
     * Refresh comments (after approval - for future use)
     */
    const refreshComments = async () => {
        setIsLoading(true);
        try {
            const freshComments = await getComments(entityType, entityId);
            setComments(freshComments);
        } catch (error) {
            console.error('Error refreshing comments:', error);
        } finally {
            setIsLoading(false);
        }
    };

    // Star rating display helper
    const renderStarRating = () => {
        return Array.from({ length: 5 }, (_, index) => {
            const starValue = index + 1;
            const isActive = starValue <= (hoveredRating || rating);

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
                    ★
                </button>
            );
        });
    };

    return (
        <section className={styles.commentsSection} id="comments">
            {/* Header */}
            <header className={styles.header}>
                <h2 className={styles.title}>نظرات</h2>
                <p className={styles.description}>
                    نظرات خود را با ما به اشتراک بگذارید
                </p>
            </header>

            {/* Submit Form */}
            <form
                id="comment-form"
                className={styles.submitForm}
                onSubmit={handleSubmit}
            >
                <h3 className={styles.formTitle}>
                    {replyingTo ? 'پاسخ به نظر' : 'ثبت نظر جدید'}
                </h3>

                {/* Success Message */}
                {submitStatus === 'success' && (
                    <div className={styles.successMessage}>
                        نظر شما با موفقیت ثبت شد و پس از تأیید نمایش داده خواهد شد.
                    </div>
                )}

                {/* Error Message */}
                {submitStatus === 'error' && (
                    <div className={styles.errorMessage}>
                        {errorMessage}
                    </div>
                )}

                {/* Reply indicator */}
                {replyingTo && (
                    <div className={styles.replyingTo}>
                        <span>در حال پاسخ به نظر شماره {replyingTo}</span>
                        <button
                            type="button"
                            className={styles.cancelReply}
                            onClick={handleCancelReply}
                        >
                            لغو
                        </button>
                    </div>
                )}

                {/* Star Rating Input */}
                <div className={styles.formGroup}>
                    <label className={styles.label}>
                        امتیاز شما
                        <span className={styles.required}>*</span>
                    </label>
                    <div className={styles.starRating}>
                        <div className={styles.starInput}>
                            {renderStarRating()}
                        </div>
                        {rating > 0 && (
                            <span className={styles.ratingLabel}>
                                {rating} از 5
                            </span>
                        )}
                    </div>
                </div>

                {/* Comment Content */}
                <div className={styles.formGroup}>
                    <label htmlFor="comment-content" className={styles.label}>
                        نظر شما
                        <span className={styles.required}>*</span>
                    </label>
                    <textarea
                        id="comment-content"
                        className={styles.textarea}
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                        placeholder="نظر خود را اینجا بنویسید... (حداقل 10 کاراکتر)"
                        disabled={isSubmitting}
                        maxLength={MAX_CONTENT_LENGTH}
                    />
                    <div className={`${styles.charCount} ${!isContentValid && contentLength > 0 ? styles.error : ''}`}>
                        {contentLength} / {MAX_CONTENT_LENGTH} کاراکتر
                        {contentLength > 0 && contentLength < MIN_CONTENT_LENGTH && (
                            <span> (حداقل {MIN_CONTENT_LENGTH} کاراکتر نیاز است)</span>
                        )}
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
                            <span className={styles.buttonIcon}>⏳</span>
                            در حال ارسال...
                        </>
                    ) : (
                        <>
                            <span className={styles.buttonIcon}>✓</span>
                            ارسال نظر
                        </>
                    )}
                </button>
            </form>

            {/* Comments List */}
            <div className={styles.commentsList}>
                {comments.length > 0 && (
                    <div className={styles.commentsCount}>
                        <span>نظرات</span>
                        <span className={styles.countBadge}>{comments.length}</span>
                    </div>
                )}

                {isLoading ? (
                    <div className={styles.loading}>
                        <div className={styles.loadingSpinner}></div>
                        <p>در حال بارگذاری نظرات...</p>
                    </div>
                ) : comments.length === 0 ? (
                    <div className={styles.emptyState}>
                        <div className={styles.emptyIcon}>💬</div>
                        <p className={styles.emptyText}>هنوز نظری ثبت نشده است</p>
                        <p className={styles.emptySubtext}>اولین نفری باشید که نظر می‌دهد!</p>
                    </div>
                ) : (
                    comments.map((comment) => (
                        <CommentItem
                            key={comment.id}
                            comment={comment}
                            onReply={handleReply}
                            depth={0}
                        />
                    ))
                )}
            </div>
        </section>
    );
};

export default CommentsSection;
