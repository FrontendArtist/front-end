import { createMockCallback, createMockToken, getSepMockEnvironmentError, isSepMockEnabled, readMockRef, readMockToken } from '../sepMock';
import { requestSepToken, reverseSepTransaction, verifySepTransaction } from '../sepPayment';

describe('local SEP mock', () => {
    const previous = {
        nodeEnv: process.env.NODE_ENV,
        enabled: process.env.SEP_MOCK_ENABLED,
        secret: process.env.SEP_MOCK_SECRET,
        strapiUrl: process.env.NEXT_PUBLIC_STRAPI_URL,
    };
    const params = { amount: 50000, resNum: 'order-123',
        redirectUrl: 'http://localhost:3000/api/payment/verify' };

    beforeEach(() => {
        process.env.NODE_ENV = 'development';
        process.env.SEP_MOCK_ENABLED = 'true';
        process.env.SEP_MOCK_SECRET = 'local-test-secret';
        global.fetch = jest.fn();
    });

    afterEach(() => {
        process.env.NODE_ENV = previous.nodeEnv;
        if (previous.enabled === undefined) delete process.env.SEP_MOCK_ENABLED;
        else process.env.SEP_MOCK_ENABLED = previous.enabled;
        if (previous.secret === undefined) delete process.env.SEP_MOCK_SECRET;
        else process.env.SEP_MOCK_SECRET = previous.secret;
        if (previous.strapiUrl === undefined) delete process.env.NEXT_PUBLIC_STRAPI_URL;
        else process.env.NEXT_PUBLIC_STRAPI_URL = previous.strapiUrl;
        jest.restoreAllMocks();
    });

    it('uses the shared SEP adapter without contacting the bank', async () => {
        expect(isSepMockEnabled()).toBe(true);
        const tokenResult = await requestSepToken(params);
        expect(tokenResult.success).toBe(true);
        expect(tokenResult.gatewayUrl).toBe('/api/payment/mock');
        const callback = createMockCallback(tokenResult.token, 'success');
        expect(callback.fields.ResNum).toBe(params.resNum);
        expect(callback.fields.State).toBe('OK');
        const verified = await verifySepTransaction({ refNum: callback.fields.RefNum });
        expect(verified.success).toBe(true);
        expect(verified.transactionDetail.OrginalAmount).toBe(params.amount);
        expect(verified.transactionDetail.AffectiveAmount).toBe(params.amount);
        expect(verified.transactionDetail.RefNum).toBe(callback.fields.RefNum);
        expect(global.fetch).not.toHaveBeenCalled();
    });

    it('supports cancellation, verification failure and amount mismatch', async () => {
        const { token } = await requestSepToken(params);
        const cancelled = createMockCallback(token, 'cancel');
        expect(cancelled.fields.State).toBe('CanceledByUser');
        expect(cancelled.fields.RefNum).toBe('');

        const bankFailed = createMockCallback(token, 'bank_failed');
        expect(bankFailed.fields.State).toBe('Failed');
        expect(bankFailed.fields.Status).toBe('3');
        expect(bankFailed.fields.RefNum).toBe('');

        const sessionExpired = createMockCallback(token, 'session_expired');
        expect(sessionExpired.fields.State).toBe('SessionIsNull');
        expect(sessionExpired.fields.Status).toBe('0');
        expect(sessionExpired.fields.RefNum).toBe('');

        const failed = await verifySepTransaction({ refNum: createMockCallback(token, 'verify_failed').fields.RefNum });
        expect(failed.success).toBe(false);
        expect(failed.resultCode).toBe(-2);

        const expired = await verifySepTransaction({ refNum: createMockCallback(token, 'verify_expired').fields.RefNum });
        expect(expired.success).toBe(false);
        expect(expired.resultCode).toBe(-6);

        const mismatchRef = createMockCallback(token, 'amount_mismatch').fields.RefNum;
        expect(mismatchRef.length).toBeLessThanOrEqual(100);
        const mismatch = await verifySepTransaction({ refNum: mismatchRef });
        expect(mismatch.transactionDetail.OrginalAmount).toBe(params.amount + 1);
        expect((await reverseSepTransaction({ refNum: mismatchRef })).success).toBe(true);

        const revFailedRef = createMockCallback(token, 'reverse_failed').fields.RefNum;
        const revFailedVerify = await verifySepTransaction({ refNum: revFailedRef });
        expect(revFailedVerify.success).toBe(true);
        const revResult = await reverseSepTransaction({ refNum: revFailedRef });
        expect(revResult.success).toBe(false);
        expect(revResult.resultCode).toBe(-104);

        expect(global.fetch).not.toHaveBeenCalled();
    });

    it('rejects forged and expired mock values and non-local callbacks', async () => {
        expect(createMockToken({ ...params, redirectUrl: 'https://tarhelahi.ir/api/payment/verify' }).success).toBe(false);
        expect(createMockToken({ ...params, redirectUrl: 'http://127.0.0.1:3000/api/payment/verify' }).success).toBe(true);
        const { token } = createMockToken(params);
        expect(readMockToken(`${token}x`)).toBeNull();
        expect(createMockCallback(`${token}x`, 'success')).toBeNull();
        const ref = createMockCallback(token, 'success').fields.RefNum;
        expect(readMockRef(`${ref}x`)).toBeNull();
        expect((await verifySepTransaction({ refNum: `${ref}x` })).success).toBe(false);
        jest.spyOn(Date, 'now').mockReturnValue(Date.now() + 61 * 60 * 1000);
        expect(readMockToken(token)).toBeNull();
        expect(readMockRef(ref)).toBeNull();
    });

    it('never enables the mock outside development', () => {
        process.env.NODE_ENV = 'production';
        expect(isSepMockEnabled()).toBe(false);
    });

    it('blocks mock payments when Strapi points to a remote server', () => {
        process.env.NEXT_PUBLIC_STRAPI_URL = 'https://api.tarhelahi.ir';
        expect(getSepMockEnvironmentError()).toContain('محلی');
        expect(createMockToken(params).success).toBe(false);
    });
});
