'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import {
    useCartStore,
    selectFinalTotalPrice,
    selectTotalPrice,
    selectCouponDiscount,
    selectItemsCount,
} from '@/store/useCartStore';
import { formatPrice } from '@/lib/formatters';
import { executeOnlinePayment } from '@/lib/checkoutService';
import styles from './ShippingStep.module.scss';

/**
 * مرحله اطلاعات ارسال و پرداخت آنلاین مستقیم
 * نمایش و ویرایش آدرس همراه با اتصال مستقیم به درگاه پرداخت شاپرک بدون مرحله اضافی
 * 
 * @param {function} onPrevious - callback برای بازگشت به سبد خرید
 */
export default function ShippingStep({ onPrevious }) {
    const { data: session } = useSession();
    const router = useRouter();

    const items = useCartStore((state) => state.items);
    const appliedCoupon = useCartStore((state) => state.appliedCoupon);
    const totalPrice = useCartStore(selectTotalPrice);
    const couponDiscount = useCartStore(selectCouponDiscount);
    const finalTotalPrice = useCartStore(selectFinalTotalPrice);
    const itemsCount = useCartStore(selectItemsCount);

    const [isEditing, setIsEditing] = useState(false);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [error, setError] = useState('');

    const [addressData, setAddressData] = useState({
        recipientName: '',
        recipientPhone: '',
        province: '',
        city: '',
        fullAddress: '',
        postalCode: '',
    });

    // دریافت اطلاعات آدرس ذخیره‌شده در پروفایل
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
                    // اگر آدرسی ذخیره نشده، مستقیماً فرم ویرایش باز شود
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
                        user: session?.user?.id,
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

    /**
     * تأیید آدرس و اتصال مستقیم به درگاه پرداخت شاپرک
     */
    const handlePayAndSubmit = async () => {
        setError('');

        if (!addressData.fullAddress || !addressData.recipientName) {
            setError('لطفاً ابتدا نام گیرنده و آدرس پستی کامل را تکمیل کنید');
            return;
        }

        // اگر کاربر در حال ویرایش آدرس بود، ابتدا ذخیره می‌کنیم
        if (isEditing) {
            setSaving(true);
            try {
                await fetch('/api/addresses', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        data: {
                            title: 'آدرس اصلی',
                            ...addressData,
                            user: session?.user?.id,
                        },
                    }),
                });
                setIsEditing(false);
            } catch (err) {
                console.error('Error saving address:', err);
            } finally {
                setSaving(false);
            }
        }

        const formattedAddress = [
            addressData.province,
            addressData.city,
            addressData.fullAddress
        ].filter(Boolean).join(' - ') +
        ` (گیرنده: ${addressData.recipientName}${addressData.recipientPhone ? ` - تلفن: ${addressData.recipientPhone}` : ''}${addressData.postalCode ? ` - کدپستی: ${addressData.postalCode}` : ''})`;

        setIsProcessing(true);
        try {
            await executeOnlinePayment({
                items,
                finalTotalPrice,
                appliedCoupon,
                couponDiscount,
                shippingAddress: formattedAddress,
                router,
            });
        } catch (err) {
            console.error('Payment Error:', err);
            setError(err.message || 'خطا در اتصال به درگاه پرداخت شاپرک. لطفاً مجدداً تلاش کنید.');
            setIsProcessing(false);
        }
    };

    if (loading) {
        return (
            <div className={styles.shippingStep}>
                <div className={styles.loadingState}>
                    <div className={styles.spinner}></div>
                    <p>در حال بارگذاری اطلاعات آدرس...</p>
                </div>
            </div>
        );
    }

    return (
        <div className={styles.shippingStep}>
            <h2 className={styles.title}>اطلاعات ارسال و پرداخت</h2>
            <p className={styles.subtitle}>آدرس تحویل سفارش فیزیکی خود را تأیید کرده و مستقیماً پرداخت نمایید</p>

            {!isEditing ? (
                // نمایش آدرس ذخیره‌شده
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
                // فرم ورود و ویرایش آدرس
                <div className={styles.addressForm}>
                    <div className={styles.row}>
                        <div className={styles.inputGroup}>
                            <label>نام گیرنده<span className={styles.required}>*</span></label>
                            <input
                                type="text"
                                name="recipientName"
                                value={addressData.recipientName}
                                onChange={handleChange}
                                placeholder="نام و نام خانوادگی تحویل‌گیرنده"
                                disabled={saving || isProcessing}
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
                                disabled={saving || isProcessing}
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
                                disabled={saving || isProcessing}
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
                                disabled={saving || isProcessing}
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
                            disabled={saving || isProcessing}
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
                            disabled={saving || isProcessing}
                        />
                    </div>

                    <div className={styles.formActions}>
                        {!loading && Object.values(addressData).some(v => v) && (
                            <button
                                type="button"
                                onClick={() => setIsEditing(false)}
                                className={styles.cancelButton}
                                disabled={saving || isProcessing}
                            >
                                انصراف
                            </button>
                        )}
                        <button
                            type="button"
                            onClick={handleSave}
                            className={styles.saveButton}
                            disabled={saving || isProcessing}
                        >
                            {saving ? 'در حال ذخیره...' : 'ذخیره آدرس'}
                        </button>
                    </div>
                </div>
            )}

            {/* خلاصه پرداخت شفاف */}
            <div style={{
                padding: '16px 20px',
                background: 'rgba(255, 255, 255, 0.03)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '12px',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                marginTop: '10px'
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', color: 'var(--color-card-text)' }}>
                    <span>تعداد اقلام سفارش:</span>
                    <strong style={{ color: 'var(--color-text-primary)' }}>{itemsCount} مورد</strong>
                </div>
                {couponDiscount > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', color: '#86efac' }}>
                        <span>تخفیف کوپن ({appliedCoupon?.code}):</span>
                        <strong>-{formatPrice(couponDiscount)} تومان</strong>
                    </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.05rem', borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '8px' }}>
                    <span style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>مبلغ نهایی قابل پرداخت:</span>
                    <strong style={{ color: finalTotalPrice === 0 ? '#4ade80' : '#ffd166', fontSize: '1.2rem' }}>
                        {finalTotalPrice === 0 ? 'رایگان (۰ تومان)' : `${formatPrice(finalTotalPrice)} تومان`}
                    </strong>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8rem', color: 'var(--color-card-text)', marginTop: '4px' }}>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="2.5">
                        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                    </svg>
                    <span>پرداخت امن شتاب از طریق درگاه پرداخت الکترونیک سامان (شاپرک)</span>
                </div>
            </div>

            {error && <div className={styles.error}>{error}</div>}

            <div className={styles.actions}>
                <button
                    type="button"
                    onClick={onPrevious || (() => router.push('/cart'))}
                    className={styles.previousButton}
                    disabled={isProcessing}
                >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="9 18 15 12 9 6" />
                    </svg>
                    <span>بازگشت به سبد خرید</span>
                </button>
                <button
                    type="button"
                    onClick={handlePayAndSubmit}
                    className={styles.nextButton}
                    disabled={isProcessing}
                >
                    {isProcessing ? (
                        'در حال اتصال به درگاه سامان...'
                    ) : (
                        <>
                            <span>تأیید آدرس و پرداخت آنلاین 💳</span>
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <polyline points="15 18 9 12 15 6" />
                            </svg>
                        </>
                    )}
                </button>
            </div>
        </div>
    );
}
