import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import GatewayReviewDetail from '../GatewayReviewDetail';
import * as clientApi from '@/lib/client/admin/gatewayReviewsClient';

jest.mock('@/lib/client/admin/gatewayReviewsClient', () => {
    const actual = jest.requireActual('@/lib/client/admin/gatewayReviewsClient');
    return {
        ...actual,
        resolveGatewayReview: jest.fn(),
    };
});

describe('GatewayReviewDetail Component', () => {
    const mockOpenCase = {
        caseId: 'CASE-OPEN-100',
        clientReferenceCode: 'REF-OPEN-100',
        topUpRequestId: 'topup-req-100',
        topUpStatus: 'Pending',
        reasonCode: 'NO_CALLBACK',
        status: 'open',
        openedAtUtc: '2026-10-04T07:30:00Z',
        resolvedAtUtc: null,
        outcomeCode: null,
        resolutionFinancialReferenceId: null,
        deliveryStatus: 'pending',
        deliveryError: null,
        history: [
            {
                eventType: 'case_opened',
                eventId: 'EVT-01',
                evidenceStage: 'CALLBACK',
                evidenceKind: 'no_callback_timeout',
                details: { thresholdMinutes: 30, attemptId: 100 },
                occurredAtUtc: '2026-10-04T07:30:00Z',
            },
        ],
    };

    const mockResolvedCase = {
        ...mockOpenCase,
        status: 'resolved',
        outcomeCode: 'PAID_AND_CONFIRMED',
        resolutionFinancialReferenceId: 'RRN-BANK-12345',
        resolvedAtUtc: '2026-10-04T08:00:00Z',
    };

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('renders case details and evidence history timeline', () => {
        render(<GatewayReviewDetail initialCase={mockOpenCase} />);

        expect(screen.getByText('رسیدگی به پرونده: REF-OPEN-100')).toBeInTheDocument();
        expect(screen.getByText('CASE-OPEN-100')).toBeInTheDocument();
        expect(screen.getByText('topup-req-100')).toBeInTheDocument();
        expect(screen.getByText('EVT-01')).toBeInTheDocument();
        expect(screen.getByText(/کال‌بک درگاه/)).toBeInTheDocument();
        expect(screen.getByText(/no_callback_timeout/)).toBeInTheDocument();
        expect(screen.getByText(/"thresholdMinutes": 30/)).toBeInTheDocument();
    });

    it('does not render resolution form for already resolved case', () => {
        render(<GatewayReviewDetail initialCase={mockResolvedCase} />);

        expect(screen.getByText('این پرونده قبلاً رسیدگی و بسته شده است.')).toBeInTheDocument();
        expect(screen.queryByLabelText('نتیجه رسیدگی:')).not.toBeInTheDocument();
    });

    it('validates outcome and financial reference before submitting', async () => {
        render(<GatewayReviewDetail initialCase={mockOpenCase} />);

        const submitBtn = screen.getByText('ثبت نتیجه رسیدگی');
        expect(submitBtn).toBeDisabled();

        const outcomeSelect = screen.getByLabelText('نتیجه رسیدگی:');
        fireEvent.change(outcomeSelect, { target: { value: 'PAID_AND_CONFIRMED' } });
        expect(submitBtn).not.toBeDisabled();

        // Submit without financial ref for PAID_AND_CONFIRMED
        fireEvent.click(submitBtn);
        expect(screen.getByText('برای این نتیجه، وارد کردن شناسه مرجع مالی بانکی الزامی است.')).toBeInTheDocument();
        expect(clientApi.resolveGatewayReview).not.toHaveBeenCalled();

        // Switch to UNPAID_REJECTED (financial ref input becomes disabled and cleared)
        fireEvent.change(outcomeSelect, { target: { value: 'UNPAID_REJECTED' } });
        const refInput = screen.getByLabelText(/شناسه مرجع مالی درگاه/);
        expect(refInput).toBeDisabled();

        // Now submission opens confirmation modal
        fireEvent.click(submitBtn);
        expect(screen.getByText('تأیید ثبت نتیجه رسیدگی')).toBeInTheDocument();
        expect(screen.getByText('بدون مرجع (null)')).toBeInTheDocument();

        // Mock resolve before clicking confirm
        clientApi.resolveGatewayReview.mockResolvedValueOnce({
            ...mockOpenCase,
            status: 'resolved',
            outcomeCode: 'UNPAID_REJECTED',
            resolutionFinancialReferenceId: null,
        });

        fireEvent.click(screen.getByText('بله، ثبت قطعی شود'));

        await waitFor(() => {
            expect(clientApi.resolveGatewayReview).toHaveBeenCalledWith('REF-OPEN-100', {
                outcomeCode: 'UNPAID_REJECTED',
                resolutionFinancialReferenceId: null,
            });
        });
        await waitFor(() => {
            expect(screen.getByText(/نتیجه رسیدگی با موفقیت ثبت شد/)).toBeInTheDocument();
        });
    });

    it('handles 409 REVIEW_CASE_CONFLICT and does not auto-resolve case', async () => {
        render(<GatewayReviewDetail initialCase={mockOpenCase} />);

        const outcomeSelect = screen.getByLabelText('نتیجه رسیدگی:');
        fireEvent.change(outcomeSelect, { target: { value: 'PAID_AND_CONFIRMED' } });

        const refInput = screen.getByLabelText(/شناسه مرجع مالی درگاه/);
        fireEvent.change(refInput, { target: { value: 'RRN-999' } });

        fireEvent.click(screen.getByText('ثبت نتیجه رسیدگی'));

        const conflictError = new Error('Conflict');
        conflictError.status = 409;
        conflictError.code = 'REVIEW_CASE_CONFLICT';
        clientApi.resolveGatewayReview.mockRejectedValueOnce(conflictError);

        fireEvent.click(screen.getByText('بله، ثبت قطعی شود'));

        await waitFor(() => {
            expect(screen.getByText(/تعارض در پرونده رسیدگی/)).toBeInTheDocument();
            expect(screen.getByText(/خودکار حل‌شده فرض نمی‌شود/)).toBeInTheDocument();
        });

        // Case status remains open in UI and form is still present
        expect(screen.getByText(/ثبت نتیجه رسیدگی به پرونده/)).toBeInTheDocument();
    });

    it('handles 422 REVIEW_MANUAL_REFUND_NOT_SUPPORTED', async () => {
        render(<GatewayReviewDetail initialCase={mockOpenCase} />);

        const outcomeSelect = screen.getByLabelText('نتیجه رسیدگی:');
        fireEvent.change(outcomeSelect, { target: { value: 'PAID_AND_CONFIRMED' } });

        const refInput = screen.getByLabelText(/شناسه مرجع مالی درگاه/);
        fireEvent.change(refInput, { target: { value: 'RRN-999' } });

        fireEvent.click(screen.getByText('ثبت نتیجه رسیدگی'));

        const refundError = new Error('Manual refund not supported');
        refundError.status = 422;
        refundError.code = 'REVIEW_MANUAL_REFUND_NOT_SUPPORTED';
        clientApi.resolveGatewayReview.mockRejectedValueOnce(refundError);

        fireEvent.click(screen.getByText('بله، ثبت قطعی شود'));

        await waitFor(() => {
            expect(screen.getByText(/بازپرداخت دستی یا استرداد وجه در این سامانه پشتیبانی نمی‌شود/)).toBeInTheDocument();
        });
    });

    it('handles 503 or Network Error as unknown outcome', async () => {
        render(<GatewayReviewDetail initialCase={mockOpenCase} />);

        const outcomeSelect = screen.getByLabelText('نتیجه رسیدگی:');
        fireEvent.change(outcomeSelect, { target: { value: 'PAID_AND_CONFIRMED' } });

        const refInput = screen.getByLabelText(/شناسه مرجع مالی درگاه/);
        fireEvent.change(refInput, { target: { value: 'RRN-999' } });

        fireEvent.click(screen.getByText('ثبت نتیجه رسیدگی'));

        const netError = new TypeError('Failed to fetch');
        clientApi.resolveGatewayReview.mockRejectedValueOnce(netError);

        fireEvent.click(screen.getByText('بله، ثبت قطعی شود'));

        await waitFor(() => {
            expect(screen.getByText(/نتیجه نامعلوم:/)).toBeInTheDocument();
            expect(screen.getByText(/خطای شبکه در ارتباط با سرور/)).toBeInTheDocument();
        });
    });
});

