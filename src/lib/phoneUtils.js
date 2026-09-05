import { parsePhoneNumberFromString } from 'libphonenumber-js/min';

/**
 * تبدیل ارقام فارسی و عربی به انگلیسی
 */
export function normalizeDigits(str) {
  if (!str) return '';
  const s = String(str).trim();
  const persianNumbers = [/۰/g, /۱/g, /۲/g, /۳/g, /۴/g, /۵/g, /۶/g, /۷/g, /۸/g, /۹/g];
  const arabicNumbers = [/٠/g, /١/g, /٢/g, /٣/g, /٤/g, /٥/g, /٦/g, /٧/g, /٨/g, /٩/g];

  let res = s;
  for (let i = 0; i < 10; i++) {
    res = res.replace(persianNumbers[i], String(i)).replace(arabicNumbers[i], String(i));
  }
  return res;
}

/**
 * بررسی حالت تست ادمین
 */
export function isTestPhoneNumber(rawPhone) {
  if (!rawPhone) return false;
  const digits = normalizeDigits(rawPhone);
  return /^[Tt]/.test(digits);
}

/**
 * بررسی اینکه آیا شماره ایرانی است یا خیر
 */
export function isIranianPhoneNumber(rawPhone) {
  if (!rawPhone) return true; // مقدار پیش‌فرض تا زمانی که شماره کامل وارد شود
  const cleaned = normalizeDigits(rawPhone);

  if (isTestPhoneNumber(cleaned)) {
    return true;
  }

  const digitsOnly = cleaned.replace(/[^\d+]/g, '');

  // شماره‌های ایران معمولاً با 09، +98، 0098 یا 9 شروع می‌شوند
  const iranRegex = /^(?:\+98|0098|98|0)?9\d{0,9}$/;
  if (iranRegex.test(digitsOnly)) {
    return true;
  }

  // اگر شماره با + یا 00 شروع شده و کد ایران نیست
  if (digitsOnly.startsWith('+') || digitsOnly.startsWith('00')) {
    try {
      let formatted = digitsOnly.startsWith('00') ? '+' + digitsOnly.slice(2) : digitsOnly;
      const parsed = parsePhoneNumberFromString(formatted);
      if (parsed) {
        return parsed.country === 'IR';
      }
    } catch (e) {
      // ادامه بررسی
    }
    return false;
  }

  // اگر طول شماره بیشتر از 4 باشد و با 09 یا 9 شروع نشده باشد، احتمالاً خارجی است
  if (digitsOnly.length >= 4 && !digitsOnly.startsWith('09') && !digitsOnly.startsWith('9')) {
    return false;
  }

  return true;
}

/**
 * بررسی اعتبار شماره تلفن (ایرانی یا خارجی)
 */
export function validatePhoneNumber(rawPhone) {
  if (!rawPhone) {
    return { valid: false, message: 'لطفاً شماره تلفن خود را وارد کنید.' };
  }

  const cleaned = normalizeDigits(rawPhone);

  // شماره تست
  if (isTestPhoneNumber(cleaned)) {
    return { valid: true, isIranian: true, isTest: true, formatted: cleaned };
  }

  const digitsOnly = cleaned.replace(/[^\d+]/g, '');

  // اگر شماره ایرانی است
  if (isIranianPhoneNumber(digitsOnly)) {
    let num = digitsOnly.replace(/^(?:\+98|0098|98)/, '');
    if (!num.startsWith('0')) {
      num = '0' + num;
    }
    const iranRegex = /^09\d{9}$/;
    if (!iranRegex.test(num)) {
      return { valid: false, message: 'شماره موبایل ایران باید ۱۱ رقم باشد و با ۰۹ شروع شود.' };
    }
    return { valid: true, isIranian: true, isTest: false, formatted: num };
  }

  // اگر شماره خارجی است
  try {
    let formatted = digitsOnly;
    if (formatted.startsWith('00')) {
      formatted = '+' + formatted.slice(2);
    } else if (!formatted.startsWith('+')) {
      formatted = '+' + formatted;
    }
    const parsed = parsePhoneNumberFromString(formatted);
    if (!parsed || !parsed.isValid()) {
      return { valid: false, message: 'شماره بین‌المللی نامعتبر است. لطفاً پیش‌شماره کشور (مثلاً +1 یا +44) را همراه شماره وارد کنید.' };
    }
    return { valid: true, isIranian: false, isTest: false, formatted: parsed.number };
  } catch (e) {
    return { valid: false, message: 'فرمت شماره تلفن صحیح نیست.' };
  }
}
