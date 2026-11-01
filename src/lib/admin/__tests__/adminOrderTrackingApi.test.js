import { getOrderTracking, STRAPI_FORBIDDEN_WARNING, STRAPI_UNAVAILABLE_WARNING } from '../adminOrderTrackingApi';
import { getAdminCourseOrderDetails, getAdminCourseOrderReceipt } from '../../byeMoneyApi';

jest.mock('../../byeMoneyApi', () => ({
    getAdminCourseOrderDetails: jest.fn(),
    getAdminCourseOrderReceipt: jest.fn(),
}));
jest.mock('../../api', () => ({ STRAPI_API_URL: 'http://strapi.test' }));

const ORDER_ID = 'cart:11111111-1111-1111-1111-111111111111';
const T1 = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
const NOW = new Date('2026-11-01T12:00:00Z');

const detail = (financialStatus = 'Failed') => ({
    success: true,
    data: {
        buyerExternalUserId: 'u1',
        buyerDisplayName: 'علی',
        order: {
            orderId: ORDER_ID,
            sourceType: 'Cart',
            cartId: '11111111-1111-1111-1111-111111111111',
            createdAtUtc: '2026-11-01T10:00:00Z',
            updatedAtUtc: '2026-11-01T10:30:00Z',
            financialStatus,
            deliveryStatus: 'NotStarted',
            finalAmountInNoor: 50,
            itemCount: 1,
            items: [{ title: 'دوره', itemType: 'Course', priceInNoor: 50, finalAmountInNoor: 50, transactionId: 'SECRET-TX' }],
            topUps: [{ topUpRequestId: T1, status: 'Rejected', amountNoor: 50, createdAtUtc: '2026-11-01T10:10:00Z', gatewayResultKind: 'Failed', clientReferenceCode: 'CLIENT-REF' }],
        },
    },
});

beforeEach(() => {
    getAdminCourseOrderDetails.mockReset();
    getAdminCourseOrderReceipt.mockReset();
    global.fetch = jest.fn();
    process.env.STRAPI_API_TOKEN = 'server-token';
});

