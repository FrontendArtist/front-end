import { useState, useEffect, useMemo } from 'react';
import { submitComment } from '@/lib/commentsApi';

export const useCommentsManager = ({ entityType, entityId, initialComments, session }) => {
    const [comments, setComments] = useState(initialComments);
    const [isLoading, setIsLoading] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [replyingTo, setReplyingTo] = useState(null);
    const [submitStatus, setSubmitStatus] = useState('idle');
    const [errorMessage, setErrorMessage] = useState('');

    const [name, setName] = useState('');
    const [content, setContent] = useState('');
    const [rating, setRating] = useState(0);
    const [hoveredRating, setHoveredRating] = useState(0);

    useEffect(() => {
        if (session?.user?.name && !name) {
            setName(session.user.name);
        }
    }, [session]);

    const totalCommentsCount = useMemo(() => {
        const getCount = (items) => {
            if (!Array.isArray(items)) return 0;
            return items.reduce((acc, item) => acc + 1 + getCount(item.replies), 0);
        };
        return getCount(comments);
    }, [comments]);

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

    const MIN_CONTENT_LENGTH = 10;
    const MAX_CONTENT_LENGTH = 1000;
    const contentLength = content.trim().length;
    const isContentValid = contentLength >= MIN_CONTENT_LENGTH && contentLength <= MAX_CONTENT_LENGTH;
    const isNameValid = name.trim().length >= 2;
    const isFormValid = isContentValid && rating > 0 && isNameValid;

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

    return {
        comments,
        isLoading,
        isSubmitting,
        replyingTo,
        submitStatus,
        errorMessage,
        name,
        setName,
        content,
        setContent,
        rating,
        hoveredRating,
        setHoveredRating,
        totalCommentsCount,
        ratingStats,
        replyingAuthorName,
        contentLength,
        isContentValid,
        isFormValid,
        MIN_CONTENT_LENGTH,
        MAX_CONTENT_LENGTH,
        handleRatingClick,
        handleSubmit,
        handleReply,
        handleCancelReply
    };
};
