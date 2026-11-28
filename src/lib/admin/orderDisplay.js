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
    Pending: {
        label: 'در جریان ارسال',
        tooltip: 'سفارش در مرحلهٔ آماده‌سازی یا ارسال است؛ وضعیت دقیق اقلام را در کشوی سفارش ببینید',
        variant: 'info',
    },
    PartiallyDelivered: {
        label: 'تحویل جزئی',
        tooltip: 'بخشی از اقلام سفارش تحویل مشتری شده است',
        variant: 'info',
    },
    Delivered: {
        label: 'تحویل‌شده',
        tooltip: 'همهٔ اقلام سفارش تحویل مشتری شده است',
        variant: 'success',
    },
    Cancelled: {
        label: 'کالا لغوشده',
        tooltip: 'همهٔ اقلام فیزیکی این سفارش لغو شده‌اند',
        variant: 'error',
    },
};

const CARRIER_RETURN_ROW_BADGES = {
    PendingReview: {
        label: 'برگشتی — نیاز به بررسی',
        tooltip: 'مرسوله توسط واسط پستی برگشت خورده و در انتظار رسیدگی ادمین است',
        variant: 'warning',
    },
    ClosedWithoutSettlement: {
        label: 'برگشتی — بدون تسویه',
        tooltip: 'پروندهٔ برگشتی واسط پستی بدون تسویه بسته شده است',
        variant: 'default',
    },
    DeliveryConfirmed: {
        label: 'برگشتی — تحویل تأیید شد',
        tooltip: 'با وجود گزارش برگشتی واسط پستی، تحویل مرسوله تأیید شده است',
        variant: 'default',
    },
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
    PendingReview: {
        label: 'هشدار پست — نیاز به بررسی',
        tooltip: 'هشدار خسارت یا مفقودی مرسوله ثبت شده و در انتظار رسیدگی ادمین است',
        variant: 'warning',
    },
    ClosedWithoutSettlement: {
        label: 'هشدار پست — بدون تسویه',
        tooltip: 'هشدار مرسوله بدون تسویه بسته شده است',
        variant: 'default',
    },
    DeliveryConfirmed: {
        label: 'هشدار پست — تحویل تأیید شد',
        tooltip: 'با وجود هشدار مرسوله، تحویل به مشتری تأیید شده است',
        variant: 'default',
    },
};

export const RESTOCK_BADGE_TOOLTIP = 'این سفارش لغو شده ولی موجودی کالا به انبار برنگشته؛ از تب اقلام و ارسال اصلاح کنید';

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

const CLOSED_PARCEL_REFUND_ROW_BADGES = {
    NotRefunded: {
        label: 'برگشت نور ثبت نشده',
        tooltip: 'مرسوله بدون تسویه بسته شده و برگشت دستی نور آن هنوز ثبت نشده است',
        variant: 'warning',
    },
    ManualReview: {
        label: 'برگشت نور — پیگیری دستی',
        tooltip: 'برگشت دستی نور این مرسوله از صفحهٔ سفارش قابل ثبت نیست و نیاز به پیگیری دستی دارد',
        variant: 'default',
    },
};

/** نشان ردیف فهرست ادمین برای برگشت دستی نور مرسولهٔ بسته‌شده؛ None و Refunded نشان نمی‌گیرند */
export function getClosedParcelRefundRowBadge(status) {
    return CLOSED_PARCEL_REFUND_ROW_BADGES[status] || null;
}

/** وضعیت تجمیعی برگشت دستی نور مرسولهٔ بسته‌شده؛ اولویت: NotRefunded > ManualReview > Refunded > None */
export function closedParcelRefundStatusOf(items) {
    const products = (items || []).filter((item) => String(item?.itemType || '').toLowerCase() === 'product');
    if (products.some((item) => item.closedParcelRefundStatus === 'NotRefunded')) return 'NotRefunded';
    if (products.some((item) => item.closedParcelRefundStatus === 'ManualReview')) return 'ManualReview';
    if (products.some((item) => item.closedParcelRefundStatus === 'Refunded')) return 'Refunded';
    return 'None';
}

/** برچسب ارسال ردیف جدول؛ برای سفارش پرداخت‌نشده یا بدون کالا null */
export function getRowShippingBadge(row) {
    if (!row || row.financialStatus !== 'Paid') return null;
    if (row.physicalCancelled) return ROW_DELIVERY.Cancelled;
    if (row.needsShipment) {
        return {
            label: 'منتظر ارسال',
            tooltip: 'حداقل یک کالای این سفارش هنوز ارسال نشده است',
            variant: 'warning',
        };
    }
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
    if (active.length === 0) {
        return {
            label: 'کالا لغوشده',
            tooltip: 'همهٔ اقلام فیزیکی این سفارش لغو شده‌اند',
            variant: 'error',
        };
    }
    const delivered = active.filter((i) => i.physicalDeliveryStatus === 'Delivered').length;
    const shipped = active.filter((i) => i.physicalDeliveryStatus === 'Shipped').length;
    if (delivered === active.length) {
        return {
            label: 'تحویل‌شده',
            tooltip: 'همهٔ اقلام فعال سفارش تحویل مشتری شده‌اند',
            variant: 'success',
        };
    }
    if (delivered + shipped === active.length) {
        return {
            label: 'ارسال‌شده',
            tooltip: 'همهٔ اقلام فعال سفارش ارسال شده‌اند',
            variant: 'info',
        };
    }
    if (delivered + shipped > 0) {
        return {
            label: 'ارسال جزئی',
            tooltip: 'بخشی از اقلام فعال سفارش ارسال شده و بخشی هنوز منتظر ارسال است',
            variant: 'warning',
        };
    }
    return {
        label: 'منتظر ارسال',
        tooltip: 'هنوز هیچ‌یک از اقلام فعال سفارش ارسال نشده است',
        variant: 'warning',
    };
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
