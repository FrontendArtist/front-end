/**
 * مدل نمایشی صفحهٔ جزئیات سفارش بای‌مانی (FE-ORDER-01).
 * فقط وضعیت و متن را از پاسخ بای‌مانی استخراج می‌کند؛ هیچ مبلغ مالی جدیدی محاسبه نمی‌شود.
 */

const isProduct = (i) => i?.type === 'product' || String(i?.itemType || '').toLowerCase() === 'product';

/** پیام واحد ۴۰۹ تأیید دریافت برای مرسولهٔ برگشتی. */
export const CARRIER_RETURN_CONFIRM_BLOCKED_MESSAGE =
    'این مرسوله برگشته و تأیید دریافت برایش ثبت نمی‌شود.';

/** وضعیت برگشتی یک قلم کالای فیزیکی: PendingReview | ClosedWithoutSettlement | DeliveryConfirmed | None. */
export function getItemCarrierReturnStatus(item) {
    if (!isProduct(item) || !item?.carrierReturnedAtUtc) return 'None';
    if (!item.carrierReturnResolution) return 'PendingReview';
    if (item.carrierReturnResolution === 'ClosedWithoutSettlement') return 'ClosedWithoutSettlement';
    if (item.carrierReturnResolution === 'DeliveryConfirmed') return 'DeliveryConfirmed';
    return 'None';
}

/** وضعیت تجمیعی برگشتی سفارش، هم‌معنای OrderCarrierReturnStatus بای‌مانی. */
export function getOrderCarrierReturnStatus(items) {
    const returned = (Array.isArray(items) ? items : []).filter(
        (item) => isProduct(item) && Boolean(item?.carrierReturnedAtUtc)
    );
    if (returned.length === 0) return 'None';
    if (returned.some((item) => !item.carrierReturnResolution)) return 'PendingReview';
    if (returned.some((item) => item.carrierReturnResolution === 'ClosedWithoutSettlement')) {
        return 'ClosedWithoutSettlement';
    }
    if (returned.every((item) => item.carrierReturnResolution === 'DeliveryConfirmed')) {
        return 'DeliveryConfirmed';
    }
    return 'None';
}

/** قلم برگشتی که تأیید دریافت خریدار برایش ثبت نمی‌شود (حل‌نشده یا بسته‌شده بدون تسویه). */
export function carrierReturnBlocksConfirmation(item) {
    return Boolean(item?.carrierReturnedAtUtc) && item.carrierReturnResolution !== 'DeliveryConfirmed';
}

/** لینک رهگیری فقط از trackingUrl مطلق https و منبعی غیر از Manual ساخته می‌شود. */
export function getTrackingHref(item) {
    if (String(item?.trackingProvider || '').toLowerCase() === 'manual') return null;
    const url = String(item?.trackingUrl || '').trim();
    return /^https:\/\/[^\s]+$/i.test(url) ? url : null;
}
export const isPhysicalItemFullyCancelled = (item) =>
    Number(item?.cancelledQuantity || 0) >= Number(item?.quantity || 1);

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
    const activeItems = physicalItems.filter((i) => !isPhysicalItemFullyCancelled(i));
    if (activeItems.length === 0) return 'cancelled';
    const st = activeItems.map((i) => i.physicalDeliveryStatus);
    if (st.every((s) => s === 'Delivered')) return 'delivered';
    if (st.some((s) => s === 'Shipped' || s === 'Delivered')) return 'shipped';
    return 'preparing';
}

const PHYSICAL_STEPS = ['پرداخت', 'آماده‌سازی', 'ارسال', 'تحویل'];
const PHYSICAL_STEP_INDEX = { preparing: 1, shipped: 2, delivered: 3 };

/** مراحل نوار پیشرفت کالا؛ done = انجام‌شده، current = مرحلهٔ فعلی، warning/stopped برای برگشتی. */
export function getPhysicalSteps(state, carrierReturnStatus = 'None') {
    const current = PHYSICAL_STEP_INDEX[state];
    if (current == null) return null;
    const isReturnPending = state === 'shipped' && carrierReturnStatus === 'PendingReview';
    const isReturnClosed = state === 'shipped' && carrierReturnStatus === 'ClosedWithoutSettlement';

    return PHYSICAL_STEPS.map((label, idx) => {
        if (idx === 2 && isReturnPending) {
            return { label: 'برگشت از پست', done: false, current: false, warning: true, stopped: false };
        }
        if (idx === 2 && isReturnClosed) {
            return { label: 'تحویل ناموفق', done: false, current: false, warning: false, stopped: true };
        }
        return {
            label,
            done: idx < current || state === 'delivered',
            current: idx === current && state !== 'delivered' && !isReturnPending && !isReturnClosed,
            warning: false,
            stopped: false,
        };
    });
}

