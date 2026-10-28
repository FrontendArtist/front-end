/**
 * @file src/utils/numberToPersianWords.js
 * @description تبدیل اعداد صحیح به حروف فارسی جهت نمایش به کاربر
 */

const ONES = ['', 'یک', 'دو', 'سه', 'چهار', 'پنج', 'شش', 'هفت', 'هشت', 'نه'];
const TEENS = ['ده', 'یازده', 'دوازده', 'سیزده', 'چهارده', 'پانزده', 'شانزده', 'هفده', 'هجده', 'نوزده'];
const TENS = ['', '', 'بیست', 'سی', 'چهل', 'پنجاه', 'شصت', 'هفتاد', 'هشتاد', 'نود'];
const HUNDREDS = ['', 'یکصد', 'دویست', 'سیصد', 'چهارصد', 'پانصد', 'ششصد', 'هفتصد', 'هشتصد', 'نهصد'];
const SCALES = ['', 'هزار', 'میلیون', 'میلیارد', 'تریلیون'];

function convertChunk(val) {
    const parts = [];
    const h = Math.floor(val / 100);
    const rem = val % 100;

    if (h > 0) parts.push(HUNDREDS[h]);

    if (rem > 0) {
        if (rem < 10) {
            parts.push(ONES[rem]);
        } else if (rem < 20) {
            parts.push(TEENS[rem - 10]);
        } else {
            const t = Math.floor(rem / 10);
            const o = rem % 10;
            parts.push(TENS[t]);
            if (o > 0) parts.push(ONES[o]);
        }
    }

    return parts.join(' و ');
}

/**
 * تبدیل یک عدد صحیح مثبت به حروف فارسی
 * @param {number|string} num
 * @returns {string}
 */
export function numberToPersianWords(num) {
    if (num === null || num === undefined || num === '') return '';
    const n = Number(num);
    if (!Number.isFinite(n) || n < 0) return '';
    if (n === 0) return 'صفر';

    const chunks = [];
    let temp = Math.floor(n);
    while (temp > 0) {
        chunks.push(temp % 1000);
        temp = Math.floor(temp / 1000);
    }

    const chunkWords = [];
    for (let i = chunks.length - 1; i >= 0; i--) {
        const chunk = chunks[i];
        if (chunk > 0) {
            const text = convertChunk(chunk);
            const scale = SCALES[i];
            chunkWords.push(scale ? `${text} ${scale}` : text);
        }
    }

    return chunkWords.join(' و ');
}

