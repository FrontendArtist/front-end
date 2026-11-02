import { useCartStore } from './useCartStore';
import { cancelOrdersAfterRemoval } from '@/lib/client/cartRemovalApi';
jest.mock('@/lib/client/cartRemovalApi', () => ({ cancelOrdersAfterRemoval: jest.fn() }));

const course = { id: 5, type: 'course', title: 'دوره', price: 100 };
const product = { id: 5, type: 'product', title: 'کالا', price: 50, stock: 10 };
const store = () => useCartStore.getState();
const find = (type) => store().items.find(item => item.type === type);

beforeEach(() => {
    jest.clearAllMocks();
    cancelOrdersAfterRemoval.mockResolvedValue(undefined);
    useCartStore.setState({ items: [], userId: null, removalError: null });
});

test.each([
    ['دوره سپس کالا', [course, product]],
    ['کالا سپس دوره', [product, course]],
])('افزودن با شناسه یکسان: %s', (_, order) => {
    order.forEach(item => store().addItem(item));
    expect(store().items).toHaveLength(2);
    expect(find('course').quantity).toBe(1);
    expect(find('product').quantity).toBe(1);
    store().addItem(product);
    expect(find('product').quantity).toBe(2);
    expect(find('course').quantity).toBe(1);
});

test.each([[[course, product]], [[product, course]]])('تغییر تعداد و حذف یکی بر دیگری اثر ندارد', async (order) => {
    order.forEach(item => store().addItem(item));
    store().updateQuantity(5, 3, 'product');
    expect(find('product').quantity).toBe(3);
    expect(find('course').quantity).toBe(1);
    store().updateQuantity(5, 4, 'course'); // دوره تعدادپذیر نیست
    expect(find('course').quantity).toBe(1);
    expect(find('product').quantity).toBe(3);
    await store().removeItemManually(5, 'course');
    expect(store().items.map(item => item.type)).toEqual(['product']);
    store().addItem(course);
    store().removeItem(5, 'product');
    expect(store().items.map(item => item.type)).toEqual(['course']);
});

test('بازگرداندن قلم در خطا فقط همان نوع را برمی‌گرداند و قلم هم‌شماره را تکرار نمی‌کند', async () => {
    useCartStore.setState({ userId: 9 });
    [course, product].forEach(item => store().addItem(item));
    cancelOrdersAfterRemoval.mockRejectedValue(new Error('x'));
    await store().removeItemManually(5, 'course');
    expect(store().items).toHaveLength(2);
    expect(store().items.filter(item => item.type === 'course')).toHaveLength(1);
    expect(store().removalError).toBe('x');
});

test('قلم قدیمی بدون type همان کالا محسوب می‌شود', () => {
    useCartStore.setState({ items: [{ id: 5, price: 50, quantity: 2, stock: 10 }] });
    store().addItem(course);
    expect(store().items).toHaveLength(2);
    store().updateQuantity(5, 4, 'product');
    expect(store().items[0].quantity).toBe(4);
    store().removeItem(5, 'product');
    expect(store().items.map(item => item.type)).toEqual(['course']);
});
