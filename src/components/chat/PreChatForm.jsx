'use client';

/**
 * @file src/components/chat/PreChatForm.jsx
 * @description فرم پیش‌نیاز اطلاعات سالک — Client Component
 *
 * 🎯 Purpose:
 * قبل از شروع مکالمه با استاد، اطلاعات پایه سالک (سن، وضعیت تاهل، شغل، سابقه معنوی)
 * جمع‌آوری می‌شود. این اطلاعات در فیلد `metaData` پیام به صورت JSON ذخیره می‌شود
 * تا استاد پروفایل کاملی از سالک داشته باشد.
 *
 * 📦 Stack:
 *  - react-hook-form برای مدیریت state فرم و validation
 *  - submitInstructorMessage از messagesApi برای ارسال پیام
 *
 * Props:
 *  - token {string}       — JWT token از session کاربر (برای API call)
 *  - onSuccess {function} — callback پس از ارسال موفق (پیام ایجادشده را پاس می‌دهد)
 */

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { submitInstructorMessage } from '@/lib/messagesApi';
import styles from './PreChatForm.module.scss';

/**
 * گزینه‌های وضعیت تاهل
 * به صورت constant تعریف شده تا قابل استفاده مجدد باشد
 */
const MARITAL_STATUS_OPTIONS = [
    { value: '', label: 'انتخاب کنید...' },
    { value: 'single', label: 'مجرد' },
    { value: 'married', label: 'متاهل' },
    { value: 'divorced', label: 'مطلقه / جدا شده' },
    { value: 'widowed', label: 'بیوه' },
];

