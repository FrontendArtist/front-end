import { PUT } from './route';
import { getServerSession } from 'next-auth/next';
import { confirmTopUpWithByeMoney } from '@/lib/byeMoneyApi';

jest.mock('next-auth/next', () => ({ getServerSession: jest.fn() }));
jest.mock('@/lib/auth', () => ({ authOptions: {} }));
jest.mock('@/lib/byeMoneyApi', () => ({ confirmTopUpWithByeMoney: jest.fn(), rejectTopUpWithByeMoney: jest.fn() }));
jest.mock('next/server', () => ({ NextResponse: { json: (body, init) => ({ body, status: init?.status || 200 }) } }));

const TOPUP_ID = '11111111-1111-1111-1111-111111111111';
const ctx = { params: Promise.resolve({ id: '7' }) };
const req = (body) => ({ json: async () => body });

function mockStrapiOrder(orderData) {
  global.fetch = jest.fn(async (url, init) => {
    if (init?.method === 'PUT') {
      return { ok: true, json: async () => ({ data: { id: 7 } }) };
    }
    return { ok: true, json: async () => ({ data: orderData }) };
  });
}

beforeEach(() => {
  confirmTopUpWithByeMoney.mockReset();
  getServerSession.mockResolvedValue({ user: { jwt: 'admin-jwt', role: { type: 'administrator' } } });
});

describe('PUT /api/admin/orders/[id] — تأیید فیش قدیمی', () => {
  it('بدون مقدار نور ساخت‌یافته رد می‌شود و از متن یادداشت یا مبلغ ریالی حدس نمی‌زند', async () => {
    mockStrapiOrder({ notes: `شارژ 50 نور [TOPUP_ID:${TOPUP_ID}]`, totalPrice: 500000 });

    const res = await PUT(req({ documentId: 'doc-7', paymentStatus: 'paid' }), ctx);

    expect(res.status).toBe(400);
    expect(confirmTopUpWithByeMoney).not.toHaveBeenCalled();
    expect(global.fetch.mock.calls.some(([, init]) => init?.method === 'PUT')).toBe(false);
  });

  it('مقدار تگ ثبت‌شده هنگام ساخت سفارش به بای‌مانی ارسال می‌شود', async () => {
    mockStrapiOrder({ notes: `[TOPUP_ID:${TOPUP_ID}] [LIGHT_AMOUNT:30]`, totalPrice: 500000 });
    confirmTopUpWithByeMoney.mockResolvedValue({ success: true });

    const res = await PUT(req({ documentId: 'doc-7', paymentStatus: 'paid' }), ctx);

    expect(res.status).toBe(200);
    expect(confirmTopUpWithByeMoney).toHaveBeenCalledWith(expect.objectContaining({ topUpId: TOPUP_ID, confirmedAmount: 30 }));
  });

  it('رد مغایرت مبلغ در بای‌مانی سفارش استرپی را paid نمی‌کند', async () => {
    mockStrapiOrder({ notes: `[TOPUP_ID:${TOPUP_ID}]` });
    confirmTopUpWithByeMoney.mockResolvedValue({ success: false, status: 400, error: 'مبلغ مغایر است' });

    const res = await PUT(req({ documentId: 'doc-7', paymentStatus: 'paid', confirmedAmount: 12 }), ctx);

    expect(res.status).toBe(400);
    expect(confirmTopUpWithByeMoney).toHaveBeenCalledWith(expect.objectContaining({ confirmedAmount: 12 }));
    expect(global.fetch.mock.calls.some(([, init]) => init?.method === 'PUT')).toBe(false);
  });
});
