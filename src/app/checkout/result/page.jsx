'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import useCompletedOrderCart from '@/hooks/useCompletedOrderCart';
import useCourseCheckoutResult from '@/hooks/useCourseCheckoutResult';
import { formatChapterDisplayTitle, getRememberedChapterCourse } from '@/lib/courseTitleUtils';

import { 
    CheckCircle2, 
    XCircle, 
    AlertTriangle, 
    Receipt, 
    GraduationCap, 
    ArrowRight, 
    RotateCcw, 
    Home, 
    Copy, 
    Check, 
    Wallet, 
    Loader2,
    ChevronDown,
    CreditCard
} from 'lucide-react';
import styles from './page.module.scss';

function CheckoutResultContent() {
    const searchParams = useSearchParams();
    useCompletedOrderCart(searchParams.get('status'), searchParams.get('orderType') === 'light_topup' ? null : searchParams.get('orderId'));
    const [mounted, setMounted] = useState(false);
    const [copiedKey, setCopiedKey] = useState(null);
    const [remoteCourseTitles, setRemoteCourseTitles] = useState({});

    const status = searchParams.get('status') || 'failed';
    const orderId = searchParams.get('orderId') || '';
    const refNum = searchParams.get('refNum') || '';
    const traceNo = searchParams.get('traceNo') || '';
    const message = searchParams.get('message') || '';
    const isTopUp = searchParams.get('orderType') === 'light_topup';
    const topUpId = searchParams.get('topUpId') || '';
    const isWalletPurchase = searchParams.get('source') === 'noor';
    const courseId = isWalletPurchase ? searchParams.get('courseId') || '' : '';
    const cartId = searchParams.get('cartId') || '';
    const checkout = useCourseCheckoutResult(courseId, isTopUp ? topUpId : '', cartId, status);
    const isCoursePurchase = Boolean(cartId) || isWalletPurchase || checkout.courses.length > 0;
    const isFinancialReview = status === 'financial_review' || checkout.phase === 'financialReview' || Boolean(checkout.isUnderReview);
    const isPendingSync = status === 'pending_sync' || checkout.phase === 'pendingSync';
    const isReviewOrPending = Boolean(
        isFinancialReview ||
        isPendingSync ||
        checkout.phase === 'financialReview' ||
        checkout.phase === 'pendingSync' ||
        checkout.isUnderReview ||
        (Boolean(message) && (
            message.includes('در حال بررسی') ||
            message.includes('بررسی مالی') ||
            message.includes('همگام‌سازی') ||
            message.includes('رسیدگی مالی') ||
            message.includes('صف بررسی')
        ))
    );
    const isCheckingPurchase = isCoursePurchase && !isReviewOrPending && (
        ['checking', 'activating'].includes(checkout.phase) ||
        (status === 'success' && ['incomplete', 'paymentPending', 'unknown'].includes(checkout.phase))
    );
    const isVerifiedCourse = isCoursePurchase && checkout.phase === 'completed';
    const reviewNoticeText = 'در حال بررسی؛ در صورت کسر وجه، نور به کیف پول اضافه می‌شود؛ می‌توانید حدود ۳۰ دقیقه صبر کنید یا دوباره پرداخت کنید.';
    const courseMessage = checkout.phase === 'checking' ? 'در حال بررسی نتیجه خرید و فعال‌سازی دوره‌ها…'
        : checkout.phase === 'completed' ? 'خرید با موفقیت انجام شد و دسترسی همه دوره‌ها برای شما فعال است.'
        : checkout.phase === 'accessMissing' ? 'سابقه خرید در بای‌مانی وجود دارد، اما دسترسی دوره در حساب شما فعال نیست. برای بررسی و بازیابی دسترسی با پشتیبانی تماس بگیرید.'
        : checkout.phase === 'incomplete' ? (checkout.paid ? 'پرداخت یا شارژ ثبت شده است، اما خرید دوره تکمیل نشده است. وضعیت را از کیف پول و پشتیبانی پیگیری کنید.' : 'خرید دوره تکمیل نشده است. وضعیت را از حساب کاربری پیگیری کنید.')
        : checkout.phase === 'activating' ? 'پرداخت ثبت شد؛ در حال فعال‌سازی دوره هستیم.'
        : isReviewOrPending ? reviewNoticeText
        : checkout.phase === 'paymentFailed' ? (status === 'cancel' ? 'پرداخت لغو شد؛ دوره خریداری نشده و سبد شما حفظ شده است.' : 'پرداخت تأیید نشد؛ دوره خریداری نشده و سبد شما حفظ شده است.')
        : 'در حال حاضر تأیید وضعیت خرید ممکن نیست. وضعیت را از کیف پول و حساب کاربری پیگیری کنید.';

    const isSuccess = isCoursePurchase ? isVerifiedCourse
        : isTopUp && topUpId ? (checkout.paid === true && checkout.phase === 'standalone') : status === 'success';
    const isCancel = status === 'cancel' || (checkout.phase === 'paymentFailed' && status === 'cancel');
    const isPendingTopUp = isTopUp && topUpId && !isCoursePurchase &&
        !['standalone', 'paymentFailed', 'financialReview', 'pendingSync', 'idle'].includes(checkout.phase);
    const isPending = !isSuccess && !isCancel && !isReviewOrPending && (
        status === 'success'
            ? !['paymentFailed', 'accessMissing', 'financialReview', 'pendingSync', 'idle'].includes(checkout.phase)
            : (
                isCheckingPurchase ||
                isPendingTopUp ||
                ['checking', 'activating', 'paymentPending'].includes(checkout.phase)
            )
    );
    const isFailed = !isSuccess && !isCancel && !isPending && !isReviewOrPending;

    // واکشی خودکار نام دوره‌های مفقود برای خریدهای فصلی
    useEffect(() => {
        const missingParentIds = [];
        const checkItem = (item) => {
            const isChapter = item?.itemType === 'CourseChapter' ||
                item?.type === 'course_chapter' ||
                Boolean(item?.parentExternalId);
            const parentId = item?.parentExternalId;
            const title = item?.title || item?.courseTitle || '';
            if (isChapter && parentId && !title.includes('(') && !remoteCourseTitles[parentId]) {
                missingParentIds.push(parentId);
            }
        };
        (checkout.courses || []).forEach(checkItem);
        (checkout.receipts || []).forEach(checkItem);

        if (missingParentIds.length === 0 || typeof fetch !== 'function') return;

        let active = true;
        fetch('/api/courses?pageSize=50')
            .then(res => res.ok ? res.json() : null)
            .then(json => {
                if (!active || !json?.data) return;
                const newTitles = {};
                for (const course of json.data) {
                    const docId = course.documentId || String(course.id);
                    if (missingParentIds.includes(docId) && course.title) {
                        newTitles[docId] = course.title;
                    }
                }
                if (Object.keys(newTitles).length > 0) {
                    setRemoteCourseTitles(prev => ({ ...prev, ...newTitles }));
                }
            })
            .catch(() => {});

        return () => { active = false; };
    }, [checkout.courses, checkout.receipts, remoteCourseTitles]);

    const resolveResultItemTitle = (course, receipt, defaultIdx) => {
        const isChapter = course?.itemType === 'CourseChapter' ||
            course?.type === 'course_chapter' ||
            receipt?.itemType === 'CourseChapter' ||
            Boolean(course?.parentExternalId || receipt?.parentExternalId);

        const rawTitle = course?.title || receipt?.courseTitle || course?.externalCourseId || `قلم ${defaultIdx + 1}`;

        if (!isChapter) {
            return rawTitle;
        }

        if (rawTitle.includes('(')) {
            return rawTitle;
        }

        const chapterKey = course?.externalCourseId || receipt?.courseExternalId;
        const parentKey = course?.parentExternalId || receipt?.parentExternalId;

        let courseName = (parentKey && remoteCourseTitles[parentKey]) ||
            (chapterKey && remoteCourseTitles[chapterKey]) || null;

        if (!courseName) {
            const remembered = getRememberedChapterCourse(chapterKey, parentKey);
            if (remembered?.courseTitle) {
                courseName = remembered.courseTitle;
            }
        }

        if (courseName) {
            return formatChapterDisplayTitle(courseName, rawTitle);
        }

        return rawTitle;
    };

    // ادغام لیست دوره‌ها و رسیدهای مالی در یک ساختار یکپارچه
    const courses = checkout.courses || [];
    const receipts = Array.isArray(checkout.receipts) ? checkout.receipts : [];
    const mergedItems = (() => {
        if (!isCoursePurchase) return [];
        if (courses.length === 0 && receipts.length === 0) return [];

        if (courses.length > 0) {
            const usedReceiptIds = new Set();
            const list = courses.map((course, idx) => {
                let matchedReceipt = receipts.find(r =>
                    !usedReceiptIds.has(r.purchaseId) &&
                    ((r.courseExternalId && r.courseExternalId === course.externalCourseId) ||
                     (r.externalCourseId && r.externalCourseId === course.externalCourseId) ||
                     (r.courseTitle && course.title && r.courseTitle.trim() === course.title.trim()))
                );
                if (!matchedReceipt && receipts[idx] && !usedReceiptIds.has(receipts[idx].purchaseId)) {
                    matchedReceipt = receipts[idx];
                }
                if (matchedReceipt && matchedReceipt.purchaseId) {
                    usedReceiptIds.add(matchedReceipt.purchaseId);
                }
                return {
                    id: course.externalCourseId || matchedReceipt?.purchaseId || `item-${idx}`,
                    title: resolveResultItemTitle(course, matchedReceipt, idx),
                    course,
                    receipt: matchedReceipt || null,
                };
            });

            receipts.forEach((r, idx) => {
                if (!usedReceiptIds.has(r.purchaseId)) {
                    list.push({
                        id: r.purchaseId || `receipt-${idx}`,
                        title: resolveResultItemTitle(null, r, list.length + idx),
                        course: null,
                        receipt: r,
                    });
                }
            });
            return list;
        }

        return receipts.map((r, idx) => ({
            id: r.purchaseId || `receipt-${idx}`,
            title: resolveResultItemTitle(null, r, idx),
            course: null,
            receipt: r,
        }));
    })();

    // باز/بسته بودن سطرهای آکاردئونی (پیش‌فرض: برای ۱ آیتم باز، برای بیش از ۱ آیتم بسته)
    const [expandedItems, setExpandedItems] = useState({});

    useEffect(() => {
        setMounted(true);
    }, []);

    useEffect(() => {
        if (mergedItems.length === 1) {
            setExpandedItems({ [mergedItems[0].id]: true });
        }
    }, [mergedItems.length, mergedItems[0]?.id]);

    const toggleItem = (id) => {
        setExpandedItems(prev => ({
            ...prev,
            [id]: !prev[id]
        }));
    };

    const handleCopy = (text, key = 'default') => {
        if (!text) return;
        if (navigator?.clipboard?.writeText) {
            navigator.clipboard.writeText(text);
        }
        setCopiedKey(key);
        setTimeout(() => setCopiedKey(null), 2000);
    };

    // محاسبه جمع مبالغ اقلام
    const totalPaidInNoor = mergedItems.reduce((acc, item) => {
        const val = item.receipt?.finalAmountInNoor;
        return val != null ? acc + Number(val) : acc;
    }, 0);
    const hasTotalPrice = mergedItems.some(item => item.receipt?.finalAmountInNoor != null);

    const getItemStatusInfo = (item) => {
        const isProduct = item.course?.itemType === 'Product' || item.course?.type === 'product' || item.receipt?.itemType === 'Product' || item.receipt?.type === 'product';

        if (isFinancialReview) {
            return {
                label: 'در انتظار بررسی مالی',
                badgeClass: styles.pendingBadge
            };
        }

        if (isPendingSync) {
            return {
                label: 'در حال همگام‌سازی',
                badgeClass: styles.pendingBadge
            };
        }

        if (item.course) {
            const courseStatus = item.course.purchaseStatus;
            if (isProduct) {
                const label = checkout.paid ? 'در حال آماده‌سازی' : isPending ? 'در حال بررسی…' : 'خریداری نشده';
                return {
                    label,
                    badgeClass: checkout.paid ? styles.successBadge : isPending ? styles.pendingBadge : styles.failedBadge
                };
            }
            if (courseStatus === 'Completed') {
                const label = item.receipt?.deliveryStatus === 'Delivered' ? 'دسترسی فعال شد' : 'فعال شد';
                return { label, badgeClass: styles.successBadge };
            }
            if (courseStatus === 'AccessMissing') {
                return { label: 'دسترسی فعال نیست؛ نیازمند پیگیری', badgeClass: styles.failedBadge };
            }
            if (courseStatus === 'Activating') {
                return { label: 'در حال فعال‌سازی', badgeClass: styles.pendingBadge };
            }
            if (courseStatus === 'DeliveryPending') {
                return { label: 'پرداخت ثبت شد؛ در حال فعال‌سازی', badgeClass: styles.pendingBadge };
            }
            if (courseStatus === 'PurchaseIncomplete') {
                return {
                    label: isPending ? 'در حال فعال‌سازی…' : 'خرید تکمیل نشده',
                    badgeClass: isPending ? styles.pendingBadge : styles.failedBadge
                };
            }
            if (courseStatus === 'NotPurchased') {
                return {
                    label: isPending ? 'در حال فعال‌سازی…' : 'خریداری نشده',
                    badgeClass: isPending ? styles.pendingBadge : styles.failedBadge
                };
            }
            return {
                label: isPending ? 'در حال فعال‌سازی…' : 'در حال بررسی',
                badgeClass: isPending ? styles.pendingBadge : styles.failedBadge
            };
        }

        if (item.receipt) {
            if (isProduct) {
                return { label: 'در حال آماده‌سازی', badgeClass: styles.successBadge };
            }
            const isDelivered = item.receipt.deliveryStatus === 'Delivered';
            return {
                label: isDelivered ? 'دسترسی فعال شد' : 'در انتظار فعال‌سازی',
                badgeClass: isDelivered ? styles.successBadge : styles.pendingBadge
            };
        }

        return {
            label: isPending ? 'در حال بررسی…' : 'ثبت شده',
            badgeClass: isSuccess ? styles.successBadge : isPending ? styles.pendingBadge : styles.failedBadge
        };
    };

    const paymentStatusBadgeClass = isSuccess ? styles.successBadge : isReviewOrPending ? styles.pendingBadge : isPending ? styles.pendingBadge : styles.failedBadge;
    const paymentStatusText = isCoursePurchase ? (isVerifiedCourse ? 'خرید و فعال‌سازی تأیید شد'
        : isFinancialReview ? 'در انتظار بررسی مالی'
        : isPendingSync ? 'در حال همگام‌سازی پرداخت'
        : isReviewOrPending ? 'در انتظار بررسی مالی'
        : checkout.phase === 'paymentFailed' ? (isCancel ? 'لغو شده توسط کاربر' : 'پرداخت تأیید نشد')
        : checkout.phase === 'activating' ? 'پرداخت ثبت شد؛ در حال فعال‌سازی'
        : checkout.paid ? 'پرداخت ثبت شد؛ خرید در حال پیگیری' : 'در حال پیگیری')
        : isPendingTopUp ? (status === 'success' ? 'پرداخت موفق؛ در حال فعال‌سازی' : 'در حال پیگیری')
        : isFinancialReview ? 'در انتظار بررسی مالی'
        : isPendingSync ? 'در حال همگام‌سازی'
        : isReviewOrPending ? 'در انتظار بررسی مالی'
        : isSuccess ? 'تایید شده و موفق' : isCancel ? 'لغو شده توسط کاربر' : 'ناموفق';

    if (!mounted) {
        return (
            <div className={styles.loadingWrapper}>
                <div className={styles.spinner} />
                <p>در حال پردازش و استعلام نتیجه تراکنش...</p>
            </div>
        );
    }

    return (
        <div className={styles.resultPage}>
            <div className={styles.container}>
                <div className={`${styles.card} ${isSuccess ? styles.success : isCancel ? styles.cancel : isReviewOrPending ? styles.financialReview : isPending ? styles.pending : styles.failed}`}>
                    
                    {/* آیکون وضعیت تراکنش */}
                    <div className={`${styles.iconWrapper} ${isSuccess ? styles.success : isCancel ? styles.cancel : isReviewOrPending ? styles.financialReview : isPending ? styles.pending : styles.failed}`}>
                        {isSuccess ? (
                            <CheckCircle2 />
                        ) : isCancel || isReviewOrPending ? (
                            <AlertTriangle />
                        ) : isPending ? (
                            <Loader2 className={styles.spinnerIcon} />
                        ) : (
                            <XCircle />
                        )}
                    </div>

                    {/* عنوان نتیجه */}
                    <h1 className={styles.title}>
                        {isCoursePurchase
                            ? isVerifiedCourse ? 'خرید موفق؛ دوره‌ها فعال شدند' : isFinancialReview ? 'پرداخت در صف بررسی مالی قرار گرفت' : isPendingSync ? 'پرداخت در حال بررسی و همگام‌سازی است' : isReviewOrPending ? 'پرداخت در صف بررسی مالی قرار گرفت' : isCheckingPurchase ? 'در حال بررسی و فعال‌سازی دوره‌ها…' : 'وضعیت خرید دوره'
                            : isFinancialReview ? 'پرداخت در صف بررسی مالی قرار گرفت'
                            : isPendingSync ? 'پرداخت در حال بررسی و همگام‌سازی است'
                            : isReviewOrPending ? 'پرداخت در صف بررسی مالی قرار گرفت'
                            : isTopUp && topUpId && !['standalone', 'paymentFailed', 'idle'].includes(checkout.phase) ? 'وضعیت پرداخت در حال بررسی است'
                            : isSuccess
                            ? 'پرداخت با موفقیت انجام شد'
                            : isCancel
                            ? 'پرداخت توسط شما لغو گردید'
                            : 'تراکنش پرداخت ناموفق بود'}
                    </h1>

                    {/* پیام توضیحی */}
                    <p className={styles.description}>
                        {isCoursePurchase
                            ? courseMessage
                            : isReviewOrPending
                            ? reviewNoticeText
                            : isTopUp && topUpId && !['standalone', 'paymentFailed', 'idle'].includes(checkout.phase)
                            ? (status === 'success'
                                ? 'پرداخت با موفقیت ثبت شد؛ در حال تایید نهایی و فعال‌سازی دوره هستیم. لطفاً چند لحظه شکیبا باشید…'
                                : 'در حال بررسی نتیجه پرداخت هستیم. وضعیت را از حساب کاربری پیگیری کنید.')
                            : isSuccess
                            ? isTopUp
                                ? 'نور شارژشده به کیف پول شما اضافه شد.'
                                : 'سفارش شما با موفقیت در سیستم ثبت شد و دسترسی به دوره‌ها و خدمات خریداری‌شده فوراً برای حساب کاربری شما فعال گردید.'
                            : isCancel
                            ? 'فرایند پرداخت در درگاه بانکی سامان لغو شد. در صورت تمایل می‌توانید سفارش خود را مجدداً تکمیل فرمایید.'
                            : message || 'پرداخت تأیید نشده است. اگر مبلغی کسر شده، وضعیت آن را از بانک یا پشتیبانی پیگیری کنید.'}
                    </p>

                    {isPending && (
                        <div className={styles.pendingProgress}>
                            <div className={styles.pendingProgressBar} />
                            <span>در حال استعلام پرداخت و فعال‌سازی دوره…</span>
                        </div>
                    )}

                    {/* سرتیتر ساده و بدون کادر لیست اقلام سفارش */}
                    {isCoursePurchase && mergedItems.length > 0 && (
                        <div className={styles.itemsSectionHeader}>
                            <div className={styles.itemsSectionTitle}>
                                <span>اقلام سفارش</span>{' '}
                                <span className={styles.itemsCount}>(<span>{mergedItems.length.toLocaleString('fa-IR')} مورد</span>)</span>
                            </div>
                            {hasTotalPrice && (
                                <div className={styles.itemsTotalPaid}>
                                    <span className={styles.totalPaidLabel}>جمع کل پرداختی:</span>
                                    <span className={styles.totalPaidValue}>{totalPaidInNoor.toLocaleString('fa-IR')} نور</span>
                                </div>
                            )}
                        </div>
                    )}

                    {/* لیست یکپارچه و آکاردئونی اقلام سبد */}
                    {isCoursePurchase && mergedItems.length > 0 && (
                        <div className={styles.accordionContainer} aria-label="وضعیت اقلام سبد">
                            {mergedItems.map((item) => {
                                const isExpanded = Boolean(expandedItems[item.id]);
                                const statusInfo = getItemStatusInfo(item);
                                const isPhysical = item.course?.itemType === 'Product' || item.course?.type === 'product' || item.receipt?.itemType === 'Product' || item.receipt?.type === 'product';
                                const deliveryText = isPhysical
                                    ? 'در حال آماده‌سازی'
                                    : (item.receipt?.deliveryStatus === 'Delivered' ? 'دسترسی فعال شد' : (statusInfo.label || 'در انتظار فعال‌سازی'));
                                const itemPrice = item.receipt?.finalAmountInNoor;

                                return (
                                    <div
                                        key={item.id}
                                        className={`${styles.accordionItem} ${isExpanded ? styles.open : ''}`}
                                        aria-label={`رسید ${item.title}`}
                                    >
                                        {/* سطر جمع‌وجور خلاصه قلم */}
                                        <button
                                            type="button"
                                            className={styles.accordionHeader}
                                            onClick={() => toggleItem(item.id)}
                                            aria-expanded={isExpanded}
                                        >
                                            <div className={styles.accordionHeaderRight}>
                                                <span className={styles.accordionItemTitle}>{item.title}</span>
                                                {itemPrice != null && (
                                                    <span className={styles.accordionItemPrice}>
                                                        {Number(itemPrice).toLocaleString('fa-IR')} نور
                                                    </span>
                                                )}
                                            </div>
                                            <div className={styles.accordionHeaderLeft}>
                                                <span className={`${styles.badge} ${statusInfo.badgeClass}`}>
                                                    {statusInfo.label}
                                                </span>
                                                <span className={`${styles.chevron} ${isExpanded ? styles.expanded : ''}`}>
                                                    <ChevronDown size={18} />
                                                </span>
                                            </div>
                                        </button>

                                        {/* جزئیات کامل قلم به صورت کشویی */}
                                        {isExpanded && (
                                            <div className={styles.accordionBody}>
                                                <div className={styles.detailRow}>
                                                    <span className={styles.label}>
                                                        <Receipt size={15} />
                                                        شماره سفارش / شناسه خرید:
                                                    </span>
                                                    <span
                                                        className={styles.valueWithCopy}
                                                        onClick={() => handleCopy(item.receipt?.purchaseId || item.course?.externalCourseId, `purchaseId-${item.id}`)}
                                                        title="برای کپی کلیک کنید"
                                                    >
                                                        <span className={styles.truncatedValue} dir="ltr">
                                                            {item.receipt?.purchaseId || item.course?.externalCourseId}
                                                        </span>
                                                        {copiedKey === `purchaseId-${item.id}` ? <Check size={14} color="#34d399" /> : <Copy size={14} opacity={0.6} />}
                                                    </span>
                                                </div>

                                                {item.receipt?.baseAmountInNoor != null && (
                                                    <div className={styles.detailRow}>
                                                        <span className={styles.label}>مبلغ پایه:</span>
                                                        <span className={styles.value}>{Number(item.receipt.baseAmountInNoor).toLocaleString('fa-IR')} نور</span>
                                                    </div>
                                                )}

                                                {item.receipt?.discountAmountInNoor != null && item.receipt.discountAmountInNoor > 0 && (
                                                    <div className={styles.detailRow}>
                                                        <span className={styles.label}>مبلغ تخفیف:</span>
                                                        <span className={styles.value}>{Number(item.receipt.discountAmountInNoor).toLocaleString('fa-IR')} نور</span>
                                                    </div>
                                                )}

                                                {item.receipt?.couponCode && (
                                                    <div className={styles.detailRow}>
                                                        <span className={styles.label}>کد تخفیف:</span>
                                                        <span className={styles.value} dir="ltr">{item.receipt.couponCode}</span>
                                                    </div>
                                                )}

                                                {item.receipt?.finalAmountInNoor != null && (
                                                    <div className={styles.detailRow}>
                                                        <span className={styles.label}>مبلغ پرداختی:</span>
                                                        <span className={styles.value} style={{ fontWeight: 'bold' }}>
                                                            {Number(item.receipt.finalAmountInNoor || 0).toLocaleString('fa-IR')} نور
                                                        </span>
                                                    </div>
                                                )}

                                                {item.receipt?.referenceRialPerNoorAtPurchaseTime != null && (
                                                    <div className={styles.detailRow}>
                                                        <span className={styles.label}>نرخ مرجع هنگام خرید:</span>
                                                        <span className={styles.value} dir="ltr">
                                                            {Number(item.receipt.referenceRialPerNoorAtPurchaseTime).toLocaleString('fa-IR')}
                                                        </span>
                                                    </div>
                                                )}

                                                {item.receipt?.purchasedAtUtc && (
                                                    <div className={styles.detailRow}>
                                                        <span className={styles.label}>زمان خرید:</span>
                                                        <span className={styles.value}>
                                                            {new Intl.DateTimeFormat('fa-IR', {
                                                                year: 'numeric',
                                                                month: 'long',
                                                                day: 'numeric',
                                                                hour: '2-digit',
                                                                minute: '2-digit'
                                                            }).format(new Date(item.receipt.purchasedAtUtc))}
                                                        </span>
                                                    </div>
                                                )}

                                                <div className={styles.detailRow}>
                                                    <span className={styles.label}>وضعیت تحویل:</span>
                                                    <span className={`${styles.badge} ${statusInfo.badgeClass}`}>
                                                        {deliveryText}
                                                    </span>
                                                </div>

                                                {item.receipt && (
                                                    <div className={styles.detailRow}>
                                                        <span className={styles.label}>رسید مالی:</span>
                                                        <span className={`${styles.badge} ${styles.successBadge}`}>
                                                            رسید مالی بای‌مانی ✓
                                                        </span>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {/* پانویس رسید: مشخصات پرداخت و تراکنش به صورت سطرهای کلید-مقدار تمیز و کم‌ارتفاع */}
                    <div className={styles.receiptFooter}>
                        <div className={styles.receiptFooterHeader}>
                            <CreditCard size={16} />
                            <span>مشخصات پرداخت و تراکنش</span>
                        </div>
                        <div className={styles.receiptFooterGrid}>
                            {isTopUp && topUpId && (
                                <div className={styles.receiptRow}>
                                    <span className={styles.receiptLabel}>شناسه شارژ:</span>
                                    <span
                                        className={styles.receiptValueWithCopy}
                                        onClick={() => handleCopy(topUpId, 'topUpId')}
                                        title="برای کپی کلیک کنید"
                                    >
                                        <span className={styles.truncateText} dir="ltr">{topUpId}</span>
                                        {copiedKey === 'topUpId' ? <Check size={14} color="#34d399" /> : <Copy size={14} opacity={0.6} />}
                                    </span>
                                </div>
                            )}

                            {orderId && (
                                <div className={styles.receiptRow}>
                                    <span className={styles.receiptLabel}>
                                        <Receipt size={14} />
                                        شناسه سفارش:
                                    </span>
                                    <span
                                        className={styles.receiptValueWithCopy}
                                        onClick={() => handleCopy(orderId, 'orderId')}
                                        title="برای کپی کلیک کنید"
                                    >
                                        <span className={styles.truncateText} dir="ltr">{orderId}</span>
                                        {copiedKey === 'orderId' ? <Check size={14} color="#34d399" /> : <Copy size={14} opacity={0.6} />}
                                    </span>
                                </div>
                            )}

                            {refNum && (
                                <div className={styles.receiptRow}>
                                    <span className={styles.receiptLabel}>رسید دیجیتال (RefNum):</span>
                                    <span
                                        className={styles.receiptValueWithCopy}
                                        onClick={() => handleCopy(refNum, 'refNum')}
                                        title="برای کپی کلیک کنید"
                                    >
                                        <span className={styles.truncateText} dir="ltr">{refNum}</span>
                                        {copiedKey === 'refNum' ? <Check size={14} color="#34d399" /> : <Copy size={14} opacity={0.6} />}
                                    </span>
                                </div>
                            )}

                            {traceNo && traceNo !== refNum && (
                                <div className={styles.receiptRow}>
                                    <span className={styles.receiptLabel}>کد رهگیری بانک (TraceNo):</span>
                                    <span
                                        className={styles.receiptValueWithCopy}
                                        onClick={() => handleCopy(traceNo, 'traceNo')}
                                        title="برای کپی کلیک کنید"
                                    >
                                        <span className={styles.truncateText} dir="ltr">{traceNo}</span>
                                        {copiedKey === 'traceNo' ? <Check size={14} color="#34d399" /> : <Copy size={14} opacity={0.6} />}
                                    </span>
                                </div>
                            )}

                            {checkout.reviewCaseId && (
                                <div className={styles.receiptRow}>
                                    <span className={styles.receiptLabel}>کد پرونده رسیدگی مالی:</span>
                                    <span
                                        className={styles.receiptValueWithCopy}
                                        onClick={() => handleCopy(checkout.reviewCaseId, 'reviewCaseId')}
                                        title="برای کپی کلیک کنید"
                                    >
                                        <span className={styles.truncateText} dir="ltr">{checkout.reviewCaseId}</span>
                                        {copiedKey === 'reviewCaseId' ? <Check size={14} color="#34d399" /> : <Copy size={14} opacity={0.6} />}
                                    </span>
                                </div>
                            )}

                            <div className={styles.receiptRow}>
                                <span className={styles.receiptLabel}>درگاه پرداخت:</span>
                                <span className={styles.receiptValue} style={{ direction: 'rtl', fontFamily: 'inherit' }}>
                                    {isWalletPurchase ? 'کیف نور' : 'پرداخت الکترونیک سامان (سپ)'}
                                </span>
                            </div>

                            <div className={styles.receiptRow}>
                                <span className={styles.receiptLabel}>وضعیت پرداخت:</span>
                                <span className={`${styles.badge} ${paymentStatusBadgeClass}`}>
                                    {paymentStatusText}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* راهنمای کاربر */}
                    {isCoursePurchase ? (
                        <div className={styles.notice}>
                            {isVerifiedCourse ? 'دوره را از بخش «دوره‌های من» مشاهده کنید.'
                                : isReviewOrPending ? reviewNoticeText
                                : checkout.phase === 'paymentFailed' ? 'سبد شما حفظ شده است؛ می‌توانید از سبد خرید دوباره اقدام کنید.'
                                : isCheckingPurchase ? 'پرداخت شما با موفقیت ثبت شد؛ در حال فعال‌سازی دسترسی دوره هستیم. لطفاً چند لحظه شکیبا باشید…'
                                : 'برای پیگیری نتیجه، کیف پول و دوره‌های من را بررسی کنید.'}
                        </div>
                    ) : isPendingTopUp ? (
                        <div className={styles.notice}>
                            {status === 'success'
                                ? 'پرداخت شما ثبت شده است؛ در حال بررسی و فعال‌سازی دوره هستیم. لطفاً صفحه را نبندید و چند لحظه منتظر بمانید…'
                                : 'نتیجهٔ شارژ یا برگشت وجه هنوز قطعی نیست. وضعیت را از کیف پول و پشتیبانی پیگیری کنید.'}
                        </div>
                    ) : isSuccess ? (
                        <div className={styles.notice}>
                            {isTopUp
                                ? 'نتیجهٔ شارژ در کیف پول شما ثبت شد.'
                                : 'رسید پرداخت برای شما صادر شد. می‌توانید در پنل کاربری، سوابق سفارشات و محتوای دوره‌های خود را مشاهده و دریافت نمایید.'}
                        </div>
                    ) : isPending ? (
                        <div className={styles.notice}>
                            در حال بررسی نتیجه و فعال‌سازی دوره هستیم. لطفاً چند لحظه شکیبا باشید…
                        </div>
                    ) : isReviewOrPending ? (
                        <div className={styles.notice}>
                            {reviewNoticeText}
                        </div>
                    ) : (
                        <div className={styles.deductionAlertBox}>
                            <div className={styles.deductionAlertHeader}>
                                <AlertTriangle size={18} />
                                <strong>اگر مبلغ از حسابتان کسر شده ولی دسترسی فعال نشده است:</strong>
                            </div>
                            <p className={styles.deductionAlertText}>
                                وضعیت کسر یا برگشت وجه را از بانک یا پشتیبانی پیگیری کنید و شناسهٔ تراکنش را نگه دارید.
                            </p>
                        </div>
                    )}

                    {/* دکمه اقدام اصلی و لینک‌های متنی در انتهای کارت رسید */}
                    <div className={styles.bottomActions}>
                        {isCoursePurchase ? (
                            isSuccess ? (
                                <>
                                    <Link href="/profile/purchases" className={styles.primaryButton}>
                                        <GraduationCap size={18} />
                                        مشاهده دوره‌های من
                                    </Link>
                                    <div className={styles.textLinks}>
                                        <Link href="/profile/orders" className={styles.textLink}>
                                            سفارش‌های من
                                        </Link>
                                        <span className={styles.textLinkDot}>•</span>
                                        <Link href="/profile" className={styles.textLink}>
                                            کیف پول
                                        </Link>
                                    </div>
                                </>
                            ) : isReviewOrPending ? (
                                <>
                                    <div className={styles.actions}>
                                        <Link href="/cart" className={styles.primaryButton}>
                                            <RotateCcw size={18} />
                                            بازگشت به سبد و پرداخت مجدد
                                        </Link>
                                        <Link href="/profile" className={styles.secondaryButton}>
                                            <Wallet size={18} />
                                            کیف پول و حساب کاربری
                                        </Link>
                                    </div>
                                    <div className={styles.textLinks}>
                                        <Link href="/profile/purchases" className={styles.textLink}>
                                            مشاهده دوره‌های من
                                        </Link>
                                        <span className={styles.textLinkDot}>•</span>
                                        <Link href="/profile/orders" className={styles.textLink}>
                                            سفارش‌های من
                                        </Link>
                                        <span className={styles.textLinkDot}>•</span>
                                        <Link href="/" className={styles.textLink}>
                                            صفحه اصلی
                                        </Link>
                                    </div>
                                </>
                            ) : (
                                <>
                                    <Link href="/profile" className={styles.primaryButton}>
                                        <Wallet size={18} />
                                        کیف پول و حساب کاربری
                                    </Link>
                                    <div className={styles.textLinks}>
                                        {checkout.phase === 'paymentFailed' && (
                                            <>
                                                <Link href="/cart" className={styles.textLink}>
                                                    <RotateCcw size={15} />
                                                    بازگشت به سبد خرید و پرداخت مجدد
                                                </Link>
                                                <span className={styles.textLinkDot}>•</span>
                                            </>
                                        )}
                                        <Link href="/profile/purchases" className={styles.textLink}>
                                            مشاهده دوره‌های من
                                        </Link>
                                        <span className={styles.textLinkDot}>•</span>
                                        <Link href="/profile/orders" className={styles.textLink}>
                                            سفارش‌های من
                                        </Link>
                                    </div>
                                </>
                            )
                        ) : isSuccess ? (
                            isTopUp ? (
                                <>
                                    <Link href="/profile" className={styles.primaryButton}>
                                        <Wallet size={18} />
                                        کیف پول و حساب کاربری
                                    </Link>
                                    <div className={styles.textLinks}>
                                        <Link href="/" className={styles.textLink}>
                                            <Home size={15} />
                                            صفحه اصلی
                                        </Link>
                                    </div>
                                </>
                            ) : (
                                <>
                                    {orderId ? (
                                        <Link href={`/profile/orders/${orderId}`} className={styles.primaryButton}>
                                            مشاهده فاکتور سفارش
                                            <ArrowRight size={18} />
                                        </Link>
                                    ) : (
                                        <Link href="/profile/purchases" className={styles.primaryButton}>
                                            <GraduationCap size={18} />
                                            مشاهده دوره‌های من
                                        </Link>
                                    )}
                                    <div className={styles.textLinks}>
                                        <Link href="/profile/purchases" className={styles.textLink}>
                                            دوره‌های من
                                        </Link>
                                        <span className={styles.textLinkDot}>•</span>
                                        <Link href="/" className={styles.textLink}>
                                            صفحه اصلی
                                        </Link>
                                    </div>
                                </>
                            )
                        ) : isReviewOrPending ? (
                            <>
                                <div className={styles.actions}>
                                    <Link href="/cart" className={styles.primaryButton}>
                                        <RotateCcw size={18} />
                                        بازگشت به سبد و پرداخت مجدد
                                    </Link>
                                    <Link href="/profile" className={styles.secondaryButton}>
                                        <Wallet size={18} />
                                        کیف پول و حساب کاربری
                                    </Link>
                                </div>
                                <div className={styles.textLinks}>
                                    <Link href="/profile/purchases" className={styles.textLink}>
                                        دوره‌های من
                                    </Link>
                                    <span className={styles.textLinkDot}>•</span>
                                    <Link href="/" className={styles.textLink}>
                                        صفحه اصلی
                                    </Link>
                                </div>
                            </>
                        ) : isPending ? (
                            <>
                                <Link href="/profile" className={styles.primaryButton}>
                                    <Wallet size={18} />
                                    کیف پول و حساب کاربری
                                </Link>
                                <div className={styles.textLinks}>
                                    <Link href="/profile/purchases" className={styles.textLink}>
                                        دوره‌های من
                                    </Link>
                                    <span className={styles.textLinkDot}>•</span>
                                    <Link href="/" className={styles.textLink}>
                                        صفحه اصلی
                                    </Link>
                                </div>
                            </>
                        ) : (
                            isTopUp ? (
                                <>
                                    <Link href="/profile" className={styles.primaryButton}>
                                        <Wallet size={18} />
                                        کیف پول و حساب کاربری
                                    </Link>
                                    <div className={styles.textLinks}>
                                        <Link href="/" className={styles.textLink}>
                                            صفحه اصلی
                                        </Link>
                                    </div>
                                </>
                            ) : (
                                <>
                                    <Link href="/cart" className={styles.primaryButton}>
                                        <RotateCcw size={18} />
                                        بازگشت به سبد خرید و پرداخت مجدد
                                    </Link>
                                    <div className={styles.textLinks}>
                                        <Link href="/" className={styles.textLink}>
                                            صفحه اصلی
                                        </Link>
                                    </div>
                                </>
                            )
                        )}

                        {/* پانویس پشتیبانی و تماس به صورت متن راهنمای ظریف */}
                        <p className={styles.supportHint}>
                            در صورت نیاز به راهنمایی{' '}
                            <Link href="/contact" className={styles.supportLink}>
                                با پشتیبانی تماس بگیرید
                            </Link>
                        </p>
                    </div>

                </div>
            </div>
        </div>
    );
}

export default function CheckoutResultPage() {
    return (
        <Suspense fallback={
            <div className={styles.loadingWrapper}>
                <div className={styles.spinner} />
                <p>در حال بارگذاری اطلاعات پرداخت...</p>
            </div>
        }>
            <CheckoutResultContent />
        </Suspense>
    );
}
