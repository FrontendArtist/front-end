jest.mock('next-auth/next', () => ({ getServerSession: jest.fn() }));
jest.mock('@/lib/auth', () => ({ authOptions: {} }));
jest.mock('@/lib/admin/adminFetch', () => ({ adminFetch: jest.fn() }));
jest.mock('next/server', () => ({ NextResponse: { json: (body, init) => ({ body, status: init?.status ?? 200 }) } }));

import { adminFetch } from '@/lib/admin/adminFetch';
import { readCloseBody, readPaging, respondSettlementResult, withBuyerNames, withClosedByNames } from '../courseOrderSettlementRoute';

const TOKEN = 'ab'.repeat(32);
const req = (qs) => ({ url: `http://x/api?${qs}` });

describe('course-order settlement route helpers', () => {
  test('readPaging defaults and bounds pageSize to 1..100', () => {
    expect(readPaging(req(''))).toEqual({ page: 1, pageSize: 20 });
    expect(readPaging(req('page=3&pageSize=100'))).toEqual({ page: 3, pageSize: 100 });
    expect(readPaging(req('pageSize=101'))).toBeNull();
    expect(readPaging(req('page=0'))).toBeNull();
    expect(readPaging(req('page=abc'))).toBeNull();
  });

  test('readCloseBody enforces title/note limits and a 64-char token', () => {
    expect(readCloseBody({ previewToken: TOKEN })).toEqual({ title: null, note: null, previewToken: TOKEN });
    expect(readCloseBody({ title: ' آبان ', note: 'n', previewToken: TOKEN })).toEqual({ title: 'آبان', note: 'n', previewToken: TOKEN });
    expect(readCloseBody({ title: 'x'.repeat(201), previewToken: TOKEN })).toBeNull();
    expect(readCloseBody({ note: 'x'.repeat(1001), previewToken: TOKEN })).toBeNull();
    expect(readCloseBody({ previewToken: 'short' })).toBeNull();
    expect(readCloseBody(null)).toBeNull();
  });

  test('respondSettlementResult passes known statuses and hides others as 502', () => {
    expect(respondSettlementResult({ success: true, status: 201, data: { a: 1 } }))
      .toEqual({ body: { success: true, data: { a: 1 } }, status: 201 });
    expect(respondSettlementResult({ success: false, status: 409, code: 'SETTLEMENT_EMPTY', error: 'e' }))
      .toEqual({ body: { success: false, code: 'SETTLEMENT_EMPTY', error: 'e' }, status: 409 });
    expect(respondSettlementResult({ success: false, status: 500, error: 'e' }).status).toBe(502);
  });
});

describe('settlement name enrichment from Strapi', () => {
  test('adds buyer name/phone by documentId with one users query', async () => {
    adminFetch.mockResolvedValue([
      { documentId: 'u1', firstName: 'علی', lastName: 'رضایی', phoneNumber: '0912', username: 'ali' },
      { documentId: 'u2', firstName: '', lastName: '', username: 'sara' },
    ]);
    const items = await withBuyerNames('jwt', [
      { orderId: 'a', buyerExternalUserId: 'u1' },
      { orderId: 'b', buyerExternalUserId: 'u2' },
      { orderId: 'c', buyerExternalUserId: 'u1' },
      { orderId: 'd', buyerExternalUserId: 'gone' },
    ]);
    expect(adminFetch).toHaveBeenCalledTimes(1);
    const url = decodeURIComponent(adminFetch.mock.calls[0][0]);
    expect(url).toContain('filters[documentId][$in][0]=u1');
    expect(url).toContain('filters[documentId][$in][1]=u2');
    expect(url).not.toContain('[2]=u1');
    expect(items.map((o) => o.buyerName)).toEqual(['علی رضایی', 'sara', 'علی رضایی', null]);
    expect(items[0].buyerPhone).toBe('0912');
    expect(items[0].orderId).toBe('a');
  });

  test('Strapi failure leaves names empty instead of failing', async () => {
    adminFetch.mockResolvedValue(null);
    const periods = await withClosedByNames('jwt', [{ periodId: 'p', closedByExternalUserId: 'admin1' }]);
    expect(periods).toEqual([{ periodId: 'p', closedByExternalUserId: 'admin1', closedByName: null }]);
  });

  test('no ids means no Strapi call', async () => {
    adminFetch.mockClear();
    expect(await withBuyerNames('jwt', [])).toEqual([]);
    expect(adminFetch).not.toHaveBeenCalled();
  });
});