const TOPUP_STATUS_META = {
    Confirmed: { label: 'شارژ تأیید شد', tone: 'success' },
    Rejected: { label: 'شارژ رد شد', tone: 'danger' },
    Pending: { label: 'در انتظار تأیید', tone: 'warning' },
    UnderReview: { label: 'در حال بررسی مالی', tone: 'warning' },
    Unresolved: { label: 'نامشخص (نیازمند پیگیری)', tone: 'danger' },
    ManuallyRefunded: { label: 'استرداد دستی انجام شد', tone: 'info' },
};

/** برچسب و رنگ فارسی وضعیت تلاش شارژ (TopUpStatus). */
export function getTopUpStatusMeta(status) {
    return TOPUP_STATUS_META[status] || { label: status || 'نامشخص', tone: 'default' };
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
        || (physicalItems.length > 0 && physicalItems.every(isPhysicalItemFullyCancelled));
    const physicalState = getPhysicalState(physicalItems, physicalCancelled);
    const carrierReturnStatus = getOrderCarrierReturnStatus(physicalItems);
    const activePhysicalItems = physicalItems.filter((i) => !isPhysicalItemFullyCancelled(i));
    const activeReturnStatuses = new Set(activePhysicalItems.map(getItemCarrierReturnStatus));
    const hasMixedReturnStates = activePhysicalItems.length > 1 && activeReturnStatuses.size > 1;
    const status = order?.financialStatus;
    const isPaid = status === 'Paid';
    const wholeOrderCancelled = isPaid && physicalCancelled && courseItems.length === 0;

    const expiry = formatOrderDate(order?.expiresAtUtc);
    const base = {
        isPaid,
        physicalItems,
        courseItems,
        physicalCancelled,
        physicalState,
        carrierReturnStatus,
        hasMixedReturnStates,
        hasProduct: physicalItems.length > 0,
        hasCourse: courseItems.length > 0,
    };

    if (wholeOrderCancelled) {
        return { ...base, tone: 'warning', title: 'سفارش لغو شد', hint: 'بخش کالای سفارش لغو شده و مبلغ آن برگشت داده شده است.', amountLabel: 'مبلغ پرداخت‌شده', unpaid: false };
    }

    switch (status) {
        case 'Paid': {
            let returnBadge = null;
            let hint = physicalCancelled ? 'بخش کالای سفارش لغو شده است.' : 'پرداخت با موفقیت انجام شد.';
            if (!physicalCancelled && carrierReturnStatus === 'PendingReview') {
                returnBadge = { label: 'برگشت‌خورده', tone: 'warning' };
                hint = hasMixedReturnStates
                    ? 'بخشی از مرسوله‌های این سفارش از سوی پست برگشت اعلام شده و در حال بررسی است.'
                    : 'مرسوله از سوی پست برگشت اعلام شده و در حال بررسی است.';
            } else if (!physicalCancelled && carrierReturnStatus === 'ClosedWithoutSettlement') {
                returnBadge = { label: 'تحویل ناموفق', tone: 'danger' };
                hint = hasMixedReturnStates
                    ? 'پروندهٔ بخشی از مرسوله‌های برگشتی این سفارش بدون تحویل بسته شده است.'
                    : 'پروندهٔ مرسولهٔ برگشتی بدون تحویل بسته شده است.';
            }
            return {
                ...base, tone: 'success', title: 'پرداخت شد',
                returnBadge,
                hint,
                amountLabel: 'مبلغ پرداخت‌شده', unpaid: false,
            };
        }
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

    const finalAmount = order?.totalPrice ?? summary?.finalAmountInNoor;
    if (
        rows.length === 1
        && rows[0].key === 'subtotal'
        && finalAmount != null
        && Number(original) === Number(finalAmount)
    ) {
        return [];
    }
    return rows;
}

function findRelevantConfirmedTopUp(order, predicate) {
    const topUps = Array.isArray(order?.topUps) ? order.topUps : [];
    const confirmed = topUps.filter((t) => t?.status === 'Confirmed' && predicate(t));
    if (confirmed.length === 0) return null;
    if (order?.currentTopUpRequestId) {
        const currentId = String(order.currentTopUpRequestId).toLowerCase();
        const matched = confirmed.find((t) => String(t.topUpRequestId || '').toLowerCase() === currentId);
        if (matched) return matched;
    }
    return confirmed[confirmed.length - 1];
}

/** کد پیگیری پرداخت از شارژ تأییدشده (در صورت وجود). */
export function getPaymentRefCode(order) {
    const confirmed = findRelevantConfirmedTopUp(order, (t) => Boolean(t.clientReferenceCode));
    return confirmed?.clientReferenceCode || order?.clientReferenceCode || null;
}

/** زمان پرداخت: تأیید شارژ یا خرید اولین قلم؛ فقط اگر از تاریخ ثبت متفاوت باشد. */
export function getPaidAt(order) {
    const confirmed = findRelevantConfirmedTopUp(order, (t) => Boolean(t.confirmedAtUtc));
    const itemTime = (order?.items || []).map((i) => i.purchasedAtUtc).find(Boolean);
    const raw = confirmed?.confirmedAtUtc || itemTime || null;
    const formatted = formatOrderDate(raw);
    return formatted && formatted !== formatOrderDate(order?.createdAt) ? formatted : null;
}
