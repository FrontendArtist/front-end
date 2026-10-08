/** @jest-environment node */
jest.mock('@/lib/admin/gatewayReviewAccess', () => ({ getGatewayReviewAccess: jest.fn() }));
jest.mock('@/lib/admin/gatewayReviewsApi');
import { getGatewayReviewAccess } from '@/lib/admin/gatewayReviewAccess';
import * as api from '@/lib/admin/gatewayReviewsApi';
import { GET as list } from '../route';
import { GET as detail } from '../[clientReferenceCode]/route';
import { GET as settings, PUT as updateSettings } from '../settings/route';
import { POST as resolve } from '../[clientReferenceCode]/resolve/route';
import { POST as reopen } from '../[clientReferenceCode]/reopen/route';

const payload = () => ({ outcomeCode: 'NO_MATCHING_DEPOSIT', resolutionFinancialReferenceId: null, evidence: {
    operationId: '12345678-1234-1234-1234-123456789abc', expectedRevision: 1, checkedReportDate: '2026-09-30',
    matchingDepositFound: false, note: 'بررسی بانک', depositReference: null, depositDate: null, depositAmountRial: null, manualRefundReference: null,
} });
const context = { params: Promise.resolve({ clientReferenceCode: 'TR-1' }) };
const request = body => new Request('http://localhost/api/admin/gateway-reviews/TR-1/resolve', { method: 'POST', body: JSON.stringify(body) });

beforeEach(() => {
    jest.clearAllMocks();
    getGatewayReviewAccess.mockResolvedValue({ status: 200, session: { user: { jwt: 'staff-jwt', role: { type: 'authenticated' } } } });
});

test.each([401, 403, 500, 503])('all read and write routes preserve access failure status (%i)', async status => {
    getGatewayReviewAccess.mockResolvedValue({ status, session: null });
    for (const route of [list, detail, settings, updateSettings, resolve, reopen]) {
        const response = await route(request(payload()), context);
        expect(response.status).toBe(status);
    }
    expect(api.resolveGatewayReview).not.toHaveBeenCalled();
});

test('list passes pagination and filters for financially authorized non-admin staff', async () => {
    api.getGatewayReviews.mockResolvedValue({ data: [], pagination: { total: 0 } });
    expect((await list(new Request('http://localhost/api/admin/gateway-reviews?page=2&status=open'))).status).toBe(200);
    expect(api.getGatewayReviews).toHaveBeenCalledWith('staff-jwt', expect.objectContaining({ page: 2, status: 'open' }));
});
test('detail passes history pagination', async () => {
    api.getGatewayReviewByReference.mockResolvedValue({ data: { caseId: 'case' } });
    expect((await detail(new Request('http://localhost/api/admin/gateway-reviews/TR-1?historyPage=3'), context)).status).toBe(200);
    expect(api.getGatewayReviewByReference).toHaveBeenCalledWith('staff-jwt', 'TR-1', 3);
});
test('missing case is 404', async () => {
    api.getGatewayReviewByReference.mockResolvedValue({ data: null });
    expect((await detail(new Request('http://localhost/api/admin/gateway-reviews/TR-1'), context)).status).toBe(404);
});
test('invalid threshold is rejected', async () => {
    expect((await updateSettings(request({ noCallbackMinutes: 0 }))).status).toBe(400);
    expect(api.updateGatewayReviewSettings).not.toHaveBeenCalled();
});
test('missing report is rejected before sending', async () => {
    expect((await resolve(request({ outcomeCode: 'NO_MATCHING_DEPOSIT' }), context)).status).toBe(400);
    expect(api.resolveGatewayReview).not.toHaveBeenCalled();
});
test('complete no-match closure passes exact operation and evidence', async () => {
    api.resolveGatewayReview.mockResolvedValue({ status: 'resolved' });
    const body = payload();
    expect((await resolve(request(body), context)).status).toBe(200);
    expect(api.resolveGatewayReview).toHaveBeenCalledWith('staff-jwt', 'TR-1', body);
});
test('manual refund is forwarded with reference; financial rejection remains 422', async () => {
    const body = payload(); body.outcomeCode = 'MANUAL_REFUND'; body.evidence.manualRefundReference = 'refund-ref';
    api.resolveGatewayReview.mockRejectedValue({ status: 422, code: 'REVIEW_MANUAL_REFUND_NOT_SUPPORTED' });
    const response = await resolve(request(body), context);
    expect(response.status).toBe(422);
    expect((await response.json()).code).toBe('REVIEW_MANUAL_REFUND_NOT_SUPPORTED');
});
test('unknown delivery does not report successful closure', async () => {
    api.resolveGatewayReview.mockRejectedValue({ status: 503, code: 'REVIEW_RESOLUTION_DELIVERY_UNKNOWN' });
    expect((await resolve(request(payload()), context)).status).toBe(503);
});

