import { getCourseCart, purchaseCourseCart } from '@/lib/courseCartApi';
import { useEffect, useState, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { getCourseCheckout, getTopUpCheckout, getCurrentCourseAccess } from '@/lib/courseCheckoutApi';
import { getMyCoursePurchases, getCoursePurchaseReceipt } from '@/lib/byeMoneyApi';
import { triggerLightUpdate } from '@/store/useLightStore';
import { invalidateProfileCache } from '@/lib/client/profileClientApi';
import { useCartStore } from '@/store/useCartStore';
import { useOrdersStore } from '@/store/useOrdersStore';

export default function useCourseCheckoutResult(courseId, topUpId, requestedCartId = null, urlStatus = null) {
    const { data: session, status } = useSession();
    const [result, setResult] = useState({
        phase: 'checking',
        courses: [],
        receipts: [],
        isUnderReview: false,
        reviewCaseId: null,
        reviewReasonCode: null
    });
    const purchasingRef = useRef(new Set());
    const jwt = session?.user?.jwt;
    const userId = session?.user?.id;
    const cartId = requestedCartId;
    useEffect(() => {
        if (!courseId && !topUpId && !cartId) {
            setResult({
                phase: 'idle',
                courses: [],
                receipts: [],
                isUnderReview: false,
                reviewCaseId: null,
                reviewReasonCode: null
            });
            return;
        }
        if (urlStatus === 'financial_review') {
            setResult({
                phase: 'financialReview',
                courses: [],
                receipts: [],
                isUnderReview: true,
                reviewCaseId: null,
                reviewReasonCode: null
            });
            return;
        }
        if (urlStatus === 'pending_sync') {
            setResult({
                phase: 'pendingSync',
                courses: [],
                receipts: [],
                isUnderReview: false,
                reviewCaseId: null,
                reviewReasonCode: null
            });
            return;
        }
        if (urlStatus === 'cancel') {
            setResult({
                phase: 'paymentFailed',
                courses: [],
                receipts: [],
                isUnderReview: false,
                reviewCaseId: null,
                reviewReasonCode: null
            });
            return;
        }
        if (!jwt) {
            if (status !== 'loading') setResult({
                phase: 'unknown',
                courses: [],
                receipts: [],
                isUnderReview: false,
                reviewCaseId: null,
                reviewReasonCode: null
            });
            return;
        }
        let timer;
        let checks = 0;
        let knownCourses = [];
        let knownReceipts = [];
        let resolvedCartId = cartId;
        const controller = new AbortController();
        const check = async () => {
            let next;
            try {
                let data = resolvedCartId ? await getCourseCart(resolvedCartId, jwt, controller.signal) : topUpId
                    ? await getTopUpCheckout(topUpId, jwt, controller.signal)
                    : await getCourseCheckout(courseId, jwt, controller.signal);
                if (!resolvedCartId && data.cartId) {
                    resolvedCartId = data.cartId;
                    data = await getCourseCart(resolvedCartId, jwt, controller.signal);
                }
                if (controller.signal.aborted) return;
                const isFinancialReview = Boolean(
                    data?.isUnderReview ||
                    data?.IsUnderReview ||
                    data?.reviewCaseId ||
                    data?.ReviewCaseId ||
                    data?.topUpStatus === 'Unresolved' ||
                    data?.topUpStatus === 'UnderReview'
                );
                const reviewCaseId = data?.reviewCaseId || data?.ReviewCaseId || null;
                const reviewReasonCode = data?.reviewReasonCode || data?.ReviewReasonCode || null;

                if (resolvedCartId && (data?.status === 'AwaitingTopUp' || data?.status === 'Ready') && data?.topUpStatus === 'Confirmed' && !isFinancialReview) {
                    if (!purchasingRef.current.has(resolvedCartId)) {
                        purchasingRef.current.add(resolvedCartId);
                        try {
                            data = await purchaseCourseCart(resolvedCartId, jwt);
                        } catch {
                            // در صورت خطا در نهایی‌سازی، در چرخهٔ بعدی مجدداً استعلام و تلاش می‌شود
                            purchasingRef.current.delete(resolvedCartId);
                        }
                    }
                }
                if (controller.signal.aborted) return;
                let courses = resolvedCartId || topUpId ? (Array.isArray(data?.courses) ? data.courses : []) : [{ externalCourseId: courseId, purchaseStatus: data?.purchaseStatus }];
                // سابقهٔ تحویل مالی، دسترسی فعلی پس از حذف دستی در استرپی را ثابت نمی‌کند.
                if (courses.some(course => course.purchaseStatus === 'Completed' && (course.itemType !== 'Product' && course.type !== 'product'))) {
                    const access = await getCurrentCourseAccess(userId, controller.signal);
                    if (controller.signal.aborted) {
                        return;
                    }
                    courses = courses.map(course => {
                        const isProduct = course.itemType === 'Product' || course.type === 'product';
                        if (isProduct || course.purchaseStatus !== 'Completed') return course;
                        const isChapter = course.itemType === 'CourseChapter' || course.type === 'course_chapter' || Boolean(course.parentExternalId);
                        const hasAccess = isChapter
                            ? (access.hasChapterAccess ? access.hasChapterAccess(course.externalCourseId, course.parentExternalId) : (access.has(course.externalCourseId) || (course.parentExternalId && access.has(course.parentExternalId))))
                            : access.has(course.externalCourseId);
                        return hasAccess ? course : { ...course, purchaseStatus: 'AccessMissing' };
                    });
                }
                knownCourses = courses;
                const paid = resolvedCartId ? data.status === 'Paid' || data.topUpStatus === 'Confirmed' : topUpId ? data.topUpStatus === 'Confirmed' : courses.some(c => ['Completed', 'AccessMissing', 'Activating', 'DeliveryPending'].includes(c.purchaseStatus));
                const digitalCourses = courses.filter(c => c.itemType !== 'Product' && c.type !== 'product');
                const phase = isFinancialReview && !paid ? 'financialReview'
                    : resolvedCartId && data.status !== 'Paid' && data.topUpStatus === 'Unresolved' ? 'unknown'
                    : resolvedCartId && data.status !== 'Paid' && data.topUpStatus === 'Pending' ? 'paymentPending'
                    : resolvedCartId && data.status !== 'Paid' && data.topUpStatus === 'Rejected' ? 'paymentFailed'
                    : resolvedCartId && ['Failed', 'Expired'].includes(data.status) ? (data.topUpStatus === 'Confirmed' ? 'incomplete' : 'paymentFailed')
                    : topUpId && data.topUpStatus === 'Rejected' ? 'paymentFailed'
                    : courses.length === 0 ? (paid ? 'standalone' : 'paymentPending')
                    : courses.some(c => c.purchaseStatus === 'AccessMissing') ? 'accessMissing'
                    : (paid && (digitalCourses.length === 0 || digitalCourses.every(c => c.purchaseStatus === 'Completed'))) ? 'completed'
                    : courses.some(c => ['Activating', 'DeliveryPending'].includes(c.purchaseStatus)) ? 'activating'
                    : paid ? 'incomplete' : 'paymentPending';

                // پس از موفقیت مالی، رسیدهای خریدهای بای‌مانی واکشی شوند
                if (paid && knownReceipts.length === 0 && jwt) {
                    try {
                        const purchasesRes = await getMyCoursePurchases({ jwt, page: 1, pageSize: 50, signal: controller.signal });
                        if (purchasesRes?.success && Array.isArray(purchasesRes.data?.items)) {
                            let matchingItems = [];
                            if (resolvedCartId) {
                                matchingItems = purchasesRes.data.items.filter(item => item.cartId === resolvedCartId);
                            }
                            if (matchingItems.length === 0 && courseId) {
                                matchingItems = purchasesRes.data.items.filter(item =>
                                    item.courseExternalId === courseId ||
                                    courses.some(c => c.externalCourseId === courseId)
                                );
                            }
                            if (matchingItems.length === 0 && (resolvedCartId || courseId)) {
                                matchingItems = purchasesRes.data.items.slice(0, Math.max(1, courses.length));
                            }
                            if (matchingItems.length > 0) {
                                const receiptPromises = matchingItems.map(item =>
                                    getCoursePurchaseReceipt({ jwt, purchaseId: item.purchaseId, signal: controller.signal })
                                );
                                const receiptResults = await Promise.all(receiptPromises);
                                knownReceipts = receiptResults
                                    .filter(r => r?.success && r.data)
                                    .map(r => r.data);
                            }
                        }
                    } catch {
                        // در صورت خطا یا انصراف، مانع ادامه کاربری نمی‌شود
                    }
                }

                next = {
                    phase,
                    courses,
                    paid,
                    receipts: knownReceipts,
                    isUnderReview: isFinancialReview,
                    reviewCaseId,
                    reviewReasonCode
                };
                // فقط قلمی حذف می‌شود که ثبت مالی آن در سرور تأیید شده است.
                const currentHydratedUserId = useCartStore.getState().hydratedUserId;
                for (const course of courses.filter(c => {
                    if (!userId || (currentHydratedUserId != null && String(currentHydratedUserId) !== String(userId))) return false;
                    const isProduct = c.itemType === 'Product' || c.type === 'product';
                    if (isProduct) return paid;
                    return ['Completed', 'Activating', 'DeliveryPending'].includes(c.purchaseStatus);
                })) {
                    const matching = useCartStore.getState().items.filter(item => {
                        const itemExternalId = item.type === 'chapter'
                            ? (item.integrationId || item.externalCourseId)
                            : (item.documentId || item.externalCourseId);
                        return itemExternalId === course.externalCourseId;
                    });
                    matching.forEach(item => useCartStore.getState().removeItem(item.id));
                }
                if (phase === 'completed') {
                    triggerLightUpdate();
                    invalidateProfileCache();
                    // کش سفارش‌ها باید پاک شود تا «دوره‌های من» و دسترسی فصل بلافاصله تازه شوند.
                    useOrdersStore.getState().invalidateOrders();
                }
            } catch {
                if (controller.signal.aborted) return;
                next = {
                    phase: 'unknown',
                    courses: knownCourses,
                    receipts: knownReceipts,
                    isUnderReview: false,
                    reviewCaseId: null,
                    reviewReasonCode: null
                };
            }
            checks += 1;
            const keepChecking = urlStatus !== 'failed' &&
                !['completed', 'standalone', 'paymentFailed', 'accessMissing', 'financialReview', 'pendingSync', 'idle', 'unknown'].includes(next.phase) &&
                checks < 15;
            setResult(next);
            if (keepChecking) timer = setTimeout(check, 2000);
        };
        check();
        return () => { controller.abort(); clearTimeout(timer); };
    }, [courseId, topUpId, cartId, jwt, status, userId, urlStatus]);
    return result;
}
