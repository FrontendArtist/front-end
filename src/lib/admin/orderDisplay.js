/**
 * @file src/lib/admin/orderDisplay.js
 * @description منطق خالص نمایش سفارش بای‌مانی در صفحهٔ «سفارش‌ها» و کشوی جزئیات (ADMIN-ORDERS-REDESIGN)
 *
 * وضعیت تحویل سطح سفارش (deliveryStatus) کالای «ارسال‌شده» را هم Pending می‌گیرد؛ برای همین برچسب
 * ردیف خنثی است («در جریان ارسال») و برچسب دقیق فقط از روی اقلام (در کشو) یا پرچم needsShipment
 * (تب «نیاز به اقدام») ساخته می‌شود.
 */

/** شمارهٔ کوتاه سفارش: ۸ نویسهٔ اول شناسه (همان شمارهٔ صفحهٔ تسویه و هشدار برگشت موجودی) */
export const shortOrderNumber = (orderId) => String(orderId || '').split(':').pop().slice(0, 8).toUpperCase();

const ROW_DELIVERY = {
    Pending: { label: 'در جریان ارسال', variant: 'info' },
    PartiallyDelivered: { label: 'تحویل ناقص', variant: 'info' },
    Delivered: { label: 'تحویل‌شده', variant: 'success' },
    Cancelled: { label: 'کالا لغو شده', variant: 'error' },
};

const CARRIER_RETURN_ROW_BADGES = {
    PendingReview: { text: 'برگشتی پستکس — در انتظار رسیدگی', variant: 'warning' },
    ClosedWithoutSettlement: { text: 'بسته‌شده بدون تسویه (برگشتی)', variant: 'default' },
    DeliveryConfirmed: { text: 'برگشتی پستکس — تحویل تأیید شد', variant: 'info' },
};

/** نشان ردیف فهرست ادمین؛ None و مقدار ناشناخته نشان نمی‌گیرند */
export function getCarrierReturnBadge(status) {
    return CARRIER_RETURN_ROW_BADGES[status] || null;
}

/**
 * وضعیت تجمیعی برگشتی سفارش، هم‌معنای OrderCarrierReturnStatus بای‌مانی.
 * PendingReview بر ClosedWithoutSettlement مقدم است.
 */
export function carrierReturnStatusOf(items) {
    const returned = (items || []).filter((item) => (
        String(item?.itemType || '').toLowerCase() === 'product' && item.carrierReturnedAtUtc
    ));
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

const CARRIER_ALERT_CODES = new Set([11304, 11305]);

export const CARRIER_ALERT_STATUS_LABELS = {
    PendingReview: 'در انتظار رسیدگی',
    DeliveryConfirmed: 'تحویل تأیید شد',
    ClosedWithoutSettlement: 'بدون تسویه بسته شد',
    None: 'بدون هشدار',
};

const CARRIER_ALERT_ROW_BADGES = {
    PendingReview: { text: 'هشدار مرسوله — در انتظار رسیدگی', variant: 'warning' },
    ClosedWithoutSettlement: { text: 'هشدار مرسوله — بسته‌شده بدون تسویه', variant: 'default' },
    DeliveryConfirmed: { text: 'هشدار مرسوله — تحویل تأیید شد', variant: 'info' },
};

/** نشان ردیف فهرست ادمین برای هشدار خسارت/مفقودی؛ None و مقدار ناشناخته نشان نمی‌گیرند */
export function getCarrierAlertBadge(status) {
    return CARRIER_ALERT_ROW_BADGES[status] || null;
}

/** قلم کالایی که هشدار خسارت/مفقودی دارد و هنوز تعیین‌تکلیف نشده است. */
export function hasPendingCarrierAlert(item) {
    const code = Number(item?.carrierAlertCode);
    if (!CARRIER_ALERT_CODES.has(code)) return false;
    return !item.carrierAlertResolution;
}

/** وضعیت تجمیعی هشدار مرسوله، هم‌معنای OrderCarrierAlertStatus بای‌مانی. */
export function carrierAlertStatusOf(items) {
    const alerts = (items || []).filter((item) => (
        String(item?.itemType || '').toLowerCase() === 'product' &&
        CARRIER_ALERT_CODES.has(Number(item?.carrierAlertCode))
    ));
    if (alerts.length === 0) return 'None';
    if (alerts.some((item) => !item.carrierAlertResolution)) return 'PendingReview';
    if (alerts.some((item) => item.carrierAlertResolution === 'ClosedWithoutSettlement')) {
        return 'ClosedWithoutSettlement';
    }
    if (alerts.every((item) => item.carrierAlertResolution === 'DeliveryConfirmed')) {
        return 'DeliveryConfirmed';
    }
    return 'None';
}

/** برچسب ارسال ردیف جدول؛ برای سفارش پرداخت‌نشده یا بدون کالا null */
export function getRowShippingBadge(row) {
    if (!row || row.financialStatus !== 'Paid') return null;
    if (row.physicalCancelled) return ROW_DELIVERY.Cancelled;
    if (row.needsShipment) return { label: 'منتظر ارسال', variant: 'warning' };
    return ROW_DELIVERY[row.deliveryStatus] || null;
}

/** وضعیت ارسال سفارش از روی اقلام کالا (فقط برای نمایش؛ مالک وضعیت بای‌مانی است) */
export function getItemsShippingState(items) {
    const products = (items || []).filter((i) => String(i?.itemType || '').toLowerCase() === 'product');
    const active = products.filter((i) => {
        const qty = Number(i.quantity) > 0 ? Number(i.quantity) : 1;
        return (Number(i.cancelledQuantity) || 0) < qty && i.physicalDeliveryStatus !== 'Cancelled';
    });
    if (products.length === 0) return null;
    if (active.length === 0) return { label: 'کالا لغو شده', variant: 'error' };
    const delivered = active.filter((i) => i.physicalDeliveryStatus === 'Delivered').length;
    const shipped = active.filter((i) => i.physicalDeliveryStatus === 'Shipped').length;
    if (delivered === active.length) return { label: 'تحویل‌شده', variant: 'success' };
    if (delivered + shipped === active.length) return { label: 'ارسال‌شده', variant: 'info' };
    if (delivered + shipped > 0) return { label: 'ارسال ناقص', variant: 'warning' };
    return { label: 'منتظر ارسال', variant: 'warning' };
}

export const faNumber = (n) => (n === null || n === undefined ? '—' : Number(n).toLocaleString('fa-IR'));

/** تاریخ کوتاه و ساعت جدا (به وقت تهران) */
export function splitDateTime(value) {
    if (!value) return null;
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return null;
    return {
        date: d.toLocaleDateString('fa-IR', { timeZone: 'Asia/Tehran', year: 'numeric', month: 'short', day: 'numeric' }),
        time: d.toLocaleTimeString('fa-IR', { timeZone: 'Asia/Tehran', hour: '2-digit', minute: '2-digit', hour12: false }),
    };
}
