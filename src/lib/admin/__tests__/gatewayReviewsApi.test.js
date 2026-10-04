import {
    getGatewayReviews,
    getGatewayReviewByReference,
    getGatewayReviewSettings,
    updateGatewayReviewSettings,
    resolveGatewayReview,
} from '../gatewayReviewsApi';

describe('gatewayReviewsApi (Server-side Strapi Client)', () => {
    const originalFetch = global.fetch;

    beforeEach(() => {
        global.fetch = jest.fn();
    });

    afterEach(() => {
        global.fetch = originalFetch;
        jest.clearAllMocks();
    });

    const mockJwt = 'mock-admin-jwt-token';

    describe('getGatewayReviews', () => {
        it('fetches reviews with query parameters and Authorization header', async () => {
            const mockResponse = {
                data: [
                    {
                        caseId: 'case-101',
                        clientReferenceCode: 'REF-101',
                        reasonCode: 'NO_CALLBACK',
                        status: 'open',
                    },
                ],
                pagination: { page: 2, pageSize: 10, total: 15 },
            };

            global.fetch.mockResolvedValueOnce({
                ok: true,
                status: 200,
                json: async () => mockResponse,
            });

            const result = await getGatewayReviews(mockJwt, {
                page: 2,
                pageSize: 10,
                status: 'open',
                reasonCode: 'NO_CALLBACK',
            });

            expect(global.fetch).toHaveBeenCalledTimes(1);
            const [url, options] = global.fetch.mock.calls[0];
            expect(url).toContain('/api/admin/gateway-reviews?');
            expect(url).toContain('page=2');
            expect(url).toContain('pageSize=10');
            expect(url).toContain('status=open');
            expect(url).toContain('reasonCode=NO_CALLBACK');
            expect(options.headers.Authorization).toBe(`Bearer ${mockJwt}`);
            expect(result).toEqual(mockResponse);
        });

        it('throws an error with status and code when Strapi returns non-ok response', async () => {
            global.fetch.mockResolvedValueOnce({
                ok: false,
                status: 500,
                json: async () => ({ error: { message: 'Internal Strapi error' }, code: 'INTERNAL_ERROR' }),
            });

            await expect(getGatewayReviews(mockJwt)).rejects.toMatchObject({
                status: 500,
                code: 'INTERNAL_ERROR',
            });
        });
    });

    describe('getGatewayReviewByReference', () => {
        it('fetches a single case by clientReferenceCode', async () => {
            const mockCase = {
                caseId: 'case-202',
                clientReferenceCode: 'REF-202',
                status: 'open',
            };

            global.fetch.mockResolvedValueOnce({
                ok: true,
                status: 200,
                json: async () => ({ data: mockCase }),
            });

            const result = await getGatewayReviewByReference(mockJwt, 'REF-202');
            expect(global.fetch).toHaveBeenCalledWith(
                expect.stringContaining('/api/admin/gateway-reviews/REF-202?historyPage=1'),
                expect.objectContaining({
                    headers: expect.objectContaining({
                        Authorization: `Bearer ${mockJwt}`,
                    }),
                })
            );
            expect(result).toEqual({ data: mockCase });
        });

        it('throws a 404 error if case is not found', async () => {
            global.fetch.mockResolvedValueOnce({
                ok: false,
                status: 404,
                json: async () => ({ code: 'NOT_FOUND', message: 'Not found' }),
            });

            await expect(getGatewayReviewByReference(mockJwt, 'NON-EXISTENT')).rejects.toMatchObject({
                status: 404,
            });
        });
    });

    describe('getGatewayReviewSettings & updateGatewayReviewSettings', () => {
        it('returns default 30 minutes when backend does not provide a number', async () => {
            global.fetch.mockResolvedValueOnce({
                ok: true,
                status: 200,
                json: async () => ({}),
            });

            const result = await getGatewayReviewSettings(mockJwt);
            expect(result.noCallbackMinutes).toBe(30);
        });

        it('saves valid threshold (1 to 1440)', async () => {
            global.fetch.mockResolvedValueOnce({
                ok: true,
                status: 200,
                json: async () => ({ noCallbackMinutes: 45 }),
            });

            const result = await updateGatewayReviewSettings(mockJwt, 45);
            expect(result.noCallbackMinutes).toBe(45);
            expect(global.fetch).toHaveBeenCalledWith(
                expect.stringContaining('/api/admin/gateway-reviews/settings'),
                expect.objectContaining({
                    method: 'PUT',
                    body: JSON.stringify({ noCallbackMinutes: 45 }),
                })
            );
        });

        it('rejects invalid threshold before calling fetch', async () => {
            await expect(updateGatewayReviewSettings(mockJwt, 0)).rejects.toMatchObject({
                status: 400,
                code: 'REVIEW_INVALID_THRESHOLD',
            });
            await expect(updateGatewayReviewSettings(mockJwt, 1441)).rejects.toMatchObject({
                status: 400,
                code: 'REVIEW_INVALID_THRESHOLD',
            });
            await expect(updateGatewayReviewSettings(mockJwt, 'invalid')).rejects.toMatchObject({
                status: 400,
                code: 'REVIEW_INVALID_THRESHOLD',
            });
            expect(global.fetch).not.toHaveBeenCalled();
        });
    });

    describe('resolveGatewayReview', () => {
        it('sends null for resolutionFinancialReferenceId when UNPAID_REJECTED', async () => {
            const mockResolved = {
                caseId: 'case-300',
                status: 'resolved',
                outcomeCode: 'UNPAID_REJECTED',
                resolutionFinancialReferenceId: null,
            };

            global.fetch.mockResolvedValueOnce({
                ok: true,
                status: 200,
                json: async () => mockResolved,
            });

            const result = await resolveGatewayReview(mockJwt, 'REF-300', {
                outcomeCode: 'UNPAID_REJECTED',
                resolutionFinancialReferenceId: null,
            });

            expect(global.fetch).toHaveBeenCalledWith(
                expect.stringContaining('/api/admin/gateway-reviews/REF-300/resolve'),
                expect.objectContaining({
                    method: 'POST',
                    body: JSON.stringify({
                        outcomeCode: 'UNPAID_REJECTED',
                        resolutionFinancialReferenceId: null,
                    }),
                })
            );
            expect(result).toEqual(mockResolved);
        });

        it('sends financial reference for PAID_AND_CONFIRMED and REVERSED_REJECTED', async () => {
            const mockResolved = {
                caseId: 'case-301',
                status: 'resolved',
                outcomeCode: 'PAID_AND_CONFIRMED',
                resolutionFinancialReferenceId: 'REF-BANK-999',
            };

            global.fetch.mockResolvedValueOnce({
                ok: true,
                status: 200,
                json: async () => mockResolved,
            });

            const result = await resolveGatewayReview(mockJwt, 'REF-301', {
                outcomeCode: 'PAID_AND_CONFIRMED',
                resolutionFinancialReferenceId: 'REF-BANK-999',
            });

            expect(global.fetch).toHaveBeenCalledWith(
                expect.stringContaining('/api/admin/gateway-reviews/REF-301/resolve'),
                expect.objectContaining({
                    method: 'POST',
                    body: JSON.stringify({
                        outcomeCode: 'PAID_AND_CONFIRMED',
                        resolutionFinancialReferenceId: 'REF-BANK-999',
                    }),
                })
            );
            expect(result).toEqual(mockResolved);
        });

        it('propagates 409 REVIEW_CASE_CONFLICT from backend', async () => {
            global.fetch.mockResolvedValueOnce({
                ok: false,
                status: 409,
                json: async () => ({ code: 'REVIEW_CASE_CONFLICT' }),
            });

            await expect(
                resolveGatewayReview(mockJwt, 'REF-CONFLICT', {
                    outcomeCode: 'PAID_AND_CONFIRMED',
                    resolutionFinancialReferenceId: 'REF-123',
                })
            ).rejects.toMatchObject({
                status: 409,
                code: 'REVIEW_CASE_CONFLICT',
            });
        });

        it('propagates 422 REVIEW_MANUAL_REFUND_NOT_SUPPORTED', async () => {
            global.fetch.mockResolvedValueOnce({
                ok: false,
                status: 422,
                json: async () => ({ code: 'REVIEW_MANUAL_REFUND_NOT_SUPPORTED' }),
            });

            await expect(
                resolveGatewayReview(mockJwt, 'REF-422', {
                    outcomeCode: 'MANUAL_REFUND',
                })
            ).rejects.toMatchObject({
                status: 422,
                code: 'REVIEW_MANUAL_REFUND_NOT_SUPPORTED',
            });
        });

        it('propagates 503 REVIEW_RESOLUTION_DELIVERY_UNKNOWN when delivery fails', async () => {
            global.fetch.mockResolvedValueOnce({
                ok: false,
                status: 503,
                json: async () => ({ code: 'REVIEW_RESOLUTION_DELIVERY_UNKNOWN', caseId: 'case-99' }),
            });

            await expect(
                resolveGatewayReview(mockJwt, 'REF-503', {
                    outcomeCode: 'PAID_AND_CONFIRMED',
                    resolutionFinancialReferenceId: 'RRN-503',
                })
            ).rejects.toMatchObject({
                status: 503,
                code: 'REVIEW_RESOLUTION_DELIVERY_UNKNOWN',
            });
        });
    });
});

