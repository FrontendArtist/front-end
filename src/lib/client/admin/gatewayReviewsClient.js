import { validateGatewayReviewResolution } from '@/lib/gatewayReviewResolution';
/**
 * @file src/lib/client/admin/gatewayReviewsClient.js
 * @description کلاینت تعامل با APIهای رسیدگی به پرداخت در فرانت‌اند
 */

export const REASON_CONFIG = {
    NO_CALLBACK: { label: 'عدم دریافت کال‌بک از درگاه', variant: 'warning', desc: 'مهلت بازگشت کاربر از درگاه سپ منقضی شده است' },
    VERIFY_UNKNOWN: { label: 'استعلام نامعلوم از درگاه', variant: 'error', desc: 'پاسخ استعلام تراکنش از درگاه بانکی نامشخص بوده است' },
    REVERSE_UNKNOWN: { label: 'برگشت نامعلوم در درگاه', variant: 'error', desc: 'عملیات برگشت وجه به حساب کاربر با نتیجه نامشخص مواجه شده است' },
    DELIVERY_UNKNOWN: { label: 'تحویل نامعلوم به بایمانی', variant: 'warning', desc: 'تحویل اعلان نتیجه به سرویس مالی با خطا یا تایم‌اوت مواجه شده است' },
    BANK_CONFLICT: { label: 'مغایرت بانکی', variant: 'error', desc: 'مغایرت در مبلغ، شماره پیگیری یا وضعیت بانکی مشاهده شده است' },
};

export const CASE_STATUS_CONFIG = {
    open: { label: 'باز (در انتظار رسیدگی)', variant: 'warning' },
    resolved: { label: 'رسیدگی‌شده', variant: 'success' },
    reopening: { label: 'در حال بازگشایی', variant: 'warning' },
};

export const TOPUP_STATUS_CONFIG = {
    Pending: { label: 'در انتظار شارژ', variant: 'warning' },
    Confirmed: { label: 'شارژ موفق', variant: 'success' },
    Rejected: { label: 'شارژ ناموفق / رد شده', variant: 'error' },
    ManuallyRefunded: { label: 'وجه خارج از سامانه به کاربر برگشت داده شد', variant: 'info' },
    Unresolved: { label: 'رسیدگی بسته؛ پرداخت نامشخص', variant: 'warning' },
    null: { label: 'نامعلوم', variant: 'default' },
};

export const OUTCOME_CONFIG = {
    NO_MATCHING_DEPOSIT: { label: 'واریز منطبق پیدا نشد', description: 'درخواست از انتظار خارج می‌شود و با وضعیت پرداخت نامشخص بسته می‌شود.', requiresRef: false, variant: 'warning' },
    MANUAL_REFUND: { label: 'وجه خارج از سامانه به کاربر برگشت داده شد', description: 'مرجع برگشت وجه انجام‌شده را ثبت کنید؛ کیف پول شارژ نمی‌شود.', requiresRef: false, variant: 'info' },
    PAID_AND_CONFIRMED: {
        label: 'پرداخت شده و نور شارژ شده',
        description: 'شارژ باید قبلاً از مسیر معتبر درگاه تأیید شده باشد.',
        requiresRef: true,
        variant: 'success',
    },
    UNPAID_REJECTED: {
        label: 'پرداخت‌نشده و رد شارژ',
        description: 'پرداختی به حساب واریز نشده و شارژ رد می‌شود (مرجع مالی باید خالی باشد).',
        requiresRef: false,
        variant: 'error',
    },
    REVERSED_REJECTED: {
        label: 'برگشت‌خورده',
        description: 'مبلغ به حساب کاربر عودت داده شده و شارژ لغو می‌شود (شناسه مرجع مالی برگشت الزامی است).',
        requiresRef: true,
        variant: 'info',
    },
};

export const EVIDENCE_STAGE_LABELS = {
    CALLBACK: 'کال‌بک درگاه (Callback)',
    VERIFY: 'استعلام تراکنش (Verify)',
    REVERSE: 'برگشت تراکنش (Reverse)',
    DELIVERY: 'تحویل اعلان (Delivery)',
    RESOLUTION: 'رسیدگی دستی ادمین (Resolution)',
};

