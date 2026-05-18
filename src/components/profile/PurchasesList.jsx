'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useOrdersStore } from '@/store/useOrdersStore';
import styles from './PurchasesList.module.scss';
import cartStyles from '@/app/cart/Cart.module.scss'; // Reuse cart styles

export default function PurchasesList() {
    const { orders, isLoading, error, fetchOrders } = useOrdersStore();

    useEffect(() => {
        fetchOrders(true);
    }, [fetchOrders]);

    if (isLoading) {
        return (
            <div className={styles.purchases__loading}>
                <div className={styles.purchases__spinner}></div>
                <p>در حال دریافت خریدهای شما...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className={styles.purchases__error}>
                <p>{error}</p>
            </div>
        );
    }

    // Extract and flatten all items from all orders
    const allItems = orders.flatMap(order => {
        const items = order.attributes?.items || order.items;
        return Array.isArray(items) ? items : [];
    });

    const courses = [];
    const products = [];

    // Deduplicate items by slug or ID so if they bought the same course twice, we only show it once
    const seenSlugs = new Set();
    allItems.forEach(item => {
        const slug = item.slug || item.id;
        // if item is not physical product and they bought it multiple times, we might still want to show quantity,
        // but for courses it's usually just 1. For products, we group them if they have the same slug.
        if (!seenSlugs.has(slug)) {
            seenSlugs.add(slug);
            if (item.__component === 'order.course-order-item' || item.type === 'course') {
                courses.push({ ...item });
            } else {
                products.push({ ...item });
            }
        } else if (item.__component === 'order.product-order-item' || item.type === 'product') {
            // Aggregate quantity for physical products across multiple orders
            const existingProduct = products.find(p => (p.slug || p.id) === slug);
            if (existingProduct) {
                existingProduct.quantity = (existingProduct.quantity || 1) + (item.quantity || 1);
            }
        }
    });

    const formatPrice = (price) => {
        return Number(price || 0).toLocaleString('fa-IR');
    };

    const renderItem = (item, isCourse) => {
        const itemUrl = item.itemUrl || (item.slug ? (isCourse ? `/courses/${item.slug}` : `/product/${item.slug}`) : '#');
        
        return (
            <div key={item.id || item.slug} className={cartStyles.cartItem}>
                {/* 1. تصویر/آیکون */}
                <Link 
                    href={itemUrl} 
                    className={cartStyles.itemImage} 
                    style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center', 
                        background: 'rgba(246, 217, 130, 0.08)', 
                        borderRadius: '10px' 
                    }}
                >
                    {isCourse ? (
                        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--color-primary)' }}>
                            <path d="M2 3h6a4 4 0 014 4v14a3 3 0 00-3-3H2z" />
                            <path d="M22 3h-6a4 4 0 00-4 4v14a3 3 0 013-3h7z" />
                        </svg>
                    ) : (
                        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--color-primary)' }}>
                            <circle cx="9" cy="21" r="1" />
                            <circle cx="20" cy="21" r="1" />
                            <path d="M1 1h4l2.68 13.39a2 2 0 001.61H18a2 2 0 002-1.61L23 6H6" />
                        </svg>
                    )}
                </Link>

                {/* 2. اطلاعات آیتم */}
                <Link href={itemUrl} className={cartStyles.itemInfo}>
                    <h3 className={cartStyles.itemTitle}>{item.title ?? '—'}</h3>
                    <p className={cartStyles.itemPrice}>
                        {formatPrice(item.price)} تومان
                    </p>
                    <span className={cartStyles.courseLabel}>
                        {isCourse ? 'دوره آموزشی' : 'محصول فیزیکی'}
                    </span>
                </Link>

                {/* 3. فضای خالی (برای حفظ ساختار 5 ستونه) */}
                <div className={cartStyles.spacer}></div>

                {/* 4. تعداد کالا / یا مبلغ کل */}
                <div className={cartStyles.itemTotal} style={{ color: 'var(--color-text-primary)' }}>
                    {!isCourse && (item.quantity || 1) > 1 ? `تعداد کل: ${item.quantity || 1}` : ''}
                </div>

                {/* 5. دکمه مشاهده جایگزین دکمه حذف */}
                <Link href={itemUrl} className={styles.viewBtn}>
                    مشاهده
                </Link>
            </div>
        );
    };

    return (
        <div className={styles.purchases}>
            <h2 className={styles.purchases__title}>محصولات و دوره‌های من</h2>
            
            {courses.length === 0 && products.length === 0 ? (
                <div className={styles.purchases__empty}>
                    <p>شما تاکنون محصول یا دوره‌ای خریداری نکرده‌اید.</p>
                </div>
            ) : (
                <>
                    {courses.length > 0 && (
                        <div className={styles.purchases__section}>
                            <h3 className={styles.purchases__sectionTitle}>دوره‌های آموزشی ({courses.length})</h3>
                            <div className={cartStyles.itemsList}>
                                {courses.map((course) => renderItem(course, true))}
                            </div>
                        </div>
                    )}

                    {products.length > 0 && (
                        <div className={styles.purchases__section}>
                            <h3 className={styles.purchases__sectionTitle}>محصولات فیزیکی ({products.length})</h3>
                            <div className={cartStyles.itemsList}>
                                {products.map((product) => renderItem(product, false))}
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
