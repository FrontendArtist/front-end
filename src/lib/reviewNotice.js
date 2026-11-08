// پیام «در حال بررسی» برای شارژ/پرداخت درگاه؛ تنها نقطهٔ تعریف متن و عدد پیش‌فرض.
// عدد دقیقه از تنظیم آستانهٔ استرپی (noCallbackMinutes) خوانده می‌شود، نه هاردکد.
// مستقل از آستانهٔ ۳۰ دقیقه‌ای SEP (کد ۶-) در sepPayment.js است؛ آن مفهوم دیگری است.

// پیش‌فرض با DEFAULT_THRESHOLD_MINUTES بک‌اند (gatewayReviewRecovery.js) یکی است.
// اگر خواندن آستانه شکست بخورد، همین مقدار نمایش داده می‌شود تا صفحه نشکند و
// پیام همان عددی را بگوید که تنظیم پیش‌فرض دارد.
export const DEFAULT_REVIEW_MINUTES = 15;

const FA_DIGITS = '۰۱۲۳۴۵۶۷۸۹';

export function normalizeReviewMinutes(value) {
    const n = Number(value);
    return Number.isSafeInteger(n) && n >= 1 ? n : DEFAULT_REVIEW_MINUTES;
}

export function buildReviewNoticeText(minutes = DEFAULT_REVIEW_MINUTES) {
    const digits = String(normalizeReviewMinutes(minutes)).replace(/\d/g, d => FA_DIGITS[d]);
    return `در حال بررسی؛ در صورت کسر وجه، نور به کیف پول اضافه می‌شود؛ می‌توانید حدود ${digits} دقیقه صبر کنید یا دوباره پرداخت کنید.`;
}
