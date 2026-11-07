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
