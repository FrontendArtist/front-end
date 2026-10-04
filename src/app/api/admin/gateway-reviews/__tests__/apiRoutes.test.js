/**
 * @jest-environment node
 */

jest.mock('next-auth/next', () => ({
    getServerSession: jest.fn(),
}));

jest.mock('@/lib/auth', () => ({
    authOptions: {},
    isUserAdmin: jest.fn(),
}));

jest.mock('@/lib/admin/gatewayReviewsApi');

import { GET as listRoute } from '../route';
import { GET as getSettingsRoute, PUT as putSettingsRoute } from '../settings/route';
import { GET as getDetailRoute } from '../[clientReferenceCode]/route';
import { POST as resolveRoute } from '../[clientReferenceCode]/resolve/route';
import { getServerSession } from 'next-auth/next';
import { isUserAdmin } from '@/lib/auth';
import * as gatewayReviewsApi from '@/lib/admin/gatewayReviewsApi';

describe('Gateway Reviews Next.js API Routes', () => {
    const adminSession = {
        user: { id: 1, role: { type: 'administrator' }, jwt: 'admin-jwt-123' },
    };

    beforeEach(() => {
        jest.clearAllMocks();
        getServerSession.mockResolvedValue(adminSession);
        isUserAdmin.mockReturnValue(true);
    });

    describe('GET /api/admin/gateway-reviews', () => {
        it('blocks unauthorized access if user is not admin', async () => {
            isUserAdmin.mockReturnValue(false);
            const req = new Request('http://localhost:3000/api/admin/gateway-reviews');
            const res = await listRoute(req);
            expect(res.status).toBe(401);
            const json = await res.json();
            expect(json.error).toBe('دسترسی غیرمجاز');
        });

        it('forwards query parameters to getGatewayReviews and returns data', async () => {
            const mockData = {
                data: [{ caseId: 'c1' }],
                pagination: { page: 1, pageSize: 25, total: 1 },
            };
            gatewayReviewsApi.getGatewayReviews.mockResolvedValueOnce(mockData);

            const req = new Request('http://localhost:3000/api/admin/gateway-reviews?page=2&pageSize=10&status=open&reasonCode=NO_CALLBACK');
            const res = await listRoute(req);

            expect(res.status).toBe(200);
            expect(gatewayReviewsApi.getGatewayReviews).toHaveBeenCalledWith('admin-jwt-123', {
                page: 2,
                pageSize: 10,
                status: 'open',
                reasonCode: 'NO_CALLBACK',
            });
            const json = await res.json();
            expect(json).toEqual(mockData);
        });
    });

    describe('Settings Routes (GET & PUT /api/admin/gateway-reviews/settings)', () => {
        it('GET returns settings from Strapi', async () => {
            gatewayReviewsApi.getGatewayReviewSettings.mockResolvedValueOnce({ noCallbackMinutes: 30 });
            const res = await getSettingsRoute();
            expect(res.status).toBe(200);
            const json = await res.json();
            expect(json.noCallbackMinutes).toBe(30);
        });

        it('PUT validates noCallbackMinutes is integer between 1 and 1440', async () => {
            const reqInvalid = new Request('http://localhost:3000/api/admin/gateway-reviews/settings', {
                method: 'PUT',
                body: JSON.stringify({ noCallbackMinutes: 0 }),
            });
            const resInvalid = await putSettingsRoute(reqInvalid);
            expect(resInvalid.status).toBe(400);
            const jsonInvalid = await resInvalid.json();
            expect(jsonInvalid.code).toBe('REVIEW_INVALID_THRESHOLD');

            const reqValid = new Request('http://localhost:3000/api/admin/gateway-reviews/settings', {
                method: 'PUT',
                body: JSON.stringify({ noCallbackMinutes: 60 }),
            });
            gatewayReviewsApi.updateGatewayReviewSettings.mockResolvedValueOnce({ noCallbackMinutes: 60 });
            const resValid = await putSettingsRoute(reqValid);
            expect(resValid.status).toBe(200);
            const jsonValid = await resValid.json();
            expect(jsonValid.noCallbackMinutes).toBe(60);
        });
    });

    describe('GET /api/admin/gateway-reviews/[clientReferenceCode]', () => {
        it('returns 404 when case is not found', async () => {
            gatewayReviewsApi.getGatewayReviewByReference.mockResolvedValueOnce({ data: null });
            const req = new Request('http://localhost:3000/api/admin/gateway-reviews/UNKNOWN');
            const res = await getDetailRoute(req, { params: { clientReferenceCode: 'UNKNOWN' } });
            expect(res.status).toBe(404);
        });

        it('returns case data when found', async () => {
            const mockCase = { caseId: 'c1', clientReferenceCode: 'REF-1' };
            gatewayReviewsApi.getGatewayReviewByReference.mockResolvedValueOnce({ data: mockCase });
            const req = new Request('http://localhost:3000/api/admin/gateway-reviews/REF-1');
            const res = await getDetailRoute(req, { params: { clientReferenceCode: 'REF-1' } });
            expect(res.status).toBe(200);
            const json = await res.json();
            expect(json.data).toEqual(mockCase);
        });
    });

    describe('POST /api/admin/gateway-reviews/[clientReferenceCode]/resolve', () => {
        it('returns 422 for MANUAL_REFUND', async () => {
            const req = new Request('http://localhost:3000/api/admin/gateway-reviews/REF-1/resolve', {
                method: 'POST',
                body: JSON.stringify({ outcomeCode: 'MANUAL_REFUND' }),
            });
            const res = await resolveRoute(req, { params: { clientReferenceCode: 'REF-1' } });
            expect(res.status).toBe(422);
            const json = await res.json();
            expect(json.code).toBe('REVIEW_MANUAL_REFUND_NOT_SUPPORTED');
        });

        it('returns 400 when outcome is invalid', async () => {
            const req = new Request('http://localhost:3000/api/admin/gateway-reviews/REF-1/resolve', {
                method: 'POST',
                body: JSON.stringify({ outcomeCode: 'INVALID_CODE' }),
            });
            const res = await resolveRoute(req, { params: { clientReferenceCode: 'REF-1' } });
            expect(res.status).toBe(400);
            const json = await res.json();
            expect(json.code).toBe('REVIEW_INVALID_RESOLUTION');
        });

        it('returns 400 when UNPAID_REJECTED has financial reference', async () => {
            const req = new Request('http://localhost:3000/api/admin/gateway-reviews/REF-1/resolve', {
                method: 'POST',
                body: JSON.stringify({
                    outcomeCode: 'UNPAID_REJECTED',
                    resolutionFinancialReferenceId: 'SHOULD_NOT_BE_HERE',
                }),
            });
            const res = await resolveRoute(req, { params: { clientReferenceCode: 'REF-1' } });
            expect(res.status).toBe(400);
            const json = await res.json();
            expect(json.code).toBe('REVIEW_INVALID_RESOLUTION');
        });

        it('returns 400 when PAID_AND_CONFIRMED is missing financial reference', async () => {
            const req = new Request('http://localhost:3000/api/admin/gateway-reviews/REF-1/resolve', {
                method: 'POST',
                body: JSON.stringify({
                    outcomeCode: 'PAID_AND_CONFIRMED',
                    resolutionFinancialReferenceId: '',
                }),
            });
            const res = await resolveRoute(req, { params: { clientReferenceCode: 'REF-1' } });
            expect(res.status).toBe(400);
            const json = await res.json();
            expect(json.code).toBe('REVIEW_INVALID_RESOLUTION');
        });

        it('successfully resolves UNPAID_REJECTED with null ref', async () => {
            const mockResolved = { caseId: 'c1', status: 'resolved', outcomeCode: 'UNPAID_REJECTED' };
            gatewayReviewsApi.resolveGatewayReview.mockResolvedValueOnce(mockResolved);

            const req = new Request('http://localhost:3000/api/admin/gateway-reviews/REF-1/resolve', {
                method: 'POST',
                body: JSON.stringify({
                    outcomeCode: 'UNPAID_REJECTED',
                }),
            });
            const res = await resolveRoute(req, { params: { clientReferenceCode: 'REF-1' } });
            expect(res.status).toBe(200);
            expect(gatewayReviewsApi.resolveGatewayReview).toHaveBeenCalledWith('admin-jwt-123', 'REF-1', {
                outcomeCode: 'UNPAID_REJECTED',
                resolutionFinancialReferenceId: null,
            });
            const json = await res.json();
            expect(json).toEqual(mockResolved);
        });

        it('successfully resolves PAID_AND_CONFIRMED with valid ref', async () => {
            const mockResolved = { caseId: 'c1', status: 'resolved', outcomeCode: 'PAID_AND_CONFIRMED' };
            gatewayReviewsApi.resolveGatewayReview.mockResolvedValueOnce(mockResolved);

            const req = new Request('http://localhost:3000/api/admin/gateway-reviews/REF-1/resolve', {
                method: 'POST',
                body: JSON.stringify({
                    outcomeCode: 'PAID_AND_CONFIRMED',
                    resolutionFinancialReferenceId: 'RRN-999',
                }),
            });
            const res = await resolveRoute(req, { params: { clientReferenceCode: 'REF-1' } });
            expect(res.status).toBe(200);
            expect(gatewayReviewsApi.resolveGatewayReview).toHaveBeenCalledWith('admin-jwt-123', 'REF-1', {
                outcomeCode: 'PAID_AND_CONFIRMED',
                resolutionFinancialReferenceId: 'RRN-999',
            });
            const json = await res.json();
            expect(json).toEqual(mockResolved);
        });
    });
});

