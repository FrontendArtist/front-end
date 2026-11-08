/**
 * @file src/lib/admin/noorWithdrawal.js
 * @description برچسب‌ها و اعتبارسنجی سمت کلاینت فرم خروج نور ادمین (I11-W).
 * اعتبارسنجی نهایی با بای‌مانی است؛ اینجا فقط خطاهای واضح ورودی زودتر نشان داده می‌شوند.
 * فقط مبلغ واریز (ریال) ورودی است؛ نور را سرور حساب می‌کند و اینجا فقط تخمین نمایشی ساخته می‌شود.
 */

export const WITHDRAWAL_KINDS = {
    AdminDiscretionary: 'صلاحدید ادمین',
    DuplicatePaymentRefund: 'استرداد پرداخت تکراری',
};

export const WITHDRAWAL_STATUSES = {
    PendingPayment: 'در انتظار پرداخت',
    Paid: 'پرداخت‌شده',
    Reversed: 'برگشت‌خورده',
};

export const RECEIPT_MAX_BYTES = 10 * 1024 * 1024;
const RECEIPT_TYPES = ['image/png', 'image/jpeg', 'image/webp'];

/** ارقام فارسی/عربی را به لاتین برمی‌گرداند. */
export function toLatinDigits(value) {
    return String(value ?? '')
        .replace(/[۰-۹]/g, (d) => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d))
        .replace(/[٠-٩]/g, (d) => '٠١٢٣٤٥٦٧٨٩'.indexOf(d));
}

/** فقط ارقام لاتین (برای مبلغ و شمارهٔ کارت). */
export const digitsOnly = (value) => toLatinDigits(value).replace(/\D/g, '');

/** شبا: حروف بزرگ، ارقام لاتین، بدون فاصله. */
export const normalizeIban = (value) => toLatinDigits(value).replace(/\s+/g, '').toUpperCase();

export const isPositiveInteger = (digits) => /^\d+$/.test(digits) && Number(digits) > 0;
export const isValidCard = (digits) => /^\d{16}$/.test(digits);
export const isValidIban = (iban) => /^IR\d{24}$/.test(iban);

/** @returns {string|null} پیام خطا برای فایل فیش یا null */
export function validateReceiptFile(file) {
    if (!file) return null;
    if (!RECEIPT_TYPES.includes(file.type)) return 'فیش باید تصویر png، jpg یا webp باشد.';
    if (file.size > RECEIPT_MAX_BYTES) return 'حجم فیش نباید بیشتر از ۱۰ مگابایت باشد.';
    return null;
}

/**
 * @param {object} form مقادیر خام فرم
 * @returns {string|null} نخستین پیام خطای اعتبارسنجی
 */
export function validateWithdrawalForm(form) {
    const {
        kind, relatedTopUpId, maxRial, amountRial, beneficiaryName, cardNumber, iban, description,
        alreadyPaid, paymentReference, receipt,
    } = form;

    if (kind === 'DuplicatePaymentRefund' && !String(relatedTopUpId ?? '').trim()) {
        return 'برای استرداد پرداخت تکراری، انتخاب شارژ تأییدشدهٔ همان کاربر الزامی است.';
    }
    if (!isPositiveInteger(amountRial)) return 'مبلغ واریز (ریال) باید عدد صحیح مثبت باشد.';
    if (kind === 'DuplicatePaymentRefund' && maxRial && Number(amountRial) > Number(maxRial)) {
        return `مبلغ استرداد نمی‌تواند از مبلغ همان شارژ (${formatNumber(maxRial)} ریال) بیشتر باشد.`;
    }
    const name = String(beneficiaryName ?? '').trim();
    if (!name || name.length > 200) return 'نام صاحب حساب الزامی است (حداکثر ۲۰۰ نویسه).';
    if (!cardNumber && !iban) return 'شمارهٔ کارت یا شبا (دست‌کم یکی) الزامی است.';
    if (cardNumber && !isValidCard(cardNumber)) return 'شمارهٔ کارت باید ۱۶ رقم باشد.';
    if (iban && !isValidIban(iban)) return 'شبا باید با IR شروع شود و ۲۴ رقم داشته باشد.';
    const desc = String(description ?? '').trim();
    if (!desc || desc.length > 1000) return 'توضیحات الزامی است (حداکثر ۱۰۰۰ نویسه).';
    if (alreadyPaid) {
        const ref = String(paymentReference ?? '').trim();
        if (!ref || ref.length > 100) return 'شناسهٔ پرداخت الزامی است (حداکثر ۱۰۰ نویسه).';
        if (!receipt) return 'برای واریز انجام‌شده، بارگذاری فیش الزامی است.';
    }
    return validateReceiptFile(receipt);
}

export const formatNumber = (value) => new Intl.NumberFormat('fa-IR').format(Number(value) || 0);

/** معادل تخمینی نور (گرد تا ۴ رقم اعشار مثل سرور)؛ بدون نرخ معتبر null. */
export function estimateNoor(amountRial, rialPerNoor) {
    const rial = Number(amountRial);
    const rate = Number(rialPerNoor);
    if (!(rial > 0) || !(rate > 0)) return null;
    return Math.round((rial / rate) * 1e4) / 1e4;
}

/** نور با حداکثر ۴ رقم اعشار فارسی. */
export const formatNoor = (value) => new Intl.NumberFormat('fa-IR', { maximumFractionDigits: 4 }).format(Number(value) || 0);

export const formatDateTime = (iso) => {
    if (!iso) return '—';
    const date = new Date(iso);
    return Number.isNaN(date.getTime()) ? '—' : date.toLocaleString('fa-IR');
};
