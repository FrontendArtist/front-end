import { getOrders, getOrdersStats } from '../adminOrdersApi';
import { getAdminCourseOrders } from '../../byeMoneyApi';
import { adminFetch } from '../adminFetch';

jest.mock('../../byeMoneyApi', () => ({ getAdminCourseOrders: jest.fn() }));
jest.mock('../adminFetch', () => ({ adminFetch: jest.fn() }));
jest.mock('../../api', () => ({ STRAPI_API_URL: 'http://strapi.test' }));

const row = (n, financialStatus, amount = 10) => ({
    orderId: `cart:${String(n).padStart(8, '0')}-0000-0000-0000-000000000000`,
    sourceType: 'Cart',
    cartId: null,
    createdAtUtc: '2026-11-01T10:00:00Z',
    updatedAtUtc: '2026-11-01T10:00:00Z',
    financialStatus,
    deliveryStatus: 'NotStarted',
    finalAmountInNoor: amount,
    itemCount: 1,
    topUpAttemptCount: 0,
    buyerExternalUserId: 'u1',
    buyerDisplayName: 'علی',
});

/** شبیه‌سازی API: هر وضعیت یک فهرست ثابت دارد و page/pageSize را رعایت می‌کند */
function mockByeMoney(byStatus) {
    getAdminCourseOrders.mockImplementation(async ({ page, pageSize, financialStatus }) => {
        const all = financialStatus
            ? byStatus[financialStatus] || []
            : Object.values(byStatus).flat();
        return {
            success: true,
            data: {
                items: all.slice((page - 1) * pageSize, page * pageSize),
                page,
                pageSize,
                totalCount: all.length,
            },
        };
    });
}

const strapiEmpty = { data: [], meta: { pagination: { total: 0, pageCount: 1 } } };

beforeEach(() => {
    getAdminCourseOrders.mockReset();
    adminFetch.mockReset();
    adminFetch.mockResolvedValue(strapiEmpty);
    jest.spyOn(console, 'error').mockImplementation(() => {});
});
afterEach(() => jest.restoreAllMocks());

const statusesAsked = () => getAdminCourseOrders.mock.calls.map(([a]) => a.financialStatus);

describe('getOrders – فهرست پیگیری بای‌مانی', () => {
    test('تب پرداخت‌شده: financialStatus=Paid و ردیف‌ها با وضعیت واقعی', async () => {
        mockByeMoney({ Paid: [row(1, 'Paid')] });
        const { orders, meta } = await getOrders('jwt', { start: 0, limit: 20, status: 'paid', source: 'byemoney' });
        expect(statusesAsked()).toEqual(['Paid']);
        expect(orders).toHaveLength(1);
        expect(orders[0]).toMatchObject({ paymentStatus: 'paid', orderStatus: 'paid', isByeMoney: true });
        expect(meta.pagination.total).toBe(1);
    });

    test('تب ناموفق: Failed را می‌فرستد و دیگر کنار گذاشته نمی‌شود', async () => {
        mockByeMoney({ Failed: [row(2, 'Failed')] });
        const { orders } = await getOrders('jwt', { start: 0, limit: 20, status: 'canceled', source: 'byemoney' });
        expect(statusesAsked()).toEqual(['Failed']);
        expect(orders[0]).toMatchObject({ financialStatus: 'Failed', paymentStatus: 'failed', orderStatus: 'canceled' });
    });

    test.each([
        ['expired', 'Expired'],
        ['review', 'RequiresReview'],
    ])('تب %s → %s', async (tab, fin) => {
        mockByeMoney({ [fin]: [row(3, fin)] });
        const { orders } = await getOrders('jwt', { start: 0, limit: 20, status: tab, source: 'byemoney' });
        expect(statusesAsked()).toEqual([fin]);
        expect(orders).toHaveLength(1);
    });

    test('تب در انتظار: Processing و AwaitingPayment پشت‌سرهم با جمع شمارش', async () => {
        mockByeMoney({
            Processing: [row(1, 'Processing')],
            AwaitingPayment: [row(2, 'AwaitingPayment'), row(3, 'AwaitingPayment'), row(4, 'AwaitingPayment')],
        });
        const page1 = await getOrders('jwt', { start: 0, limit: 2, status: 'pending', source: 'byemoney' });
        expect(page1.meta.pagination.total).toBe(4);
        expect(page1.orders.map((o) => o.financialStatus)).toEqual(['Processing', 'AwaitingPayment']);

        const page2 = await getOrders('jwt', { start: 2, limit: 2, status: 'pending', source: 'byemoney' });
        expect(page2.orders.map((o) => o.financialStatus)).toEqual(['AwaitingPayment', 'AwaitingPayment']);
        expect(page2.orders.map((o) => o.orderNumber)).toEqual(['00000003', '00000004']);
    });

    test('تب همه بدون فیلتر وضعیت و تب آنلاین بدون فراخوانی بای‌مانی', async () => {
        mockByeMoney({ Paid: [row(1, 'Paid')], Failed: [row(2, 'Failed')] });
        const all = await getOrders('jwt', { start: 0, limit: 20, source: 'byemoney' });
        expect(statusesAsked()).toEqual([undefined]);
        expect(all.orders).toHaveLength(2);

        getAdminCourseOrders.mockClear();
        await getOrders('jwt', { start: 0, limit: 20, status: 'online', source: 'byemoney' });
        expect(getAdminCourseOrders).not.toHaveBeenCalled();
    });

    test('منبع همه: ابتدا بای‌مانی سپس استرپی؛ تب‌های فقط‌بای‌مانی استرپی را نمی‌خوانند', async () => {
        mockByeMoney({ RequiresReview: [row(1, 'RequiresReview')] });
        const r = await getOrders('jwt', { start: 0, limit: 20, status: 'review', source: 'all' });
        expect(r.orders).toHaveLength(1);
        expect(adminFetch).not.toHaveBeenCalled();
    });

    test('ردیف‌های استرپی قدیمی مثل قبل بعد از بای‌مانی می‌آیند', async () => {
        mockByeMoney({ Paid: [row(1, 'Paid')] });
        adminFetch.mockResolvedValue({
            data: [{ id: 7, documentId: 'd7', attributes: { orderStatus: 'paid', paymentStatus: 'paid', totalPrice: 5000, createdAt: '2026-10-01T00:00:00Z' } }],
            meta: { pagination: { total: 1 } },
        });
        const r = await getOrders('jwt', { start: 0, limit: 20, status: 'paid', source: 'all' });
        expect(r.orders.map((o) => o.source)).toEqual(['byemoney', 'strapi']);
        expect(r.meta.pagination.total).toBe(2);
    });

    test('پوشهٔ آرشیو تسویه، بای‌مانی را نمی‌خواند', async () => {
        await getOrders('jwt', { start: 0, limit: 20, settlementId: '5', source: 'all' });
        expect(getAdminCourseOrders).not.toHaveBeenCalled();
    });

    test('خطای بای‌مانی (مثلاً ۴۰۳) هشدار می‌دهد و صفحه نمی‌شکند', async () => {
        getAdminCourseOrders.mockResolvedValue({ success: false, forbidden: true, error: 'no perm' });
        const r = await getOrders('jwt', { start: 0, limit: 20, source: 'byemoney' });
        expect(r.byemoneyWarning).toBe(true);
        expect(r.orders).toEqual([]);
    });
});

