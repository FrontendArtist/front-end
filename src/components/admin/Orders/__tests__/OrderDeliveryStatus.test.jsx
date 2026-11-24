import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import OrderDeliveryStatus from '../OrderDeliveryStatus';

jest.mock('../../Shared/AdminBadge', () => ({ text, variant }) => (
    <span data-variant={variant}>{text}</span>
));

const detail = {
    items: [
        { title: 'کتاب', itemType: 'Product', quantity: 1, purchaseId: 'p1', physicalDeliveryStatus: 'Shipped' },
        { title: 'دفتر', itemType: 'Product', quantity: 1, purchaseId: 'p2', physicalDeliveryStatus: 'Shipped' },
    ],
};

beforeEach(() => {
    global.fetch = jest.fn();
});

describe('OrderDeliveryStatus', () => {
    it('وضعیت را یک‌بار نشان می‌دهد و تحویل را برای همهٔ اقلام ثبت می‌کند', async () => {
        const onItemStatus = jest.fn();
        render(<OrderDeliveryStatus detail={detail} isPaid onItemStatus={onItemStatus} />);

        expect(screen.getAllByText('وضعیت ارسال مرسوله:')).toHaveLength(1);
        expect(screen.getByText('ارسال‌شده')).toBeInTheDocument();

        global.fetch.mockResolvedValue({
            ok: true,
            json: async () => ({ data: { deliveryStatus: 'Delivered' } }),
        });
        fireEvent.click(screen.getByTestId('advance-order-delivery'));

        await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(2));
        expect(global.fetch).toHaveBeenNthCalledWith(
            1,
            '/api/admin/physical-purchases/p1/delivery-status',
            expect.objectContaining({
                method: 'PUT',
                body: JSON.stringify({ status: 'Delivered' }),
            })
        );
        expect(global.fetch).toHaveBeenNthCalledWith(
            2,
            '/api/admin/physical-purchases/p2/delivery-status',
            expect.objectContaining({ method: 'PUT' })
        );
        expect(onItemStatus).toHaveBeenCalledWith('p1', 'Delivered');
        expect(onItemStatus).toHaveBeenCalledWith('p2', 'Delivered');
    });

    it('وقتی یک قلم هنوز آماده‌سازی است، فقط قلم ارسال‌شده را پیش می‌برد', async () => {
        const onItemStatus = jest.fn();
        render(
            <OrderDeliveryStatus
                detail={{
                    items: [
                        { itemType: 'Product', quantity: 1, purchaseId: 'p1', physicalDeliveryStatus: 'Shipped' },
                        { itemType: 'Product', quantity: 1, purchaseId: 'p2', physicalDeliveryStatus: 'Preparing' },
                    ],
                }}
                isPaid
                onItemStatus={onItemStatus}
            />
        );

        expect(screen.getByText('ارسال ناقص')).toHaveAttribute('data-variant', 'warning');
        global.fetch.mockResolvedValue({
            ok: true,
            json: async () => ({ data: { deliveryStatus: 'Delivered' } }),
        });
        fireEvent.click(screen.getByTestId('advance-order-delivery'));

        await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(1));
        expect(global.fetch).toHaveBeenCalledWith(
            '/api/admin/physical-purchases/p1/delivery-status',
            expect.objectContaining({ method: 'PUT' })
        );
        expect(onItemStatus).toHaveBeenCalledWith('p1', 'Delivered');
    });

    it('قلم تحویل‌شدهٔ قبلی را دوباره نمی‌فرستد و نشان را هشدار نمی‌کند', async () => {
        render(
            <OrderDeliveryStatus
                detail={{
                    items: [
                        { itemType: 'Product', quantity: 1, purchaseId: 'p1', physicalDeliveryStatus: 'Delivered' },
                        { itemType: 'Product', quantity: 1, purchaseId: 'p2', physicalDeliveryStatus: 'Shipped' },
                    ],
                }}
                isPaid
            />
        );

        expect(screen.getByText('ارسال‌شده')).toHaveAttribute('data-variant', 'info');
        global.fetch.mockResolvedValue({
            ok: true,
            json: async () => ({ data: { deliveryStatus: 'Delivered' } }),
        });
        fireEvent.click(screen.getByTestId('advance-order-delivery'));

        await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(1));
        expect(global.fetch).toHaveBeenCalledWith(
            '/api/admin/physical-purchases/p2/delivery-status',
            expect.objectContaining({ method: 'PUT' })
        );
    });

    it('شکست یک قلم بقیه را متوقف نمی‌کند و دکمه برای قلم مانده می‌ماند', async () => {
        const onItemStatus = jest.fn();
        render(
            <OrderDeliveryStatus
                detail={{
                    items: [
                        { itemType: 'Product', quantity: 1, purchaseId: 'p1', physicalDeliveryStatus: 'Shipped' },
                        { itemType: 'Product', quantity: 1, purchaseId: 'p2', physicalDeliveryStatus: 'Shipped' },
                        { itemType: 'Product', quantity: 1, purchaseId: 'p3', physicalDeliveryStatus: 'Shipped' },
                    ],
                }}
                isPaid
                onItemStatus={onItemStatus}
            />
        );

        global.fetch
            .mockResolvedValueOnce({
                ok: true,
                json: async () => ({ data: { deliveryStatus: 'Delivered' } }),
            })
            .mockResolvedValueOnce({
                ok: false,
                json: async () => ({ error: 'این قلم برگشتی است.' }),
            })
            .mockResolvedValueOnce({
                ok: true,
                json: async () => ({ data: { deliveryStatus: 'Delivered' } }),
            });

        fireEvent.click(screen.getByTestId('advance-order-delivery'));

        await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(3));
        expect(onItemStatus).toHaveBeenCalledWith('p1', 'Delivered');
        expect(onItemStatus).toHaveBeenCalledWith('p3', 'Delivered');
        expect(onItemStatus).not.toHaveBeenCalledWith('p2', expect.anything());
        expect(screen.getByTestId('delivery-message-alert')).toHaveTextContent('این قلم برگشتی است.');
        expect(screen.getByTestId('advance-order-delivery')).toBeInTheDocument();
    });
});
