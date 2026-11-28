/**
 * نام تجاری حامل را از متنی که خریدار می‌بیند برمی‌دارد.
 * برچسب قاعدهٔ ارسال جدا عوض می‌شود تا «برآورد شرکت پستی» ساخته نشود.
 */
const RULE_LABEL = /برآورد[\s\u200c]*پستکس/g;
const CARRIER_BRAND = /پستکس|postex/gi;

export function buyerFacingText(value) {
    if (typeof value !== 'string' || value.length === 0) return value;
    return value.replace(RULE_LABEL, 'برآورد هزینه ارسال').replace(CARRIER_BRAND, 'شرکت پستی');
}
