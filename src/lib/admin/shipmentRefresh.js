/**
 * نتیجهٔ «بررسی وضعیت» مرسوله. outcome همان PhysicalShipmentRefreshOutcome بای‌مانی است.
 */

export const SHIPMENT_REFRESH_MESSAGES = {
    Shipped: 'مرسوله با بارکد واقعی پذیرفته شد و وضعیت به «ارسال‌شده» تغییر کرد.',
    AwaitingTrackingCode: 'مرسوله پذیرفته شده ولی بارکد واقعی هنوز نیامده و سفارش در آماده‌سازی می‌ماند.',
    PaymentPending: 'کرایه هنوز پرداخت نشده و سفارش در انتظار پرداخت مانده است.',
    ParcelNotFound: 'مرسوله در واسط پستی پیدا نشد.',
};

export function carrierPaymentPendingSince(item) {
    const value = item?.carrierPaymentPendingSinceUtc;
    return typeof value === 'string' ? value.trim() : '';
}

/** اولین قلم فیزیکی که نشان انتظار پرداخت کرایه دارد. دکمه یک‌بار برای همان سفارش است. */
export function firstCarrierPaymentPending(items) {
    if (!Array.isArray(items)) return null;
    return items.find((item) => {
        const type = String(item?.itemType || '').toLowerCase();
        return type === 'product' && item?.purchaseId && carrierPaymentPendingSince(item);
    }) || null;
}

export function shipmentRefreshMessage(payload) {
    const text = SHIPMENT_REFRESH_MESSAGES[payload?.outcome];
    if (text) {
        return { ok: payload.outcome === 'Shipped', text };
    }
    return { ok: false, text: 'وضعیت مرسوله خوانده نشد.' };
}
