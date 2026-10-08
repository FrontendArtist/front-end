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
        expect(screen.queryByRole('columnheader', { name: 'وضعیت شارژ' })).not.toBeInTheDocument();
        expect(screen.getByRole('columnheader', { name: 'تاریخ ایجاد پرونده' })).toBeInTheDocument();
        const dateText = new Intl.DateTimeFormat('fa-IR', {
            year: 'numeric', month: '2-digit', day: '2-digit', timeZone: 'Asia/Tehran',
        }).format(new Date(mockCases[0].openedAtUtc));
        expect(screen.getByText(`۱۱:۳۰ — ${dateText}`)).toHaveAttribute('dir', 'ltr');
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

    it('ترجمهٔ کد در عنوان آیکون نمایش داده می‌شود و متن ردیف را بلند نمی‌کند', () => {
        render(<GatewayReviewsList initialData={{
            ...initialData,
            data: [
                { ...mockCases[0], bankResultCode: '-2', bankResultStage: 'verify', bankResultDescription: 'تراکنش یافت نشد.' },
                { ...mockCases[1], bankResultCode: '0', bankResultDescription: 'موفق' },
            ],
        }} />);

        expect(screen.getByRole('columnheader', { name: 'نتیجهٔ درگاه' })).toBeInTheDocument();
        expect(screen.getByText('-2')).toHaveAttribute('dir', 'ltr');
        expect(screen.queryByText('استعلام تراکنش (Verify)')).not.toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'استعلام تراکنش (Verify)؛ تراکنش یافت نشد.' }))
            .toHaveAttribute('title', 'استعلام تراکنش (Verify)؛ تراکنش یافت نشد.');
        expect(screen.queryByText('تراکنش یافت نشد.')).not.toBeInTheDocument();
        expect(screen.getByText('0')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'موفق' })).toHaveAttribute('title', 'موفق');
        expect(clientApi.fetchGatewayReviews).not.toHaveBeenCalled();
    });

    it('کد ناشناخته بدون متن یا آیکون توضیح نمایش داده می‌شود', () => {
        render(<GatewayReviewsList initialData={{
            ...initialData,
            data: [
                { ...mockCases[0], bankResultCode: '999', bankResultDescription: null },
                { ...mockCases[1], bankResultCode: null, bankResultDescription: null },
            ],
        }} />);

        expect(screen.getByText('999')).toBeInTheDocument();
        expect(screen.queryByText('توضیح این کد موجود نیست.')).not.toBeInTheDocument();
        expect(screen.getByText('999').closest('td').querySelector('button')).toBeNull();
        expect(screen.getByText('—')).toBeInTheDocument();
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