/**
 * تبدیل پیام‌های خطا به پیام‌های دقیق و استاندارد فارسی
 * @param {any} err - خطای پرتاب‌شده یا شیء خطای دریافتی
 * @returns {{ message: string, code: string, isUnknownOutcome: boolean }}
 */
export function formatGatewayReviewError(err) {
    const status = err?.status || err?.response?.status;
    const code = err?.code || err?.response?.data?.code || '';
    const rawMessage = err?.message || err?.response?.data?.error || '';
    if (status === 401 || status === 403) return { code: code || 'REVIEW_PERMISSION_DENIED', message: 'نشست یا مجوز رسیدگی مالی معتبر نیست.', isUnknownOutcome: false };
    if (code === 'REVIEW_RESOLUTION_IN_PROGRESS') return { code, message: 'عملیات دیگری در جریان است. وضعیت پرونده را دوباره دریافت کنید.', isUnknownOutcome: true };

    // بررسی خطاهای شبکه
    if (err?.name === 'TypeError' || err?.message?.includes('Failed to fetch') || err?.message?.includes('NetworkError')) {
        return {
            code: 'NETWORK_ERROR',
            message: 'خطای شبکه در ارتباط با سرور. نتیجه عملیات نامعلوم است؛ لطفاً پرونده را حل‌شده فرض نکنید و وضعیت را مجدداً بررسی نمایید.',
            isUnknownOutcome: true,
        };
    }

    if (status === 409 || code === 'REVIEW_CASE_CONFLICT' || code === 'REVIEW_STATE_MISMATCH') {
        if (code === 'REVIEW_STATE_MISMATCH') {
            return {
                code: 'REVIEW_STATE_MISMATCH',
                message: 'تعارض وضعیت در سرویس مالی (State Mismatch). لطفاً آخرین وضعیت تراکنش و شارژ را استعلام کرده و دوباره بررسی کنید.',
                isUnknownOutcome: false,
            };
        }
        return {
            code: 'REVIEW_CASE_CONFLICT',
            message: 'تعارض در پرونده رسیدگی (REVIEW_CASE_CONFLICT). این پرونده احتمالاً با نتیجه دیگری پیش‌تر حل شده است. پرونده خودکار حل‌شده فرض نمی‌شود؛ لطفاً اطلاعات پرونده را مجدداً بررسی فرمایید.',
            isUnknownOutcome: false,
        };
    }

    if (code === 'REVIEW_MANUAL_REFUND_NOT_SUPPORTED') {
        return {
            code: 'REVIEW_MANUAL_REFUND_NOT_SUPPORTED',
            message: 'ثبت بازپرداخت دستی برای شارژ تأییدشده پشتیبانی نمی‌شود.',
            isUnknownOutcome: false,
        };
    }

    if (status === 503 || code === 'REVIEW_RESOLUTION_DELIVERY_UNKNOWN' || code === 'REVIEW_DELIVERY_NOT_CONFIGURED') {
        return {
            code: code || 'REVIEW_RESOLUTION_DELIVERY_UNKNOWN',
            message: 'نتیجه تحویل رسیدگی نامعلوم است (سرویس مالی یا شبکه در دسترس نیست - ۵۰۳). وضعیت عملیات نامعلوم تلقی می‌شود؛ لطفاً برای اطمینان از نتیجه، پرونده را دوباره استعلام و بررسی کنید.',
            isUnknownOutcome: true,
        };
    }

    if (status === 400 || status === 422 || code === 'REVIEW_INVALID_RESOLUTION') {
        return {
            code: 'REVIEW_INVALID_RESOLUTION',
            message: 'اطلاعات گزارش یا نتیجه رسیدگی معتبر نیست. تاریخ، مبلغ و شناسه‌های واردشده را بررسی کنید.',
            isUnknownOutcome: false,
        };
    }

    if (status === 400 || code === 'REVIEW_INVALID_THRESHOLD') {
        return {
            code: 'REVIEW_INVALID_THRESHOLD',
            message: 'آستانه زمانی نامعتبر است. مقدار باید عدد صحیح بین ۱ تا ۱۴۴۰ دقیقه باشد.',
            isUnknownOutcome: false,
        };
    }

    return {
        code: code || 'UNKNOWN_ERROR',
        message: rawMessage || 'خطای غیرمنتظره در پردازش درخواست',
        isUnknownOutcome: status >= 500,
    };
}

