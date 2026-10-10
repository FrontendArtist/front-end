import { checkCourseAccess } from '@/lib/ordersApi';
import { useCartStore } from '@/store/useCartStore';

jest.mock('@/lib/api', () => ({ API_BASE_URL: 'http://strapi.test' }));

const pendingOrder = (overrides = {}) => ({
    id: 10,
    documentId: 'order-one',
    orderStatus: 'pending',
    paymentStatus: 'pending_payment',
    paymentMethod: 'online',
    items: [{ courseId: 42, slug: 'course-one' }],
    ...overrides,
});

beforeEach(() => {
    global.fetch = jest.fn();
});

afterEach(() => jest.restoreAllMocks());

const loadOrders = (orders) => {
    fetch.mockResolvedValue({ ok: true, json: async () => ({ data: orders }) });
    return checkCourseAccess(7, 42, 'course-one');
};

test.each(['pending_payment', 'pending_verification'])('سفارش آنلاین %s خرید دوباره را با پیام فیش مسدود نمی‌کند', async (paymentStatus) => {
    const result = await loadOrders([pendingOrder({ paymentStatus })]);
    expect(result.hasAccess).toBe(false);
    expect(result.activeCourseOrder).toBeNull();
});

test('ساختار attributes نیز برای سفارش آنلاین مانع خرید نمی‌شود', async () => {
    const result = await loadOrders([{ id: 10, attributes: pendingOrder() }]);
    expect(result.activeCourseOrder).toBeNull();
});

test.each(['pending_payment', 'pending_verification'])('رفتار کارت‌به‌کارت %s حفظ می‌شود', async (paymentStatus) => {
    const result = await loadOrders([pendingOrder({ paymentMethod: 'card_to_card', paymentStatus })]);
    expect(result.hasAccess).toBe(false);
    expect(result.activeCourseOrder.paymentStatus).toBe(paymentStatus);
});

test('پرداخت موفق همچنان دسترسی دوره را اعطا می‌کند', async () => {
    const result = await loadOrders([pendingOrder({ orderStatus: 'paid', paymentStatus: 'paid' })]);
    expect(result.hasAccess).toBe(true);
    expect(result.activeCourseOrder).toBeNull();
});

test('سفارش لغوشده مانع خرید دوباره نمی‌شود', async () => {
    const result = await loadOrders([pendingOrder({ orderStatus: 'canceled', paymentStatus: 'failed' })]);
    expect(result.hasAccess).toBe(false);
    expect(result.activeCourseOrder).toBeNull();
});

test('حذف دستی قلم پس از رهاکردن پرداخت، افزودن دوباره را مسدود نمی‌کند', async () => {
    const item = { id: 42, type: 'course', slug: 'course-one', title: 'دوره', price: 100 };
    useCartStore.setState({ items: [], appliedCoupon: null });
    useCartStore.getState().addItem(item);
    // سفارش در انتظار پرداخت باقی مانده، اما کاربر قلم را از سبد حذف کرده است.
    useCartStore.getState().removeItem(42);
    expect(useCartStore.getState().items).toEqual([]);
    const access = await loadOrders([pendingOrder()]);
    expect(access.hasAccess).toBe(false);
    expect(access.activeCourseOrder).toBeNull();
    // صفحهٔ دوره اکنون به‌جای پیام انتظار فیش، امکان افزودن را ارائه می‌کند.
    useCartStore.getState().addItem(item);
    expect(useCartStore.getState().items).toEqual([expect.objectContaining({ id: 42, quantity: 1 })]);
});
