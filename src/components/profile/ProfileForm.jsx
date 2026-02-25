'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import styles from './ProfileForm.module.scss';

export default function ProfileForm() {
    const { data: session, status } = useSession(); // 🚨 دریافت status
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [isEditing, setIsEditing] = useState(false); // Track edit mode

    const [formData, setFormData] = useState({
        firstName: '',
        lastName: '',
        phoneNumber: '',
        addressDocumentId: null, // Track address documentId for update operations in Strapi V5

        // 💡 All 7 Strapi Address Fields:
        fullAddress: '',     // آدرس کامل (اصلی)
        province: '',        // استان
        city: '',            // شهر
        postalCode: '',      // کد پستی
        recipientName: '',   // نام گیرنده
        recipientPhone: '',  // تلفن گیرنده
    });

    // Fetch user data when session status changes to authenticated
    useEffect(() => {
        const fetchUserData = async () => {
            // 🚨 شرط اولیه: فقط اگر احراز هویت شده باشد
            if (status !== 'authenticated') {
                // اگر unauthenticated بود یا هنوز loading بود، لودینگ را متوقف نمی‌کنیم تا ریدایرکت انجام شود
                setLoading(false);
                return;
            }

            try {
                // فراخوانی API Proxy داخلی Next.js: /api/profile
                const response = await fetch('/api/profile', {
                    headers: {
                        'Content-Type': 'application/json',
                    },
                });

                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.message || 'خطا در دریافت اطلاعات کاربر');
                }

                const data = await response.json();

                setFormData({
                    firstName: data.firstName || '',
                    lastName: data.lastName || '',
                    phoneNumber: data.phoneNumber || session.user.phoneNumber || '',
                    addressDocumentId: data.address?.documentId || null, // ✅ Use documentId for Strapi V5

                    // 💡 Reading all 7 fields from the Address relation
                    fullAddress: data.address?.fullAddress || '',
                    province: data.address?.province || '',
                    city: data.address?.city || '',
                    postalCode: data.address?.postalCode || '',
                    recipientName: data.address?.recipientName || '',
                    recipientPhone: data.address?.recipientPhone || '',
                });
            } catch (err) {
                setError(err.message);
            } finally {
                setLoading(false); // 🚨 مهم: حتماً setLoading(false) را در نهایت اجرا کنید.
            }
        };

        // 🚨 اجرای fetch فقط زمانی که status به authenticated تغییر کند.
        if (status === 'authenticated') {
            fetchUserData();
        }

    }, [status]); // 🚨 وابستگی به status سشن برای اجرای صحیح fetch

    const handleChange = (e) => {
        const { name, value } = e.target;

        // 🚨 اطمینان حاصل کنید که این console.log کار می‌کند
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    // ... (بقیه کدهای فرم و state ها و handleChange دست نخورده)

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');
        setSaving(true);

        try {
            // مرحله 1: به‌روزرسانی نام و نام خانوادگی (در مدل User)
            const userUpdateResponse = await fetch('/api/profile', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    firstName: formData.firstName,
                    lastName: formData.lastName,
                }),
            });

            if (!userUpdateResponse.ok) {
                const errorData = await userUpdateResponse.json();
                throw new Error(errorData.message || 'خطا در ذخیره نام و نام خانوادگی');
            }

            // مرحله 2: ذخیره آدرس (در مدل Address)
            let addressResponse;
            const addressData = {
                title: 'آدرس اصلی',

                // 💡 Using all 7 fields from the new state
                fullAddress: formData.fullAddress,
                province: formData.province,
                city: formData.city,
                postalCode: formData.postalCode,
                recipientName: formData.recipientName,
                recipientPhone: formData.recipientPhone,
            };

            if (formData.addressDocumentId) {
                // اگر آدرس وجود دارد، آن را به‌روزرسانی کن
                addressResponse = await fetch(`/api/addresses/${formData.addressDocumentId}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ data: addressData }),
                });
            } else {
                // اگر آدرس وجود ندارد، ایجاد کن و به کاربر لینک کن
                addressResponse = await fetch('/api/addresses', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        data: {
                            ...addressData,
                            user: session.user.id // لینک آدرس جدید به کاربر فعلی
                        }
                    }),
                });
            }

            if (!addressResponse.ok) {
                const errorData = await addressResponse.json();
                throw new Error(errorData.message || 'خطا در ذخیره آدرس');
            }

            // اگر ایجاد موفق بود، addressDocumentId را به‌روزرسانی کن
            if (!formData.addressDocumentId) {
                const newAddress = await addressResponse.json();
                setFormData(prev => ({
                    ...prev,
                    addressDocumentId: newAddress.data.documentId // ✅ Use documentId for Strapi V5
                }));
            }

            setSuccess('اطلاعات با موفقیت ذخیره شد');
            setIsEditing(false); // Exit edit mode after successful save

            setTimeout(() => {
                setSuccess('');
            }, 3000);
        } catch (err) {
            setError(err.message);
        } finally {
            setSaving(false);
        }
    };

    // ... (ادامه کامپوننت)

    // 🚨 مدیریت نمایش لودینگ
    if (loading || status === 'loading') { // اگر loading ما یا loading سشن فعال باشد
        return (
            <div className={styles.formCard}>
                <div className={styles.loader}>در حال بارگذاری اطلاعات...</div>
            </div>
        );
    }

    // اگر پس از لود شدن، unauthenticated بود، چیزی نشان نده (layout باید ریدایرکت کند)
    if (status === 'unauthenticated') return null;

    // ... (ادامه رندرینگ UI)
    return (
        <div className={styles.formCard}>
            <div className={styles.header}>
                <div>
                    <h1 className={styles.title}>اطلاعات حساب کاربری</h1>
                    <p className={styles.subtitle}>مدیریت اطلاعات شخصی و تماس</p>
                </div>
                {!isEditing && (
                    <button
                        type="button"
                        onClick={() => setIsEditing(true)}
                        className={styles.editButton}
                    >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                        ویرایش
                    </button>
                )}
            </div>

            <form onSubmit={handleSubmit} className={styles.form}>
                <div className={styles.row}>
                    <div className={styles.inputGroup}>
                        <label htmlFor="firstName" className={styles.label}>
                            نام
                        </label>
                        <input
                            type="text"
                            id="firstName"
                            name="firstName"
                            value={formData.firstName}
                            onChange={handleChange}
                            className={styles.input}
                            placeholder="نام خود را وارد کنید"
                            disabled={!isEditing || saving}
                        />
                    </div>

                    <div className={styles.inputGroup}>
                        <label htmlFor="lastName" className={styles.label}>
                            نام خانوادگی
                        </label>
                        <input
                            type="text"
                            id="lastName"
                            name="lastName"
                            value={formData.lastName}
                            onChange={handleChange}
                            className={styles.input}
                            placeholder="نام خانوادگی خود را وارد کنید"
                            disabled={!isEditing || saving}
                        />
                    </div>
                </div>

                <div className={styles.inputGroup}>
                    <label htmlFor="phoneNumber" className={styles.label}>
                        شماره موبایل
                        <span className={styles.badge}>غیرقابل تغییر</span>
                    </label>
                    <input
                        type="tel"
                        id="phoneNumber"
                        name="phoneNumber"
                        value={formData.phoneNumber}
                        className={`${styles.input} ${styles.disabled}`}
                        disabled
                        dir="ltr"
                    />
                </div>

                <div className={styles.addressSection}>
                    <h3 className={styles.addressTitle}>اطلاعات آدرس و گیرنده</h3>

                    {/* Full Address (Use Textarea for detailed address) */}
                    <div className={styles.inputGroup}>
                        <label htmlFor="fullAddress" className={styles.label}>
                            آدرس کامل
                        </label>
                        <textarea
                            id="fullAddress"
                            name="fullAddress"
                            value={formData.fullAddress}
                            onChange={handleChange}
                            className={styles.textarea}
                            placeholder="آدرس دقیق (خیابان، کوچه، پلاک)"
                            rows="3"
                            disabled={!isEditing || saving}
                        />
                    </div>

                    {/* Row 1: Province and City */}
                    <div className={styles.row}>
                        <div className={styles.inputGroup}>
                            <label htmlFor="province" className={styles.label}>
                                استان
                            </label>
                            <input
                                type="text"
                                id="province"
                                name="province"
                                value={formData.province}
                                onChange={handleChange}
                                className={styles.input}
                                placeholder="استان"
                                disabled={!isEditing || saving}
                            />
                        </div>
                        <div className={styles.inputGroup}>
                            <label htmlFor="city" className={styles.label}>
                                شهر
                            </label>
                            <input
                                type="text"
                                id="city"
                                name="city"
                                value={formData.city}
                                onChange={handleChange}
                                className={styles.input}
                                placeholder="شهر"
                                disabled={!isEditing || saving}
                            />
                        </div>
                    </div>

                    {/* Row 2: Postal Code and Recipient Name */}
                    <div className={styles.row}>
                        <div className={styles.inputGroup}>
                            <label htmlFor="postalCode" className={styles.label}>
                                کد پستی
                            </label>
                            <input
                                type="text"
                                id="postalCode"
                                name="postalCode"
                                value={formData.postalCode}
                                onChange={handleChange}
                                className={styles.input}
                                placeholder="۱۰ رقمی"
                                dir="ltr"
                                disabled={!isEditing || saving}
                            />
                        </div>
                        <div className={styles.inputGroup}>
                            <label htmlFor="recipientName" className={styles.label}>
                                نام گیرنده
                            </label>
                            <input
                                type="text"
                                id="recipientName"
                                name="recipientName"
                                value={formData.recipientName}
                                onChange={handleChange}
                                className={styles.input}
                                placeholder="نام و نام خانوادگی گیرنده"
                                disabled={!isEditing || saving}
                            />
                        </div>
                    </div>

                    {/* Recipient Phone (If different from user's phone, otherwise remove) */}
                    <div className={styles.inputGroup}>
                        <label htmlFor="recipientPhone" className={styles.label}>
                            تلفن گیرنده
                        </label>
                        <input
                            type="tel"
                            id="recipientPhone"
                            name="recipientPhone"
                            value={formData.recipientPhone}
                            onChange={handleChange}
                            className={styles.input}
                            placeholder="شماره تماس گیرنده (در صورت تفاوت)"
                            dir="ltr"
                            disabled={!isEditing || saving}
                        />
                    </div>

                </div>

                {error && (
                    <div className={styles.error}>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
                            <line x1="12" y1="8" x2="12" y2="12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                            <line x1="12" y1="16" x2="12.01" y2="16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                        </svg>
                        {error}
                    </div>
                )}

                {success && (
                    <div className={styles.success}>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            <polyline points="22 4 12 14.01 9 11.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                        {success}
                    </div>
                )}

                {isEditing && (
                    <div className={styles.buttonGroup}>
                        <button
                            type="button"
                            onClick={() => setIsEditing(false)}
                            className={styles.cancelButton}
                            disabled={saving}
                        >
                            انصراف
                        </button>
                        <button
                            type="submit"
                            className={styles.submitButton}
                            disabled={saving}
                        >
                            {saving ? 'در حال ذخیره...' : 'ذخیره تغییرات'}
                        </button>
                    </div>
                )}
            </form>
        </div>
    );
}