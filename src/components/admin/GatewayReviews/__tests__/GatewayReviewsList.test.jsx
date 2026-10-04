import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import GatewayReviewsList from '../GatewayReviewsList';
import * as clientApi from '@/lib/client/admin/gatewayReviewsClient';

jest.mock('@/lib/client/admin/gatewayReviewsClient', () => {
    const actual = jest.requireActual('@/lib/client/admin/gatewayReviewsClient');
    return {
        ...actual,
        fetchGatewayReviews: jest.fn(),
    };
});

describe('GatewayReviewsList Component', () => {
    const mockCases = [
        {
            caseId: 'CASE-001',
            clientReferenceCode: 'REF-001',
            topUpRequestId: 'topup-1',
            topUpStatus: 'Pending',
            reasonCode: 'NO_CALLBACK',
            status: 'open',
            openedAtUtc: '2026-10-04T08:00:00Z',
            deliveryStatus: 'delivered',
            deliveryError: null,
            history: [],
        },
        {
            caseId: 'CASE-002',
            clientReferenceCode: 'REF-002',
            topUpRequestId: 'topup-2',
            topUpStatus: 'Confirmed',
            reasonCode: 'VERIFY_UNKNOWN',
            status: 'resolved',
            openedAtUtc: '2026-10-04T09:00:00Z',
            deliveryStatus: 'failed',
            deliveryError: 'DELIVERY_TIMEOUT',
            history: [],
        },
    ];

    const initialData = {
        data: mockCases,
        pagination: { page: 1, pageSize: 25, total: 2 },
    };

    beforeEach(() => {
        jest.clearAllMocks();
        clientApi.fetchGatewayReviews.mockResolvedValue(initialData);
    });

    it('renders initial list and case details in table', () => {
        render(<GatewayReviewsList initialData={initialData} />);

        expect(screen.getByText('رسیدگی به پرداخت‌های سپ')).toBeInTheDocument();
        expect(screen.getByText('REF-001')).toBeInTheDocument();
        expect(screen.getByText('CASE-001')).toBeInTheDocument();
        expect(screen.getByText('REF-002')).toBeInTheDocument();
        expect(screen.getByText('CASE-002')).toBeInTheDocument();
        expect(screen.getByText('عدم دریافت کال‌بک از درگاه')).toBeInTheDocument();
        expect(screen.getByText('استعلام نامعلوم از درگاه')).toBeInTheDocument();
        expect(screen.getByText('DELIVERY_TIMEOUT')).toBeInTheDocument();
    });

    it('triggers refetch when status filter is changed', async () => {
        render(<GatewayReviewsList initialData={initialData} />);

        const statusSelect = screen.getByLabelText('وضعیت پرونده:');
        fireEvent.change(statusSelect, { target: { value: 'open' } });

        await waitFor(() => {
            expect(clientApi.fetchGatewayReviews).toHaveBeenCalledWith(
                expect.objectContaining({
                    status: 'open',
                    page: 1,
                })
            );
        });
    });

    it('triggers refetch when reason filter is changed', async () => {
        render(<GatewayReviewsList initialData={initialData} />);

        const reasonSelect = screen.getByLabelText('علت پرونده:');
        fireEvent.change(reasonSelect, { target: { value: 'BANK_CONFLICT' } });

        await waitFor(() => {
            expect(clientApi.fetchGatewayReviews).toHaveBeenCalledWith(
                expect.objectContaining({
                    reasonCode: 'BANK_CONFLICT',
                    page: 1,
                })
            );
        });
    });
});
