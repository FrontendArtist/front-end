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

describe('ByeMoneyOrderView — برگشتی مرسوله', () => {
    const returnedItem = (extra = {}) => ({
        ...buildOrder().items[0],
        purchaseId: 'p-returned',
        carrierReturnedAtUtc: '2026-11-18T10:00:00Z',
        carrierReturnResolution: null,
        ...extra,
    });

    it('قلم برگشتی حل‌نشده نشان «برگشتی» می‌گیرد حتی وقتی بقیه ارسال‌شده‌اند', () => {
        const order = buildOrder({
            items: [returnedItem(), { ...buildOrder().items[0], purchaseId: 'p-normal', title: 'کتاب دوم' }],
        });

        render(<ByeMoneyOrderView order={order} />);

        expect(screen.getByTestId('physical-return-badge')).toHaveTextContent('برگشتی');
        expect(screen.getByTestId('physical-return-badge')).not.toHaveTextContent('برگشت خورد');
        const note = screen.getByTestId('carrier-return-review-note');
        expect(note).toHaveTextContent('مرسوله از سوی پست برگشت اعلام شده است');
        expect(note).toHaveTextContent('تماس بگیرید');
        expect(screen.getByRole('link', { name: 'پشتیبانی' })).toHaveAttribute('href', '/contact');
        expect(screen.getByTestId('confirm-delivery-btn')).toBeInTheDocument();
    });

    it('تأیید جزئی تعداد تأییدشده را می‌گوید و قلم برگشتی را خارج از تأیید اعلام می‌کند', async () => {
        global.fetch.mockResolvedValue({
            ok: true,
            status: 200,
            json: async () => ({ success: true, data: { confirmedCount: 1 } }),
        });
        const order = buildOrder({
            items: [returnedItem(), { ...buildOrder().items[0], purchaseId: 'p-normal', title: 'کتاب دوم' }],
        });

        render(<ByeMoneyOrderView order={order} />);
        fireEvent.click(screen.getByTestId('confirm-delivery-btn'));

        const message = await screen.findByTestId('confirm-delivery-message');
        expect(message).toHaveTextContent('دریافت ۱ قلم ثبت شد');
        expect(message).toHaveTextContent('قلم برگشتی در این تأیید نبوده است');
    });

    it('۴۰۹ را نشان می‌دهد و جملهٔ واحد تأیید مرسولهٔ برگشتی را می‌آورد', async () => {
        global.fetch.mockResolvedValue({
            ok: false,
            status: 409,
            json: async () => ({ success: false, error: 'مرسولهٔ این سفارش برگشتی اعلام شده است.' }),
        });
        const order = buildOrder({
            items: [
                { ...buildOrder().items[0], purchaseId: 'p-normal' },
                returnedItem(),
            ],
        });

        render(<ByeMoneyOrderView order={order} />);
        fireEvent.click(screen.getByTestId('confirm-delivery-btn'));

        const message = await screen.findByTestId('confirm-delivery-message');
        expect(message).toHaveTextContent('این مرسوله برگشته و تأیید دریافت برایش ثبت نمی‌شود.');
    });
});

describe('ByeMoneyOrderView — لینک رهگیری', () => {
    it('فقط trackingUrl مطلق https لینک امن می‌سازد', () => {
        const order = buildOrder({
            items: [{ ...buildOrder().items[0], trackingUrl: 'https://track.example/parcel/1' }],
        });

        render(<ByeMoneyOrderView order={order} />);

        const link = screen.getByTestId('physical-tracking-link');
        expect(link).toHaveAttribute('href', 'https://track.example/parcel/1');
        expect(link).toHaveAttribute('target', '_blank');
        expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    });

    it.each([
        ['http', { trackingUrl: 'http://track.example/1' }],
        ['javascript', { trackingUrl: 'javascript:alert(1)' }],
        ['منبع Manual', { trackingUrl: 'https://track.example/1', trackingProvider: 'Manual' }],
    ])('%s لینک نمی‌سازد و فقط کد و کپی می‌ماند', (_name, extra) => {
        const order = buildOrder({ items: [{ ...buildOrder().items[0], ...extra }] });

        render(<ByeMoneyOrderView order={order} />);

        expect(screen.queryByTestId('physical-tracking-link')).not.toBeInTheDocument();
        expect(screen.getByTestId('physical-tracking-code')).toHaveTextContent('PTX-8846884');
        expect(screen.getByRole('button', { name: 'کپی کد رهگیری' })).toBeInTheDocument();
    });

    it('بدون trackingUrl از روی کد لینک نمی‌سازد', () => {
        render(<ByeMoneyOrderView order={buildOrder()} />);
        expect(screen.queryByTestId('physical-tracking-link')).not.toBeInTheDocument();
    });
});
