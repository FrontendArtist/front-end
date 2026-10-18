import { getCourseCart } from '@/lib/courseCartApi';
import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { getCourseCheckout, getTopUpCheckout } from '@/lib/courseCheckoutApi';
import { triggerLightUpdate } from '@/store/useLightStore';
import { invalidateProfileCache } from '@/lib/client/profileClientApi';
import { useCartStore } from '@/store/useCartStore';

export default function useCourseCheckoutResult(courseId, topUpId, requestedCartId = null) {
    const { data: session, status } = useSession();
    const [result, setResult] = useState({ phase: 'checking', courses: [] });
    const jwt = session?.user?.jwt;
    const userId = session?.user?.id;
    const hydratedUserId = useCartStore(state => state.hydratedUserId);
    const cartId = requestedCartId;
    useEffect(() => {
        if (!courseId && !topUpId && !cartId) return;
        if (!jwt) {
            if (status !== 'loading') setResult({ phase: 'unknown', courses: [] });
            return;
        }
        let timer;
        let checks = 0;
        let knownCourses = [];
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
                const courses = resolvedCartId || topUpId ? data.courses : [{ externalCourseId: courseId, purchaseStatus: data.purchaseStatus }];
                knownCourses = courses;
                const paid = resolvedCartId ? data.status === 'Paid' || data.topUpStatus === 'Confirmed' : topUpId ? data.topUpStatus === 'Confirmed' : courses.some(c => ['Completed', 'Activating', 'DeliveryPending'].includes(c.purchaseStatus));
                const phase = resolvedCartId && data.status !== 'Paid' && data.topUpStatus === 'Unresolved' ? 'unknown'
                    : resolvedCartId && data.status !== 'Paid' && data.topUpStatus === 'Pending' ? 'paymentPending'
                    : resolvedCartId && data.status !== 'Paid' && data.topUpStatus === 'Rejected' ? 'paymentFailed'
                    : resolvedCartId && ['Failed', 'Expired'].includes(data.status) ? (data.topUpStatus === 'Confirmed' ? 'incomplete' : 'paymentFailed')
                    : topUpId && data.topUpStatus === 'Rejected' ? 'paymentFailed'
                    : courses.length === 0 ? (paid ? 'standalone' : 'paymentPending')
                    : courses.every(c => c.purchaseStatus === 'Completed') ? 'completed'
                    : courses.some(c => ['Activating', 'DeliveryPending'].includes(c.purchaseStatus)) ? 'activating'
                    : paid ? 'incomplete' : 'paymentPending';
                next = { phase, courses, paid };
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
                next = { phase: 'unknown', courses: knownCourses };
            }
            checks += 1;
            const keepChecking = !['completed', 'standalone', 'paymentFailed'].includes(next.phase) && checks < 15;
            setResult({ ...next, phase: keepChecking && next.phase === 'incomplete' ? 'activating' : next.phase });
            if (keepChecking) timer = setTimeout(check, 2000);
        };
        check();
        return () => { controller.abort(); clearTimeout(timer); };
    }, [courseId, topUpId, cartId, jwt, status, userId, hydratedUserId]);
    return result;
}
