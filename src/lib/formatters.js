/**
 * Shared Formatting Utilities
 * توابع مشترک قالب‌بندی اعداد و مبالغ واحد «نور» و راهنمای تومانی (Display Hint)
 */

const persianNumberFormatter = new Intl.NumberFormat('fa-IR');

const persianNoorFormatter = new Intl.NumberFormat('fa-IR', {
  maximumFractionDigits: 4,
  minimumFractionDigits: 0,
});

/**
 * فرمت‌بندی استاندارد مبلغ به فارسی با جداکننده هزارگان
 * @param {number|string} price
 * @returns {string} - رشته فرمت‌شده (مثلاً "۱,۲۵۰,۰۰۰")
 */
export function formatPrice(price) {
  const numeric = Number(price);
  if (isNaN(numeric)) return '۰';
  return persianNumberFormatter.format(numeric);
}

/**
 * فرمت‌بندی همراه با واحد پولی تومان (صرفاً برای مصارف راهنما یا گذشته)
 * @param {number|string} price 
 * @returns {string} - مثلاً "۱,۲۵۰,۰۰۰ تومان"
 */
export function formatPriceWithCurrency(price) {
  return `${formatPrice(price)} تومان`;
}

/**
 * فرمت‌بندی استاندارد واحد نور (با پشتیبانی از اعشار تا ۴ رقم و زبان فارسی)
 * @param {number|string} amount
 * @returns {string} - مثلاً "۲۵۰" یا "۱۵۰/۵"
 */
export function formatNoor(amount) {
  const numeric = Number(amount);
  if (isNaN(numeric)) return '۰';
  return persianNoorFormatter.format(numeric);
}

/**
 * فرمت‌بندی مبلغ به واحد نور همراه با برچسب واحد
 * @param {number|string} amount 
 * @returns {string} - مثلاً "۲۵۰ نور"
 */
export function formatNoorWithUnit(amount) {
  return `${formatNoor(amount)} نور`;
}

/**
 * ساخت متن راهنمای تومانی (Display Hint) بر مبنای نرخ پویای دریافت‌شده از سرور
 * @param {number|string} noorAmount - مبلغ به نور
 * @param {number|null} tomanPerNoor - نرخ هر نور به تومان از ByeMoney
 * @returns {string|null} - مثلاً "معادل تقریبی: ۲۵۰,۰۰۰ تومان" یا در صورت نبود نرخ null
 */
export function formatTomanHint(noorAmount, tomanPerNoor) {
  const numericNoor = Number(noorAmount);
  const rate = Number(tomanPerNoor);

  if (isNaN(numericNoor) || isNaN(rate) || rate <= 0) {
    return null;
  }

  const estimatedToman = Math.round(numericNoor * rate);
  return `معادل تقریبی: ${formatPrice(estimatedToman)} تومان`;
}
