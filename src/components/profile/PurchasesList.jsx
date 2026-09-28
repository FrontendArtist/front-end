'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { useOrdersStore } from '@/store/useOrdersStore';
import { fetchProfileCartData } from '@/lib/client/profileClientApi';
import { isOrderPaid } from '@/lib/constants/orderConstants';
import CardSkeletonHorizontal from '@/components/ui/Skeleton/CardSkeletonHorizontal';
import styles from './PurchasesList.module.scss';
import cartStyles from '@/app/cart/Cart.module.scss'; // Reuse cart styles

export default function PurchasesList() {
    const { orders, isLoading, error, fetchOrders, hasFetched } = useOrdersStore();
    const { data: session, status: sessionStatus } = useSession();
    const [profileCourses, setProfileCourses] = useState([]);

    useEffect(() => {
        if (!hasFetched) {
            fetchOrders();
        }
    }, [hasFetched, fetchOrders]);

    // واکشی پروفایل برای اطمینان از دریافت تازه‌ترین لیست دوره‌ها (شامل خریدهای انجام‌شده با نور)
    useEffect(() => {
        let isMounted = true;
        fetchProfileCartData(true)
            .then(data => {
                if (isMounted && Array.isArray(data?.courses)) {
                    setProfileCourses(data.courses);
                }
            })
            .catch(() => {});
        return () => {
            isMounted = false;
        };
    }, []);

    if (isLoading || (sessionStatus === 'loading' && !hasFetched)) {
        return (
            <div className={styles.purchases__loading}>
                <CardSkeletonHorizontal />
                <CardSkeletonHorizontal />
                <CardSkeletonHorizontal />
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

    // ⚠️ فقط سفارشاتی که پرداخت آنها قطعی و تأیید شده است در خریدهای من نمایش داده می‌شوند
    const paidOrders = orders.filter(isOrderPaid);

    // Extract and flatten all items from all paid orders
    const allItems = paidOrders.flatMap(order => {
        const items = order.attributes?.items || order.items;
        return Array.isArray(items) ? items : [];
    });

    const courses = [];
    const products = [];

    // Deduplicate items by slug or ID so if they bought the same course twice, we only show it once
    const seenOrderKeys = new Set();
    allItems.forEach(item => {
        const isCourseItem = item.__component === 'order.course-order-item' || item.type === 'course' || item.type === 'chapter';
        const key = item.slug || item.id;

        if (!seenOrderKeys.has(key)) {
            seenOrderKeys.add(key);
            if (isCourseItem) {
                courses.push({ ...item });
            } else {
                products.push({ ...item });
            }
        } else if (item.__component === 'order.product-order-item' || item.type === 'product') {
            // Aggregate quantity for physical products across multiple orders
            const existingProduct = products.find(p => (p.slug || p.id) === key);
            if (existingProduct) {
                existingProduct.quantity = (existingProduct.quantity || 1) + (item.quantity || 1);
            }
        }
    });

    // دوره‌های کاربر از سشن و پروفایل (شامل خریدهای انجام‌شده با نور که فاقد سفارش استرپی هستند)
    const rawUserCourses = [
        ...(Array.isArray(session?.user?.courses) ? session.user.courses : []),
        ...(Array.isArray(profileCourses) ? profileCourses : [])
    ];

    // ادغام دوره‌های user.courses بدون تکرار
    const seenUserCourseIdentifiers = new Set();
    rawUserCourses.forEach(uc => {
        if (!uc) return;
        const ucId = String(uc.id || uc.documentId || '');
        if (ucId && seenUserCourseIdentifiers.has(ucId)) return;
        if (ucId) seenUserCourseIdentifiers.add(ucId);

        const isAlreadyAdded = courses.some(existing => {
            const isExistingChapter = Boolean(
                existing.type === 'chapter' ||
                existing.chapterId ||
                existing.slug?.includes('-chapter-')
            );
            // اگر قلم قبلی فقط یک فصل باشد، مانع از نمایش خود دوره کامل نیست
            if (isExistingChapter) return false;

            const existingSlug = String(existing.slug || '').toLowerCase();
            const targetSlug = String(uc.slug || '').toLowerCase();
            if (existingSlug && targetSlug && existingSlug === targetSlug) return true;

            const existingCourseId = String(existing.courseId || (!isExistingChapter ? existing.id : '') || '');
            const targetId = String(uc.id || '');
            if (existingCourseId && targetId && existingCourseId === targetId) return true;

            const existingDocId = String(existing.courseDocumentId || existing.documentId || '');
            const targetDocId = String(uc.documentId || '');
            if (existingDocId && targetDocId && existingDocId === targetDocId) return true;

            return false;
        });

        if (!isAlreadyAdded) {
            const courseSlug = uc.slug || uc.documentId || uc.id;
            courses.push({
                id: uc.id,
                documentId: uc.documentId,
                courseId: uc.id,
                title: uc.title,
                slug: uc.slug,
                price: uc.price,
                isFree: uc.isFree,
                type: 'course',
                __component: 'order.course-order-item',
                itemUrl: `/courses/${courseSlug}`
            });
        }
    });

    const formatPrice = (price) => {
        return Number(price || 0).toLocaleString('fa-IR');
    };

    const renderItem = (item, isCourse) => {
        // استخراج slug اصلی دوره (مثلاً mohajerat-chapter-7 -> mohajerat)
        const isChapter = item.type === 'chapter' || Boolean(item.chapterId) || Boolean(item.slug?.includes('-chapter-'));
        const rawSlug = item.slug || item.courseSlug || item.documentId || '';
        const courseSlug = rawSlug ? String(rawSlug).split('-chapter-')[0] : '';

        const itemUrl = isCourse
            ? (item.itemUrl || (courseSlug ? `/courses/${courseSlug}` : '#'))
            : (item.itemUrl || (item.slug ? `/product/${item.slug}` : '#'));

        const isFreeItem = item.isFree || item.price === 0;

        return (
            <div key={item.documentId || item.id || item.slug} className={cartStyles.cartItem}>
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
                        {isFreeItem ? 'رایگان' : `${formatPrice(item.price)} تومان`}
                    </p>
                    <span className={cartStyles.courseLabel}>
                        {isChapter ? 'فصل آموزشی' : isCourse ? 'دوره آموزشی' : 'محصول فیزیکی'}
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
