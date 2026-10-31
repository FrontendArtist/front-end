'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { useAccountOrders } from '@/hooks/useAccountOrders';
import { fetchProfileCartData } from '@/lib/client/profileClientApi';
import { isOrderPaid } from '@/lib/constants/orderConstants';
import { resolvePurchasedCourseHref, resolvePurchasedCourseTitle } from '@/lib/courseTitleUtils';
import { isChapterOrderItem } from '@/lib/courseAccessUtils';
import CardSkeletonHorizontal from '@/components/ui/Skeleton/CardSkeletonHorizontal';
import PriceWithHint from '@/components/ui/PriceWithHint/PriceWithHint';
import styles from './PurchasesList.module.scss';
import cartStyles from '@/app/cart/Cart.module.scss'; // Reuse cart styles

export default function PurchasesList() {
    const { orders, isLoading, error, fetchOrders, hasFetched } = useAccountOrders();
    const { data: session, status: sessionStatus } = useSession();
    const [profileCourses, setProfileCourses] = useState([]);
    const [courseCatalog, setCourseCatalog] = useState([]);
    const [refreshAttempt, setRefreshAttempt] = useState(0);
    const userId = sessionStatus === 'authenticated' ? session?.user?.id : null;

    useEffect(() => {
        fetchOrders(true);
    }, [fetchOrders]);

    const loadProfileCourses = useCallback(() => {
        if (!userId) return Promise.resolve();
        return fetchProfileCartData(true, userId)
            .then(data => {
                if (Array.isArray(data?.courses)) {
                    setProfileCourses(data.courses);
                }
            })
            .catch(() => {});
    }, [userId]);

    // واکشی پروفایل برای اطمینان از دریافت تازه‌ترین لیست دوره‌ها (شامل خریدهای انجام‌شده با نور)
    useEffect(() => {
        loadProfileCourses();
    }, [loadProfileCourses]);

    // تحویل خرید در Strapi/بای‌مانی کمی بعد از پرداخت ثبت می‌شود؛ تا چند ثانیه دوباره تلاش می‌کنیم.
    const hasLoadedPurchases = profileCourses.length > 0 || orders.some(order => {
        if (!isOrderPaid(order)) return false;
        const items = order.attributes?.items || order.items;
        return Array.isArray(items) && items.some(item => {
            const hasIdentity = Boolean(
                item?.documentId || item?.courseId || item?.slug || item?.id ||
                item?.integrationId || item?.chapterId || item?.title || item?.courseTitle
            );
            return hasIdentity && (
                item?.type === 'course' ||
                item?.type === 'chapter' ||
                item?.__component === 'order.course-order-item' ||
                isChapterOrderItem(item)
            );
        });
    });
    useEffect(() => {
        if (!userId || hasLoadedPurchases || refreshAttempt >= 3) return;
        const delays = [2500, 5000, 9000];
        const timer = setTimeout(() => {
            fetchOrders(true);
            loadProfileCourses();
            setRefreshAttempt(attempt => attempt + 1);
        }, delays[refreshAttempt]);
        return () => clearTimeout(timer);
    }, [userId, hasLoadedPurchases, refreshAttempt, fetchOrders, loadProfileCourses]);

    useEffect(() => {
        let isMounted = true;
        fetch('/api/courses?pageSize=100')
            .then(res => (res.ok ? res.json() : null))
            .then(json => {
                if (isMounted && Array.isArray(json?.data)) {
                    setCourseCatalog(json.data);
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

    const courseRows = [];
    const productRows = [];
    const seenRowKeys = new Set();

    const pushRow = (item, fallbackKey) => {
        if (!item || typeof item !== 'object') return;

        const isChapter = isChapterOrderItem(item);
        const isCourseItem = isChapter ||
            item.__component === 'order.course-order-item' ||
            item.type === 'course' ||
            item.type === 'course_chapter';
        const identity = item.integrationId || item.chapterId || item.slug ||
            item.courseSlug || item.courseDocumentId || item.documentId || item.courseId || item.id;

        // ردیف‌های خلاصهٔ سفارش بای‌مانی که نه هویت دارند و نه عنوان، قابل نمایش یا لینک‌دهی نیستند.
        if (!identity && !item.title && !item.courseTitle) return;

        const rowKey = `${isChapter ? 'chapter' : isCourseItem ? 'course' : 'product'}:${identity || fallbackKey}`;

        if (seenRowKeys.has(rowKey)) {
            if (!isCourseItem) {
                const existingProduct = productRows.find(row => row.__key === rowKey);
                if (existingProduct) {
                    existingProduct.quantity = (existingProduct.quantity || 1) + (item.quantity || 1);
                }
            }
            return;
        }
        seenRowKeys.add(rowKey);

        const row = { ...item, __key: rowKey, __isChapter: isChapter };
        (isCourseItem ? courseRows : productRows).push(row);
    };

    paidOrders.forEach((order, orderIndex) => {
        const items = order.attributes?.items || order.items;
        if (!Array.isArray(items)) return;
        items.forEach((item, itemIndex) => {
            pushRow(item, `${order.documentId || order.id || orderIndex}-${itemIndex}`);
        });
    });

    // دوره‌های کاربر از سشن و پروفایل (شامل خریدهایی که هنوز سفارش قابل‌نمایش ندارند)
    const rawUserCourses = [
        ...(Array.isArray(session?.user?.courses) ? session.user.courses : []),
        ...(Array.isArray(profileCourses) ? profileCourses : [])
    ];

    rawUserCourses.forEach(uc => {
        if (!uc) return;
        pushRow({
            id: uc.id,
            documentId: uc.documentId,
            courseId: uc.id,
            title: uc.title,
            courseTitle: uc.title,
            slug: uc.slug,
            courseSlug: uc.slug,
            price: uc.price,
            isFree: uc.isFree,
            type: 'course',
            __component: 'order.course-order-item'
        }, `profile:${uc.id || uc.documentId || uc.slug}`);
    });

    const courses = courseRows;
    const products = productRows;

    const formatPrice = (price) => {
        return Number(price || 0).toLocaleString('fa-IR');
    };

    const renderItem = (item, isCourse) => {
        const isChapter = Boolean(item.__isChapter);
        const itemUrl = isCourse
            ? resolvePurchasedCourseHref(item, courseCatalog)
            : (item.slug ? `/product/${item.slug}` : '');
        const displayTitle = isCourse
            ? resolvePurchasedCourseTitle(item, courseCatalog)
            : (item.title || '');
        const isFreeItem = item.isFree || item.price === 0;

        const imageStyle = {
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(246, 217, 130, 0.08)',
            borderRadius: '10px'
        };

        const imageContent = isCourse ? (
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
        );

        const infoContent = (
            <>
                <h3 className={cartStyles.itemTitle}>{displayTitle || (isCourse ? 'دوره آموزشی' : 'محصول')}</h3>
                <div className={cartStyles.itemPrice}>
                    {isFreeItem ? 'رایگان' : <PriceWithHint price={item.price} size="sm" />}
                </div>
                <span className={cartStyles.courseLabel}>
                    {isChapter ? 'فصل آموزشی' : isCourse ? 'دوره آموزشی' : 'محصول فیزیکی'}
                </span>
            </>
        );

        return (
            <div key={item.__key || item.documentId || item.id || item.slug} className={cartStyles.cartItem}>
                {/* 1. تصویر/آیکون */}
                {itemUrl ? (
                    <Link href={itemUrl} className={cartStyles.itemImage} style={imageStyle}>
                        {imageContent}
                    </Link>
                ) : (
                    <div className={cartStyles.itemImage} style={imageStyle}>
                        {imageContent}
                    </div>
                )}

                {/* 2. اطلاعات آیتم */}
                {itemUrl ? (
                    <Link href={itemUrl} className={cartStyles.itemInfo}>
                        {infoContent}
                    </Link>
                ) : (
                    <div className={cartStyles.itemInfo}>
                        {infoContent}
                    </div>
                )}

                {/* 3. فضای خالی (برای حفظ ساختار 5 ستونه) */}
                <div className={cartStyles.spacer}></div>

                {/* 4. تعداد کالا / یا مبلغ کل */}
                <div className={cartStyles.itemTotal} style={{ color: 'var(--color-text-primary)' }}>
                    {!isCourse && (item.quantity || 1) > 1 ? `تعداد کل: ${item.quantity || 1}` : ''}
                </div>

                {/* 5. دکمه مشاهده؛ بدون اسلاگ معتبر لینک مرده ساخته نمی‌شود */}
                {itemUrl ? (
                    <Link href={itemUrl} className={styles.viewBtn}>
                        مشاهده
                    </Link>
                ) : (
                    <span className={styles.viewBtn} aria-disabled="true" style={{ opacity: 0.45, cursor: 'default' }}>
                        —
                    </span>
                )}
            </div>
        );
    };

    return (
        <div className={styles.purchases}>
            <h2 className={styles.purchases__title}>محصولات و دوره‌های من</h2>

            {courses.length === 0 && products.length === 0 ? (
                <div className={styles.purchases__empty}>
                    <p>{refreshAttempt > 0 && refreshAttempt <= 3
                        ? 'در حال به‌روزرسانی فهرست خریدها…'
                        : 'شما تاکنون محصول یا دوره‌ای خریداری نکرده‌اید.'}</p>
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