describe('getOrdersStats – شمارندهٔ تب‌ها و درآمد', () => {
    test('بای‌مانی هم شمرده می‌شود و درآمد فقط از Paid است', async () => {
        getAdminCourseOrders.mockImplementation(async ({ page, pageSize, financialStatus }) => {
            const data = {
                Paid: [row(1, 'Paid', 30), row(2, 'Paid', 20)],
                AwaitingPayment: [row(3, 'AwaitingPayment', 999)],
                Processing: [row(4, 'Processing', 999)],
                Failed: [row(5, 'Failed', 999), row(6, 'Failed', 999)],
                Expired: [row(7, 'Expired', 999)],
                RequiresReview: [],
            }[financialStatus];
            return { success: true, data: { items: data.slice((page - 1) * pageSize, page * pageSize), totalCount: data.length } };
        });
        adminFetch.mockImplementation(async (endpoint) => {
            if (endpoint.includes('settlements')) return { meta: { pagination: { total: 0 } } };
            if (endpoint.includes('pagination[limit]=1')) return { meta: { pagination: { total: 1 } } };
            return {
                data: [{ id: 1, attributes: { orderStatus: 'pending', paymentStatus: 'pending_payment', paymentMethod: 'online', totalPrice: 1 } }],
                meta: { pagination: { pageCount: 1, total: 1 } },
            };
        });

        const stats = await getOrdersStats('jwt');
        expect(stats.statusCounts).toMatchObject({ paid: 2, pending: 1 + 2, canceled: 2, expired: 1, review: 0, online: 1 });
        expect(stats.strapiStatusCounts).toMatchObject({ pending: 1, paid: 0, canceled: 0 });
        expect(stats.byemoney.revenueNoor).toBe(50);
        expect(stats.totalRevenue).toBe(0);
    });

    test('اگر بای‌مانی در دسترس نباشد آمار استرپی مثل قبل برمی‌گردد', async () => {
        getAdminCourseOrders.mockResolvedValue({ success: false, forbidden: true, error: 'x' });
        adminFetch.mockResolvedValue({ data: [], meta: { pagination: { pageCount: 1, total: 0 } } });
        const stats = await getOrdersStats('jwt');
        expect(stats.byemoney.available).toBe(false);
        expect(stats.statusCounts).toMatchObject({ pending: 0, paid: 0, canceled: 0, expired: 0, review: 0 });
    });
});
