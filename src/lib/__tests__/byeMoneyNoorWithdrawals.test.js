/**
 * I11-W: کلاینت سروری بای‌مانی برای خروج نور و شارژهای قابل استرداد.
 */
import {
    createNoorWithdrawalWithByeMoney, listNoorWithdrawalsWithByeMoney, listRefundableTopUpsWithByeMoney,
    reverseNoorWithdrawalWithByeMoney,
} from '../byeMoneyNoorWithdrawals';

const respond = (status, body) => ({
    ok: status >= 200 && status < 300, status, json: async () => body, headers: { get: () => null },
});

describe('byeMoneyNoorWithdrawals', () => {
    beforeEach(() => { global.fetch = jest.fn(); });

    test('بدون JWT فراخوانی انجام نمی‌شود', async () => {
        const res = await listNoorWithdrawalsWithByeMoney({});
        expect(res).toMatchObject({ success: false, unauthorized: true });
        expect(fetch).not.toHaveBeenCalled();
    });

    test('ثبت خروج: multipart با Bearer و فقط فیلدهای قرارداد', async () => {
        fetch.mockResolvedValue(respond(200, { id: 'w1' }));
        const receipt = new Blob(['x'], { type: 'image/png' });
        await createNoorWithdrawalWithByeMoney({
            jwt: 'J', receipt, fields: { operationId: 'op', userExternalId: 'doc', amountRial: '100', amountNoor: '5', hack: 'no', description: '' },
        });
        const [url, init] = fetch.mock.calls[0];
        expect(url).toMatch(/\/api\/admin\/noor-withdrawals$/);
        expect(init.headers.Authorization).toBe('Bearer J');
        expect(init.body.get('operationId')).toBe('op');
        expect(init.body.get('amountRial')).toBe('100');
        expect(init.body.has('hack')).toBe(false);
        expect(init.body.has('amountNoor')).toBe(false);
        expect(init.body.has('description')).toBe(false);
        expect(init.body.get('receipt')).toBeTruthy();
    });

    test('خطای {code,error} بدون تغییر برمی‌گردد', async () => {
        fetch.mockResolvedValue(respond(400, { code: 'NOOR_WITHDRAWAL_INSUFFICIENT_BALANCE', error: 'موجودی کافی نیست' }));
        const res = await reverseNoorWithdrawalWithByeMoney({ jwt: 'J', id: 'w1', reason: 'r' });
        expect(res).toEqual({ success: false, status: 400, code: 'NOOR_WITHDRAWAL_INSUFFICIENT_BALANCE', error: 'موجودی کافی نیست' });
    });

    test('شارژهای قابل استرداد: userExternalId کدشده و فقط فیلدهای قرارداد', async () => {
        fetch.mockResolvedValue(respond(200, [{
            id: 't1', clientReferenceCode: 'TP-1', amountNoor: 50, amountRial: 5000000, rialPerNoor: 100000,
            confirmedAtUtc: '2026-11-01T00:00:00Z', hasActiveRefund: true, userId: 'internal-guid',
        }]));
        const res = await listRefundableTopUpsWithByeMoney({ jwt: 'J', userExternalId: 'doc 1' });
        expect(fetch.mock.calls[0][0]).toMatch(/noor-withdrawals\/refundable-topups\?userExternalId=doc%201$/);
        expect(res.data).toEqual([{
            id: 't1', clientReferenceCode: 'TP-1', amountNoor: 50, amountRial: 5000000, rialPerNoor: 100000,
            confirmedAtUtc: '2026-11-01T00:00:00Z', hasActiveRefund: true,
        }]);
        expect(JSON.stringify(res)).not.toContain('internal-guid');
    });

    test('شارژهای قابل استرداد: خطا بدون تغییر و بدنهٔ غیرآرایه خالی', async () => {
        fetch.mockResolvedValueOnce(respond(403, { error: 'مجوز ندارید' }));
        expect(await listRefundableTopUpsWithByeMoney({ jwt: 'J', userExternalId: 'd' }))
            .toEqual({ success: false, status: 403, error: 'مجوز ندارید' });
        fetch.mockResolvedValueOnce(respond(200, {}));
        expect(await listRefundableTopUpsWithByeMoney({ jwt: 'J', userExternalId: 'd' })).toEqual({ success: true, data: [] });
    });

});
