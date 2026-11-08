/**
 * I11-W: routeهای سروری نازک خروج نور ادمین، شارژهای قابل استرداد و نرخ فعلی (BND-07).
 */
import { getServerSession } from 'next-auth/next';
import { lookupPeople } from '@/lib/courseOrderSettlementRoute';
import * as lib from '@/lib/byeMoneyNoorWithdrawals';
import { GET as listRoute, POST as createRoute } from './route';
import { POST as payRoute } from './[id]/payment/route';
import { POST as reverseRoute } from './[id]/reverse/route';
import { GET as receiptRoute } from './[id]/receipt/route';
import { GET as topUpsRoute } from './refundable-topups/route';
import { GET as rateRoute } from './conversion-rate/route';
import { getConversionRateWithByeMoney } from '@/lib/byeMoneyApi';

jest.mock('next-auth/next', () => ({ getServerSession: jest.fn() }));
jest.mock('@/lib/auth', () => ({ authOptions: {} }));
jest.mock('@/lib/byeMoneyNoorWithdrawals', () => ({
    createNoorWithdrawalWithByeMoney: jest.fn(),
    listNoorWithdrawalsWithByeMoney: jest.fn(),
    markNoorWithdrawalPaidWithByeMoney: jest.fn(),
    reverseNoorWithdrawalWithByeMoney: jest.fn(),
    getNoorWithdrawalReceiptWithByeMoney: jest.fn(),
    listRefundableTopUpsWithByeMoney: jest.fn(),
}));
jest.mock('@/lib/byeMoneyApi', () => ({ getConversionRateWithByeMoney: jest.fn() }));
jest.mock('@/lib/courseOrderSettlementRoute', () => ({ lookupPeople: jest.fn() }));
jest.mock('next/server', () => ({
    NextResponse: Object.assign(function NextResponse(body, init) { return { body, status: init?.status || 200 }; }, {
        json: (body, init) => ({ body, status: init?.status || 200 }),
    }),
}));

const JWT = 'server-admin-jwt';
const params = (value) => ({ params: Promise.resolve(value) });
const form = (values) => ({ formData: async () => ({
    get: (n) => values[n] ?? null,
    entries: () => Object.entries(values),
}) });
const file = { name: 'r.png', size: 3 };

const calls = [
    ['GET list', () => listRoute({ url: 'http://x/api/admin/noor-withdrawals?status=Paid&limit=5' }), lib.listNoorWithdrawalsWithByeMoney,
        { jwt: JWT, status: 'Paid', userExternalId: undefined, limit: '5' }],
    ['POST create', () => createRoute(form({ operationId: 'op-1', userExternalId: 'doc-1', receipt: file })), lib.createNoorWithdrawalWithByeMoney,
        { jwt: JWT, fields: { operationId: 'op-1', userExternalId: 'doc-1' }, receipt: file }],
    ['POST payment', () => payRoute(form({ paymentReference: 'ref', receipt: file }), params({ id: 'w1' })), lib.markNoorWithdrawalPaidWithByeMoney,
        { jwt: JWT, id: 'w1', paymentReference: 'ref', receipt: file }],
    ['POST reverse', () => reverseRoute({ json: async () => ({ reason: 'x' }) }, params({ id: 'w1' })), lib.reverseNoorWithdrawalWithByeMoney,
        { jwt: JWT, id: 'w1', reason: 'x' }],
    ['GET receipt', () => receiptRoute({}, params({ id: 'w1' })), lib.getNoorWithdrawalReceiptWithByeMoney, { jwt: JWT, id: 'w1' }],
    ['GET refundable-topups', () => topUpsRoute({ url: 'http://x/api/admin/noor-withdrawals/refundable-topups?userExternalId=doc-1' }), lib.listRefundableTopUpsWithByeMoney,
        { jwt: JWT, userExternalId: 'doc-1' }],
    ['GET conversion-rate', () => rateRoute(), getConversionRateWithByeMoney, { jwt: JWT }],
];

describe('noor-withdrawal routes', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        getServerSession.mockResolvedValue({ user: { jwt: JWT, role: { type: 'administrator' } } });
        Object.values(lib).forEach((fn) => fn.mockResolvedValue?.({ success: true, data: {} }));
        getConversionRateWithByeMoney.mockResolvedValue({ success: true, rialPerNoor: 100000, tomanPerNoor: 10000 });
    });

    test.each(calls)('%s: بدون نشست ۴۰۱ و بدون فراخوانی بای‌مانی', async (_n, call, libFn) => {
        getServerSession.mockResolvedValue(null);
        expect((await call()).status).toBe(401);
        expect(libFn).not.toHaveBeenCalled();
    });

    test.each(calls)('%s: غیرادمین ۴۰۳', async (_n, call, libFn) => {
        getServerSession.mockResolvedValue({ user: { jwt: JWT, role: { type: 'authenticated' } } });
        expect((await call()).status).toBe(403);
        expect(libFn).not.toHaveBeenCalled();
    });

    test.each(calls)('%s: JWT فقط از نشست سروری و ورودی دست‌نخورده', async (_n, call, libFn, expected) => {
        await call();
        expect(libFn).toHaveBeenCalledWith(expect.objectContaining(expected));
    });

    test('GET list: نام کاربر از استرپی اضافه می‌شود و شکست واکشی نام را خالی می‌گذارد', async () => {
        lib.listNoorWithdrawalsWithByeMoney.mockResolvedValue({
            success: true, data: [{ id: 'w1', userExternalId: 'doc-1' }, { id: 'w2', userExternalId: 'doc-2' }],
        });
        lookupPeople.mockResolvedValue(new Map([['doc-1', { name: 'علی رضایی', phone: null }]]));
        const res = await listRoute({ url: 'http://x/api/admin/noor-withdrawals' });
        expect(lookupPeople).toHaveBeenCalledWith(JWT, ['doc-1', 'doc-2']);
        expect(res.body.data).toEqual([
            { id: 'w1', userExternalId: 'doc-1', userName: 'علی رضایی' },
            { id: 'w2', userExternalId: 'doc-2', userName: null },
        ]);
    });

    test('خطای {code,error} بای‌مانی با همان کد و پیام عبور می‌کند', async () => {
        lib.createNoorWithdrawalWithByeMoney.mockResolvedValue({
            success: false, status: 409, code: 'NOOR_WITHDRAWAL_TOPUP_ALREADY_REFUNDED', error: 'پیام بای‌مانی',
        });
        const res = await createRoute(form({ operationId: 'op-1' }));
        expect(res.status).toBe(409);
        expect(res.body).toMatchObject({ code: 'NOOR_WITHDRAWAL_TOPUP_ALREADY_REFUNDED', error: 'پیام بای‌مانی' });
    });

    test('conversion-rate: فقط rialPerNoor به مرورگر می‌رسد و خطا بدون نرخ حدسی است', async () => {
        expect((await rateRoute()).body).toMatchObject({ success: true, rialPerNoor: 100000 });
        expect((await rateRoute()).body).not.toHaveProperty('tomanPerNoor');
        getConversionRateWithByeMoney.mockResolvedValue({ success: false, error: 'نرخ نیست' });
        const res = await rateRoute();
        expect(res.status).toBe(502);
        expect(res.body).toMatchObject({ success: false, error: 'نرخ نیست' });
    });
});
