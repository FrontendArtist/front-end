import { purchaseCourseCart } from '@/lib/courseCartApi';
import { PAYMENT_METHOD, PAYMENT_STATUS } from '@/lib/constants/orderConstants';
import { ensurePaymentConnection } from '@/lib/client/paymentConnection';
import { purchaseCourseWithByeMoney } from '@/lib/byeMoneyApi';
import { useCartStore } from '@/store/useCartStore';
import { triggerLightUpdate } from '@/store/useLightStore';
import { invalidateProfileCache } from '@/lib/client/profileClientApi';
import { getSession } from 'next-auth/react';

/**
 * سرویس متمرکز پرداخت آنلاین
 * ایجاد سفارش، دریافت توکن از درگاه شاپرک (بانک سامان) و انتقال خودکار به درگاه پرداخت
 * در صورت مبلغ صفر (سفارش رایگان)، هدایت به صفحه نتیجه موفق
 *
 * @param {Object} params
 * @param {Array} params.items - اقلام سبد خرید
 * @param {number} params.finalTotalPrice - مبلغ نهایی قابل پرداخت
 * @param {Object|null} params.appliedCoupon - اطلاعات کوپن تخفیف اعمال‌شده
 * @param {number} params.couponDiscount - مبلغ تخفیف کوپن
 * @param {string|null} params.shippingAddress - آدرس کامل پستی در صورت وجود محصول فیزیکی
 * @param {Object} [params.router] - شیء router از Next.js برای ریدایرکت‌های کلاینتی
 * @returns {Promise<{success: boolean, isFree?: boolean}>}
 */
export async function executeOnlinePayment({
    items,
    finalTotalPrice,
    appliedCoupon = null,
    couponDiscount = 0,
    shippingAddress = null,
    router = null,
}) {
    if (!items || items.length === 0) {
        throw new Error('سبد خرید شما خالی است.');
    }

    if (appliedCoupon?.pending) {
        throw new Error('بررسی کد تخفیف برای سبد فعلی هنوز تمام نشده است.');
    }

    const isFreeOrder = finalTotalPrice === 0;
    let checkedBeforeOrder = false;

    // بررسی اتصال فیلترشکن (VPN) قبل از ورود به درگاه شاپرک
    // درگاه‌های بانکی شاپرک آی‌پی‌های خارجی و VPN را مسدود می‌کنند
    if (!isFreeOrder) {
        await ensurePaymentConnection();
        checkedBeforeOrder = true;
    }

    const paymentMethodToSend = isFreeOrder ? PAYMENT_METHOD.FREE : PAYMENT_METHOD.ONLINE;
    const initialPaymentStatus = PAYMENT_STATUS.PENDING_PAYMENT;

    // ۱. ثبت سفارش در سرور
    const response = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            cartItems: items,
            totalPrice: finalTotalPrice,
            shippingAddress: shippingAddress,
            couponCode: appliedCoupon?.code || null,
            couponDiscount: couponDiscount,
            paymentMethod: paymentMethodToSend,
            paymentStatus: initialPaymentStatus,
        }),
    });

    if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.message || 'خطا در ثبت سفارش');
    }

    const newOrder = await response.json();

    // ۲. در صورت صفر بودن مبلغ (دوره رایگان یا کوپن ۱۰۰٪)
    const order = newOrder?.data?.attributes || newOrder?.data;
    const isServerFreeOrder = order?.paymentMethod === PAYMENT_METHOD.FREE &&
        order?.paymentStatus === PAYMENT_STATUS.PAID && Number(order?.totalPrice) === 0;
    if (isServerFreeOrder) {
        if (router) {
            router.push(`/checkout/result?status=success&source=free&orderId=${encodeURIComponent(newOrder?.data?.documentId || '')}`);
        } else {
            window.location.href = `/checkout/result?status=success&source=free&orderId=${encodeURIComponent(newOrder?.data?.documentId || '')}`;
        }
        return { success: true, isFree: true };
    }

    // ۳. دریافت شناسه سفارش ثبت‌شده
    const documentId = newOrder?.data?.documentId;
    if (!documentId) {
        throw new Error('شناسه سفارش ایجادشده یافت نشد.');
    }

    // ۴. دریافت توکن پرداخت اینترنتی از درگاه سامان
    // مبلغ نهایی سرور ممکن است با نمایش قدیمیِ صفر در مرورگر متفاوت باشد.
    if (!checkedBeforeOrder && Number(order?.totalPrice) > 0) {
        await ensurePaymentConnection();
    }
    const tokenResponse = await fetch('/api/payment/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId: documentId }),
    });

    const tokenData = await tokenResponse.json();

    if (!tokenResponse.ok || !tokenData.success || !tokenData.token) {
        throw new Error(tokenData.message || 'خطا در دریافت توکن پرداخت از درگاه سامان');
    }

    // ۵. ایجاد فرم داینامیک و ارسال خودکار به درگاه شاپرک
    submitGatewayPayment(tokenData);

    return { success: true, isFree: false };
}

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
 * @returns {Promise<{success: boolean, data?: Object}>}
 */
export async function executeNoorCoursePurchase({
    items,
    jwt = null,
    router = null,
    payOnline = false,
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

    let token = jwt;
    if (!token) {
        const session = await getSession();
        token = session?.user?.jwt;
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
        if (purchaseResult.conflict) error.conflict = true;
        if (purchaseResult.unauthorized) error.unauthorized = true;
        if (purchaseResult.notFound) error.notFound = true;
        throw error;
    }

    // فقط دوره خریداری‌شده حذف شود؛ اقلامی که در این فاصله اضافه شده‌اند حفظ شوند.
    useCartStore.getState().removeItem(courseItem.id);

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
export async function executeNoorCartPurchase({ cartId, jwt, router, payOnline = false }) {
    if (!cartId || !jwt) throw new Error('نشست یا شناسه سبد معتبر نیست.');
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
                return executeNoorCartPurchase({ cartId, jwt, router, payOnline: true });
            }
            throw error;
        }
    }
    // فقط اقلام خرید تکمیل‌شده از سبد حذف شوند و اقلام تازه‌اضافه‌شده حفظ گردند.
    if (data?.courses && Array.isArray(data.courses)) {
        const completedCourseIds = new Set(
            data.courses
                .filter(c => ['Completed', 'Activating', 'DeliveryPending'].includes(c.purchaseStatus))
                .map(c => c.externalCourseId)
        );
        if (completedCourseIds.size > 0) {
            const currentItems = useCartStore.getState().items;
            for (const item of currentItems) {
                if (item.type === 'course' && completedCourseIds.has(item.documentId || item.externalCourseId)) {
                    useCartStore.getState().removeItem(item.id);
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
