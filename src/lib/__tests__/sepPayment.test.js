import {
    requestSepToken,
    verifySepTransaction,
    reverseSepTransaction,
    getSepErrorMessage,
    SEP_TERMINAL_ID,
    SEP_GATEWAY_ACTION_URL,
} from '../sepPayment';

describe('SEP Payment Service', () => {
    const originalFetch = global.fetch;

    beforeEach(() => {
        global.fetch = jest.fn();
    });

    afterEach(() => {
        global.fetch = originalFetch;
        jest.clearAllMocks();
    });

    describe('getSepErrorMessage', () => {
        it('returns correct message for CanceledByUser', () => {
            expect(getSepErrorMessage('CanceledByUser')).toBe('پرداخت توسط کاربر لغو شد.');
        });

        it('returns correct message for verify code -6', () => {
            expect(getSepErrorMessage('-6')).toContain('بیش از ۳۰ دقیقه');
        });

        it('returns fallback for unknown code', () => {
            expect(getSepErrorMessage('UNKNOWN_CODE')).toBe('خطای درگاه پرداخت سامان (UNKNOWN_CODE)');
        });
    });

    describe('requestSepToken', () => {
        it('throws error if amount is missing or invalid', async () => {
            await expect(requestSepToken({ amount: 0, resNum: '123', redirectUrl: 'http://test' }))
                .rejects.toThrow('مبلغ تراکنش نامعتبر است.');
        });

        it('throws error if resNum is missing', async () => {
            await expect(requestSepToken({ amount: 1000, resNum: '', redirectUrl: 'http://test' }))
                .rejects.toThrow('شناسه فاکتور (ResNum) الزامی است.');
        });

        it('successfully gets token from SEP API', async () => {
            global.fetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({
                    status: 1,
                    token: 'mock-token-xyz-123',
                }),
            });

            const res = await requestSepToken({
                amount: 50000,
                resNum: 'ORDER-123',
                redirectUrl: 'https://tarhelahi.ir/api/payment/verify',
                cellNumber: '09123456789',
            });

            expect(global.fetch).toHaveBeenCalledTimes(1);
            const [url, options] = global.fetch.mock.calls[0];
            expect(url).toContain('onlinepg');
            const sentBody = JSON.parse(options.body);
            expect(sentBody.Action).toBe('Token');
            expect(sentBody.TerminalId).toBe(SEP_TERMINAL_ID);
            expect(sentBody.Amount).toBe(50000);
            expect(sentBody.ResNum).toBe('ORDER-123');
            expect(sentBody.RedirectUrl).toBe('https://tarhelahi.ir/api/payment/verify');
            expect(sentBody.CellNumber).toBe('09123456789');

            expect(res.success).toBe(true);
            expect(res.token).toBe('mock-token-xyz-123');
            expect(res.gatewayUrl).toBe(SEP_GATEWAY_ACTION_URL);
        });

        it('handles rejection from SEP API', async () => {
            global.fetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({
                    status: -1,
                    errorCode: '8',
                    errorDesc: 'آدرس سرور پذیرنده نامعتبر است.',
                }),
            });

            const res = await requestSepToken({
                amount: 50000,
                resNum: 'ORDER-123',
                redirectUrl: 'https://tarhelahi.ir/api/payment/verify',
            });

            expect(res.success).toBe(false);
            expect(res.errorCode).toBe('8');
            expect(res.errorDesc).toContain('آدرس سرور پذیرنده');
        });
    });

    describe('verifySepTransaction', () => {
        it('throws error if refNum is missing', async () => {
            await expect(verifySepTransaction({ refNum: '' }))
                .rejects.toThrow('شماره رسید دیجیتالی (RefNum) جهت تایید تراکنش الزامی است.');
        });

        it('successfully verifies transaction with bank', async () => {
            global.fetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({
                    Success: true,
                    ResultCode: 0,
                    ResultDescription: 'عملیات با موفقیت انجام شد',
                    TransactionDetail: {
                        RRN: '123456789',
                        RefNum: 'REF-999',
                        MaskedPan: '603799****1234',
                        OrginalAmount: 50000,
                        StraceNo: '778899',
                    },
                }),
            });

            const res = await verifySepTransaction({ refNum: 'REF-999' });

            expect(global.fetch).toHaveBeenCalledTimes(1);
            const [url, options] = global.fetch.mock.calls[0];
            expect(url).toContain('VerifyTransaction');
            const sentBody = JSON.parse(options.body);
            expect(sentBody.RefNum).toBe('REF-999');
            expect(sentBody.TerminalNumber).toBe(Number(SEP_TERMINAL_ID));

            expect(res.success).toBe(true);
            expect(res.resultCode).toBe(0);
            expect(res.transactionDetail.MaskedPan).toBe('603799****1234');
            expect(res.transactionDetail.OrginalAmount).toBe(50000);
        });

        it('handles failure when verify returns non-zero ResultCode', async () => {
            global.fetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({
                    Success: false,
                    ResultCode: -2,
                    ResultDescription: 'تراکنش یافت نشد.',
                }),
            });

            const res = await verifySepTransaction({ refNum: 'REF-INVALID' });

            expect(res.success).toBe(false);
            expect(res.resultCode).toBe(-2);
            expect(res.resultDescription).toBe('تراکنش یافت نشد.');
        });
    });

    describe('reverseSepTransaction', () => {
        it('sends reverse request to SEP', async () => {
            global.fetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({
                    Success: true,
                    ResultCode: 0,
                    ResultDescription: 'تراکنش با موفقیت بازگشت داده شد',
                }),
            });

            const res = await reverseSepTransaction({ refNum: 'REF-REV' });
            expect(res.success).toBe(true);
            expect(res.resultCode).toBe(0);
        });
    });
});
