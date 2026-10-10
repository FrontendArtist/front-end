import { mergeRecoveredItems, removeOrderItems } from '@/lib/cartRecovery';
import { recoverOrderItems } from '@/lib/recoverOrderItems';
import { useCartStore } from '@/store/useCartStore';

test('تعداد اضافهٔ محصول که متعلق به سفارش نیست حفظ می‌شود', () => {
    expect(removeOrderItems([{ id: 1, type: 'product', quantity: 5 }], [{ productId: 1, quantity: 2 }]))
        .toEqual([{ id: 1, type: 'product', quantity: 3 }]);
});

test('حذف اقلام سفارش بین فصل و دوره و محصول با شناسه یکسان تداخل ندارد', () => {
    const items = [{ id: 1, type: 'course' }, { id: 'chapter-1', chapterId: 1, type: 'chapter' }, { id: 1, type: 'product' }];
    expect(removeOrderItems(items, [{ courseId: 8, chapterId: 1 }])).toEqual([items[0], items[2]]);
});

test('انتقال مکرر تعداد را زیاد نمی‌کند و اقلام دیگر را نگه می‌دارد', () => {
    const other = { type: 'course', id: 9 };
    const fresh = { type: 'product', id: 1, stock: 2, quantity: 2, price: 150 };
    const first = mergeRecoveredItems([other, { ...fresh, quantity: 1, price: 20 }], [fresh]);
    expect(mergeRecoveredItems(first, [fresh])).toEqual([other, fresh]);
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

test('قیمت قدیمی سفارش استفاده نمی‌شود و تعداد با موجودی روز محدود می‌شود', async () => {
    const read = jest.fn().mockResolvedValue({ data: [{ id: 3, title: 'محصول', slug: 'p', price: 200, stock: 2, isAvailable: true }] });
    const result = await recoverOrderItems([{ productId: 3, title: 'محصول', price: 1, quantity: 5 }], {}, read);
    expect(result.items[0]).toMatchObject({ price: 200, quantity: 2, stock: 2 });
    expect(result.warnings).toHaveLength(1);
    expect(read.mock.calls[0][0]).toContain('status=published');
});

test('محصول ناموجود و فصل حذف‌شده منتقل نمی‌شوند', async () => {
    const read = jest.fn().mockResolvedValueOnce({ data: [{ id: 3, title: 'محصول', stock: 0 }] })
        .mockResolvedValueOnce({ data: [{ id: 8, title: 'دوره', chapters: [] }] });
    const result = await recoverOrderItems([{ productId: 3 }, { courseId: 8, chapterId: 2 }], {}, read);
    expect(result.items).toEqual([]);
    expect(result.warnings).toHaveLength(2);
});

test('فصل با قیمت فعلی خودش منتقل می‌شود', async () => {
    const read = jest.fn().mockResolvedValue({ data: [{ id: 8, title: 'دوره', slug: 'course', price: 500, chapters: [{ id: 2, title: 'فصل', price: 100 }] }] });
    const result = await recoverOrderItems([{ courseId: 8, chapterId: 2, price: 5 }], {}, read);
    expect(result.items[0]).toMatchObject({ type: 'chapter', chapterId: 2, courseId: 8, price: 100 });
});