/**
 * دریافت لیست پرونده‌ها
 */
export async function fetchGatewayReviews({ page = 1, pageSize = 25, status, reasonCode } = {}) {
    const params = new URLSearchParams();
    if (page) params.set('page', String(page));
    if (pageSize) params.set('pageSize', String(pageSize));
    if (status && status !== 'all') params.set('status', status);
    if (reasonCode && reasonCode !== 'all') params.set('reasonCode', reasonCode);

    try {
        const res = await fetch(`/api/admin/gateway-reviews?${params.toString()}`);
        const data = await res.json().catch(() => ({}));

        if (!res.ok) {
            const err = new Error(data?.error || 'خطا در دریافت لیست پرونده‌ها');
            err.status = res.status;
            err.code = data?.code;
            throw err;
        }

        return data; // { data: [...], pagination: { page, pageSize, total } }
    } catch (error) {
        throw error;
    }
}

/**
 * دریافت جزئیات یک پرونده بر اساس clientReferenceCode
 */
export async function fetchGatewayReview(clientReferenceCode, historyPage = 1) {
    const encoded = encodeURIComponent(String(clientReferenceCode || '').trim());
    try {
        const res = await fetch(`/api/admin/gateway-reviews/${encoded}?historyPage=${historyPage}`);
        const data = await res.json().catch(() => ({}));

        if (!res.ok) {
            const err = new Error(data?.error || 'خطا در دریافت اطلاعات پرونده');
            err.status = res.status;
            err.code = data?.code;
            throw err;
        }

        return data?.data || null;
    } catch (error) {
        throw error;
    }
}

/**
 * دریافت تنظیمات آستانه کال‌بک
 */
export async function fetchGatewayReviewSettings() {
    try {
        const res = await fetch('/api/admin/gateway-reviews/settings');
        const data = await res.json().catch(() => ({}));

        if (!res.ok) {
            const err = new Error(data?.error || 'خطا در دریافت تنظیمات');
            err.status = res.status;
            err.code = data?.code;
            throw err;
        }

        return typeof data?.noCallbackMinutes === 'number' ? data.noCallbackMinutes : 30;
    } catch (error) {
        throw error;
    }
}

/**
 * ذخیره تنظیمات آستانه کال‌بک
 */
export async function saveGatewayReviewSettings(noCallbackMinutes) {
    const num = Number(noCallbackMinutes);
    if (!Number.isInteger(num) || num < 1 || num > 1440) {
        const err = new Error('مقدار آستانه باید عدد صحیح بین ۱ تا ۱۴۴۰ دقیقه باشد.');
        err.status = 400;
        err.code = 'REVIEW_INVALID_THRESHOLD';
        throw err;
    }

    try {
        const res = await fetch('/api/admin/gateway-reviews/settings', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ noCallbackMinutes: num }),
        });
        const data = await res.json().catch(() => ({}));

        if (!res.ok) {
            const err = new Error(data?.error || 'خطا در ذخیره تنظیمات');
            err.status = res.status;
            err.code = data?.code;
            throw err;
        }

        return data?.noCallbackMinutes ?? num;
    } catch (error) {
        throw error;
    }
}

/**
 * ثبت نتیجه رسیدگی پرونده
 */
export async function resolveGatewayReview(clientReferenceCode, payload) {
    const validation = validateGatewayReviewResolution(payload);
    if (validation) throw Object.assign(new Error(validation), { status: 400, code: 'REVIEW_INVALID_RESOLUTION' });
    return sendReviewAction(clientReferenceCode, 'resolve', payload);
}

export async function reopenGatewayReview(clientReferenceCode, payload) {
    return sendReviewAction(clientReferenceCode, 'reopen', payload);
}

async function sendReviewAction(reference, action, payload) {
    const response = await fetch('/api/admin/gateway-reviews/' + encodeURIComponent(reference) + '/' + action, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw Object.assign(new Error(data.error || data.code || 'REVIEW_REQUEST_FAILED'), { status: response.status, code: data.code });
    return data;
}