export default function PreChatForm({ token, onSuccess }) {
    // ─── State: خطای سرور (جدا از خطاهای validation فرم) ───────────────────
    const [serverError, setServerError] = useState(null);

    // ─── react-hook-form setup ───────────────────────────────────────────────
    const {
        register,
        handleSubmit,
        formState: { errors, isSubmitting },
    } = useForm({
        defaultValues: {
            subject: 'درخواست مشاوره با استاد',
            body: '',
            age: '',
            maritalStatus: '',
            job: '',
            spiritualBackground: '',
        },
    });

    // ─── Submit Handler ──────────────────────────────────────────────────────
    const onSubmit = async (data) => {
        setServerError(null);
        try {
            const result = await submitInstructorMessage(data, token);
            // پس از ارسال موفق، پیام ایجادشده را به کامپوننت پدر می‌فرستیم
            onSuccess?.(result?.data);
        } catch (err) {
            // نمایش پیام خطای قابل‌فهم برای کاربر
            setServerError('ارسال پیام با خطا مواجه شد. لطفاً دوباره تلاش کنید.');
        }
    };

    return (
        <div className={styles.preChatForm}>
            <div className={styles.preChatForm__card}>

                {/* ─── Header ─────────────────────────────────────────── */}
                <div className={styles.preChatForm__header}>
                    <div className={styles.preChatForm__icon}>
                        {/* آیکون ساده SVG — بدون dependency خارجی */}
                        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                            <circle cx="12" cy="7" r="4" />
                        </svg>
                    </div>
                    <h1 className={styles.preChatForm__title}>اطلاعات پایه سالک</h1>
                    <p className={styles.preChatForm__subtitle}>
                        برای شروع مکالمه با استاد، لطفاً اطلاعات زیر را تکمیل کنید.
                    </p>
                </div>

                {/* ─── Form ───────────────────────────────────────────── */}
                <form onSubmit={handleSubmit(onSubmit)} noValidate>
                    <div className={styles.preChatForm__fields}>

                        {/* ردیف اول: سن + وضعیت تاهل */}
                        <div className={styles.preChatForm__row}>

                            {/* سن */}
                            <div className={styles.preChatForm__field}>
                                <label
                                    htmlFor="age"
                                    className={`${styles.preChatForm__label} ${styles['preChatForm__label--required']}`}
                                >
                                    سن
                                </label>
                                <input
                                    id="age"
                                    type="number"
                                    min="1"
                                    max="120"
                                    placeholder="مثلاً ۳۵"
                                    className={`${styles.preChatForm__input} ${errors.age ? styles['preChatForm__input--error'] : ''}`}
                                    {...register('age', {
                                        required: 'سن الزامی است',
                                        min: { value: 1, message: 'سن معتبر نیست' },
                                        max: { value: 120, message: 'سن معتبر نیست' },
                                    })}
                                />
                                {errors.age && (
                                    <span className={styles.preChatForm__error} role="alert">
                                        {errors.age.message}
                                    </span>
                                )}
                            </div>

                            {/* وضعیت تاهل */}
                            <div className={styles.preChatForm__field}>
                                <label
                                    htmlFor="maritalStatus"
                                    className={`${styles.preChatForm__label} ${styles['preChatForm__label--required']}`}
                                >
                                    وضعیت تاهل
                                </label>
                                <select
                                    id="maritalStatus"
                                    className={`${styles.preChatForm__select} ${errors.maritalStatus ? styles['preChatForm__select--error'] : ''}`}
                                    {...register('maritalStatus', { required: 'وضعیت تاهل الزامی است' })}
                                >
                                    {MARITAL_STATUS_OPTIONS.map(({ value, label }) => (
                                        <option key={value} value={value}>{label}</option>
                                    ))}
                                </select>
                                {errors.maritalStatus && (
                                    <span className={styles.preChatForm__error} role="alert">
                                        {errors.maritalStatus.message}
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* شغل */}
                        <div className={styles.preChatForm__field}>
                            <label
                                htmlFor="job"
                                className={`${styles.preChatForm__label} ${styles['preChatForm__label--required']}`}
                            >
                                شغل
                            </label>
                            <input
                                id="job"
                                type="text"
                                placeholder="شغل فعلی خود را بنویسید"
                                className={`${styles.preChatForm__input} ${errors.job ? styles['preChatForm__input--error'] : ''}`}
                                {...register('job', { required: 'شغل الزامی است' })}
                            />
                            {errors.job && (
                                <span className={styles.preChatForm__error} role="alert">
                                    {errors.job.message}
                                </span>
                            )}
                        </div>

                        {/* سابقه معنوی */}
                        <div className={styles.preChatForm__field}>
                            <label
                                htmlFor="spiritualBackground"
                                className={`${styles.preChatForm__label} ${styles['preChatForm__label--required']}`}
                            >
                                سابقه معنوی
                            </label>
                            <textarea
                                id="spiritualBackground"
                                rows={3}
                                placeholder="سابقه معنوی، تجربیات یا مسیری که تا به‌حال طی کرده‌اید را شرح دهید..."
                                className={`${styles.preChatForm__textarea} ${errors.spiritualBackground ? styles['preChatForm__textarea--error'] : ''}`}
                                {...register('spiritualBackground', {
                                    required: 'توضیح سابقه معنوی الزامی است',
                                    minLength: { value: 10, message: 'حداقل ۱۰ کاراکتر بنویسید' },
                                })}
                            />
                            {errors.spiritualBackground && (
                                <span className={styles.preChatForm__error} role="alert">
                                    {errors.spiritualBackground.message}
                                </span>
                            )}
                        </div>

                        {/* پیام اولیه برای استاد */}
                        <div className={styles.preChatForm__field}>
                            <label
                                htmlFor="body"
                                className={`${styles.preChatForm__label} ${styles['preChatForm__label--required']}`}
                            >
                                سوال یا درخواست شما از استاد
                            </label>
                            <textarea
                                id="body"
                                rows={4}
                                placeholder="سوال یا موضوعی که می‌خواهید با استاد در میان بگذارید را بنویسید..."
                                className={`${styles.preChatForm__textarea} ${errors.body ? styles['preChatForm__textarea--error'] : ''}`}
                                {...register('body', {
                                    required: 'نوشتن پیام الزامی است',
                                    minLength: { value: 15, message: 'حداقل ۱۵ کاراکتر بنویسید' },
                                })}
                            />
                            {errors.body && (
                                <span className={styles.preChatForm__error} role="alert">
                                    {errors.body.message}
                                </span>
                            )}
                        </div>

                        {/* خطای سرور */}
                        {serverError && (
                            <div className={styles.preChatForm__serverError} role="alert">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <circle cx="12" cy="12" r="10" />
                                    <path d="M12 8v4M12 16h.01" />
                                </svg>
                                {serverError}
                            </div>
                        )}

                        {/* دکمه ارسال */}
                        <button
                            type="submit"
                            id="preChatForm-submit"
                            disabled={isSubmitting}
                            className={styles.preChatForm__submit}
                        >
                            {isSubmitting ? (
                                <>
                                    <span className={styles.preChatForm__spinner} aria-hidden="true" />
                                    در حال ارسال...
                                </>
                            ) : (
                                <>
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <line x1="22" y1="2" x2="11" y2="13" />
                                        <polygon points="22 2 15 22 11 13 2 9 22 2" />
                                    </svg>
                                    ارسال و شروع مکالمه
                                </>
                            )}
                        </button>

                    </div>
                </form>
            </div>
        </div>
    );
}
