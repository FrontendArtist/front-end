import {
  closeCourseOrderSettlementPeriod,
  getCourseOrderSettlementPeriodOrders,
  getCourseOrderSettlementPreview,
} from '../byeMoneyApi';

jest.mock('../byeMoneySync.js', () => ({ BYEMONEY_API_URL: 'https://byemoney.test' }));

const TOKEN = 'a'.repeat(64);
const res = (status, body) => ({ status, json: () => Promise.resolve(body) });
const originalFetch = global.fetch;
beforeEach(() => { global.fetch = jest.fn(); });
afterAll(() => { global.fetch = originalFetch; });

describe('ByeMoney course-order settlements client (I11-S)', () => {
  test('preview calls the admin path with paging and bearer token', async () => {
    global.fetch.mockResolvedValue(res(200, { orderCount: 2, previewToken: TOKEN }));
    const r = await getCourseOrderSettlementPreview({ jwt: 'j', page: 2, pageSize: 50 });
    expect(r).toEqual({ success: true, status: 200, data: { orderCount: 2, previewToken: TOKEN } });
    const [url, init] = global.fetch.mock.calls[0];
    expect(url).toBe('https://byemoney.test/api/admin/order-settlements/preview?page=2&pageSize=50');
    expect(init.headers.Authorization).toBe('Bearer j');
  });

  test('close sends previewToken verbatim and returns 201', async () => {
    global.fetch.mockResolvedValue(res(201, { periodId: 'p', orderCount: 2 }));
    const r = await closeCourseOrderSettlementPeriod({ jwt: 'j', title: 'آبان', previewToken: TOKEN });
    expect(r.success).toBe(true);
    expect(r.status).toBe(201);
    const [url, init] = global.fetch.mock.calls[0];
    expect(url).toBe('https://byemoney.test/api/admin/order-settlements');
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body)).toEqual({ title: 'آبان', note: null, previewToken: TOKEN });
  });

  test('409 keeps the structured code and the Persian message from ByeMoney', async () => {
    global.fetch.mockResolvedValue(res(409, { code: 'SETTLEMENT_PREVIEW_CHANGED', error: 'فهرست تغییر کرده است.' }));
    const r = await closeCourseOrderSettlementPeriod({ jwt: 'j', previewToken: TOKEN });
    expect(r).toEqual({ success: false, status: 409, code: 'SETTLEMENT_PREVIEW_CHANGED', error: 'فهرست تغییر کرده است.' });
  });

  test('403 maps to a permission message instead of throwing', async () => {
    global.fetch.mockResolvedValue(res(403, {}));
    const r = await getCourseOrderSettlementPreview({ jwt: 'j' });
    expect(r.success).toBe(false);
    expect(r.status).toBe(403);
    expect(r.error).toMatch(/Purchases\.View/);
    global.fetch.mockResolvedValue(res(403, {}));
    expect((await closeCourseOrderSettlementPeriod({ jwt: 'j', previewToken: TOKEN })).error).toMatch(/Purchases\.Settle/);
  });

  test('missing period is 404 and network failure is 502', async () => {
    global.fetch.mockResolvedValue(res(404, {}));
    expect((await getCourseOrderSettlementPeriodOrders({ jwt: 'j', periodId: 'x' })).status).toBe(404);
    global.fetch.mockRejectedValue(new Error('down'));
    expect((await getCourseOrderSettlementPreview({ jwt: 'j' })).status).toBe(502);
  });

  test('no jwt never calls ByeMoney', async () => {
    expect((await getCourseOrderSettlementPreview({})).status).toBe(401);
    expect(global.fetch).not.toHaveBeenCalled();
  });
});
