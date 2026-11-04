/**
 * مدل نمایشی صفحهٔ جزئیات سفارش بای‌مانی (FE-ORDER-01).
 * فقط وضعیت و متن را از پاسخ بای‌مانی استخراج می‌کند؛ هیچ مبلغ مالی جدیدی محاسبه نمی‌شود.
 */

const isProduct = (i) => i?.type === 'product' || String(i?.itemType || '').toLowerCase() === 'product';

export const formatNoor = (value) => `${Number(value || 0).toLocaleString('fa-IR')} نور`;

export const formatOrderDate = (value) => {
    if (!value) return null;
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return null;
    return new Intl.DateTimeFormat('fa-IR', {
        year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit',
    }).format(date);
};

/** شمارهٔ کوتاه سفارش برای نمایش (۸ نویسهٔ اول شناسه) و شناسهٔ کامل برای کپی. */
export function getOrderNumber(order) {
    const full = String(order?.cartId || order?.orderId || order?.documentId || '').replace(/^[a-z]+:/i, '');
    return { short: (order?.orderNumber || full.slice(0, 8)).toUpperCase(), full };
}

/** وضعیت واحد بخش کالا: cancelled | delivered | shipped | preparing | null (بدون کالا). */
export function getPhysicalState(physicalItems, cancelled) {
    if (physicalItems.length === 0) return null;
    if (cancelled) return 'cancelled';
    const st = physicalItems.map((i) => i.physicalDeliveryStatus);
    if (st.every((s) => s === 'Delivered')) return 'delivered';
    if (st.some((s) => s === 'Shipped' || s === 'Delivered')) return 'shipped';
    return 'preparing';
}

const PHYSICAL_STEPS = ['پرداخت', 'آماده‌سازی', 'ارسال', 'تحویل'];
const PHYSICAL_STEP_INDEX = { preparing: 1, shipped: 2, delivered: 3 };

/** مراحل نوار پیشرفت کالا؛ done = انجام‌شده، current = مرحلهٔ فعلی. */
export function getPhysicalSteps(state) {
    const current = PHYSICAL_STEP_INDEX[state];
    if (current == null) return null;
    return PHYSICAL_STEPS.map((label, idx) => ({
        label,
        done: idx < current || state === 'delivered',
        current: idx === current && state !== 'delivered',
    }));
}

/**
 * @param {object} order سفارش نگاشت‌شدهٔ /api/orders
 * @param {{ cancelledNow?: boolean }} opts نتیجهٔ لغوی که در همین نشست انجام شده
 */
