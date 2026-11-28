import { hasUnshippedItems, readOrderFilters, normalizeTab, getByeMoneyAdminOrders, getByeMoneyOrderCounts } from '../byeMoneyAdminOrders';
import { getAdminCourseOrders, getAdminCourseOrderDetails, getPendingPhysicalRestocks } from '../../byeMoneyApi';
import { lookupPeople } from '../../courseOrderSettlementRoute';
import { getRowShippingBadge, getItemsShippingState, shortOrderNumber } from '../orderDisplay';
import { findStrapiUserIdsForByeMoney } from '../adminOrdersApi';

jest.mock('../../byeMoneyApi', () => ({
    getAdminCourseOrders: jest.fn(),
    getAdminCourseOrderDetails: jest.fn(),
    getPendingPhysicalRestocks: jest.fn(),
    CourseOrderId: { for: (s, id) => `cart:${id}` },
}));
jest.mock('../../courseOrderSettlementRoute', () => ({ lookupPeople: jest.fn() }));
jest.mock('../adminOrdersApi', () => ({ findStrapiUserIdForByeMoney: jest.fn(), findStrapiUserIdsForByeMoney: jest.fn() }));

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

describe('نبود مجوز Purchases.View (RBAC-04)', () => {
    beforeEach(() => {
        getPendingPhysicalRestocks.mockResolvedValue({ success: false, forbidden: true, error: 'x' });
        getAdminCourseOrders.mockResolvedValue({ success: false, forbidden: true, error: 'no perm' });
    });

    test.each(['action', 'all', 'paid'])('تب %s forbidden را برمی‌گرداند', async (tab) => {
        const r = await getByeMoneyAdminOrders('jwt', { tab });
        expect(r.forbidden).toBe(true);
        expect(r.orders).toEqual([]);
    });
});

