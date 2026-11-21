/**
 * @file ByeMoneyOrderView.test.jsx
 * نمایش کد رهگیری و تأیید دریافت کالا برای خریدار (SHIP-TRACKING).
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import ByeMoneyOrderView from '../ByeMoneyOrderView';
import { useOrdersStore } from '@/store/useOrdersStore';

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
    jest.restoreAllMocks();
});

describe('ByeMoneyOrderView — رهگیری مرسوله و اصلاحات ممیزی', () => {
    it('کد رهگیری قلم ارسال‌شده را نشان می‌دهد', () => {
        render(<ByeMoneyOrderView order={buildOrder()} />);

        expect(screen.getByTestId('physical-tracking-code')).toHaveTextContent('PTX-8846884');
    });

    it('تأیید دریافت کالا کش useOrdersStore را باطل کرده و سفارش را تازه می‌کند', async () => {
        const invalidateSpy = jest.spyOn(useOrdersStore.getState(), 'invalidateOrders');
        global.fetch.mockResolvedValue({
            ok: true,
            json: async () => ({ success: true, data: { orderId: `cart:${CART}`, confirmedCount: 1 } }),
        });
        const onOrderChanged = jest.fn().mockResolvedValue();

        render(<ByeMoneyOrderView order={buildOrder()} onOrderChanged={onOrderChanged} />);

        fireEvent.click(screen.getByTestId('confirm-delivery-btn'));

        await waitFor(() => expect(onOrderChanged).toHaveBeenCalled());
        expect(invalidateSpy).toHaveBeenCalled();
        expect(global.fetch).toHaveBeenCalledWith(
            `/api/orders/${encodeURIComponent(`cart:${CART}`)}/confirm-delivery`,
            { method: 'POST' }
        );
        expect(await screen.findByTestId('confirm-delivery-message')).toHaveTextContent('دریافت کالا ثبت شد');
    });

    it('پس از لغو کالا، کش useOrdersStore باطل و onOrderChanged صدا زده می‌شود', async () => {
        const invalidateSpy = jest.spyOn(useOrdersStore.getState(), 'invalidateOrders');
        const onOrderChanged = jest.fn().mockResolvedValue();
        global.fetch.mockImplementation(async (_url, opts) => {
            if (opts?.method === 'POST') {
                return {
                    ok: true,
                    status: 200,
                    json: async () => ({
                        data: {
                            outcome: 'Refunded',
                            items: [{ regularRefundInNoor: 0, giftRefundInNoor: 360000 }],
                            shippingRegularRefundInNoor: 0,
                            shippingGiftRefundInNoor: 25000,
                        },
                    }),
                };
            }
            return { ok: true, status: 200, json: async () => ({ data: { items: [], warnings: [] } }) };
        });

        const order = buildOrder({
            items: [{ ...buildOrder().items[0], physicalDeliveryStatus: 'Preparing' }],
        });

        render(<ByeMoneyOrderView order={order} onOrderChanged={onOrderChanged} />);
        fireEvent.click(screen.getByText('لغو بخش فیزیکی سفارش'));
        fireEvent.change(await screen.findByPlaceholderText('علت لغو را وارد کنید...'), { target: { value: 'انصراف' } });
        fireEvent.click(screen.getByText('تأیید و لغو'));

        await waitFor(() => expect(onOrderChanged).toHaveBeenCalled());
        expect(invalidateSpy).toHaveBeenCalled();
    });

    it('وقتی قلم ارسال‌شده نمانده باشد دکمهٔ تأیید نمایش داده نمی‌شود', () => {
        const delivered = buildOrder({
            items: [{ ...buildOrder().items[0], physicalDeliveryStatus: 'Delivered' }],
        });

        render(<ByeMoneyOrderView order={delivered} />);

        expect(screen.queryByTestId('confirm-delivery-btn')).not.toBeInTheDocument();
    });

    it('کارت خالی ارسال کالا برای سفارش فیزیکی پرداخت‌نشده بدون آدرس رندر نمی‌شود (O13)', () => {
        const unpaid = buildOrder({
            financialStatus: 'AwaitingPayment',
            items: [{ ...buildOrder().items[0], physicalDeliveryStatus: 'Preparing' }],
        });

        render(<ByeMoneyOrderView order={unpaid} />);
        expect(screen.queryByTestId('shipping-card')).not.toBeInTheDocument();
    });

    it('وضعیت‌های UnderReview، Unresolved و ManuallyRefunded را در تلاش‌های پرداخت دقیق نشان می‌دهد (O15)', () => {
        const order = buildOrder({
            financialStatus: 'RequiresReview',
            topUps: [
                { topUpRequestId: 't1', status: 'UnderReview', amountNoor: 100, clientReferenceCode: 'TR-U1' },
                { topUpRequestId: 't2', status: 'Unresolved', amountNoor: 100, clientReferenceCode: 'TR-U2' },
                { topUpRequestId: 't3', status: 'ManuallyRefunded', amountNoor: 100, clientReferenceCode: 'TR-U3' },
            ],
        });

        render(<ByeMoneyOrderView order={order} />);
        const section = screen.getByTestId('top-ups-section');
        expect(section).toHaveTextContent('در حال بررسی مالی');
        expect(section).toHaveTextContent('نامشخص (نیازمند پیگیری)');
        expect(section).toHaveTextContent('استرداد دستی انجام شد');
    });

    it('برگشتی فقط از نور هدیه بدون پیشوند «۰ نور +» چاپ می‌شود و برگشت ارسال پس از رفرش باقی می‌ماند (O6/O9)', () => {
        const order = buildOrder({
            shippingGiftRefundInNoor: 25000,
            items: [
                {
                    ...buildOrder().items[0],
                    quantity: 2,
                    cancelledQuantity: 2,
                    refundedRegularInNoor: 0,
                    refundedGiftInNoor: 360000,
                    physicalDeliveryStatus: 'Preparing',
                },
            ],
        });

        render(<ByeMoneyOrderView order={order} />);
        const itemRefund = screen.getByTestId('physical-item-refunded');
        expect(itemRefund).toHaveTextContent('برگشتی:');
        expect(itemRefund).toHaveTextContent('هدیه');
        expect(itemRefund.textContent).not.toContain('۰ نور +');

        const cancelledRefunds = screen.getByTestId('cancelled-refunds');
        expect(cancelledRefunds).toHaveTextContent('۳۸۵');
        expect(cancelledRefunds).toHaveTextContent('شامل برگشت هزینهٔ ارسال');
    });

    it('قلم با قیمت null را «—» و سفارش پرداخت‌شدهٔ رایگان را «رایگان» نشان می‌دهد (O1)', () => {
        const order = buildOrder({
            financialStatus: 'Paid',
            totalPrice: 0,
            items: [{ type: 'course', title: 'رادیو بیداری', price: 0 }, { type: 'course', title: 'نامشخص', price: null }],
        });

        render(<ByeMoneyOrderView order={order} />);
        expect(screen.getByTestId('paid-amount')).toHaveTextContent('رایگان');
        expect(screen.getByText('—')).toBeInTheDocument();
    });

    it('در سفارش با یک قلم Delivered و یک قلم ۱۰۰٪ لغوشده، نوار پیشرفت نمایش داده می‌شود (O17)', () => {
        const order = buildOrder({
            items: [
                { ...buildOrder().items[0], physicalDeliveryStatus: 'Delivered' },
                { ...buildOrder().items[0], purchaseId: 'p2', title: 'عطر', physicalDeliveryStatus: 'Preparing', cancelledQuantity: 1 },
            ],
        });

        render(<ByeMoneyOrderView order={order} />);
        expect(screen.getByTestId('physical-progress')).toBeInTheDocument();
    });

    it('یادداشت بررسی پستی با confirmedNow پنهان نمی‌شود و state با تغییر orderId ریست می‌شود', async () => {
        global.fetch.mockResolvedValue({
            ok: true,
            json: async () => ({ success: true, data: { orderId: `cart:${CART}`, confirmedCount: 1 } }),
        });

        const orderWithReturnAndNormal = buildOrder({
            items: [
                { ...buildOrder().items[0], purchaseId: 'p1', physicalDeliveryStatus: 'Shipped' },
                { ...buildOrder().items[0], purchaseId: 'p2', physicalDeliveryStatus: 'Shipped', carrierReturnedAtUtc: '2026-11-11T10:00:00Z' },
            ],
        });

        const { rerender } = render(<ByeMoneyOrderView order={orderWithReturnAndNormal} />);
        fireEvent.click(screen.getByTestId('confirm-delivery-btn'));
        expect(await screen.findByTestId('carrier-return-review-note')).toBeInTheDocument();

        const nextOrder = buildOrder({
            orderId: 'cart:99999999-9999-9999-9999-999999999999',
            cartId: '99999999-9999-9999-9999-999999999999',
        });
        rerender(<ByeMoneyOrderView order={nextOrder} />);
        expect(screen.queryByTestId('confirm-delivery-message')).not.toBeInTheDocument();
        expect(screen.getByTestId('confirm-delivery-btn')).toBeInTheDocument();
    });
});
