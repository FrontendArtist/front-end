'use client';

/**
 * ContactForm Component - فرم تماس با قابلیت اعتبارسنجی
 * 
 * نقش:
 * این کامپوننت یک فرم کامل برای ارسال پیام تماس به Strapi فراهم می‌کند.
 * از react-hook-form برای مدیریت state و اعتبارسنجی استفاده می‌کند.
 * هنگام ورود کاربر، اطلاعات نام و شماره تماس به طور خودکار از پروفایل بارگذاری می‌شود
 * و دکمه ویرایش (علامت مداد) برای تغییر دستی آن‌ها در دسترس قرار می‌گیرد.
 */

import { useState, useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { useSession } from 'next-auth/react';
import { Pencil, Check } from 'lucide-react';
import { submitContactMessage } from '@/lib/contactApi';
import styles from './ContactForm.module.scss';

export default function ContactForm() {
    const { data: session, status } = useSession();

    // مدیریت state فرم با react-hook-form
    const {
        register,
        handleSubmit,
        setValue,
        formState: { errors, isSubmitting },
        reset,
    } = useForm({
        defaultValues: {
            name: '',
            contactInfo: '',
            subject: '',
            body: '',
        },
    });

    // وضعیت ویرایش فیلدهای پروفایل
    const [isEditingName, setIsEditingName] = useState(false);
    const [isEditingContact, setIsEditingContact] = useState(false);
    const [userProfile, setUserProfile] = useState({
        name: '',
        phone: '',
    });

    const nameInputRef = useRef(null);
    const contactInputRef = useRef(null);

    // مدیریت وضعیت ارسال
    const [submitStatus, setSubmitStatus] = useState({
        type: null, // 'success' | 'error' | null
        message: '',
    });

    // بارگذاری اطلاعات کاربر لاگین‌شده از پروفایل یا سشن
    useEffect(() => {
        if (status !== 'authenticated') return;

        let isMounted = true;
        const loadUserProfile = async () => {
            try {
                const res = await fetch('/api/profile', { cache: 'no-store' });
                let profileData = null;
                if (res.ok) {
                    profileData = await res.json();
                }

                if (!isMounted) return;

                const firstName = profileData?.firstName ?? session?.user?.firstName ?? '';
                const lastName = profileData?.lastName ?? session?.user?.lastName ?? '';
                const fullName = [firstName, lastName].filter(Boolean).join(' ').trim() || session?.user?.name || '';
                const phoneNumber = profileData?.phoneNumber || session?.user?.phoneNumber || '';

                setUserProfile({
                    name: fullName,
                    phone: phoneNumber,
                });

                if (fullName) {
                    setValue('name', fullName, { shouldValidate: true });
                    setIsEditingName(false);
                } else {
                    setIsEditingName(true);
                }

                if (phoneNumber) {
                    setValue('contactInfo', phoneNumber, { shouldValidate: true });
                    setIsEditingContact(false);
                } else {
                    setIsEditingContact(true);
                }
            } catch (err) {
                console.error('Failed to load profile in contact form:', err);
                const firstName = session?.user?.firstName ?? '';
                const lastName = session?.user?.lastName ?? '';
                const fullName = [firstName, lastName].filter(Boolean).join(' ').trim() || session?.user?.name || '';
                const phoneNumber = session?.user?.phoneNumber || '';

                setUserProfile({
                    name: fullName,
                    phone: phoneNumber,
                });

                if (fullName) {
                    setValue('name', fullName);
                    setIsEditingName(false);
                }
                if (phoneNumber) {
                    setValue('contactInfo', phoneNumber);
                    setIsEditingContact(false);
                }
            }
        };

        loadUserProfile();

        return () => {
            isMounted = false;
        };
    }, [status, session, setValue]);

    const toggleEditName = () => {
        setIsEditingName((prev) => {
            const next = !prev;
            if (!prev) {
                setTimeout(() => nameInputRef.current?.focus(), 50);
            }
            return next;
        });
    };

    const toggleEditContact = () => {
        setIsEditingContact((prev) => {
            const next = !prev;
            if (!prev) {
                setTimeout(() => contactInputRef.current?.focus(), 50);
            }
            return next;
        });
    };

    /**
     * Handler ارسال فرم
     * 
     * @param {object} data - داده‌های فرم از react-hook-form
     */
    const onSubmit = async (data) => {
        try {
            // پاک کردن وضعیت قبلی
            setSubmitStatus({ type: null, message: '' });

            // ارسال داده به API همراه با توکن کاربر (در صورت وجود)
            await submitContactMessage(data, session?.user?.jwt);

            // نمایش پیام موفقیت
            setSubmitStatus({
                type: 'success',
                message: 'پیام شما با موفقیت ارسال شد. به‌زودی با شما تماس خواهیم گرفت.',
            });

            // ریست فرم
            reset({
                name: userProfile.name || '',
                contactInfo: userProfile.phone || '',
                subject: '',
                body: '',
            });

            if (userProfile.name) setIsEditingName(false);
            if (userProfile.phone) setIsEditingContact(false);

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

    const nameRegister = register('name', {
        required: 'نام الزامی است',
        minLength: {
            value: 2,
            message: 'نام باید حداقل 2 کاراکتر باشد',
        },
        maxLength: {
            value: 100,
            message: 'نام نباید بیشتر از 100 کاراکتر باشد',
        },
    });

    const contactRegister = register('contactInfo', {
        required: 'اطلاعات تماس الزامی است',
        validate: (value) => {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            const phoneRegex = /^[\d\s\-\+\(\)]+$/;

            if (emailRegex.test(value) || phoneRegex.test(value)) {
                return true;
            }
            return 'لطفاً یک ایمیل یا شماره تلفن معتبر وارد کنید';
        },
    });

    const isNameLocked = status === 'authenticated' && !!userProfile.name && !isEditingName;
    const isContactLocked = status === 'authenticated' && !!userProfile.phone && !isEditingContact;

    return (
        <div className={styles.formContainer}>
            <h2 className={styles.formTitle}>فرم تماس با ما</h2>
            <p className={styles.formDescription}>
                لطفاً فرم زیر را پر کنید ما در اسرع وقت پاسخگوی شما خواهیم بود.
            </p>

            <form onSubmit={handleSubmit(onSubmit)} className={styles.form} noValidate>
                {/* فیلد نام */}
                <div className={styles.formGroup}>
                    <label htmlFor="name" className={styles.label}>
                        نام و نام خانوادگی <span className={styles.required}>*</span>
                    </label>
                    <div className={styles.inputWrapper}>
                        <input
                            id="name"
                            type="text"
                            className={`${styles.input} ${errors.name ? styles.inputError : ''} ${
                                isNameLocked ? styles.inputLocked : ''
                            } ${status === 'authenticated' && userProfile.name ? styles.inputWithAction : ''}`}
                            {...nameRegister}
                            ref={(e) => {
                                nameRegister.ref(e);
                                nameInputRef.current = e;
                            }}
                            readOnly={isNameLocked}
                            onClick={() => {
                                if (isNameLocked) toggleEditName();
                            }}
                            placeholder="نام کامل خود را وارد کنید"
                            disabled={isSubmitting}
                        />
                        {status === 'authenticated' && !!userProfile.name && (
                            <button
                                type="button"
                                className={`${styles.inputActionBtn} ${isEditingName ? styles.inputActionBtnActive : ''}`}
                                onClick={toggleEditName}
                                title={isEditingName ? 'ثبت ویرایش' : 'ویرایش نام'}
                                aria-label={isEditingName ? 'ثبت ویرایش' : 'ویرایش نام'}
                            >
                                {isEditingName ? <Check size={17} /> : <Pencil size={17} />}
                            </button>
                        )}
                    </div>
                    {errors.name && (
                        <span className={styles.errorMessage}>{errors.name.message}</span>
                    )}
                </div>

                {/* فیلد اطلاعات تماس */}
                <div className={styles.formGroup}>
                    <label htmlFor="contactInfo" className={styles.label}>
                        ایمیل یا شماره تماس <span className={styles.required}>*</span>
                    </label>
                    <div className={styles.inputWrapper}>
                        <input
                            id="contactInfo"
                            type="text"
                            className={`${styles.input} ${errors.contactInfo ? styles.inputError : ''} ${
                                isContactLocked ? styles.inputLocked : ''
                            } ${status === 'authenticated' && userProfile.phone ? styles.inputWithAction : ''}`}
                            {...contactRegister}
                            ref={(e) => {
                                contactRegister.ref(e);
                                contactInputRef.current = e;
                            }}
                            readOnly={isContactLocked}
                            onClick={() => {
                                if (isContactLocked) toggleEditContact();
                            }}
                            placeholder="example@email.com یا 09123456789"
                            disabled={isSubmitting}
                        />
                        {status === 'authenticated' && !!userProfile.phone && (
                            <button
                                type="button"
                                className={`${styles.inputActionBtn} ${isEditingContact ? styles.inputActionBtnActive : ''}`}
                                onClick={toggleEditContact}
                                title={isEditingContact ? 'ثبت ویرایش' : 'ویرایش شماره تماس'}
                                aria-label={isEditingContact ? 'ثبت ویرایش' : 'ویرایش شماره تماس'}
                            >
                                {isEditingContact ? <Check size={17} /> : <Pencil size={17} />}
                            </button>
                        )}
                    </div>
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

