/**
 * Order & Payment Constants
 * استانداردهای یکپارچه وضعیت سفارشات و روش‌های پرداخت در سامانه
 */

export const ORDER_STATUS = {
    PENDING: 'pending',
    CONFIRMED: 'confirmed',
    PROCESSING: 'processing',
    PAID: 'paid',
    SHIPPED: 'shipped',
    DELIVERED: 'delivered',
    CANCELLED: 'cancelled',
};

export const PAYMENT_STATUS = {
    PENDING_PAYMENT: 'pending_payment',
    PENDING_VERIFICATION: 'pending_verification',
    PAID: 'paid',
    FAILED: 'failed',
    REFUNDED: 'refunded',
};

export const PAYMENT_METHOD = {
    CARD_TO_CARD: 'card_to_card',
    ONLINE: 'online',
    FREE: 'free',
};

/**
 * تابع متمرکز و استاندارد برای بررسی معتبر و پرداخت‌شده بودن سفارش در سراسر سیستم
 * @param {object} order - آبجکت سفارش از استراپی
 * @returns {boolean}
 */
export function isOrderPaid(order) {
    if (!order) return false;
    const oStatus = String(order.orderStatus || order.attributes?.orderStatus || '').trim().toLowerCase();
    const pStatus = String(order.paymentStatus || order.attributes?.paymentStatus || '').trim().toLowerCase();

    // سفارش‌های لغو شده، رد شده یا مرجوعی تحت هیچ شرایطی معتبر نیستند
    const invalidStatuses = [ORDER_STATUS.CANCELLED, PAYMENT_STATUS.FAILED, PAYMENT_STATUS.REFUNDED];
    if (invalidStatuses.includes(oStatus) || invalidStatuses.includes(pStatus)) {
        return false;
    }

    const validOrderStatuses = [
        ORDER_STATUS.PAID,
        ORDER_STATUS.CONFIRMED,
        ORDER_STATUS.PROCESSING,
        ORDER_STATUS.SHIPPED,
        ORDER_STATUS.DELIVERED,
    ];
    const validPaymentStatuses = [PAYMENT_STATUS.PAID];
    const isPending = pStatus === PAYMENT_STATUS.PENDING_PAYMENT || pStatus === PAYMENT_STATUS.PENDING_VERIFICATION;

    return validPaymentStatuses.includes(pStatus) || (validOrderStatuses.includes(oStatus) && !isPending);
}
