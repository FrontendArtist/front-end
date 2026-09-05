'use client';

import { useState } from 'react';
import { useCartStore, selectTotalPrice, selectCouponDiscount } from '@/store/useCartStore';
import { formatPrice } from '@/lib/formatters';
import styles from './DiscountCouponInput.module.scss';

export default function DiscountCouponInput() {
    const [inputCode, setInputCode] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');
    const [successMessage, setSuccessMessage] = useState('');

    const items = useCartStore((state) => state.items);
    const totalPrice = useCartStore(selectTotalPrice);
    const appliedCoupon = useCartStore((state) => state.appliedCoupon);
    const applyCoupon = useCartStore((state) => state.applyCoupon);
    const removeCoupon = useCartStore((state) => state.removeCoupon);

    const handleApply = async (e) => {
        if (e) e.preventDefault();
        const code = inputCode.trim();

        if (!code) {
            setErrorMessage('لطفاً کد تخفیف را وارد نمایید.');
            setSuccessMessage('');
            return;
        }

        if (items.length === 0) {
            setErrorMessage('سبد خرید شما خالی است.');
            setSuccessMessage('');
            return;
        }

        setIsLoading(true);
        setErrorMessage('');
        setSuccessMessage('');

        try {
            const res = await fetch('/api/coupons/validate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    code,
                    cartItems: items,
                    currentTotal: totalPrice,
                }),
            });

            const data = await res.json();

            if (!res.ok || !data.valid) {
                setErrorMessage(data.message || 'کد تخفیف وارد شده معتبر نمی‌باشد.');
                return;
            }

            // ذخیره در Zustand Store
            applyCoupon(data);
            setSuccessMessage(data.message || 'کد تخفیف با موفقیت اعمال شد.');
            setInputCode('');
        } catch (err) {
            console.error('Error applying coupon:', err);
            setErrorMessage('خطا در برقراری ارتباط با سرور.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleRemove = () => {
        removeCoupon();
        setSuccessMessage('');
        setErrorMessage('');
        setInputCode('');
    };

    if (appliedCoupon) {
        return (
            <div className={styles.appliedCouponContainer}>
                <div className={styles.couponBadge}>
                    <div className={styles.badgeInfo}>
                        <span className={styles.icon}>🎟️</span>
                        <div className={styles.textGroup}>
                            <span className={styles.codeText}>کد تخفیف: <strong>{appliedCoupon.code}</strong></span>
                            <span className={styles.discountDesc}>
                                {appliedCoupon.discountType === 'percentage'
                                    ? `${appliedCoupon.discountValue}٪ تخفیف (${formatPrice(appliedCoupon.discountAmount)} تومان)`
                                    : `${formatPrice(appliedCoupon.discountAmount)} تومان تخفیف`}
                            </span>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={handleRemove}
                        className={styles.removeBtn}
                        title="حذف کد تخفیف"
                        aria-label="حذف کد تخفیف"
                    >
                        حذف
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="18" y1="6" x2="6" y2="18" />
                            <line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                    </button>
                </div>
                {successMessage && <div className={styles.successText}>{successMessage}</div>}
            </div>
        );
    }

    return (
        <div className={styles.couponWrapper}>
            <form onSubmit={handleApply} className={styles.couponForm}>
                <div className={styles.inputGroup}>
                    <input
                        type="text"
                        value={inputCode}
                        onChange={(e) => {
                            setInputCode(e.target.value);
                            if (errorMessage) setErrorMessage('');
                        }}
                        placeholder="کد تخفیف دارید؟ وارد کنید..."
                        className={`${styles.couponInput} ${errorMessage ? styles.hasError : ''}`}
                        disabled={isLoading || items.length === 0}
                    />
                    <button
                        type="submit"
                        disabled={isLoading || !inputCode.trim() || items.length === 0}
                        className={styles.submitBtn}
                    >
                        {isLoading ? (
                            <span className={styles.spinner} />
                        ) : (
                            'اعمال کد'
                        )}
                    </button>
                </div>
            </form>

            {errorMessage && (
                <div className={styles.errorAlert} role="alert">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="10" />
                        <line x1="12" y1="8" x2="12" y2="12" />
                        <line x1="12" y1="16" x2="12.01" y2="16" />
                    </svg>
                    <span>{errorMessage}</span>
                </div>
            )}
        </div>
    );
}
