'use client';

import Image from 'next/image';
import DiscountCouponInput from '@/components/cart/DiscountCouponInput/DiscountCouponInput';
import {
    useCartStore,
    selectTotalPrice,
    selectCouponDiscount,
    selectFinalTotalPrice,
    selectItemsCount,
} from '@/store/useCartStore';
import { formatPrice } from '@/lib/formatters';
import styles from './CartReviewStep.module.scss';

/**
 * مرحله 1: بررسی سبد خرید
 * نمایش خلاصه اقلام سبد خرید همراه با اعمال کد تخفیف
 * 
 * @param {function} onNext - callback برای رفتن به مرحله بعد
 */
export default function CartReviewStep({ onNext }) {
    const items = useCartStore((state) => state.items);
    const appliedCoupon = useCartStore((state) => state.appliedCoupon);
    const totalPrice = useCartStore(selectTotalPrice);
    const couponDiscount = useCartStore(selectCouponDiscount);
    const finalTotalPrice = useCartStore(selectFinalTotalPrice);
    const itemsCount = useCartStore(selectItemsCount);

    return (
        <div className={styles.cartReview}>
            <h2 className={styles.title}>بررسی سبد خرید</h2>
            <p className={styles.subtitle}>لطفاً اقلام سبد خرید خود را بررسی کنید</p>

            <div className={styles.itemsList}>
                {items.map((item) => (
                    <div key={item.id} className={styles.item}>
                        <div className={styles.itemImage}>
                            <Image
                                src={item.image || '/images/forempties2.png'}
                                alt={item.title || 'تصویر محصول'}
                                fill
                                sizes="80px"
                                className={styles.image}
                            />
                        </div>
                        <div className={styles.itemInfo}>
                            <h4 className={styles.itemTitle}>{item.title}</h4>
                            <p className={styles.itemMeta}>
                                {item.type === 'product' ? 'محصول' : item.type === 'chapter' ? 'فصل آموزشی' : 'دوره آموزشی'}
                                {item.quantity > 1 && ` × ${item.quantity}`}
                            </p>
                        </div>
                        <div className={styles.itemPrice}>
                            {item.originalPrice && item.originalPrice > item.price ? (
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '2px' }}>
                                    <del style={{ fontSize: '0.75rem', opacity: 0.5, color: '#f87171' }}>
                                        {formatPrice(item.originalPrice * item.quantity)} تومان
                                    </del>
                                    <span style={{ color: '#ffd166', fontWeight: 'bold' }}>
                                        {formatPrice(item.price * item.quantity)} تومان
                                    </span>
                                </div>
                            ) : (
                                <span>{formatPrice(item.price * item.quantity)} تومان</span>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            <div className={styles.summary}>
                <div className={styles.summaryRow}>
                    <span>تعداد اقلام:</span>
                    <strong>{itemsCount} مورد</strong>
                </div>

                <div className={styles.summaryRow}>
                    <span>جمع جزء:</span>
                    <strong>{formatPrice(totalPrice)} تومان</strong>
                </div>

                {items.some(i => i.originalPrice && i.originalPrice > i.price) && (
                    <div className={styles.summaryRow} style={{ color: '#4ade80' }}>
                        <span>سود شما از تخفیف‌ها:</span>
                        <strong>
                            {formatPrice(items.reduce((sum, item) => sum + ((item.originalPrice && item.originalPrice > item.price ? (item.originalPrice - item.price) : 0) * item.quantity), 0))} تومان
                        </strong>
                    </div>
                )}

                <div className={styles.divider}></div>

                {/* فرم کد تخفیف در چک‌اوت */}
                <div style={{ margin: '8px 0' }}>
                    <DiscountCouponInput />
                </div>

                {couponDiscount > 0 && (
                    <div className={styles.summaryRow} style={{ color: '#86efac' }}>
                        <span>تخفیف کوپن ({appliedCoupon?.code}):</span>
                        <strong>-{formatPrice(couponDiscount)} تومان</strong>
                    </div>
                )}

                <div className={styles.divider}></div>

                <div className={styles.summaryTotal}>
                    <span>مبلغ نهایی قابل پرداخت:</span>
                    <strong style={{ color: '#ffd166', fontSize: '1.2rem' }}>
                        {formatPrice(finalTotalPrice)} تومان
                    </strong>
                </div>
            </div>

            <div className={styles.actions}>
                <button onClick={onNext} className={styles.nextButton}>
                    <span>ادامه</span>
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="15 18 9 12 15 6" />
                    </svg>
                </button>
            </div>
        </div>
    );
}
