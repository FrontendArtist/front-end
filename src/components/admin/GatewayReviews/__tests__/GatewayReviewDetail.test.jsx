import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import GatewayReviewDetail from '../GatewayReviewDetail';
import * as client from '@/lib/client/admin/gatewayReviewsClient';

jest.mock('@/lib/client/admin/gatewayReviewsClient', () => ({
    ...jest.requireActual('@/lib/client/admin/gatewayReviewsClient'),
    resolveGatewayReview: jest.fn(), fetchGatewayReview: jest.fn(), reopenGatewayReview: jest.fn(),
}));
const openCase = {
    caseId: 'case-1', clientReferenceCode: 'TR-1', topUpRequestId: 'topup-id', topUpStatus: 'Pending',
    userName: 'کاربر نمونه', userPhone: '09123456789', amountRial: 10000, requestedAtUtc: '2026-09-30T06:00:00Z',
    reasonCode: 'NO_CALLBACK', status: 'open', revision: 1, history: [], audit: [], canClosePaid: false, canCloseReversed: false,
};
beforeEach(() => {
    jest.clearAllMocks();
    Object.defineProperty(global.crypto, 'randomUUID', { configurable: true, value: () => '12345678-1234-1234-1234-123456789abc' });
});
function completeNoMatch() {
    fireEvent.change(screen.getByLabelText('نتیجه رسیدگی'), { target: { value: 'NO_MATCHING_DEPOSIT' } });
    fireEvent.change(screen.getByLabelText('تاریخ گزارش بررسی‌شده (میلادی)'), { target: { value: '2026-09-30' } });
    fireEvent.change(screen.getByLabelText('واریز منطبق در گزارش پیدا شد؟'), { target: { value: 'no' } });
}
test('shows identity, request amount and reference', () => {
    render(<GatewayReviewDetail initialCase={openCase} />);
    expect(screen.getByText('کاربر نمونه')).toBeInTheDocument();
    expect(screen.getByText('09123456789')).toBeInTheDocument();
    expect(screen.getByText('topup-id')).toBeInTheDocument();
    expect(screen.getByText('۱۰٬۰۰۰ ریال')).toBeInTheDocument();
});
test('pending payment cannot be represented as already credited', () => {
    render(<GatewayReviewDetail initialCase={openCase} />);
    expect(screen.getByRole('option', { name: 'پرداخت شده و نور شارژ شده' })).toBeDisabled();
});
test('an incomplete checked report never submits', async () => {
    render(<GatewayReviewDetail initialCase={openCase} />);
    fireEvent.click(screen.getByRole('button', { name: 'ثبت بررسی و بستن پرونده' }));
    expect(client.resolveGatewayReview).not.toHaveBeenCalled();
    expect(screen.getByRole('alert')).toBeInTheDocument();
});
test('old pending case closes without a complaint and records an explicit no-match answer', async () => {
    client.resolveGatewayReview.mockResolvedValue({ ...openCase, status: 'resolved', outcomeCode: 'NO_MATCHING_DEPOSIT' });
    render(<GatewayReviewDetail initialCase={openCase} />);
    completeNoMatch();
    fireEvent.click(screen.getByRole('button', { name: 'ثبت بررسی و بستن پرونده' }));
    await waitFor(() => expect(client.resolveGatewayReview).toHaveBeenCalledTimes(1));
    expect(client.resolveGatewayReview.mock.calls[0][1]).toMatchObject({
        outcomeCode: 'NO_MATCHING_DEPOSIT', resolutionFinancialReferenceId: null,
        evidence: { expectedRevision: 1, checkedReportDate: '2026-09-30', matchingDepositFound: false },
    });
    await waitFor(() => expect(screen.getByText(/رسیدگی بسته شده است/)).toBeInTheDocument());
});
test('timeout keeps the same payload and operation id for retry', async () => {
    client.resolveGatewayReview.mockRejectedValueOnce({ status: 503 }).mockResolvedValueOnce({ ...openCase, status: 'resolved' });
    render(<GatewayReviewDetail initialCase={openCase} />); completeNoMatch();
    fireEvent.click(screen.getByRole('button', { name: 'ثبت بررسی و بستن پرونده' }));
    await waitFor(() => expect(screen.getByRole('button', { name: 'ارسال مجدد همان درخواست' })).toBeInTheDocument());
    expect(screen.getByLabelText('نتیجه رسیدگی')).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'ارسال مجدد همان درخواست' }));
    await waitFor(() => expect(client.resolveGatewayReview).toHaveBeenCalledTimes(2));
    expect(client.resolveGatewayReview.mock.calls[0][1]).toEqual(client.resolveGatewayReview.mock.calls[1][1]);
});
test('confirmed topup cannot select manual refund', () => {
    render(<GatewayReviewDetail initialCase={{ ...openCase, topUpStatus: 'Confirmed', canClosePaid: true }} />);
    expect(screen.getByRole('option', { name: 'وجه خارج از سامانه به کاربر برگشت داده شد' })).toBeDisabled();
});
test('a found deposit requires report id, date and amount without inventing a RefNum', async () => {
    render(<GatewayReviewDetail initialCase={openCase} />);
    fireEvent.change(screen.getByLabelText('واریز منطبق در گزارش پیدا شد؟'), { target: { value: 'yes' } });
    expect(screen.getByLabelText('شناسه واریز درج‌شده در گزارش')).toBeInTheDocument();
    expect(screen.getByLabelText('مبلغ واریز گزارش، به ریال')).toBeInTheDocument();
    expect(screen.queryByLabelText('RefNum')).not.toBeInTheDocument();
});
test('new manual evidence reopens a closed case', async () => {
    client.reopenGatewayReview.mockResolvedValue({ ...openCase, revision: 2 });
    render(<GatewayReviewDetail initialCase={{ ...openCase, status: 'resolved', outcomeCode: 'NO_MATCHING_DEPOSIT' }} />);
    fireEvent.change(screen.getByLabelText('مدرک جدید برای بازگشایی'), { target: { value: 'گزارش جدید بانک' } });
    fireEvent.click(screen.getByRole('button', { name: 'ثبت مدرک و بازگشایی' }));
    await waitFor(() => expect(client.reopenGatewayReview).toHaveBeenCalledWith('TR-1', expect.objectContaining({ note: 'گزارش جدید بانک' })));
});

