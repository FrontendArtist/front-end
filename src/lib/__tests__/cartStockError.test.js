import { cartStockErrorMessage } from '../cartStockError';

const items = [
    { id: 1, documentId: 'course-1', type: 'course', title: 'دوره' },
    { id: 2, documentId: 'prod-1', type: 'product', title: 'کتاب' },
];
const stockError = lineError => ({ code: 'CART_STOCK_UNAVAILABLE', lineError });

test('اتمام موجودی با نام کالا', () => {
    expect(cartStockErrorMessage(stockError({ externalId: 'prod-1', reason: 'OUT_OF_STOCK', availableQuantity: 0 }), items))
        .toBe('موجودی «کتاب» تمام شده است؛ آن را از سبد حذف کنید.');
});

test('کمبود موجودی با تعداد مجاز', () => {
    expect(cartStockErrorMessage(stockError({ externalId: 'prod-1', reason: 'INSUFFICIENT_STOCK', availableQuantity: 2 }), items))
        .toBe('از «کتاب» فقط 2 عدد موجود است؛ تعداد را در سبد کم کنید.');
});

test('خطای دیگر یا قلم ناشناخته پیام سرور را جایگزین نمی‌کند', () => {
    expect(cartStockErrorMessage({ code: 'CART_CONFLICT' }, items)).toBeNull();
    expect(cartStockErrorMessage(stockError({ externalId: 'missing', reason: 'OUT_OF_STOCK' }), items)).toBeNull();
    expect(cartStockErrorMessage(stockError({ externalId: 'course-1', reason: 'OUT_OF_STOCK' }), items)).toBeNull();
});
