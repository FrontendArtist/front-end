/**
 * @file ByeMoneyOrderView.test.jsx
 * نمایش کد رهگیری و تأیید دریافت کالا برای خریدار (SHIP-TRACKING).
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import ByeMoneyOrderView from '../ByeMoneyOrderView';

const CART = '11111111-1111-1111-1111-111111111111';

const buildOrder = (overrides = {}) => ({
    orderId: `cart:${CART}`,
    cartId: CART,
    source: 'byemoney',
    financialStatus: 'Paid',
    deliveryStatus: 'Pending',
    createdAt: '2026-11-10T10:00:00Z',
    totalPrice: 100,
    items: [
        {
            type: 'product',
            itemType: 'Product',
            title: 'کتاب',
            quantity: 1,
            cancelledQuantity: 0,
            financialStatus: 'Paid',
            deliveryStatus: 'Pending',
            physicalDeliveryStatus: 'Shipped',
            trackingCode: 'PTX-8846884',
            trackingProvider: 'PostEx',
            price: 100,
        },
    ],
    topUps: [],
    ...overrides,
});

beforeEach(() => {
    global.fetch = jest.fn();
});

describe('ByeMoneyOrderView — رهگیری مرسوله', () => {
    it('کد رهگیری قلم ارسال‌شده را نشان می‌دهد', () => {
        render(<ByeMoneyOrderView order={buildOrder()} />);

        expect(screen.getByTestId('physical-tracking-code')).toHaveTextContent('PTX-8846884');
    });

    it('تأیید دریافت کالا از route سروری می‌گذرد و سفارش را تازه می‌کند', async () => {
        global.fetch.mockResolvedValue({
            ok: true,
            json: async () => ({ success: true, data: { orderId: `cart:${CART}`, confirmedCount: 1 } }),
        });
        const onOrderChanged = jest.fn().mockResolvedValue();

        render(<ByeMoneyOrderView order={buildOrder()} onOrderChanged={onOrderChanged} />);

        fireEvent.click(screen.getByTestId('confirm-delivery-btn'));

        await waitFor(() => expect(onOrderChanged).toHaveBeenCalled());
        expect(global.fetch).toHaveBeenCalledWith(
            `/api/orders/${encodeURIComponent(`cart:${CART}`)}/confirm-delivery`,
            { method: 'POST' }
        );
        expect(await screen.findByTestId('confirm-delivery-message')).toHaveTextContent('دریافت کالا ثبت شد');
    });

    it('وقتی قلم ارسال‌شده نمانده باشد دکمهٔ تأیید نمایش داده نمی‌شود', () => {
        const delivered = buildOrder({
            items: [{ ...buildOrder().items[0], physicalDeliveryStatus: 'Delivered' }],
        });

        render(<ByeMoneyOrderView order={delivered} />);

        expect(screen.queryByTestId('confirm-delivery-btn')).not.toBeInTheDocument();
    });
});