describe('تب «نیاز به اقدام» با فیلتر سروری (SHIP-TRACKING)', () => {
    const orderId = 'cart:11111111-1111-1111-1111-111111111111';

    beforeEach(() => {
        jest.clearAllMocks();
        getPendingPhysicalRestocks.mockResolvedValue({ success: true, data: [] });
        lookupPeople.mockResolvedValue(new Map());
    });

    test('awaitingShipment=true صدا زده می‌شود و جزئیات تک‌تک سفارش‌ها خوانده نمی‌شود', async () => {
        getAdminCourseOrders.mockResolvedValue({
            success: true,
            data: {
                items: [{
                    orderId,
                    sourceType: 'Cart',
                    cartId: '11111111-1111-1111-1111-111111111111',
                    createdAtUtc: '2026-11-10T10:00:00Z',
                    financialStatus: 'Paid',
                    deliveryStatus: 'Pending',
                    finalAmountInNoor: 100,
                    itemCount: 1,
                }],
                totalCount: 1,
            },
        });

        const result = await getByeMoneyAdminOrders('jwt', { tab: 'action' });

        expect(getAdminCourseOrders).toHaveBeenCalledWith(
            expect.objectContaining({ awaitingShipment: true, page: 1 })
        );
        expect(getAdminCourseOrderDetails).not.toHaveBeenCalled();
        expect(result.orders).toHaveLength(1);
        expect(result.orders[0].needsShipment).toBe(true);
        expect(result.total).toBe(1);
        expect(result.truncated).toBe(false);
    });

    test('بیشتر از سقف صفحه با truncated اعلام می‌شود', async () => {
        getAdminCourseOrders.mockResolvedValue({
            success: true,
            data: { items: [{ orderId, sourceType: 'Cart', financialStatus: 'Paid' }], totalCount: 250 },
        });

        const result = await getByeMoneyAdminOrders('jwt', { tab: 'action' });

        expect(result.truncated).toBe(true);
    });

    test('ادغام ۳ گروه با حفظ فیلدها هنگام حذف تکرار، شمارنده و truncated گروه سوم', async () => {
        const orderA = 'cart:aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
        const orderB = 'cart:bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
        getPendingPhysicalRestocks.mockResolvedValue({
            success: true,
            data: [{ cartId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', abandoned: true }],
        });
        getAdminCourseOrderDetails.mockResolvedValue({
            success: true,
            data: {
                buyerExternalUserId: 'u1',
                buyerDisplayName: 'کاربر یک',
                order: {
                    orderId: orderA,
                    sourceType: 'Cart',
                    cartId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
                    createdAtUtc: '2026-11-12T10:00:00Z',
                    financialStatus: 'Paid',
                    deliveryStatus: 'Pending',
                    finalAmountInNoor: 200,
                    items: [{ itemType: 'Product', quantity: 1, closedParcelRefundStatus: 'None' }],
                    topUps: [],
                },
            },
        });
        getAdminCourseOrders.mockImplementation(async (params) => {
            if (params.awaitingShipment) {
                return {
                    success: true,
                    data: {
                        items: [{
                            orderId: orderA,
                            sourceType: 'Cart',
                            createdAtUtc: '2026-11-12T10:00:00Z',
                            financialStatus: 'Paid',
                            deliveryStatus: 'Pending',
                            carrierReturnStatus: 'None',
                            carrierAlertStatus: 'None',
                            closedParcelRefundStatus: 'None',
                        }],
                        totalCount: 1,
                    },
                };
            }
            if (params.needsCarrierAction) {
                return {
                    success: true,
                    data: {
                        items: [
                            {
                                orderId: orderA,
                                sourceType: 'Cart',
                                createdAtUtc: '2026-11-12T10:00:00Z',
                                financialStatus: 'Paid',
                                deliveryStatus: 'Pending',
                                carrierReturnStatus: 'PendingReview',
                                carrierAlertStatus: 'None',
                                closedParcelRefundStatus: 'NotRefunded',
                            },
                            {
                                orderId: orderB,
                                sourceType: 'Cart',
                                createdAtUtc: '2026-11-11T10:00:00Z',
                                financialStatus: 'Paid',
                                deliveryStatus: 'Pending',
                                carrierReturnStatus: 'ClosedWithoutSettlement',
                                carrierAlertStatus: 'None',
                                closedParcelRefundStatus: 'NotRefunded',
                            },
                        ],
                        totalCount: 150,
                    },
                };
            }
            return { success: true, data: { items: [], totalCount: 0 } };
        });

        const result = await getByeMoneyAdminOrders('jwt', { tab: 'action' });
        const counts = await getByeMoneyOrderCounts('jwt', {});

        expect(getAdminCourseOrders).toHaveBeenCalledWith(
            expect.objectContaining({ needsCarrierAction: true, page: 1 })
        );
        expect(result.orders).toHaveLength(2);
        expect(result.total).toBe(2);
        expect(result.truncated).toBe(true);

        const mergedA = result.orders.find((o) => o.orderId === orderA);
        expect(mergedA.restockPending).toBe(true);
        expect(mergedA.needsShipment).toBe(true);
        expect(mergedA.needsCarrierAction).toBe(true);
        expect(mergedA.carrierReturnStatus).toBe('PendingReview');
        expect(mergedA.closedParcelRefundStatus).toBe('NotRefunded');

        expect(counts.action).toBe(2);
    });

    test('جستجوی نام مشترک سفارش‌های همه کاربران منطبق را برمی‌گرداند', async () => {
        findStrapiUserIdsForByeMoney.mockResolvedValue(['u1', 'u2']);
        getAdminCourseOrders.mockImplementation(async ({ buyerExternalUserId }) => {
            if (buyerExternalUserId === 'u1') return { success: true, data: { items: [], totalCount: 0 } };
            return {
                success: true,
                data: {
                    items: [{ orderId, sourceType: 'Cart', financialStatus: 'Paid', createdAtUtc: '2026-11-10T10:00:00Z', buyerExternalUserId: 'u2' }],
                    totalCount: 1,
                },
            };
        });

        const result = await getByeMoneyAdminOrders('jwt', { tab: 'all', q: 'علی' });
        expect(result.orders).toHaveLength(1);
        expect(result.orders[0].buyerExternalUserId).toBe('u2');
        expect(result.total).toBe(1);
    });
});
