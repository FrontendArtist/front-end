import { purchaseCourseCart } from '@/lib/courseCartApi';
import { ensurePaymentConnection } from '@/lib/client/paymentConnection';
import { purchaseCourseWithByeMoney } from '@/lib/byeMoneyApi';
import { useCartStore } from '@/store/useCartStore';
import { triggerLightUpdate } from '@/store/useLightStore';
import { invalidateProfileCache } from '@/lib/client/profileClientApi';
import { getSession } from 'next-auth/react';
import { isCoursePurchasedByUser, isCartItemPurchasedByUser } from '@/lib/courseAccessUtils';

/**
 * خرید یک دوره با کیف نور یا شارژ کسری و ادامه خودکار خرید در سرور
 *
 * طبق سناریوی برش اول TASKS/R01 و الزامات I01 و I08:
 * - مستقیماً POST /api/courses/purchase در بایمانی را صدا می‌زند
 * - هیچ سفارش معلق (pending) در Strapi ایجاد نمی‌کند
 * - در صورت کسری، بدون گام اضافه به درگاه شارژ می‌رود؛ سبد تا ثبت خرید حفظ می‌شود
 * - پس از ثبت مالی، دوره را از سبد حذف و موجودی و دسترسی‌ها را تازه می‌کند
 *
 * @param {Object} params
 * @param {Array} params.items - اقلام سبد خرید (شامل یک دوره)
 * @param {string} [params.jwt] - توکن نشست کاربری (اختیاری؛ در صورت نبود از سشن خوانده می‌شود)
 * @param {boolean} [params.payOnline] - در صورت کسری معلوم، مستقیم به مسیر پرداخت آنلاین برود
 * @param {Object} [params.router] - شیء router از Next.js برای هدایت به نتیجه
 * @param {Object} [params.session] - شیء session کاربر برای گیت بررسی مالکیت قبلی
 * @param {Array} [params.orders] - سفارشات کاربر برای گیت بررسی مالکیت قبلی
 * @returns {Promise<{success: boolean, data?: Object}>}
 */
export async function executeNoorCoursePurchase({
    items,
    jwt = null,
    router = null,
    payOnline = false,
    session = null,
    orders = null,
}) {
    if (!items || items.length === 0) {
        throw new Error('سبد خرید شما خالی است.');
    }

    if (items.length !== 1 || items[0].type !== 'course') {
        throw new Error('پرداخت با نور در این مرحله فقط برای خرید یک دوره کامل فعال است.');
    }

    const courseItem = items[0];
    const externalCourseId = courseItem.documentId || courseItem.externalCourseId;

    if (!externalCourseId) {
        throw new Error('شناسه دوره معتبر نیست.');
    }

    // گیت کنترلی پیش از پرداخت: در صورت احراز مالکیت قبلی دوره توسط کاربر، مانع ارسال درخواست شویم
    if (session || orders) {
        if (isCoursePurchasedByUser(courseItem, { session, orders })) {
            const err = new Error('شما قبلاً این دوره آموزشی را خریداری کرده‌اید.');
            err.conflict = true;
            err.alreadyOwned = true;
            throw err;
        }
    }

    let token = jwt;
    if (!token) {
        const currentSession = session || await getSession();
        token = currentSession?.user?.jwt;
    }

    if (!token) {
        throw new Error('نشست کاربری شما نامعتبر است. لطفاً مجدداً وارد حساب کاربری خود شوید.');
    }

    let purchaseResult = payOnline ? null : await purchaseCourseWithByeMoney({
        externalCourseIds: [externalCourseId],
        jwt: token,
    });

    if (payOnline || (!purchaseResult.success && purchaseResult.insufficientBalance)) {
        await ensurePaymentConnection();
        const response = await fetch('/api/payment/request', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ paymentType: 'course_purchase', externalCourseId }),
        });
        const payment = await response.json().catch(() => ({}));
        if (!response.ok || !payment.success) {
            throw new Error(payment.message || payment.error || 'شروع پرداخت آنلاین ممکن نیست. لطفاً دوباره تلاش کنید.');
        }
        if (payment.paidWithWallet) {
            purchaseResult = payment;
        } else {
            if (!payment.token) throw new Error('توکن پرداخت دریافت نشد.');
            submitGatewayPayment(payment);
            return { success: true, awaitingPayment: true };
        }
    }

    if (!purchaseResult.success) {
        const error = new Error(purchaseResult.error || 'خطا در خرید دوره با نور');
        if (purchaseResult.insufficientBalance) error.insufficientBalance = true;
        if (purchaseResult.conflict) {
            error.conflict = true;
            error.alreadyOwned = true;
        }
        if (purchaseResult.unauthorized) error.unauthorized = true;
        if (purchaseResult.notFound) error.notFound = true;
        throw error;
    }

    // فقط دوره خریداری‌شده حذف شود؛ اقلامی که در این فاصله اضافه شده‌اند حفظ شوند.
    useCartStore.getState().removeItem(courseItem.id, courseItem.type);

    // ۲. به‌روزرسانی موجودی نور
    triggerLightUpdate();

    // ۳. ابطال کش پروفایل جهت بازخوانی دسترسی‌های جدید دوره
    invalidateProfileCache();

    // ۴. هدایت به صفحه نتیجه در صورت وجود router
    const refNum = purchaseResult.data?.transactionId || purchaseResult.data?.purchaseId || '';
    const redirectUrl = `/checkout/result?status=success&source=noor&courseId=${encodeURIComponent(externalCourseId)}${refNum ? `&refNum=${encodeURIComponent(refNum)}` : ''}`;

    if (router?.push) {
        router.push(redirectUrl);
    } else if (typeof window !== 'undefined' && process.env.NODE_ENV !== 'test') {
        window.location.href = redirectUrl;
    }

    return {
        success: true,
        data: purchaseResult.data,
    };
}

