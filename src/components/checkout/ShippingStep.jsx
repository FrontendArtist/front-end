'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import styles from './ShippingStep.module.scss';

/**
 * مرحله 3: اطلاعات ارسال
 * نمایش و ویرایش آدرس به صورت inline
 * 
 * @param {function} onNext - callback برای رفتن به مرحله بعد
 * @param {function} onPrevious - callback برای برگشت به مرحله قبل
 */
export default function ShippingStep({ onNext, onPrevious }) {
    const { data: session } = useSession();
    const [isEditing, setIsEditing] = useState(false);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    const [addressData, setAddressData] = useState({
        recipientName: '',
        recipientPhone: '',
        province: '',
        city: '',
        fullAddress: '',
        postalCode: '',
    });

    // دریافت اطلاعات آدرس
    useEffect(() => {
        const fetchAddress = async () => {
            try {
                const response = await fetch('/api/profile');
                if (!response.ok) throw new Error('خطا در دریافت اطلاعات');

                const data = await response.json();
                if (data.address) {
                    setAddressData({
                        recipientName: data.address.recipientName || '',
                        recipientPhone: data.address.recipientPhone || '',
                        province: data.address.province || '',
                        city: data.address.city || '',
                        fullAddress: data.address.fullAddress || '',
                        postalCode: data.address.postalCode || '',
                    });
                } else {
                    // اگر آدرس ندارد، به حالت ویرایش برود
                    setIsEditing(true);
                }
            } catch (err) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        fetchAddress();
    }, []);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setAddressData(prev => ({ ...prev, [name]: value }));
    };

    const handleSave = async () => {
        setError('');

        // Validation
        if (!addressData.fullAddress || !addressData.recipientName) {
            setError('لطفاً آدرس کامل و نام گیرنده را وارد کنید');
            return;
        }

        setSaving(true);

        try {
            const response = await fetch('/api/addresses', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    data: {
                        title: 'آدرس اصلی',
                        ...addressData,
                        user: session.user.id,
                    },
                }),
            });

            if (!response.ok) throw new Error('خطا در ذخیره آدرس');

            setIsEditing(false);
        } catch (err) {
            setError(err.message);
        } finally {
            setSaving(false);
        }
    };

    const handleContinue = () => {
        if (!addressData.fullAddress || !addressData.recipientName) {
            setError('لطفاً ابتدا آدرس خود را تکمیل کنید');
            return;
        }
        onNext();
    };

    if (loading) {
        return (
            <div className={styles.shippingStep}>
                <div className={styles.loadingState}>
                    <div className={styles.spinner}></div>
                    <p>در حال بارگذاری...</p>
                </div>
            </div>
        );
    }

    return (
        <div className={styles.shippingStep}>
            <h2 className={styles.title}>اطلاعات ارسال</h2>
            <p className={styles.subtitle}>آدرس تحویل سفارش خود را مشخص کنید</p>

            {!isEditing ? (
                // نمایش آدرس
                <div className={styles.addressDisplay}>
                    <div className={styles.addressCard}>
                        <div className={styles.addressRow}>
                            <span className={styles.label}>گیرنده:</span>
                            <span className={styles.value}>{addressData.recipientName}</span>
                        </div>
                        {addressData.recipientPhone && (
                            <div className={styles.addressRow}>
                                <span className={styles.label}>تلفن:</span>
                                <span className={styles.value} dir="ltr">{addressData.recipientPhone}</span>
                            </div>
                        )}
                        {(addressData.city || addressData.province) && (
                            <div className={styles.addressRow}>
                                <span className={styles.label}>شهر:</span>
                                <span className={styles.value}>
                                    {addressData.city}{addressData.province && `, ${addressData.province}`}
                                </span>
                            </div>
                        )}
                        <div className={styles.addressRow}>
                            <span className={styles.label}>آدرس:</span>
                            <span className={styles.value}>{addressData.fullAddress}</span>
                        </div>
                        {addressData.postalCode && (
                            <div className={styles.addressRow}>
                                <span className={styles.label}>کد پستی:</span>
                                <span className={styles.value} dir="ltr">{addressData.postalCode}</span>
                            </div>
                        )}
                    </div>

                    <button onClick={() => setIsEditing(true)} className={styles.editButton}>
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                        </svg>
                        ویرایش آدرس
                    </button>
                </div>
            ) : (
                // فرم ویرایش
                <div className={styles.addressForm}>
                    <div className={styles.row}>
                        <div className={styles.inputGroup}>
                            <label>نام گیرنده<span className={styles.required}>*</span></label>
                            <input
                                type="text"
                                name="recipientName"
                                value={addressData.recipientName}
                                onChange={handleChange}
                                placeholder="نام و نام خانوادگی"
                                disabled={saving}
                            />
                        </div>
                        <div className={styles.inputGroup}>
                            <label>تلفن گیرنده</label>
                            <input
                                type="tel"
                                name="recipientPhone"
                                value={addressData.recipientPhone}
                                onChange={handleChange}
                                placeholder="09123456789"
                                dir="ltr"
                                disabled={saving}
                            />
                        </div>
                    </div>

                    <div className={styles.row}>
                        <div className={styles.inputGroup}>
                            <label>استان</label>
                            <input
                                type="text"
                                name="province"
                                value={addressData.province}
                                onChange={handleChange}
                                placeholder="استان"
                                disabled={saving}
                            />
                        </div>
                        <div className={styles.inputGroup}>
                            <label>شهر</label>
                            <input
                                type="text"
                                name="city"
                                value={addressData.city}
                                onChange={handleChange}
                                placeholder="شهر"
                                disabled={saving}
                            />
                        </div>
                    </div>

                    <div className={styles.inputGroup}>
                        <label>آدرس کامل<span className={styles.required}>*</span></label>
                        <textarea
                            name="fullAddress"
                            value={addressData.fullAddress}
                            onChange={handleChange}
                            placeholder="خیابان، کوچه، پلاک، واحد"
                            rows="3"
                            disabled={saving}
                        />
                    </div>

                    <div className={styles.inputGroup}>
                        <label>کد پستی</label>
                        <input
                            type="text"
                            name="postalCode"
                            value={addressData.postalCode}
                            onChange={handleChange}
                            placeholder="۱۰ رقمی"
                            dir="ltr"
                            maxLength="10"
                            disabled={saving}
                        />
                    </div>

                    {error && <div className={styles.error}>{error}</div>}

                    <div className={styles.formActions}>
                        {!loading && Object.values(addressData).some(v => v) && (
                            <button
                                type="button"
                                onClick={() => setIsEditing(false)}
                                className={styles.cancelButton}
                                disabled={saving}
                            >
                                انصراف
                            </button>
                        )}
                        <button
                            onClick={handleSave}
                            className={styles.saveButton}
                            disabled={saving}
                        >
                            {saving ? 'در حال ذخیره...' : 'ذخیره آدرس'}
                        </button>
                    </div>
                </div>
            )}

            {error && !isEditing && <div className={styles.error}>{error}</div>}

            <div className={styles.actions}>
                <button onClick={onPrevious} className={styles.previousButton}>
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="9 18 15 12 9 6" />
                    </svg>
                    <span>مرحله قبل</span>
                </button>
                <button
                    onClick={handleContinue}
                    className={styles.nextButton}
                    disabled={isEditing}
                >
                    <span>ادامه</span>
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="15 18 9 12 15 6" />
                    </svg>
                </button>
            </div>
        </div>
    );
}
