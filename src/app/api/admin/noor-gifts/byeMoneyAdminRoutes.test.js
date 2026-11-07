/**
 * BND-07: routeهای سروری نازک ادمین بای‌مانی (هدیهٔ نور، شارژ کمکی، موجودی دسته‌ای، رسید ادمین).
 */
import { getServerSession } from 'next-auth/next';
import {
    createAdminAssistedTopUpWithByeMoney, getAdminCourseOrderReceipt, getBatchBalancesWithByeMoney,
    sendNoorGiftWithByeMoney,
} from '@/lib/byeMoneyApi';
import { POST as postGift } from './route';
import { POST as postAssisted } from '../topups/assisted/route';
import { POST as postBalances } from '../wallets/batch-balances/route';
import { GET as getReceipt } from '../byemoney-orders/[orderId]/receipt/route';

jest.mock('next-auth/next', () => ({ getServerSession: jest.fn() }));
jest.mock('@/lib/auth', () => ({ authOptions: {} }));
jest.mock('@/lib/byeMoneyApi', () => ({
    sendNoorGiftWithByeMoney: jest.fn(),
    createAdminAssistedTopUpWithByeMoney: jest.fn(),
    getBatchBalancesWithByeMoney: jest.fn(),
    getAdminCourseOrderReceipt: jest.fn(),
}));
jest.mock('next/server', () => ({ NextResponse: { json: (body, init) => ({ body, status: init?.status || 200 }) } }));

const JWT = 'server-admin-jwt';
const ORDER_ID = 'cart:11111111-1111-1111-1111-111111111111';
const headers = (values = {}) => ({ get: (name) => values[name] ?? null });
const jsonRequest = (body, extraHeaders) => ({ json: async () => body, headers: headers(extraHeaders) });

const receiptFile = { name: 'r.jpg', size: 3 };
const assistedRequest = () => ({
    headers: headers({ 'Idempotency-Key': 'key-2' }),
    formData: async () => {
        const values = {
            beneficiaryExternalUserId: 'doc-1', amountToman: '1000', amountRial: '10000', receipt: receiptFile,
        };
        return { get: (name) => values[name] ?? null };
    },
});

const routes = [
    {
        name: 'POST /api/admin/noor-gifts',
        lib: sendNoorGiftWithByeMoney,
        call: () => postGift(jsonRequest({ externalUserIds: ['doc-1'], amountNoor: 5, reason: 'r' }, { 'Idempotency-Key': 'key-1' })),
        expectedArgs: { externalUserIds: ['doc-1'], amountNoor: 5, reason: 'r', idempotencyKey: 'key-1', jwt: JWT },
    },
    {
        name: 'POST /api/admin/topups/assisted',
        lib: createAdminAssistedTopUpWithByeMoney,
        call: () => postAssisted(assistedRequest()),
        expectedArgs: {
            beneficiaryExternalUserId: 'doc-1', amountToman: '1000', amountRial: '10000', receipt: receiptFile,
            externalTransactionId: undefined, idempotencyKey: 'key-2', jwt: JWT,
        },
    },
    {
        name: 'POST /api/admin/wallets/batch-balances',
        lib: getBatchBalancesWithByeMoney,
        call: () => postBalances(jsonRequest({ userIds: ['doc-1'] })),
        expectedArgs: { userIds: ['doc-1'], jwt: JWT },
    },
    {
        name: 'GET /api/admin/byemoney-orders/[orderId]/receipt',
        lib: getAdminCourseOrderReceipt,
        call: () => getReceipt({}, { params: Promise.resolve({ orderId: ORDER_ID }) }),
        expectedArgs: { jwt: JWT, orderId: ORDER_ID },
    },
];

beforeEach(() => {
    jest.clearAllMocks();
    getServerSession.mockResolvedValue({ user: { jwt: JWT, role: { type: 'administrator' } } });
});

describe.each(routes)('$name', ({ lib, call, expectedArgs }) => {
    test('بدون نشست ۴۰۱ و بای‌مانی صدا زده نمی‌شود', async () => {
        getServerSession.mockResolvedValue(null);
        const res = await call();
        expect(res.status).toBe(401);
        expect(lib).not.toHaveBeenCalled();
    });

    test('کاربر غیرادمین ۴۰۳ و بای‌مانی صدا زده نمی‌شود', async () => {
        getServerSession.mockResolvedValue({ user: { jwt: 'user-jwt', role: { type: 'authenticated' } } });
        const res = await call();
        expect(res.status).toBe(403);
        expect(lib).not.toHaveBeenCalled();
    });

    test('پاسخ موفق با JWT نشست سروری عبور می‌کند و توکن در پاسخ نیست', async () => {
        lib.mockResolvedValue({ success: true, data: { ok: 1 }, balances: { 'doc-1': 7 } });
        const res = await call();
        expect(lib).toHaveBeenCalledWith(expectedArgs);
        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(JSON.stringify(res.body)).not.toContain(JWT);
    });

    test('۴۰۳ بای‌مانی بی‌تغییر برمی‌گردد', async () => {
        lib.mockResolvedValue({ success: false, status: 403, forbidden: true, error: 'مجوز ندارید.' });
        const res = await call();
        expect(res.status).toBe(403);
        expect(res.body.error).toBe('مجوز ندارید.');
    });
});

test('خطای شبکهٔ بای‌مانی ۵۰۲ و invalidUsers هدیه حفظ می‌شود', async () => {
    sendNoorGiftWithByeMoney.mockResolvedValue({ success: false, status: 0, error: 'قطع' });
    expect((await routes[0].call()).status).toBe(502);
    sendNoorGiftWithByeMoney.mockResolvedValue({ success: false, status: 400, invalidUsers: ['x'], error: 'نامعتبر' });
    const res = await routes[0].call();
    expect(res.status).toBe(400);
    expect(res.body.invalidUsers).toEqual(['x']);
});
