import { hasUnshippedItems, readOrderFilters, normalizeTab } from '../byeMoneyAdminOrders';
import { getRowShippingBadge, getItemsShippingState, shortOrderNumber } from '../orderDisplay';

jest.mock('../../byeMoneyApi', () => ({
    getAdminCourseOrders: jest.fn(),
    getAdminCourseOrderDetails: jest.fn(),
    getPendingPhysicalRestocks: jest.fn(),
    CourseOrderId: { for: (s, id) => `cart:${id}` },
}));
jest.mock('../../courseOrderSettlementRoute', () => ({ lookupPeople: jest.fn() }));
jest.mock('../adminOrdersApi', () => ({ findStrapiUserIdForByeMoney: jest.fn() }));

const product = (extra = {}) => ({ itemType: 'Product', quantity: 1, ...extra });

describe('hasUnshippedItems (تب «نیاز به اقدام»)', () => {
    test('کالای ارسال‌نشده یعنی نیاز به اقدام', () => {
        expect(hasUnshippedItems({ items: [product({ physicalDeliveryStatus: 'Preparing' })] })).toBe(true);
        expect(hasUnshippedItems({ items: [product({ physicalDeliveryStatus: null })] })).toBe(true);
    });
    test('کالای ارسال‌شده، تحویل‌شده یا لغوشده نیاز به اقدام نیست', () => {
        expect(hasUnshippedItems({ items: [product({ physicalDeliveryStatus: 'Shipped' })] })).toBe(false);
        expect(hasUnshippedItems({ items: [product({ physicalDeliveryStatus: 'Delivered' })] })).toBe(false);
        expect(hasUnshippedItems({ items: [product({ cancelledQuantity: 1 })] })).toBe(false);
    });
    test('سفارش دوره‌ای بدون کالا نیاز به اقدام نیست', () => {
        expect(hasUnshippedItems({ items: [{ itemType: 'Course' }] })).toBe(false);
    });
    test('یک کالای ارسال‌نشده کنار کالای ارسال‌شده کافی است', () => {
        expect(hasUnshippedItems({
            items: [product({ physicalDeliveryStatus: 'Shipped' }), product({ physicalDeliveryStatus: 'Preparing' })],
        })).toBe(true);
    });
});

describe('فیلترهای آدرس', () => {
    test('مقدار نامعتبر به پیش‌فرض برمی‌گردد', () => {
        expect(normalizeTab('x')).toBe('action');
        expect(readOrderFilters({ tab: 'paid', q: '  علی ', view: 'restock' }))
            .toEqual({ tab: 'paid', q: 'علی', view: 'restock' });
        expect(readOrderFilters(new URLSearchParams('tab=bad&view=other')))
            .toEqual({ tab: 'action', q: '', view: null });
    });
});

describe('نمایش سفارش', () => {
    test('برچسب ارسال ردیف', () => {
        expect(getRowShippingBadge({ financialStatus: 'Paid', needsShipment: true }).label).toBe('منتظر ارسال');
        expect(getRowShippingBadge({ financialStatus: 'Paid', deliveryStatus: 'Pending' }).label).toBe('در جریان ارسال');
        expect(getRowShippingBadge({ financialStatus: 'AwaitingPayment', deliveryStatus: 'Pending' })).toBeNull();
    });
    test('وضعیت ارسال از روی اقلام', () => {
        expect(getItemsShippingState([product({ physicalDeliveryStatus: 'Shipped' })]).label).toBe('ارسال‌شده');
        expect(getItemsShippingState([product({ physicalDeliveryStatus: 'Delivered' })]).label).toBe('تحویل‌شده');
        expect(getItemsShippingState([{ itemType: 'Course' }])).toBeNull();
    });
    test('شمارهٔ کوتاه', () => {
        expect(shortOrderNumber('cart:abcdef12-0000-0000-0000-000000000000')).toBe('ABCDEF12');
    });
});
