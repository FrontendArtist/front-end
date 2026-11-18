'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import Modal from '@/components/ui/Modal/Modal';
import Alert from '@/components/ui/Alert/Alert';
import styles from './AddressModal.module.scss';

/**
 * Modal ثبت و ویرایش آدرس تحویل سفارش
 * 
 * @param {Object} props
 * @param {boolean} props.isOpen - وضعیت باز بودن مدال
 * @param {Function} props.onClose - هندلر بستن مدال
 * @param {Object|null} props.initialAddress - اطلاعات آدرس اولیه در صورت وجود
 * @param {Function} props.onSuccess - کال‌بک پس از ثبت موفق آدرس همراه با داده آدرس
 * @param {string} [props.submitLabel] - متن دکمه ثبت
 */
export default function AddressModal({
    isOpen,
    onClose,
    initialAddress = null,
    onSuccess,
    submitLabel = 'ثبت آدرس و ادامه پرداخت',
}) {
    const { data: session } = useSession();
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [fieldErrors, setFieldErrors] = useState({});

    const [formData, setFormData] = useState({
        recipientName: '',
        recipientPhone: '',
        province: '',
        city: '',
        fullAddress: '',
        postalCode: '',
    });

    useEffect(() => {
        if (isOpen) {
            setError('');
            setFieldErrors({});
            setFormData({
                recipientName: initialAddress?.recipientName || '',
                recipientPhone: initialAddress?.recipientPhone || '',
                province: initialAddress?.province || '',
                city: initialAddress?.city || '',
                fullAddress: initialAddress?.fullAddress || '',
                postalCode: initialAddress?.postalCode || '',
            });
        }
    }, [isOpen, initialAddress]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
        if (fieldErrors[name]) {
            setFieldErrors((prev) => {
                const next = { ...prev };
                delete next[name];
                return next;
            });
        }
    };

    const handleSubmit = async (e) => {
        if (e && e.preventDefault) e.preventDefault();
        setError('');

        const trimmedName = formData.recipientName?.trim();
        const trimmedAddress = formData.fullAddress?.trim();
        const trimmedPostalCode = formData.postalCode?.trim();
        const nextErrors = {};

        if (!trimmedName) {
            nextErrors.recipientName = 'لطفاً نام و نام خانوادگی تحویل‌گیرنده را وارد کنید.';
        }

        if (!trimmedAddress) {
            nextErrors.fullAddress = 'لطفاً آدرس پستی کامل را وارد کنید.';
        }

        if (trimmedPostalCode && !/^\d{10}$/.test(trimmedPostalCode)) {
            nextErrors.postalCode = 'کد پستی باید دقیقاً ۱۰ رقم عددی باشد.';
        }

        if (Object.keys(nextErrors).length > 0) {
            setFieldErrors(nextErrors);
            return;
        }
        setFieldErrors({});

        setSaving(true);
        try {
            const addressPayload = {
                title: 'آدرس اصلی',
                recipientName: trimmedName,
                recipientPhone: formData.recipientPhone?.trim() || '',
                province: formData.province?.trim() || '',
                city: formData.city?.trim() || '',
                fullAddress: trimmedAddress,
                postalCode: formData.postalCode?.trim() || '',
            };

            const existingId = initialAddress?.documentId || initialAddress?.id;
            let response;

            if (existingId) {
                response = await fetch(`/api/addresses/${existingId}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ data: addressPayload }),
                });
            } else {
                response = await fetch('/api/addresses', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        data: {
                            ...addressPayload,
                            user: session?.user?.id,
                        },
                    }),
                });
            }

            if (!response.ok) {
                const resData = await response.json().catch(() => ({}));
                throw new Error(resData.message || 'خطا در ذخیره آدرس. لطفاً مجدداً تلاش کنید.');
            }

            const responseData = await response.json().catch(() => ({}));
            const savedAddress = {
                ...addressPayload,
                documentId: responseData?.data?.documentId || existingId || null,
                id: responseData?.data?.id || existingId || null,
            };

            if (typeof onSuccess === 'function') {
                onSuccess(savedAddress);
            }
        } catch (err) {
            setError(err.message || 'خطا در ثبت آدرس. لطفاً اتصال اینترنت خود را بررسی کنید.');
        } finally {
            setSaving(false);
        }
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={() => {
                if (!saving) onClose();
            }}
            title={initialAddress?.fullAddress ? 'ویرایش آدرس تحویل سفارش' : 'ثبت آدرس تحویل سفارش'}
        >
            <form onSubmit={handleSubmit} noValidate className={styles.addressForm}>
                <p className={styles.hint}>
                    برای ارسال اقلام فیزیکی سبد خرید، لطفاً نشانی پستی دقیق و مشخصات تحویل‌گیرنده را وارد کنید.
                </p>

                {error && (
                    <Alert variant="error">
                        {error}
                    </Alert>
                )}

                <div className={styles.row}>
                    <div className={styles.inputGroup}>
                        <label htmlFor="recipientName">
                            نام و نام خانوادگی گیرنده<span className={styles.required}>*</span>
                        </label>
                        <input
                            id="recipientName"
                            type="text"
                            name="recipientName"
                            value={formData.recipientName}
                            onChange={handleChange}
                            placeholder="مثال: علی محمدی"
                            className={fieldErrors.recipientName ? styles.inputError : ''}
                            aria-invalid={Boolean(fieldErrors.recipientName)}
                            disabled={saving}
                            required
                        />
                        {fieldErrors.recipientName && (
                            <span
                                className={styles.fieldError}
                                role={!error ? 'alert' : undefined}
                            >
                                {fieldErrors.recipientName}
                            </span>
                        )}
                    </div>

                    <div className={styles.inputGroup}>
                        <label htmlFor="recipientPhone">شماره تماس گیرنده</label>
                        <input
                            id="recipientPhone"
                            type="tel"
                            name="recipientPhone"
                            value={formData.recipientPhone}
                            onChange={handleChange}
                            placeholder="09123456789"
                            dir="ltr"
                            disabled={saving}
                        />
                    </div>
                </div>

                <div className={styles.row}>
                    <div className={styles.inputGroup}>
                        <label htmlFor="province">استان</label>
                        <input
                            id="province"
                            type="text"
                            name="province"
                            value={formData.province}
                            onChange={handleChange}
                            placeholder="مثال: تهران"
                            disabled={saving}
                        />
                    </div>

                    <div className={styles.inputGroup}>
                        <label htmlFor="city">شهر</label>
                        <input
                            id="city"
                            type="text"
                            name="city"
                            value={formData.city}
                            onChange={handleChange}
                            placeholder="مثال: تهران"
                            disabled={saving}
                        />
                    </div>
                </div>

                <div className={styles.inputGroup}>
                    <label htmlFor="fullAddress">
                        نشانی پستی کامل<span className={styles.required}>*</span>
                    </label>
                    <textarea
                        id="fullAddress"
                        name="fullAddress"
                        value={formData.fullAddress}
                        onChange={handleChange}
                        placeholder="خیابان، کوچه، پلاک، واحد..."
                        className={fieldErrors.fullAddress ? styles.inputError : ''}
                        aria-invalid={Boolean(fieldErrors.fullAddress)}
                        rows={3}
                        disabled={saving}
                        required
                    />
                    {fieldErrors.fullAddress && (
                        <span
                            className={styles.fieldError}
                            role={!error && !fieldErrors.recipientName ? 'alert' : undefined}
                        >
                            {fieldErrors.fullAddress}
                        </span>
                    )}
                </div>

                <div className={styles.inputGroup}>
                    <label htmlFor="postalCode">کد پستی (۱۰ رقمی)</label>
                    <input
                        id="postalCode"
                        type="text"
                        name="postalCode"
                        value={formData.postalCode}
                        onChange={handleChange}
                        placeholder="کد پستی ۱۰ رقمی بدون خط تیره"
                        className={fieldErrors.postalCode ? styles.inputError : ''}
                        aria-invalid={Boolean(fieldErrors.postalCode)}
                        dir="ltr"
                        maxLength={10}
                        disabled={saving}
                    />
                    {fieldErrors.postalCode && (
                        <span
                            className={styles.fieldError}
                            role={!error && !fieldErrors.recipientName && !fieldErrors.fullAddress ? 'alert' : undefined}
                        >
                            {fieldErrors.postalCode}
                        </span>
                    )}
                </div>

                <div className={styles.formActions}>
                    <button
                        type="button"
                        onClick={onClose}
                        className={styles.cancelButton}
                        disabled={saving}
                    >
                        انصراف
                    </button>

                    <button
                        type="submit"
                        className={styles.saveButton}
                        disabled={saving}
                    >
                        {saving ? 'در حال ذخیره آدرس...' : submitLabel}
                    </button>
                </div>
            </form>
        </Modal>
    );
}
