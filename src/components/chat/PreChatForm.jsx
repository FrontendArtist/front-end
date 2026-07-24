'use client';

/**
 * @file src/components/chat/PreChatForm.jsx
 * @description فرم پیش‌نیاز اطلاعات سالک — Client Component پویا
 *
 * 🎯 Purpose:
 * اطلاعات پیش‌نیاز سالک بر اساس تنظیمات دریافتی از Strapi (MentorFormSetting) به صورت پویا رندر می‌شود.
 * پاسخ‌های سوالات پویا در فیلد `metaData` پیام به صورت JSON ذخیره می‌شوند.
 *
 * 📦 Stack:
 *  - react-hook-form برای مدیریت state فرم و validation
 *  - getMentorFormSetting & submitInstructorMessage از messagesApi
 *
 * Props:
 *  - token {string}       — JWT token از session کاربر
 *  - onSuccess {function} — callback پس از ارسال موفق
 */

import { useState, useEffect, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { getMentorFormSetting, submitInstructorMessage } from '@/lib/messagesApi';
import styles from './PreChatForm.module.scss';

/**
 * سوالات پیش‌فرض برای حالت دریافت خطا یا خالی بودن دیتابیس
 */
const DEFAULT_QUESTIONS = [
    {
        key: 'age',
        label: 'سن',
        fieldType: 'number',
        isRequired: true,
        placeholder: 'مثلاً ۳۵',
    },
    {
        key: 'maritalStatus',
        label: 'وضعیت تاهل',
        fieldType: 'select',
        isRequired: true,
        options: [
            { value: 'single', label: 'مجرد' },
            { value: 'married', label: 'متاهل' },
            { value: 'divorced', label: 'مطلقه / جدا شده' },
            { value: 'widowed', label: 'بیوه' },
        ],
    },
    {
        key: 'job',
        label: 'شغل',
        fieldType: 'text',
        isRequired: true,
        placeholder: 'شغل فعلی خود را بنویسید',
    },
    {
        key: 'spiritualBackground',
        label: 'سابقه معنوی',
        fieldType: 'textarea',
        isRequired: true,
        placeholder: 'سابقه معنوی، تجربیات یا مسیری که تا به‌حال طی کرده‌اید را شرح دهید...',
    },
];

/**
 * نرمال‌سازی گزینه‌های Select
 */
function normalizeOptions(options) {
    if (!options) return [];
    let parsed = options;
    if (typeof options === 'string') {
        try {
            parsed = JSON.parse(options);
        } catch {
            return [];
        }
    }
    if (!Array.isArray(parsed)) return [];
    return parsed.map((item) => {
        if (typeof item === 'object' && item !== null && item.value !== undefined) {
            return { value: String(item.value), label: String(item.label || item.value) };
        }
        return { value: String(item), label: String(item) };
    });
}

export default function PreChatForm({ token, onSuccess }) {
    // ─── States ─────────────────────────────────────────────────────────────
    const [questions, setQuestions] = useState([]);
    const [formTitle, setFormTitle] = useState('اطلاعات پایه سالک');
    const [formDescription, setFormDescription] = useState('برای شروع مکالمه با استاد، لطفاً اطلاعات زیر را تکمیل کنید.');
    const [isLoadingSchema, setIsLoadingSchema] = useState(true);
    const [schemaError, setSchemaError] = useState(null);
    const [serverError, setServerError] = useState(null);

    // ─── react-hook-form setup ───────────────────────────────────────────────
    const {
        register,
        handleSubmit,
        formState: { errors, isSubmitting },
    } = useForm();

    // ─── Fetch Schema ────────────────────────────────────────────────────────
    const fetchSchema = useCallback(async () => {
        setIsLoadingSchema(true);
        setSchemaError(null);
        try {
            const res = await getMentorFormSetting(token);
            const data = res?.data?.attributes || res?.data;

            if (data) {
                if (data.title) setFormTitle(data.title);
                if (data.description) setFormDescription(data.description);

                const rawQuestions = data.questions?.data || data.questions;
                if (Array.isArray(rawQuestions) && rawQuestions.length > 0) {
                    const normalized = rawQuestions.map((q) => {
                        const attrs = q.attributes || q;
                        return {
                            id: q.id || attrs.key,
                            key: attrs.key,
                            label: attrs.label,
                            fieldType: attrs.fieldType || 'text',
                            isRequired: Boolean(attrs.isRequired),
                            options: normalizeOptions(attrs.options),
                            placeholder: attrs.placeholder || '',
                        };
                    });
                    setQuestions(normalized);
                } else {
                    console.info('ℹ️ تنظیمات فرم پیش‌نیاز در Strapi کامل نیست. از فرم پیش‌فرض استفاده می‌شود.');
                    setQuestions(DEFAULT_QUESTIONS);
                }
            } else {
                console.info('ℹ️ تنظیمات فرم پیش‌نیاز در Strapi ثبت نشده است. از فرم پیش‌فرض استفاده می‌شود.');
                setQuestions(DEFAULT_QUESTIONS);
            }
        } catch (err) {
            console.info('ℹ️ تنظیمات فرم پیش‌نیاز در Strapi یافت نشد. از فرم پیش‌فرض استفاده می‌شود.');
            setQuestions(DEFAULT_QUESTIONS);
        } finally {
            setIsLoadingSchema(false);
        }
    }, [token]);

    useEffect(() => {
        fetchSchema();
    }, [fetchSchema]);

    // ─── Submit Handler ──────────────────────────────────────────────────────
    const onSubmit = async (data) => {
        setServerError(null);
        try {
            const { body, subject, ...metaData } = data;
            const payload = {
                subject: subject || 'درخواست مشاوره با استاد',
                body,
                metaData,
            };
            const result = await submitInstructorMessage(payload, token);
            onSuccess?.(result?.data);
        } catch (err) {
            setServerError('ارسال پیام با خطا مواجه شد. لطفاً دوباره تلاش کنید.');
        }
    };

    // ─── Render Dynamic Input Field ──────────────────────────────────────────
    const renderField = (q) => {
        const fieldError = errors[q.key];
        const validationRules = {};

        if (q.isRequired) {
            validationRules.required = `${q.label} الزامی است`;
        }

        if (q.fieldType === 'number') {
            validationRules.min = { value: 1, message: `${q.label} معتبر نیست` };
        }

        switch (q.fieldType) {
            case 'select': {
                const opts = Array.isArray(q.options) ? q.options : normalizeOptions(q.options);
                return (
                    <div key={q.key} className={styles.preChatForm__field}>
                        <label
                            htmlFor={q.key}
                            className={`${styles.preChatForm__label} ${q.isRequired ? styles['preChatForm__label--required'] : ''}`}
                        >
                            {q.label}
                        </label>
                        <select
                            id={q.key}
                            className={`${styles.preChatForm__select} ${fieldError ? styles['preChatForm__select--error'] : ''}`}
                            {...register(q.key, validationRules)}
                        >
                            <option value="">انتخاب کنید...</option>
                            {opts.map(({ value, label }) => (
                                <option key={value} value={value}>{label}</option>
                            ))}
                        </select>
                        {fieldError && (
                            <span className={styles.preChatForm__error} role="alert">
                                {fieldError.message}
                            </span>
                        )}
                    </div>
                );
            }

            case 'textarea':
                return (
                    <div key={q.key} className={styles.preChatForm__field}>
                        <label
                            htmlFor={q.key}
                            className={`${styles.preChatForm__label} ${q.isRequired ? styles['preChatForm__label--required'] : ''}`}
                        >
                            {q.label}
                        </label>
                        <textarea
                            id={q.key}
                            rows={3}
                            placeholder={q.placeholder}
                            className={`${styles.preChatForm__textarea} ${fieldError ? styles['preChatForm__textarea--error'] : ''}`}
                            {...register(q.key, validationRules)}
                        />
                        {fieldError && (
                            <span className={styles.preChatForm__error} role="alert">
                                {fieldError.message}
                            </span>
                        )}
                    </div>
                );

            case 'number':
                return (
                    <div key={q.key} className={styles.preChatForm__field}>
                        <label
                            htmlFor={q.key}
                            className={`${styles.preChatForm__label} ${q.isRequired ? styles['preChatForm__label--required'] : ''}`}
                        >
                            {q.label}
                        </label>
                        <input
                            id={q.key}
                            type="number"
                            placeholder={q.placeholder}
                            className={`${styles.preChatForm__input} ${fieldError ? styles['preChatForm__input--error'] : ''}`}
                            {...register(q.key, validationRules)}
                        />
                        {fieldError && (
                            <span className={styles.preChatForm__error} role="alert">
                                {fieldError.message}
                            </span>
                        )}
                    </div>
                );

            case 'text':
            default:
                return (
                    <div key={q.key} className={styles.preChatForm__field}>
                        <label
                            htmlFor={q.key}
                            className={`${styles.preChatForm__label} ${q.isRequired ? styles['preChatForm__label--required'] : ''}`}
                        >
                            {q.label}
                        </label>
                        <input
                            id={q.key}
                            type="text"
                            placeholder={q.placeholder}
                            className={`${styles.preChatForm__input} ${fieldError ? styles['preChatForm__input--error'] : ''}`}
                            {...register(q.key, validationRules)}
                        />
                        {fieldError && (
                            <span className={styles.preChatForm__error} role="alert">
                                {fieldError.message}
                            </span>
                        )}
                    </div>
                );
        }
    };

    return (
        <div className={styles.preChatForm}>
            <div className={styles.preChatForm__card}>

                {/* ─── Header ─────────────────────────────────────────── */}
                <div className={styles.preChatForm__header}>
                    <div className={styles.preChatForm__icon}>
                        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                            <circle cx="12" cy="7" r="4" />
                        </svg>
                    </div>
                    <h1 className={styles.preChatForm__title}>{formTitle}</h1>
                    <p className={styles.preChatForm__subtitle}>{formDescription}</p>

                    {schemaError && (
                        <div className={styles.preChatForm__serverError} style={{ marginTop: '12px' }} role="status">
                            <span>{schemaError}</span>
                            <button
                                type="button"
                                className={styles.preChatForm__retryButton}
                                onClick={fetchSchema}
                            >
                                تلاش مجدد
                            </button>
                        </div>
                    )}
                </div>

                {/* ─── Form Content ────────────────────────────────────── */}
                {isLoadingSchema ? (
                    /* ─── Skeleton Loader ────────────────────────────────── */
                    <div className={styles.preChatForm__fields} aria-label="در حال بارگذاری فرم...">
                        <div className={styles.preChatForm__row}>
                            <div>
                                <div className={styles.preChatForm__skeletonLabel} />
                                <div className={styles.preChatForm__skeletonBlock} />
                            </div>
                            <div>
                                <div className={styles.preChatForm__skeletonLabel} />
                                <div className={styles.preChatForm__skeletonBlock} />
                            </div>
                        </div>
                        <div>
                            <div className={styles.preChatForm__skeletonLabel} />
                            <div className={styles.preChatForm__skeletonBlock} />
                        </div>
                        <div>
                            <div className={styles.preChatForm__skeletonLabel} />
                            <div className={styles.preChatForm__skeletonBlock} style={{ height: '80px' }} />
                        </div>
                    </div>
                ) : (
                    /* ─── Dynamic Form ───────────────────────────────────── */
                    <form onSubmit={handleSubmit(onSubmit)} noValidate>
                        <div className={styles.preChatForm__fields}>

                            {/* رندر سوالات داینامیک */}
                            {questions.map((q) => renderField(q))}

                            {/* فیلد ثابت: متن پیام سالک */}
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
                                        minLength: { value: 10, message: 'حداقل ۱۰ کاراکتر بنویسید' },
                                    })}
                                />
                                {errors.body && (
                                    <span className={styles.preChatForm__error} role="alert">
                                        {errors.body.message}
                                    </span>
                                )}
                            </div>

                            {/* خطای ارسال به سرور */}
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
                )}
            </div>
        </div>
    );
}
