import {
    createAdminAssistedTopUp, getAdminBatchBalances, getAdminOrderReceipt, sendAdminNoorGift,
} from '../adminByeMoneyClient';

const respond = (status, body) => ({ ok: status >= 200 && status < 300, status, json: async () => body });

beforeEach(() => {
    global.fetch = jest.fn();
});

describe('adminByeMoneyClient (BND-07)', () => {
    test('همهٔ فراخوانی‌ها به route نسبی و بدون Authorization می‌روند', async () => {
        global.fetch.mockResolvedValue(respond(200, { success: true, data: {}, balances: {} }));
        await sendAdminNoorGift({ externalUserIds: ['d'], amountNoor: 1, reason: 'r', idempotencyKey: 'k' });
        await createAdminAssistedTopUp({ beneficiaryExternalUserId: 'd', amountToman: '1', idempotencyKey: 'k2' });
        await getAdminBatchBalances({ userIds: ['d'] });
        await getAdminOrderReceipt({ orderId: 'cart:1' });
        const urls = global.fetch.mock.calls.map(([url]) => url);
        expect(urls).toEqual([
            '/api/admin/noor-gifts',
            '/api/admin/topups/assisted',
            '/api/admin/wallets/batch-balances',
            '/api/admin/course-orders/cart%3A1/receipt',
        ]);
        global.fetch.mock.calls.forEach(([, init]) => expect(init.headers?.Authorization).toBeUndefined());
        expect(global.fetch.mock.calls[0][1].headers['Idempotency-Key']).toBe('k');
        expect(global.fetch.mock.calls[1][1].headers['Idempotency-Key']).toBe('k2');
    });

    test('خطای route با status و فیلدهای نتیجه برمی‌گردد و موجودی پیش‌فرض خالی است', async () => {
        global.fetch.mockResolvedValueOnce(respond(403, { success: false, error: 'مجوز ندارید.' }));
        const result = await getAdminBatchBalances({ userIds: ['d'] });
        expect(result).toMatchObject({ success: false, status: 403, error: 'مجوز ندارید.', balances: {} });
    });

    test('قطع شبکه نتیجهٔ ناموفق با status صفر می‌دهد', async () => {
        global.fetch.mockRejectedValueOnce(new TypeError('network'));
        expect(await sendAdminNoorGift({ externalUserIds: ['d'], amountNoor: 1, reason: 'r', idempotencyKey: 'k' }))
            .toMatchObject({ success: false, status: 0 });
    });
});
