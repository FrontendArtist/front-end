import { removeOrderItems } from '@/lib/cartRecovery';
import { useCartStore } from '@/store/useCartStore';

test('تعداد اضافهٔ محصول که متعلق به سفارش نیست حفظ می‌شود', () => {
    expect(removeOrderItems([{ id: 1, type: 'product', quantity: 5 }], [{ productId: 1, quantity: 2 }]))
        .toEqual([{ id: 1, type: 'product', quantity: 3 }]);
});

test('حذف اقلام سفارش بین فصل و دوره و محصول با شناسه یکسان تداخل ندارد', () => {
    const items = [{ id: 1, type: 'course' }, { id: 'chapter-1', chapterId: 1, type: 'chapter' }, { id: 1, type: 'product' }];
    expect(removeOrderItems(items, [{ courseId: 8, chapterId: 1 }])).toEqual([items[0], items[2]]);
});

test('نتیجهٔ تکراری سفارش سبد جدید را پاک نمی‌کند', () => {
    const purchased = { type: 'product', id: 1 };
    const other = { type: 'course', id: 9 };
    useCartStore.setState({ items: [purchased, other], processedOrders: {} });
    expect(useCartStore.getState().completeOrder(7, 'one', [{ productId: 1 }])).toBe(true);
    expect(useCartStore.getState().items).toEqual([other]);
    useCartStore.setState({ items: [purchased, other] });
    expect(useCartStore.getState().completeOrder(7, 'one', [{ productId: 1 }])).toBe(false);
    expect(useCartStore.getState().items).toEqual([purchased, other]);
    expect(JSON.parse(localStorage.getItem('cart-storage')).state.processedOrders['7:one']).toBe(true);
});
