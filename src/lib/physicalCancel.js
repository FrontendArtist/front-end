/**
 * لغو کالای فیزیکی (I09-PC): ثابت‌ها و نگاشت ErrorCode ساختاریافته به پیام فارسی.
 * پیام‌ها از کد خطا انتخاب می‌شوند، نه از تطبیق متن پاسخ سرور.
 */

export const CANCEL_REASON_MAX = 500;

const GUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const isGuid = (v) => typeof v === 'string' && GUID_RE.test(v);

/** شناسهٔ یکتای یک اقدام لغو؛ سمت مرورگر یک‌بار ساخته و در تلاش مجدد همان ارسال می‌شود. */
export function newOperationId() {
    return globalThis.crypto.randomUUID();
}

export const CANCEL_ERROR_MESSAGES = {
    PHYSICAL_CANCEL_NOT_FOUND: 'سفارش فیزیکی پیدا نشد.',
    PHYSICAL_CANCEL_CONFLICT: 'این سفارش دیگر قابل لغو نیست یا تعداد واردشده بیشتر از باقی‌مانده است.',
    PHYSICAL_CANCEL_ALREADY_SHIPPED: 'کالا ارسال شده است و لغو خودکار ممکن نیست؛ رسیدگی دستی لازم است.',
    PHYSICAL_CANCEL_MANUAL_REVIEW: 'این خرید نیاز به رسیدگی دستی دارد و لغو خودکار ممکن نیست.',
    PHYSICAL_CANCEL_UNAVAILABLE: 'آزادسازی سفارش اکنون ممکن نیست؛ کمی بعد دوباره تلاش کنید.',
};

/** کدهایی که یعنی فقط رسیدگی دستی ممکن است (برای نمایش جدا در پنل ادمین). */
export const MANUAL_REVIEW_CODES = ['PHYSICAL_CANCEL_ALREADY_SHIPPED', 'PHYSICAL_CANCEL_MANUAL_REVIEW'];

export function cancelErrorMessage(code, status) {
    if (code && CANCEL_ERROR_MESSAGES[code]) return CANCEL_ERROR_MESSAGES[code];
    if (status === 401) return 'نشست شما منقضی شده است؛ دوباره وارد شوید.';
    if (status === 403) return 'اجازهٔ این عملیات را ندارید.';
    if (status === 400) return 'اطلاعات واردشده معتبر نیست.';
    return 'لغو انجام نشد؛ دوباره تلاش کنید.';
}

export const CANCEL_OUTCOME_LABELS = {
    Refunded: 'لغو شد و نور برگشت داده شد',
    ReservationReleased: 'لغو شد (پرداختی انجام نشده بود؛ رزرو آزاد شد)',
};

/** جمع نور عادی و هدیهٔ برگشتی از پاسخ پیش‌نمایش/لغو. */
export function sumRefunds(data) {
    const items = Array.isArray(data?.items) ? data.items : [];
    return {
        regular: items.reduce((s, i) => s + (Number(i.regularRefundInNoor) || 0), 0) + (Number(data?.shippingRegularRefundInNoor) || 0),
        gift: items.reduce((s, i) => s + (Number(i.giftRefundInNoor) || 0), 0) + (Number(data?.shippingGiftRefundInNoor) || 0),
    };
}