describe('getOrderTracking', () => {
    test('تلاش‌ها با توکن سرور، فیلتر $in، fields صریح، pageSize و sort=createdAt:desc خوانده می‌شوند', async () => {
        getAdminCourseOrderDetails.mockResolvedValue(detail());
        global.fetch.mockResolvedValue({ ok: true, status: 200, json: async () => ({ data: [] }) });
        await getOrderTracking({ jwt: 'admin', orderId: ORDER_ID, now: NOW });

        const [url, init] = global.fetch.mock.calls[0];
        const q = new URL(url).searchParams;
        expect(url).toContain('http://strapi.test/api/gateway-payment-attempts?');
        expect(init.headers.Authorization).toBe('Bearer server-token');
        expect(q.get('filters[topUpRequestId][$in][0]')).toBe(T1);
        expect(q.get('sort')).toBe('createdAt:desc');
        expect(q.get('pagination[pageSize]')).toBe('100');
        const fields = [...q.entries()].filter(([k]) => k.startsWith('fields[')).map(([, v]) => v);
        expect(fields).toEqual(expect.arrayContaining(['status', 'lastError', 'tokenIssuedAtUtc', 'tokenExpiresAtUtc', 'createdAt', 'updatedAt']));
        for (const bad of ['refNum', 'rrn', 'securePan', 'hashedCardNumber', 'retryCount']) expect(fields).not.toContain(bad);
    });

    test('لغو کاربر در درگاه در خط زمانی و خلاصه می‌آید و داده‌های حساس به مرورگر نمی‌رسند', async () => {
        getAdminCourseOrderDetails.mockResolvedValue(detail());
        global.fetch.mockResolvedValue({
            ok: true,
            status: 200,
            json: async () => ({
                data: [{
                    id: 1, topUpRequestId: T1, status: 'cancelled', createdAt: '2026-11-01T10:10:01Z',
                    refNum: 'REF-LEAK', rrn: 'RRN-LEAK', securePan: 'PAN-LEAK', hashedCardNumber: 'HASH-LEAK', retryCount: 0,
                }],
            }),
        });
        const res = await getOrderTracking({ jwt: 'admin', orderId: ORDER_ID, now: NOW });
        expect(res.success).toBe(true);
        expect(res.data.timeline.map((e) => e.kind)).toEqual(['cart', 'attempt', 'final']);
        expect(res.data.timeline[1].result.label).toBe('لغو توسط کاربر');
        expect(res.data.attemptSummary.label).toBe('لغو توسط کاربر');
        expect(res.data.attemptsStatus).toBe('ok');
        const json = JSON.stringify(res.data);
        for (const leak of ['REF-LEAK', 'RRN-LEAK', 'PAN-LEAK', 'HASH-LEAK', 'SECRET-TX', 'CLIENT-REF', 'retryCount']) {
            expect(json).not.toContain(leak);
        }
    });

    test('استرپی ۴۰۳: خطای عدم دسترسی توکن، جدا از «بدون تلاش»؛ بای‌مانی نمایش داده می‌شود', async () => {
        getAdminCourseOrderDetails.mockResolvedValue(detail());
        global.fetch.mockResolvedValue({ ok: false, status: 403, json: async () => ({}) });
        const res = await getOrderTracking({ jwt: 'admin', orderId: ORDER_ID, now: NOW });
        expect(res.success).toBe(true);
        expect(res.data.attemptsStatus).toBe('forbidden');
        expect(res.data.warnings).toEqual([STRAPI_FORBIDDEN_WARNING]);
        expect(res.data.timeline[1].source).toBe('byemoney');
        expect(res.data.timeline[1].result.label).toBe('شارژ: رد شده');
    });

    test.each([
        ['خطای شبکه', () => global.fetch.mockRejectedValue(new Error('down')), 'error'],
        ['پاسخ ۵۰۰', () => global.fetch.mockResolvedValue({ ok: false, status: 500, json: async () => ({}) }), 'error'],
    ])('استرپی در دسترس نیست (%s): هشدار و صفحه نمی‌شکند', async (_n, arrange, status) => {
        getAdminCourseOrderDetails.mockResolvedValue(detail());
        arrange();
        const res = await getOrderTracking({ jwt: 'admin', orderId: ORDER_ID, now: NOW });
        expect(res.success).toBe(true);
        expect(res.data.attemptsAvailable).toBe(false);
        expect(res.data.attemptsStatus).toBe(status);
        expect(res.data.warnings).toEqual([STRAPI_UNAVAILABLE_WARNING]);
        expect(res.data.order.items).toHaveLength(1);
    });

    test('بدون STRAPI_API_TOKEN درخواستی به استرپی زده نمی‌شود', async () => {
        delete process.env.STRAPI_API_TOKEN;
        getAdminCourseOrderDetails.mockResolvedValue(detail());
        const res = await getOrderTracking({ jwt: 'admin', orderId: ORDER_ID, now: NOW });
        expect(global.fetch).not.toHaveBeenCalled();
        expect(res.data.attemptsStatus).toBe('no_token');
    });

    test('رسید فقط برای Paid خوانده می‌شود', async () => {
        getAdminCourseOrderDetails.mockResolvedValue(detail('AwaitingPayment'));
        global.fetch.mockResolvedValue({ ok: true, status: 200, json: async () => ({ data: [] }) });
        const res = await getOrderTracking({ jwt: 'admin', orderId: ORDER_ID, now: NOW });
        expect(getAdminCourseOrderReceipt).not.toHaveBeenCalled();
        expect(res.data.receipt).toBeNull();

        getAdminCourseOrderDetails.mockResolvedValue(detail('Paid'));
        getAdminCourseOrderReceipt.mockResolvedValue({ success: true, data: { purchasedAtUtc: 'x', finalAmountInNoor: 50, transactionId: 'SECRET-TX', items: [] } });
        const paid = await getOrderTracking({ jwt: 'admin', orderId: ORDER_ID, now: NOW });
        expect(getAdminCourseOrderReceipt).toHaveBeenCalledTimes(1);
        expect(JSON.stringify(paid.data.receipt)).not.toContain('SECRET-TX');
    });

    test.each([
        [{ success: false, forbidden: true, error: 'x' }, 403],
        [{ success: false, notFound: true, error: 'x' }, 404],
    ])('خطای بای‌مانی %j → وضعیت %i', async (bm, code) => {
        getAdminCourseOrderDetails.mockResolvedValue(bm);
        const res = await getOrderTracking({ jwt: 'admin', orderId: ORDER_ID });
        expect(res).toMatchObject({ success: false, status: code });
    });
});
