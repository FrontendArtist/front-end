/**
 * Shared Formatting Utilities
 * توابع مشترک قالب‌بندی اعداد و مبالغ ریالی/تومانی به زبان فارسی
 */

const persianNumberFormatter = new Intl.NumberFormat('fa-IR');

/**
 * فرمت‌بندی استاندارد مبلغ به فارسی با جداکننده هزارگان
 * @param {number|string} price - مبلغ به تومان
 * @returns {string} - رشته فرمت‌شده (مثلاً "۱,۲۵۰,۰۰۰")
 */
export function formatPrice(price) {
    const numeric = Number(price);
    if (isNaN(numeric)) return '۰';
    return persianNumberFormatter.format(numeric);
}

/**
 * فرمت‌بندی همراه با واحد پولی تومان
 * @param {number|string} price 
 * @returns {string} - مثلاً "۱,۲۵۰,۰۰۰ تومان"
 */
export function formatPriceWithCurrency(price) {
    return `${formatPrice(price)} تومان`;
}
