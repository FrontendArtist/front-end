import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import ByeMoneyOrders from '../ByeMoneyOrders';
import { PermissionsProvider } from '@/context/PermissionsContext';

const ORDER_ID = 'cart:11111111-1111-1111-1111-111111111111';

jest.mock('next/navigation', () => ({
    useSearchParams: () => new URLSearchParams(`tab=all&order=${encodeURIComponent(ORDER_ID)}`),
}));

jest.mock('../../OrderDrawer/OrderDrawer', () => function MockDrawer({ onRefundRecorded }) {
    return (
        <button type="button" data-testid="record-refund" onClick={() => onRefundRecorded?.(60)}>
            ثبت آزمایشی
        </button>
    );
});

const order = {
    orderId: ORDER_ID,
    orderNumber: '11111111',
    financialStatus: 'Paid',
    totalPrice: 100,
    refundedAmountInNoor: 10,
    createdAt: '2026-11-01T10:00:00Z',
    buyerName: 'علی',
    carrierReturnStatus: 'None',
    carrierAlertStatus: 'None',
};

beforeEach(() => {
    global.fetch = jest.fn(async () => ({
        ok: true,
        json: async () => ({
            orders: [{ ...order, refundedAmountInNoor: 80 }],
            hasMore: false,
            total: 1,
        }),
    }));
});

describe('فهرست سفارش‌های ادمین پس از برگشت قلم', () => {
    test('مبلغ برگشتی از پاسخ تازهٔ سرور جایگزین می‌شود', async () => {
        render(
            <PermissionsProvider initialPermissions={[]} isLoaded>
                <ByeMoneyOrders
                    initialData={{
                        orders: [order],
                        total: 1,
                        hasMore: false,
                        counts: { action: 0, all: 1, paid: 1, pending: 0, canceled: 0 },
                        restockIds: [],
                    }}
                    initialKey="all||"
                />
            </PermissionsProvider>,
        );

        expect(screen.getByTestId('order-refunded-amount')).toHaveTextContent('۱۰');
        fireEvent.click(screen.getByTestId('record-refund'));
        await waitFor(() => expect(screen.getByTestId('order-refunded-amount')).toHaveTextContent('۸۰'));
        expect(global.fetch).toHaveBeenCalled();
        const url = String(global.fetch.mock.calls.at(-1)[0]);
        expect(url).toContain('/api/admin/byemoney-orders');
    });
});
