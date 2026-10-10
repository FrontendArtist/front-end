import { PAYMENT_METHOD, PAYMENT_STATUS } from '@/lib/constants/orderConstants';

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

    const isFreeOrder = finalTotalPrice === 0;

    // بررسی اتصال فیلترشکن (VPN) قبل از ورود به درگاه شاپرک
    // درگاه‌های بانکی شاپرک آی‌پی‌های خارجی و VPN را مسدود می‌کنند
    if (!isFreeOrder) {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 800); // کاهش timeout به ۸۰۰ms
            const vpnCheckRes = await fetch('/api/check-vpn', { cache: 'no-store', signal: controller.signal });
            clearTimeout(timeoutId);
            if (vpnCheckRes.ok) {
                const vpnData = await vpnCheckRes.json();
                if (vpnData?.success && vpnData?.isVpn) {
                    throw new Error('فیلترشکن (VPN) شما روشن است! درگاه‌های پرداخت اینترنتی شاپرک دسترسی با فیلترشکن را مسدود می‌کنند. لطفاً ابتدا فیلترشکن خود را خاموش کرده و سپس دکمه پرداخت را بزنید.');
                }
            }
        } catch (vpnErr) {
            if (vpnErr.message?.includes('فیلترشکن')) {
                throw vpnErr;
            }
            // timeout یا هر خطای دیگری: بی‌سروصدا رد می‌شود و پرداخت ادامه می‌یابد
        }
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
    const form = document.createElement('form');
    form.method = 'POST';
    form.action = tokenData.gatewayUrl || 'https://sep.shaparak.ir/OnlinePG/OnlinePG';
    form.style.display = 'none';

    const tokenInput = document.createElement('input');
    tokenInput.type = 'hidden';
    tokenInput.name = 'Token';
    tokenInput.value = tokenData.token;
    form.appendChild(tokenInput);

    const getMethodInput = document.createElement('input');
    getMethodInput.type = 'hidden';
    getMethodInput.name = 'GetMethod';
    getMethodInput.value = '';
    form.appendChild(getMethodInput);

    document.body.appendChild(form);
    form.submit();

    return { success: true, isFree: false };
}