export function getByeMoneyOrderView(order, { cancelledNow = false } = {}) {
    const items = Array.isArray(order?.items) ? order.items : [];
    const physicalItems = items.filter(isProduct);
    const courseItems = items.filter((i) => !isProduct(i));
    const physicalCancelled = cancelledNow
        || (physicalItems.length > 0 && physicalItems.every((i) => Number(i.cancelledQuantity) >= Number(i.quantity || 1)));
    const physicalState = getPhysicalState(physicalItems, physicalCancelled);
    const status = order?.financialStatus;
    const isPaid = status === 'Paid';
    const wholeOrderCancelled = isPaid && physicalCancelled && courseItems.length === 0;

    const expiry = formatOrderDate(order?.expiresAtUtc);
    const base = { isPaid, physicalItems, courseItems, physicalCancelled, physicalState, hasProduct: physicalItems.length > 0, hasCourse: courseItems.length > 0 };

    if (wholeOrderCancelled) {
        return { ...base, tone: 'warning', title: 'سفارش لغو شد', hint: 'بخش کالای سفارش لغو شده و مبلغ آن برگشت داده شده است.', amountLabel: 'مبلغ پرداخت‌شده', unpaid: false };
    }

    switch (status) {
        case 'Paid':
            return {
                ...base, tone: 'success', title: 'پرداخت شد',
                hint: physicalCancelled ? 'بخش کالای سفارش لغو شده است.' : 'پرداخت با موفقیت انجام شد.',
                amountLabel: 'مبلغ پرداخت‌شده', unpaid: false,
            };
        case 'AwaitingPayment':
            return {
                ...base, tone: 'warning', title: 'در انتظار پرداخت',
                hint: expiry ? `هنوز پرداختی انجام نشده است. مهلت پرداخت تا ${expiry}.` : 'هنوز پرداختی انجام نشده است.',
                amountLabel: 'مبلغ قابل پرداخت', unpaid: true,
            };
        case 'Processing':
            return {
                ...base, tone: 'info', title: 'پرداخت در حال تأیید است',
                hint: 'چند دقیقهٔ دیگر صفحه را تازه کنید.',
                amountLabel: 'مبلغ در حال تأیید', unpaid: true, hideUnpaidNote: true,
            };
        case 'Failed':
            return {
                ...base, tone: 'danger', title: 'پرداخت انجام نشد',
                hint: 'اگر مبلغی کسر شده و دسترسی فعال نشده است، با ذکر شمارهٔ سفارش با پشتیبانی تماس بگیرید.',
                amountLabel: 'مبلغ سفارش', unpaid: true,
            };
        case 'Expired':
            return {
                ...base, tone: 'danger', title: 'سفارش منقضی شد',
                hint: 'مهلت پرداخت تمام شده است. برای خرید دوباره از سبد خرید اقدام کنید.',
                amountLabel: 'مبلغ سفارش', unpaid: true,
            };
        case 'RequiresReview':
            return {
                ...base, tone: 'warning', title: 'در حال بررسی مالی',
                hint: 'نیازی به پرداخت دوباره نیست؛ نتیجه پس از بررسی اعلام می‌شود. در صورت نیاز با شمارهٔ سفارش به پشتیبانی پیام دهید.',
                amountLabel: 'مبلغ در حال بررسی', unpaid: true, hideUnpaidNote: true,
            };
        default:
            return { ...base, tone: 'default', title: status || 'وضعیت نامشخص', hint: '', amountLabel: 'مبلغ سفارش', unpaid: !isPaid };
    }
}

/** ردیف‌های ریز مبلغ؛ مبلغ نهایی عمداً نیست چون در خلاصهٔ بالا می‌آید. */
export function getAmountRows(order) {
    const summary = order?.cartSummary;
    const rows = [];
    const original = summary?.originalTotalInNoor ?? order?.baseAmountInNoor;
    if (original != null) rows.push({ key: 'subtotal', label: 'جمع اقلام', value: formatNoor(original) });
    const discount = (Number(summary?.itemDiscountInNoor) || 0) + (Number(summary?.couponDiscountInNoor) || 0)
        || Number(order?.discountAmountInNoor) || 0;
    if (discount > 0) {
        rows.push({ key: 'discount', label: order?.couponCode ? `تخفیف (کد ${order.couponCode})` : 'تخفیف', value: `− ${formatNoor(discount)}` });
    }
    const shipping = Number(summary?.shippingAmountInNoor);
    const hasProduct = (order?.items || []).some(isProduct);
    if (shipping > 0) rows.push({ key: 'shipping', label: 'هزینهٔ ارسال', value: formatNoor(shipping) });
    else if (hasProduct && summary?.shippingAmountInNoor != null) rows.push({ key: 'shipping', label: 'هزینهٔ ارسال', value: 'رایگان' });
    return rows;
}

/** کد پیگیری پرداخت از شارژ تأییدشده (در صورت وجود). */
export function getPaymentRefCode(order) {
    const confirmed = Array.isArray(order?.topUps)
        ? order.topUps.find((t) => t.status === 'Confirmed' && t.clientReferenceCode)
        : null;
    return confirmed?.clientReferenceCode || order?.clientReferenceCode || null;
}

/** زمان پرداخت: تأیید شارژ یا خرید اولین قلم؛ فقط اگر از تاریخ ثبت متفاوت باشد. */
export function getPaidAt(order) {
    const confirmed = Array.isArray(order?.topUps) ? order.topUps.find((t) => t.status === 'Confirmed' && t.confirmedAtUtc) : null;
    const itemTime = (order?.items || []).map((i) => i.purchasedAtUtc).find(Boolean);
    const raw = confirmed?.confirmedAtUtc || itemTime || null;
    const formatted = formatOrderDate(raw);
    return formatted && formatted !== formatOrderDate(order?.createdAt) ? formatted : null;
}
