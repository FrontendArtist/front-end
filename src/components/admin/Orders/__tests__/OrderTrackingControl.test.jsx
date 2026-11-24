import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import OrderTrackingControl from '../OrderTrackingControl';
import { OrderItemsList } from '../ByeMoneyOrderPanel';

jest.mock('../PhysicalDeliveryControl', () => ({ purchaseId }) => (
    <div data-testid="delivery-control">{purchaseId}</div>
));
jest.mock('@/components/physicalCancel/PhysicalCancelFlow', () => () => null);

const detail = {
    cartId: 'cccccccc-cccc-cccc-cccc-cccccccccccc',
    items: [
        { title: 'کتاب', itemType: 'Product', quantity: 1, purchaseId: 'p1', physicalDeliveryStatus: 'Preparing', finalAmountInNoor: 10 },
        { title: 'دفتر', itemType: 'Product', quantity: 1, purchaseId: 'p2', physicalDeliveryStatus: 'Preparing', finalAmountInNoor: 8 },
    ],
};

beforeEach(() => {
    global.fetch = jest.fn();
});

describe('OrderTrackingControl', () => {
    it('برای چند قلم فقط یک فرم کد رهگیری نشان می‌دهد و همان کد را برای همه ثبت می‌کند', async () => {
        const onApplied = jest.fn();
        render(<OrderTrackingControl detail={detail} isPaid onApplied={onApplied} />);

        expect(screen.getAllByTestId('manual-tracking-box')).toHaveLength(1);
        fireEvent.change(screen.getByTestId('tracking-code-input'), { target: { value: 'IR-100' } });

        global.fetch.mockResolvedValue({
            ok: true,
            json: async () => ({ data: { deliveryStatus: 'Shipped', trackingCode: 'IR-100' } }),
        });
        fireEvent.click(screen.getByTestId('register-manual-tracking'));

        await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(2));
        expect(global.fetch).toHaveBeenNthCalledWith(
            1,
            '/api/admin/physical-purchases/p1/delivery-status',
            expect.objectContaining({
                method: 'PUT',
                body: JSON.stringify({ status: 'Shipped', trackingCode: 'IR-100', trackingProvider: 'Manual' }),
            })
        );
        expect(global.fetch).toHaveBeenNthCalledWith(
            2,
            '/api/admin/physical-purchases/p2/delivery-status',
            expect.objectContaining({
                method: 'PUT',
                body: JSON.stringify({ status: 'Shipped', trackingCode: 'IR-100', trackingProvider: 'Manual' }),
            })
        );
        expect(onApplied).toHaveBeenCalled();
    });
});

describe('OrderItemsList', () => {
    it('دکمهٔ ارسال به پستکس و کد رهگیری را یک‌بار برای کل سفارش نشان می‌دهد', () => {
        render(
            <OrderItemsList
                detail={detail}
                isPaid
                onReload={() => {}}
                onItemStatus={() => {}}
            />
        );

        expect(screen.getAllByTestId('create-provider-shipment')).toHaveLength(1);
        expect(screen.getByTestId('create-provider-shipment')).toHaveTextContent('ارسال به پستکس');
        expect(screen.getAllByTestId('manual-tracking-box')).toHaveLength(1);
        expect(screen.getAllByTestId('order-delivery-status')).toHaveLength(1);
        expect(screen.queryByTestId('delivery-control')).not.toBeInTheDocument();
    });
});
