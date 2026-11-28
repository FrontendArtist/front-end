import { buyerFacingText } from '../buyerFacingText';

test('برچسب برآورد حامل برای خریدار برآورد هزینه ارسال است', () => {
    expect(buyerFacingText('برآورد پستکس')).toBe('برآورد هزینه ارسال');
});

test('نام حامل در پیام خطا به شرکت پستی عوض می‌شود', () => {
    expect(buyerFacingText('برآورد هزینهٔ ارسال از پستکس ممکن نیست. Postex رد کرد.')).toBe(
        'برآورد هزینهٔ ارسال از شرکت پستی ممکن نیست. شرکت پستی رد کرد.',
    );
});

test('متن بدون نام حامل و مقدار غیرمتنی دست نمی‌خورد', () => {
    expect(buyerFacingText('ارسال ثابت داخلی')).toBe('ارسال ثابت داخلی');
    expect(buyerFacingText(null)).toBeNull();
});
