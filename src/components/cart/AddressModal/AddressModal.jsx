'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import Modal from '@/components/ui/Modal/Modal';
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
    };

    const handleSubmit = async (e) => {
        if (e && e.preventDefault) e.preventDefault();
        setError('');

        const trimmedName = formData.recipientName?.trim();
        const trimmedAddress = formData.fullAddress?.trim();

        if (!trimmedName) {
            setError('لطفاً نام و نام خانوادگی تحویل‌گیرنده را وارد کنید.');
            return;
        }

        if (!trimmedAddress) {
            setError('لطفاً آدرس پستی کامل را وارد کنید.');
            return;
        }

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
                    <div className={styles.error} role="alert">
                        {error}
                    </div>
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
                            disabled={saving}
                            required
                        />
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
                        rows={3}
                        disabled={saving}
                        required
                    />
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
                        dir="ltr"
                        maxLength={10}
                        disabled={saving}
                    />
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
