'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useCartStore, selectTotalPrice, selectItemsCount } from '@/store/useCartStore';
import styles from './PaymentStep.module.scss';

/**
 * مرحله 4: روش پرداخت
 * انتخاب روش پرداخت و تکمیل خرید
 * 
 * @param {function} onPrevious - callback برای برگشت به مرحله قبل
 */
export default function PaymentStep({ onPrevious }) {
    const router = useRouter();
    const items = useCartStore((state) => state.items);
    const totalPrice = useCartStore(selectTotalPrice);
    const itemsCount = useCartStore(selectItemsCount);

    const [paymentMethod, setPaymentMethod] = useState('online');
    const [isProcessing, setIsProcessing] = useState(false);

    const formatPrice = (price) => {
        return new Intl.NumberFormat('fa-IR').format(price);
    };

    /**
     * 🚨 MOCK PAYMENT LOGIC
     * پردازش پرداخت (Mock)
     */
    const handlePayment = async () => {
        setIsProcessing(true);

        // 🚨 MOCK: شبیه‌سازی تاخیر پردازش
        await new Promise(resolve => setTimeout(resolve, 2000));

        // 🚨 MOCK: ریدایرکت به صفحه نتیجه پرداخت
        router.push('/payment/callback?status=success');
    };

    return (
        <div className={styles.paymentStep}>
            <h2 className={styles.title}>روش پرداخت</h2>
            <p className={styles.subtitle}>روش پرداخت خود را انتخاب کنید</p>

            {/* خلاصه سفارش */}
            <div className={styles.orderSummary}>
                <h3 className={styles.summaryTitle}>خلاصه سفارش</h3>

                <div className={styles.items}>
                    {items.map((item) => (
                        <div key={item.id} className={styles.item}>
                            <span className={styles.itemName}>
                                {item.title}
                                {item.quantity > 1 && <span className={styles.quantity}> × {item.quantity}</span>}
                            </span>
                            <span className={styles.itemPrice}>
                                {formatPrice(item.price * item.quantity)} تومان
                            </span>
                        </div>
                    ))}
                </div>

                <div className={styles.divider}></div>

                <div className={styles.summaryRow}>
                    <span>تعداد اقلام:</span>
                    <strong>{itemsCount} مورد</strong>
                </div>

                <div className={styles.summaryTotal}>
                    <span>مبلغ قابل پرداخت:</span>
                    <strong>{formatPrice(totalPrice)} تومان</strong>
                </div>
            </div>

            {/* انتخاب روش پرداخت */}
            <div className={styles.paymentMethods}>
                <h3 className={styles.methodsTitle}>انتخاب روش پرداخت</h3>

                <div className={styles.methodsList}>
                    <label className={`${styles.method} ${paymentMethod === 'online' ? styles.selected : ''}`}>
                        <input
                            type="radio"
                            name="paymentMethod"
                            value="online"
                            checked={paymentMethod === 'online'}
                            onChange={(e) => setPaymentMethod(e.target.value)}
                        />
                        <div className={styles.methodContent}>
                            <div className={styles.methodIcon}>
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
                                    <line x1="1" y1="10" x2="23" y2="10" />
                                </svg>
                            </div>
                            <div className={styles.methodInfo}>
                                <span className={styles.methodName}>پرداخت آنلاین</span>
                                <span className={styles.methodDesc}>پرداخت امن از طریق درگاه بانکی</span>
                            </div>
                            <div className={styles.checkmark}>
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                                    <polyline points="20 6 9 17 4 12" />
                                </svg>
                            </div>
                        </div>
                    </label>

                    <label className={`${styles.method} ${styles.disabled}`}>
                        <input
                            type="radio"
                            name="paymentMethod"
                            value="cod"
                            disabled
                        />
                        <div className={styles.methodContent}>
                            <div className={styles.methodIcon}>
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                                    <circle cx="12" cy="10" r="3" />
                                </svg>
                            </div>
                            <div className={styles.methodInfo}>
                                <span className={styles.methodName}>پرداخت در محل</span>
                                <span className={styles.methodDesc}>فعلاً غیرفعال</span>
                            </div>
                        </div>
                    </label>
                </div>
            </div>

            {/* دکمه‌های عملیات */}
            <div className={styles.actions}>
                <button onClick={onPrevious} className={styles.previousButton} disabled={isProcessing}>
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="9 18 15 12 9 6" />
                    </svg>
                    <span>مرحله قبل</span>
                </button>
                <button
                    onClick={handlePayment}
                    className={styles.paymentButton}
                    disabled={isProcessing}
                >
                    {isProcessing ? (
                        <>
                            <span className={styles.spinner}></span>
                            در حال انتقال به درگاه...
                        </>
                    ) : (
                        <>
                            <span>پرداخت و تکمیل خرید</span>
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                                <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                            </svg>
                        </>
                    )}
                </button>
            </div>
        </div>
    );
}
