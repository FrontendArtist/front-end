/**
 * D2: ثبت دستی سفارش ادمین فقط از endpoint سبد ادمین بای‌مانی (I11-AO)؛ بدون order استرپی.
 */
import { getServerSession } from 'next-auth/next';
import { createAdminCartOrderWithByeMoney } from '@/lib/byeMoneyApi';
import { POST } from './route';

jest.mock('next-auth/next', () => ({ getServerSession: jest.fn() }));
jest.mock('@/lib/auth', () => ({ authOptions: {}, isUserAdmin: () => true }));
jest.mock('@/lib/byeMoneyApi', () => ({
    createAdminCartOrderWithByeMoney: jest.fn(),
    getBatchBalancesWithByeMoney: jest.fn(),
    CourseOrderId: { for: (_s, id) => `cart:${String(id).toLowerCase()}` },
}));
jest.mock('next/server', () => ({ NextResponse: { json: (body, init) => ({ body, status: init?.status || 200 }) } }));

const JWT = 'server-admin-jwt';
const CART_ID = '11111111-1111-4111-8111-111111111111';
const req = (body) => ({ json: async () => body });
const valid = (extra = {}) => ({
    cartId: CART_ID,
    userId: '7',
    items: [
        { externalId: 'course-doc', type: 'course' },
        { externalId: 'chapter-int-id', type: 'course_chapter' },
    ],
    isFree: false,
    ...extra,
});

describe('POST /api/admin/orders/manual', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        getServerSession.mockResolvedValue({ user: { jwt: JWT, role: { type: 'administrator' } } });
        global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => ({ id: 7, documentId: 'user-doc' }) });
        createAdminCartOrderWithByeMoney.mockResolvedValue({ success: true, data: { status: 'Paid' } });
    });

    test('sends course and chapter by their own ids to the admin cart endpoint with the server JWT', async () => {
        const res = await POST(req(valid()));
        expect(res.status).toBe(200);
        expect(res.body.orderId).toBe(`cart:${CART_ID}`);
        expect(createAdminCartOrderWithByeMoney).toHaveBeenCalledWith({
            cartId: CART_ID,
            beneficiaryExternalUserId: 'user-doc',
            items: [
                { externalId: 'course-doc', type: 'course', quantity: 1 },
                { externalId: 'chapter-int-id', type: 'course_chapter', quantity: 1 },
            ],
            isFree: false,
            freeReason: '',
            jwt: JWT,
        });
    });

    test('never calls the Strapi orders endpoint', async () => {
        await POST(req(valid({ isFree: true, freeReason: 'gift' })));
        const urls = global.fetch.mock.calls.map(([url]) => String(url));
        expect(urls.some((u) => u.includes('/api/orders'))).toBe(false);
        expect(createAdminCartOrderWithByeMoney.mock.calls[0][0]).toMatchObject({ isFree: true, freeReason: 'gift' });
    });

    test('maps insufficient balance to a clear 409 without success', async () => {
        createAdminCartOrderWithByeMoney.mockResolvedValue({
            success: false, status: 409, conflict: true, insufficientBalance: true, code: 'INSUFFICIENT_NOOR_BALANCE', error: 'x',
        });
        const res = await POST(req(valid()));
        expect(res.status).toBe(409);
        expect(res.body.insufficientBalance).toBe(true);
        expect(res.body.code).toBe('INSUFFICIENT_NOOR_BALANCE');
        expect(res.body.error).toContain('کافی نیست');
    });

    test('passes other ByeMoney errors through unchanged', async () => {
        createAdminCartOrderWithByeMoney.mockResolvedValue({ success: false, status: 409, conflict: true, code: 'CART_CONFLICT', error: 'قبلاً خریده شده' });
        const res = await POST(req(valid()));
        expect(res.status).toBe(409);
        expect(res.body.error).toBe('قبلاً خریده شده');
    });

    test.each([
        ['bad cartId', { cartId: 'nope' }],
        ['no items', { items: [] }],
        ['product item', { items: [{ externalId: 'p', type: 'product' }] }],
        ['duplicate item', { items: [{ externalId: 'a', type: 'course' }, { externalId: 'a', type: 'course' }] }],
        ['free without reason', { isFree: true, freeReason: ' ' }],
    ])('rejects %s with 400 and no upstream call', async (_n, extra) => {
        const res = await POST(req(valid(extra)));
        expect(res.status).toBe(400);
        expect(createAdminCartOrderWithByeMoney).not.toHaveBeenCalled();
    });

    test('rejects missing session', async () => {
        getServerSession.mockResolvedValue(null);
        const res = await POST(req(valid()));
        expect(res.status).toBe(401);
        expect(createAdminCartOrderWithByeMoney).not.toHaveBeenCalled();
    });
});
