'use client';

/**
 * ContactForm Component - فرم تماس با قابلیت اعتبارسنجی
 * 
 * نقش:
 * این کامپوننت یک فرم کامل برای ارسال پیام تماس به Strapi فراهم می‌کند.
 * از react-hook-form برای مدیریت state و اعتبارسنجی استفاده می‌کند.
 * 
 * ویژگی‌ها:
 * - اعتبارسنجی real-time
 * - مدیریت وضعیت‌های loading/success/error
 * - بازخورد بصری به کاربر
 * - ریست خودکار فرم پس از ارسال موفق
 * - طراحی Glassmorphism
 * - پشتیبانی RTL
 */

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { submitContactMessage } from '@/lib/contactApi';
import styles from './ContactForm.module.scss';

export default function ContactForm() {
    // مدیریت state فرم با react-hook-form
    const {
        register,
        handleSubmit,
        formState: { errors, isSubmitting },
        reset,
    } = useForm();

    // مدیریت وضعیت ارسال
    const [submitStatus, setSubmitStatus] = useState({
        type: null, // 'success' | 'error' | null
        message: '',
    });

    /**
     * Handler ارسال فرم
     * 
     * @param {object} data - داده‌های فرم از react-hook-form
     */
    const onSubmit = async (data) => {
        try {
            // پاک کردن وضعیت قبلی
            setSubmitStatus({ type: null, message: '' });

            // ارسال داده به API
            await submitContactMessage(data);

            // نمایش پیام موفقیت
            setSubmitStatus({
                type: 'success',
                message: 'پیام شما با موفقیت ارسال شد. به‌زودی با شما تماس خواهیم گرفت.',
            });

            // ریست فرم
            reset();

            // پاک کردن پیام موفقیت بعد از 5 ثانیه
            setTimeout(() => {
                setSubmitStatus({ type: null, message: '' });
            }, 5000);

        } catch (error) {
            // نمایش پیام خطا
            setSubmitStatus({
                type: 'error',
                message: error.message || 'خطایی در ارسال پیام رخ داد. لطفاً دوباره تلاش کنید.',
            });

            // پاک کردن پیام خطا بعد از 7 ثانیه
            setTimeout(() => {
                setSubmitStatus({ type: null, message: '' });
            }, 7000);
        }
    };

    return (
        <div className={styles.formContainer}>
            <h2 className={styles.formTitle}>فرم تماس با ما</h2>
            <p className={styles.formDescription}>
                لطفاً فرم زیر را با دقت پر کنید. ما در اسرع وقت پاسخگوی شما خواهیم بود.
            </p>

            <form onSubmit={handleSubmit(onSubmit)} className={styles.form} noValidate>
                {/* فیلد نام */}
                <div className={styles.formGroup}>
                    <label htmlFor="name" className={styles.label}>
                        نام و نام خانوادگی <span className={styles.required}>*</span>
                    </label>
                    <input
                        id="name"
                        type="text"
                        className={`${styles.input} ${errors.name ? styles.inputError : ''}`}
                        {...register('name', {
                            required: 'نام الزامی است',
                            minLength: {
                                value: 2,
                                message: 'نام باید حداقل 2 کاراکتر باشد',
                            },
                            maxLength: {
                                value: 100,
                                message: 'نام نباید بیشتر از 100 کاراکتر باشد',
                            },
                        })}
                        placeholder="نام کامل خود را وارد کنید"
                        disabled={isSubmitting}
                    />
                    {errors.name && (
                        <span className={styles.errorMessage}>{errors.name.message}</span>
                    )}
                </div>

                {/* فیلد اطلاعات تماس */}
                <div className={styles.formGroup}>
                    <label htmlFor="contactInfo" className={styles.label}>
                        ایمیل یا شماره تماس <span className={styles.required}>*</span>
                    </label>
                    <input
                        id="contactInfo"
                        type="text"
                        className={`${styles.input} ${errors.contactInfo ? styles.inputError : ''}`}
                        {...register('contactInfo', {
                            required: 'اطلاعات تماس الزامی است',
                            validate: (value) => {
                                // اعتبارسنجی ایمیل یا شماره تلفن
                                const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                                const phoneRegex = /^[\d\s\-\+\(\)]+$/;

                                if (emailRegex.test(value) || phoneRegex.test(value)) {
                                    return true;
                                }
                                return 'لطفاً یک ایمیل یا شماره تلفن معتبر وارد کنید';
                            },
                        })}
                        placeholder="example@email.com یا 09123456789"
                        disabled={isSubmitting}
                    />
                    {errors.contactInfo && (
                        <span className={styles.errorMessage}>{errors.contactInfo.message}</span>
                    )}
                </div>

                {/* فیلد موضوع */}
                <div className={styles.formGroup}>
                    <label htmlFor="subject" className={styles.label}>
                        موضوع
                    </label>
                    <input
                        id="subject"
                        type="text"
                        className={styles.input}
                        {...register('subject', {
                            maxLength: {
                                value: 200,
                                message: 'موضوع نباید بیشتر از 200 کاراکتر باشد',
                            },
                        })}
                        placeholder="موضوع پیام خود را بنویسید (اختیاری)"
                        disabled={isSubmitting}
                    />
                    {errors.subject && (
                        <span className={styles.errorMessage}>{errors.subject.message}</span>
                    )}
                </div>

                {/* فیلد متن پیام */}
                <div className={styles.formGroup}>
                    <label htmlFor="body" className={styles.label}>
                        متن پیام <span className={styles.required}>*</span>
                    </label>
                    <textarea
                        id="body"
                        rows="6"
                        className={`${styles.textarea} ${errors.body ? styles.inputError : ''}`}
                        {...register('body', {
                            required: 'متن پیام الزامی است',
                            minLength: {
                                value: 20,
                                message: 'پیام باید حداقل 20 کاراکتر باشد',
                            },
                            maxLength: {
                                value: 2000,
                                message: 'پیام نباید بیشتر از 2000 کاراکتر باشد',
                            },
                        })}
                        placeholder="پیام خود را اینجا بنویسید... (حداقل 20 کاراکتر)"
                        disabled={isSubmitting}
                    />
                    {errors.body && (
                        <span className={styles.errorMessage}>{errors.body.message}</span>
                    )}
                </div>

                {/* دکمه ارسال */}
                <button
                    type="submit"
                    className={styles.submitButton}
                    disabled={isSubmitting}
                >
                    {isSubmitting ? 'در حال ارسال...' : 'ارسال پیام'}
                </button>

                {/* پیام وضعیت */}
                {submitStatus.message && (
                    <div
                        className={`${styles.statusMessage} ${submitStatus.type === 'success' ? styles.statusSuccess : styles.statusError
                            }`}
                        role="alert"
                    >
                        {submitStatus.message}
                    </div>
                )}
            </form>
        </div>
    );
}
