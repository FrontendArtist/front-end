import { getCourseCart } from '@/lib/courseCartApi';
import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { getCourseCheckout, getTopUpCheckout, getCurrentCourseAccess } from '@/lib/courseCheckoutApi';
import { getMyCoursePurchases, getCoursePurchaseReceipt } from '@/lib/byeMoneyApi';
import { triggerLightUpdate } from '@/store/useLightStore';
import { invalidateProfileCache } from '@/lib/client/profileClientApi';
import { useCartStore } from '@/store/useCartStore';

export default function useCourseCheckoutResult(courseId, topUpId, requestedCartId = null) {
    const { data: session, status } = useSession();
    const [result, setResult] = useState({ phase: 'checking', courses: [], receipts: [] });
    const jwt = session?.user?.jwt;
    const userId = session?.user?.id;
    const hydratedUserId = useCartStore(state => state.hydratedUserId);
    const cartId = requestedCartId;
    useEffect(() => {
        if (!courseId && !topUpId && !cartId) return;
        if (!jwt) {
            if (status !== 'loading') setResult({ phase: 'unknown', courses: [], receipts: [] });
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
                let courses = resolvedCartId || topUpId ? data.courses : [{ externalCourseId: courseId, purchaseStatus: data.purchaseStatus }];
                // سابقهٔ تحویل مالی، دسترسی فعلی پس از حذف دستی در استرپی را ثابت نمی‌کند.
                if (courses.some(course => course.purchaseStatus === 'Completed')) {
                    const access = await getCurrentCourseAccess(userId, controller.signal);
                    if (controller.signal.aborted) {
                        return;
                    }
                    courses = courses.map(course => course.purchaseStatus === 'Completed' && !access.has(course.externalCourseId)
                        ? { ...course, purchaseStatus: 'AccessMissing' }
                        : course);
                }
                knownCourses = courses;
                const paid = resolvedCartId ? data.status === 'Paid' || data.topUpStatus === 'Confirmed' : topUpId ? data.topUpStatus === 'Confirmed' : courses.some(c => ['Completed', 'AccessMissing', 'Activating', 'DeliveryPending'].includes(c.purchaseStatus));
                const phase = resolvedCartId && data.status !== 'Paid' && data.topUpStatus === 'Unresolved' ? 'unknown'
                    : resolvedCartId && data.status !== 'Paid' && data.topUpStatus === 'Pending' ? 'paymentPending'
                    : resolvedCartId && data.status !== 'Paid' && data.topUpStatus === 'Rejected' ? 'paymentFailed'
                    : resolvedCartId && ['Failed', 'Expired'].includes(data.status) ? (data.topUpStatus === 'Confirmed' ? 'incomplete' : 'paymentFailed')
                    : topUpId && data.topUpStatus === 'Rejected' ? 'paymentFailed'
                    : courses.length === 0 ? (paid ? 'standalone' : 'paymentPending')
                    : courses.some(c => c.purchaseStatus === 'AccessMissing') ? 'accessMissing'
                    : courses.every(c => c.purchaseStatus === 'Completed') ? 'completed'
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

                next = { phase, courses, paid, receipts: knownReceipts };
                // فقط قلمی حذف می‌شود که ثبت مالی آن در سرور تأیید شده است.
                for (const course of courses.filter(c => userId && String(hydratedUserId) === String(userId) && ['Completed', 'Activating', 'DeliveryPending'].includes(c.purchaseStatus))) {
                    const matching = useCartStore.getState().items.filter(item => item.type === 'course' &&
                        (item.documentId || item.externalCourseId) === course.externalCourseId);
                    matching.forEach(item => useCartStore.getState().removeItem(item.id));
                }
                if (phase === 'completed') {
                    triggerLightUpdate();
                    invalidateProfileCache();
                }
            } catch {
                if (controller.signal.aborted) return;
                next = { phase: 'unknown', courses: knownCourses, receipts: knownReceipts };
            }
            checks += 1;
            const keepChecking = !['completed', 'standalone', 'paymentFailed', 'accessMissing'].includes(next.phase) && checks < 15;
            setResult(next);
            if (keepChecking) timer = setTimeout(check, 2000);
        };
        check();
        return () => { controller.abort(); clearTimeout(timer); };
    }, [courseId, topUpId, cartId, jwt, status, userId, hydratedUserId]);
    return result;
}
