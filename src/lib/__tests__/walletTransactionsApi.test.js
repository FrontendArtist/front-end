import { getWalletTransactionsWithByeMoney, getWalletBalanceWithByeMoney } from '@/lib/byeMoneyApi';

jest.mock('@/lib/byeMoneySync', () => ({ BYEMONEY_API_URL: 'http://byemoney.test' }));

describe('wallet transactions API client', () => {
    beforeEach(() => {
        global.fetch = jest.fn();
    });

    it('calls the paged endpoint with bearer token and maps the page', async () => {
        global.fetch.mockResolvedValue({
            ok: true,
            status: 200,
            json: async () => ({ items: [{ transactionId: 't1', amountNoor: 10 }], page: 2, pageSize: 5, totalCount: 6 }),
        });

        const result = await getWalletTransactionsWithByeMoney({ jwt: 'jwt', page: 2, pageSize: 5 });

        expect(global.fetch).toHaveBeenCalledWith(
            'http://byemoney.test/api/wallet/transactions?page=2&pageSize=5',
            expect.objectContaining({ headers: { Authorization: 'Bearer jwt' } }));
        expect(result).toEqual({
            success: true, items: [{ transactionId: 't1', amountNoor: 10 }], page: 2, pageSize: 5, totalCount: 6,
        });
    });

    it('reports unauthorized on 401', async () => {
        global.fetch.mockResolvedValue({ ok: false, status: 401, json: async () => ({}) });

        const result = await getWalletTransactionsWithByeMoney({ jwt: 'jwt' });

        expect(result.success).toBe(false);
        expect(result.unauthorized).toBe(true);
        expect(result.items).toEqual([]);
    });

    it('does not call the network without a token', async () => {
        const result = await getWalletTransactionsWithByeMoney({ jwt: null });

        expect(global.fetch).not.toHaveBeenCalled();
        expect(result.unauthorized).toBe(true);
    });

    it('returns gift balance from the balance endpoint', async () => {
        global.fetch.mockResolvedValue({
            ok: true, status: 200, json: async () => ({ balance: 80, currency: 'Noor', giftBalance: 20 }),
        });

        const result = await getWalletBalanceWithByeMoney({ jwt: 'jwt' });

        expect(result).toEqual({ success: true, balance: 80, giftBalance: 20, currency: 'Noor' });
    });
});