function submitGatewayPayment(payment) {
    const form = document.createElement('form');
    form.method = 'POST';
    form.action = payment.gatewayUrl || 'https://sep.shaparak.ir/OnlinePG/OnlinePG';
    form.style.display = 'none';
    for (const [name, value] of [['Token', payment.token], ['GetMethod', '']]) {
        const input = document.createElement('input');
        input.type = 'hidden';
        input.name = name;
        input.value = value;
        form.appendChild(input);
    }
    document.body.appendChild(form);
    form.submit();
}

/** خرید سبد با قیمت تثبیت‌شده؛ ادامه پس از شارژ بر عهده سرور است. */
export async function executeNoorCartPurchase({ cartId, jwt, router, payOnline = false, items = null, session = null, orders = null }) {
    if (!cartId || !jwt) throw new Error('نشست یا شناسه سبد معتبر نیست.');

    // گیت کنترلی پیش از پرداخت سبد در صورت ارائه اقلام و سشن
    if (Array.isArray(items) && (session || orders)) {
        const ownedItem = items.find(item => isCartItemPurchasedByUser(item, { session, orders }));
        if (ownedItem) {
            const error = new Error(`دورهٔ «${ownedItem.title || 'انتخاب‌شده'}» قبلاً توسط شما خریداری شده است.`);
            error.conflict = true;
            error.code = 'CART_UNAVAILABLE';
            throw error;
        }
    }

    let data;
    if (payOnline) {
        await ensurePaymentConnection();
        const response = await fetch('/api/payment/request', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ paymentType: 'course_cart', cartId }),
        });
        const payment = await response.json().catch(() => ({}));
        if (!response.ok || !payment.success) throw new Error(payment.message || payment.error || 'شروع پرداخت ممکن نیست.');
        if (!payment.paidWithWallet && !payment.alreadyProcessing) {
            if (!payment.token || !payment.topUpRequestId) throw new Error('پاسخ پرداخت معتبر نیست.');
            submitGatewayPayment(payment);
            return { success: true, awaitingPayment: true };
        }
        data = payment.data;
    } else {
        try {
            data = await purchaseCourseCart(cartId, jwt);
        } catch (error) {
            if (error.code === 'CART_INSUFFICIENT_BALANCE') {
                return executeNoorCartPurchase({ cartId, jwt, router, payOnline: true, items, session, orders });
            }
            throw error;
        }
    }
    // فقط اقلام خرید تکمیل‌شده از سبد حذف شوند و اقلام تازه‌اضافه‌شده حفظ گردند.
    if (Array.isArray(data?.items)) {
        const completedCourseIds = new Set(
            data.items
                .filter(c => ['Completed', 'Activating', 'DeliveryPending'].includes(c.purchaseStatus))
                .map(c => c.externalItemId)
        );
        if (completedCourseIds.size > 0) {
            const currentItems = useCartStore.getState().items;
            for (const item of currentItems) {
                const itemExternalId = item.type === 'chapter'
                    ? (item.integrationId || item.externalCourseId)
                    : (item.documentId || item.externalCourseId);
                if (itemExternalId && completedCourseIds.has(itemExternalId)) {
                    useCartStore.getState().removeItem(item.id, item.type);
                }
            }
        }
    }
    triggerLightUpdate();
    invalidateProfileCache();
    const target = '/checkout/result?source=noor&cartId=' + encodeURIComponent(cartId);
    if (router?.push) router.push(target);
    else if (typeof window !== 'undefined' && process.env.NODE_ENV !== 'test') window.location.href = target;
    return { success: true, data };
}
