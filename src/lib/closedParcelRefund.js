/**
 * برگشت دستی نور قلم بسته‌شده بدون تسویه.
 * پیام از کد خطا انتخاب می‌شود، نه از متن پاسخ سرور.
 */

import { newOperationId } from '@/lib/physicalCancel';

export { newOperationId };

export const CONFIRMATION_TEXT = 'کل ماندهٔ پرداخت‌شدهٔ این قلم به کیف نور خریدار برمی‌گردد و این کار قابل بازگشت نیست. کرایهٔ ارسال و کوپن برنمی‌گردد.';

export const REFUND_UNKNOWN_MESSAGE = 'نتیجهٔ ثبت مشخص نیست. می‌توانید همین درخواست را دوباره بفرستید.';
export const REFUND_GENERIC_MESSAGE = 'ثبت برگشت انجام نشد. وضعیت قلم را بررسی کنید و دوباره تلاش کنید.';
export const REFUND_SUCCESS_MESSAGE = 'برگشت نور این قلم ثبت شد.';

const MESSAGES = {
    CLOSED_PARCEL_REFUND_NOT_FOUND: 'این قلم پیدا نشد.',
    CLOSED_PARCEL_REFUND_NOT_ELIGIBLE: 'این قلم برای برگشت دستی نور واجد شرایط نیست.',
    CLOSED_PARCEL_REFUND_ALREADY_REFUNDED: 'برگشت نور این قلم قبلاً ثبت شده است.',
    CLOSED_PARCEL_REFUND_NO_REMAINING_AMOUNT: 'ماندهٔ قابل‌برگشت این قلم صفر است.',
    CLOSED_PARCEL_REFUND_ALREADY_SETTLED: 'این سفارش قبلاً تسویه شده و برگشت باید خارج از سفارش پیگیری شود.',
    CLOSED_PARCEL_REFUND_MANUAL_REVIEW: 'سهم پرداخت این قلم ثبت نشده است؛ برگشت از این بخش ممکن نیست و باید دستی پیگیری شود.',
    CLOSED_PARCEL_REFUND_CONFLICT: 'ثبت برگشت با درخواست دیگری تداخل داشت. وضعیت قلم را ببینید و در صورت نیاز دوباره ثبت کنید.',
};

export function refundErrorMessage(code, status) {
    if (typeof code === 'string' && MESSAGES[code]) return MESSAGES[code];
    if (typeof code === 'string' && code.trim()) return REFUND_GENERIC_MESSAGE;
    if (status === 401) return 'نشست شما منقضی شده است؛ دوباره وارد شوید.';
    if (status === 403) return 'اجازهٔ ثبت برگشت نور را ندارید.';
    if (status === 400) return 'علت باید بین ۱ تا ۵۰۰ نویسه باشد.';
    return REFUND_GENERIC_MESSAGE;
}

function isUnknownStatus(status) {
    return status === 408 || status >= 500;
}

/**
 * نتیجهٔ قابل‌فهم پاسخ route. قطع شبکه و پاسخ ناخوانا را خودِ فراخوان جدا می‌گیرد.
 * @param {Response} res
 */
export async function interpretRefundResponse(res) {
    if (!res || isUnknownStatus(res.status)) return { kind: 'unknown' };
    let body;
    try {
        body = await res.json();
    } catch {
        return { kind: 'unknown' };
    }
    if (!body || typeof body !== 'object' || Array.isArray(body)) return { kind: 'unknown' };
    if (res.ok) {
        if (body.success === true && body.data && typeof body.data === 'object') {
            return { kind: 'success', data: body.data };
        }
        return { kind: 'unknown' };
    }
    const code = typeof body.code === 'string' && body.code.trim() ? body.code.trim() : undefined;
    return {
        kind: res.status === 409 ? 'conflict' : 'error',
        status: res.status,
        code,
        message: refundErrorMessage(code, res.status),
    };
}

/** مبلغ برگشتی ردیف فهرست را با سقف مبلغ سفارش زیاد می‌کند تا پیش از پاسخ تازهٔ سرور هم دیده شود. */
export function addListedRefund(row, amount) {
    const added = Number(amount);
    if (!row || !Number.isFinite(added) || added <= 0) return row;
    const current = Number(row.refundedAmountInNoor);
    const base = Number.isFinite(current) ? current : 0;
    const next = base + added;
    const total = Number(row.totalPrice);
    const capped = Number.isFinite(total) && total >= 0 ? Math.min(next, total) : next;
    return { ...row, refundedAmountInNoor: capped };
}
