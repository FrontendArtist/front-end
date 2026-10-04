import {
    formatGatewayReviewError,
    fetchGatewayReviews,
    fetchGatewayReview,
    fetchGatewayReviewSettings,
    saveGatewayReviewSettings,
    resolveGatewayReview,
} from '../gatewayReviewsClient';

describe('gatewayReviewsClient', () => {
    const originalFetch = global.fetch;

    beforeEach(() => {
        global.fetch = jest.fn();
    });

    afterEach(() => {
        global.fetch = originalFetch;
        jest.clearAllMocks();
    });

    describe('formatGatewayReviewError', () => {
        it('formats 409 REVIEW_CASE_CONFLICT correctly without auto-resolving', () => {
            const err = { status: 409, code: 'REVIEW_CASE_CONFLICT' };
            const formatted = formatGatewayReviewError(err);
            expect(formatted.code).toBe('REVIEW_CASE_CONFLICT');
            expect(formatted.message).toContain('تعارض در پرونده رسیدگی');
            expect(formatted.message).toContain('خودکار حل‌شده فرض نمی‌شود');
            expect(formatted.isUnknownOutcome).toBe(false);
        });

        it('formats 409 REVIEW_STATE_MISMATCH correctly', () => {
            const err = { status: 409, code: 'REVIEW_STATE_MISMATCH' };
            const formatted = formatGatewayReviewError(err);
            expect(formatted.code).toBe('REVIEW_STATE_MISMATCH');
            expect(formatted.message).toContain('تعارض وضعیت در سرویس مالی');
            expect(formatted.isUnknownOutcome).toBe(false);
        });

        it('formats 422 REVIEW_MANUAL_REFUND_NOT_SUPPORTED with Persian message', () => {
            const err = { status: 422, code: 'REVIEW_MANUAL_REFUND_NOT_SUPPORTED' };
            const formatted = formatGatewayReviewError(err);
            expect(formatted.code).toBe('REVIEW_MANUAL_REFUND_NOT_SUPPORTED');
            expect(formatted.message).toContain('بازپرداخت دستی یا استرداد وجه در این سامانه پشتیبانی نمی‌شود');
            expect(formatted.isUnknownOutcome).toBe(false);
        });

        it('marks 503 and delivery unknown as unknown outcome', () => {
            const err = { status: 503, code: 'REVIEW_RESOLUTION_DELIVERY_UNKNOWN' };
            const formatted = formatGatewayReviewError(err);
            expect(formatted.isUnknownOutcome).toBe(true);
            expect(formatted.message).toContain('نامعلوم');
        });

        it('marks network errors as unknown outcome with warning message', () => {
            const err = new TypeError('Failed to fetch');
            const formatted = formatGatewayReviewError(err);
            expect(formatted.code).toBe('NETWORK_ERROR');
            expect(formatted.isUnknownOutcome).toBe(true);
            expect(formatted.message).toContain('خطای شبکه');
            expect(formatted.message).toContain('نتیجه عملیات نامعلوم است');
        });
    });

    describe('fetchGatewayReviews & fetchGatewayReview', () => {
        it('passes query params to /api/admin/gateway-reviews', async () => {
            global.fetch.mockResolvedValueOnce({
                ok: true,
                status: 200,
                json: async () => ({ data: [], pagination: { page: 1, pageSize: 25, total: 0 } }),
            });

            await fetchGatewayReviews({ page: 3, pageSize: 50, status: 'open', reasonCode: 'NO_CALLBACK' });
            expect(global.fetch).toHaveBeenCalledTimes(1);
            const url = global.fetch.mock.calls[0][0];
            expect(url).toContain('page=3');
            expect(url).toContain('pageSize=50');
            expect(url).toContain('status=open');
            expect(url).toContain('reasonCode=NO_CALLBACK');
        });

        it('fetches single review from /api/admin/gateway-reviews/:clientReferenceCode', async () => {
            const mockCase = { caseId: 'c1', clientReferenceCode: 'REF-001' };
            global.fetch.mockResolvedValueOnce({
                ok: true,
                status: 200,
                json: async () => ({ data: mockCase }),
            });

            const result = await fetchGatewayReview('REF-001');
            expect(global.fetch).toHaveBeenCalledWith('/api/admin/gateway-reviews/REF-001');
            expect(result).toEqual(mockCase);
        });
    });

    describe('saveGatewayReviewSettings', () => {
        it('validates threshold client-side before calling fetch', async () => {
            await expect(saveGatewayReviewSettings(0)).rejects.toMatchObject({
                status: 400,
                code: 'REVIEW_INVALID_THRESHOLD',
            });
            await expect(saveGatewayReviewSettings(1441)).rejects.toMatchObject({
                status: 400,
                code: 'REVIEW_INVALID_THRESHOLD',
            });
            expect(global.fetch).not.toHaveBeenCalled();
        });

        it('sends PUT to settings when valid', async () => {
            global.fetch.mockResolvedValueOnce({
                ok: true,
                status: 200,
                json: async () => ({ noCallbackMinutes: 60 }),
            });

            const result = await saveGatewayReviewSettings(60);
            expect(result).toBe(60);
            expect(global.fetch).toHaveBeenCalledWith(
                '/api/admin/gateway-reviews/settings',
                expect.objectContaining({
                    method: 'PUT',
                    body: JSON.stringify({ noCallbackMinutes: 60 }),
                })
            );
        });
    });

    describe('resolveGatewayReview', () => {
        it('rejects MANUAL_REFUND on client with 422', async () => {
            await expect(
                resolveGatewayReview('REF-1', { outcomeCode: 'MANUAL_REFUND' })
            ).rejects.toMatchObject({
                status: 422,
                code: 'REVIEW_MANUAL_REFUND_NOT_SUPPORTED',
            });
            expect(global.fetch).not.toHaveBeenCalled();
        });

        it('rejects UNPAID_REJECTED if financial reference is provided', async () => {
            await expect(
                resolveGatewayReview('REF-1', {
                    outcomeCode: 'UNPAID_REJECTED',
                    resolutionFinancialReferenceId: 'SOME-REF',
                })
            ).rejects.toMatchObject({
                status: 400,
                code: 'REVIEW_INVALID_RESOLUTION',
            });
            expect(global.fetch).not.toHaveBeenCalled();
        });

        it('rejects PAID_AND_CONFIRMED if financial reference is missing', async () => {
            await expect(
                resolveGatewayReview('REF-1', {
                    outcomeCode: 'PAID_AND_CONFIRMED',
                    resolutionFinancialReferenceId: '',
                })
            ).rejects.toMatchObject({
                status: 400,
                code: 'REVIEW_INVALID_RESOLUTION',
            });
            expect(global.fetch).not.toHaveBeenCalled();
        });

        it('sends null as financial reference for valid UNPAID_REJECTED', async () => {
            global.fetch.mockResolvedValueOnce({
                ok: true,
                status: 200,
                json: async () => ({ caseId: 'c1', status: 'resolved' }),
            });

            await resolveGatewayReview('REF-1', {
                outcomeCode: 'UNPAID_REJECTED',
                resolutionFinancialReferenceId: null,
            });

            expect(global.fetch).toHaveBeenCalledWith(
                '/api/admin/gateway-reviews/REF-1/resolve',
                expect.objectContaining({
                    method: 'POST',
                    body: JSON.stringify({
                        outcomeCode: 'UNPAID_REJECTED',
                        resolutionFinancialReferenceId: null,
                    }),
                })
            );
        });
    });
});

