import React, { useState } from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import ByeMoneyOrderPanel, { useOrderTracking, OrderItemsList } from '../ByeMoneyOrderPanel';
import { fetchOrderTracking } from '@/lib/client/admin/ordersClient';

jest.mock('@/lib/client/admin/ordersClient', () => ({ fetchOrderTracking: jest.fn() }));
jest.mock('../PhysicalDeliveryControl', () => ({ purchaseId }) => <div data-testid="delivery-control">{purchaseId}</div>);
jest.mock('../PendingRestockNotice', () => () => null);
jest.mock('@/components/physicalCancel/PhysicalCancelFlow', () => ({ mode, targetId, maxQuantity }) => (
    <div data-testid="cancel-flow" data-mode={mode} data-target-id={targetId} data-max-quantity={maxQuantity} />
));
jest.mock('../../Shared/AdminBadge', () => ({ text }) => <span>{text}</span>);

const ORDER = { id: 'cart:11111111-1111-1111-1111-111111111111', orderId: 'cart:11111111-1111-1111-1111-111111111111' };

const payload = (over = {}) => ({
    order: {
        orderId: ORDER.orderId,
        cartId: '11111111-1111-1111-1111-111111111111',
        financialStatus: 'Failed',
        deliveryStatus: 'NotStarted',
        finalAmountInNoor: 50,
        items: [{ title: 'دورهٔ React', itemType: 'Course', finalAmountInNoor: 50, purchaseId: null }],
    },
    buyer: { displayName: 'علی', externalUserId: 'u1' },
    timeline: [
        { kind: 'cart', at: '2026-11-01T10:00:00Z', title: 'ساخت سبد خرید', result: null, details: [] },
        { kind: 'attempt', at: '2026-11-01T10:10:00Z', title: 'تلاش درگاه ۱', result: { key: 'cancelled_by_user', label: 'لغو توسط کاربر', tone: 'error' }, details: [] },
        { kind: 'final', at: '2026-11-01T10:30:00Z', title: 'نتیجهٔ نهایی سفارش', result: { key: 'failed', label: 'ناموفق', tone: 'error' }, details: [] },
    ],
    warnings: [],
    receipt: null,
    attemptSummary: { key: 'cancelled_by_user', label: 'لغو توسط کاربر', tone: 'error' },
    ...over,
});

beforeEach(() => fetchOrderTracking.mockReset());

describe('ByeMoneyOrderPanel', () => {
    test('اقلام و خط زمانی تلاش با برچسب «لغو توسط کاربر» را نشان می‌دهد و خلاصه را به ردیف می‌دهد', async () => {
        fetchOrderTracking.mockResolvedValue(payload());
        const onSummary = jest.fn();
        render(<ByeMoneyOrderPanel order={ORDER} onSummary={onSummary} />);

        expect(await screen.findByText('دورهٔ React')).toBeInTheDocument();
        const list = screen.getByRole('list', { name: 'خط زمانی تلاش‌های خرید' });
        expect(list).not.toHaveTextContent('ساخت سبد خرید');
        fireEvent.click(screen.getByRole('button', { name: /موارد بیشتر/ }));
        expect(screen.getByRole('list', { name: 'خط زمانی تلاش‌های خرید' })).toHaveTextContent('ساخت سبد خرید');
        expect(list).toHaveTextContent('تلاش درگاه ۱');
        expect(list).toHaveTextContent('لغو توسط کاربر');
        expect(list).toHaveTextContent('نتیجهٔ نهایی سفارش');
        expect(screen.queryByTestId('order-receipt')).not.toBeInTheDocument();
        expect(screen.queryByTestId('order-delivery-status')).not.toBeInTheDocument();
        expect(fetchOrderTracking).toHaveBeenCalledWith(ORDER.orderId, expect.any(Object));
        await waitFor(() => expect(onSummary).toHaveBeenCalledWith(expect.objectContaining({ label: 'لغو توسط کاربر' })));
    });

    test('آدرس تحویل فقط وقتی هست نمایش داده می‌شود', async () => {
        fetchOrderTracking.mockResolvedValue(payload({
            shippingAddress: { recipientName: 'علی رضایی', recipientPhone: '09120000000', province: 'قم', city: 'قم', fullAddress: 'خیابان ۱', postalCode: '12345' },
            shippingOrigin: { id: 'ramsar', label: 'رامسر' },
        }));
        const { unmount } = render(<ByeMoneyOrderPanel order={ORDER} />);
        const box = await screen.findByTestId('shipping-address');
        expect(box).toHaveTextContent('علی رضایی');
        expect(box).toHaveTextContent('قم، قم، خیابان ۱');
        expect(box).toHaveTextContent('کد پستی: 12345');
        expect(screen.getByTestId('shipping-origin')).toHaveTextContent('مبدأ ارسال: رامسر');
        unmount();

        fetchOrderTracking.mockResolvedValue(payload());
        render(<ByeMoneyOrderPanel order={ORDER} />);
        await screen.findByText('دورهٔ React');
        expect(screen.queryByTestId('shipping-address')).not.toBeInTheDocument();
    });

    test('سقوط به حالت بدون استرپی: هشدار + وضعیت بای‌مانی، بدون شکستن پنل', async () => {
        fetchOrderTracking.mockResolvedValue(payload({
            warnings: ['رکورد تلاش‌های درگاه از استرپی در دسترس نیست؛ فقط وضعیت ثبت‌شده در بای‌مانی نمایش داده می‌شود.'],
            timeline: [
                payload().timeline[0],
                { kind: 'attempt', at: '2026-11-01T10:10:00Z', title: 'تلاش درگاه ۱', source: 'byemoney', result: { key: 'byemoney_only', label: 'شارژ: رد شده', tone: 'default' }, details: [{ label: 'نتیجهٔ درگاه (بای‌مانی)', value: 'ناموفق' }] },
                payload().timeline[2],
            ],
            attemptSummary: null,
        }));
        render(<ByeMoneyOrderPanel order={ORDER} />);
        expect(await screen.findByText(/در دسترس نیست؛ فقط وضعیت/)).toBeInTheDocument();
        expect(screen.getByText('شارژ: رد شده')).toBeInTheDocument();
        expect(screen.getByText('دورهٔ React')).toBeInTheDocument();
    });

    test('خطای ۴۰۳ توکن استرپی به‌صورت هشدار جدا نمایش داده می‌شود', async () => {
        fetchOrderTracking.mockResolvedValue(payload({ warnings: ['عدم دسترسی توکن: استرپی با ۴۰۳ پاسخ داد'] }));
        render(<ByeMoneyOrderPanel order={ORDER} />);
        expect(await screen.findByText(/عدم دسترسی توکن/)).toBeInTheDocument();
    });

    test('کارت همان سفارش وضعیت هشدار و شناسهٔ مرسوله را نشان می‌دهد و کنترل تعیین‌تکلیف دارد', async () => {
        fetchOrderTracking.mockResolvedValue(payload({
            order: {
                ...payload().order,
                financialStatus: 'Paid',
                items: [{
                    title: 'کتاب',
                    itemType: 'Product',
                    quantity: 1,
                    finalAmountInNoor: 50,
                    purchaseId: 'p1',
                    physicalDeliveryStatus: 'Shipped',
                    providerParcelId: 'parcel-9',
                    carrierAlertCode: 11304,
                    carrierAlertAtUtc: '2026-11-19T09:00:00Z',
                    carrierAlertResolution: null,
                }],
            },
            receipt: { purchasedAtUtc: '2026-11-01T10:20:00Z', couponCode: null, finalAmountInNoor: 50, cartSummary: { originalTotalInNoor: 50 }, items: [] },
        }));
        render(<ByeMoneyOrderPanel order={ORDER} />);

        expect(await screen.findByTestId('carrier-alert-status')).toHaveTextContent('در انتظار رسیدگی');
        expect(screen.getByTestId('carrier-alert-badge')).toHaveTextContent('هشدار مرسوله');
        expect(screen.getByTestId('provider-parcel-id')).toHaveTextContent('parcel-9');
        expect(screen.getByTestId('carrier-alert-resolve-open')).toBeInTheDocument();
        expect(screen.queryByTestId('carrier-payment-pending-badge')).not.toBeInTheDocument();
        expect(screen.queryByTestId('refresh-carrier-shipment')).not.toBeInTheDocument();
    });

    test('نشان انتظار پرداخت فقط با فیلد پر می‌آید و کنار هشدار مرسوله می‌ماند', async () => {
        fetchOrderTracking.mockResolvedValue(payload({
            order: {
                ...payload().order,
                financialStatus: 'Paid',
                items: [
                    {
                        title: 'کتاب',
                        itemType: 'Product',
                        quantity: 1,
                        finalAmountInNoor: 50,
                        purchaseId: 'p1',
                        physicalDeliveryStatus: 'Preparing',
                        providerParcelId: 'parcel-pending',
                        carrierPaymentPendingSinceUtc: '2026-11-19T10:00:00Z',
                    },
                    {
                        title: 'دفتر',
                        itemType: 'Product',
                        quantity: 1,
                        finalAmountInNoor: 20,
                        purchaseId: 'p2',
                        physicalDeliveryStatus: 'Shipped',
                        carrierAlertCode: 11304,
                        carrierAlertAtUtc: '2026-11-19T09:00:00Z',
                    },
                ],
            },
            receipt: { purchasedAtUtc: '2026-11-01T10:20:00Z', couponCode: null, finalAmountInNoor: 70, cartSummary: { originalTotalInNoor: 70 }, items: [] },
        }));
        render(<ByeMoneyOrderPanel order={ORDER} />);

        expect(await screen.findByTestId('carrier-payment-pending-badge')).toHaveTextContent('کرایهٔ واسط پستی پرداخت نشده');
        expect(screen.getAllByTestId('carrier-payment-pending-badge')).toHaveLength(1);
        expect(screen.getByTestId('refresh-carrier-shipment')).toBeInTheDocument();
        expect(screen.getByTestId('carrier-alert-badge')).toHaveTextContent('هشدار مرسوله');
        expect(screen.getByTestId('carrier-alert-resolve-open')).toBeInTheDocument();
    });

    test('بدون فیلد انتظار پرداخت، نشان و دکمهٔ بررسی وضعیت نیستند', async () => {
        fetchOrderTracking.mockResolvedValue(payload({
            order: {
                ...payload().order,
                financialStatus: 'Paid',
                items: [{
                    title: 'کتاب',
                    itemType: 'Product',
                    quantity: 1,
                    finalAmountInNoor: 50,
                    purchaseId: 'p1',
                    physicalDeliveryStatus: 'Preparing',
                    carrierPaymentPendingSinceUtc: '',
                }],
            },
            receipt: { purchasedAtUtc: '2026-11-01T10:20:00Z', couponCode: null, finalAmountInNoor: 50, cartSummary: { originalTotalInNoor: 50 }, items: [] },
        }));
        render(<ByeMoneyOrderPanel order={ORDER} />);
        await screen.findByText('کتاب');
        expect(screen.queryByTestId('carrier-payment-pending-badge')).not.toBeInTheDocument();
        expect(screen.queryByTestId('refresh-carrier-shipment')).not.toBeInTheDocument();
    });

    test('سفارش Paid: رسید و کنترل ارسال کالا فقط برای قلم کالا', async () => {
        fetchOrderTracking.mockResolvedValue(payload({
            order: {
                ...payload().order,
                financialStatus: 'Paid',
                items: [
                    { title: 'کتاب', itemType: 'Product', quantity: 2, finalAmountInNoor: 20, purchaseId: 'p1', physicalDeliveryStatus: 'Preparing' },
                    { title: 'دوره', itemType: 'Course', finalAmountInNoor: 30, purchaseId: 'p2' },
                ],
            },
            receipt: { purchasedAtUtc: '2026-11-01T10:20:00Z', couponCode: null, finalAmountInNoor: 50, cartSummary: { originalTotalInNoor: 50 }, items: [] },
        }));
        render(<ByeMoneyOrderPanel order={ORDER} />);
        expect(await screen.findByTestId('order-receipt')).toBeInTheDocument();
        expect(screen.getAllByTestId('order-delivery-status')).toHaveLength(1);
        expect(screen.queryByTestId('delivery-control')).not.toBeInTheDocument();
    });

    describe('دکمهٔ لغو کالای فیزیکی (PhysicalCancelFlow)', () => {
        const paidWith = (itemOver) => payload({
            order: {
                ...payload().order,
                financialStatus: 'Paid',
                items: [{ title: 'کتاب', itemType: 'Product', quantity: 3, finalAmountInNoor: 20, purchaseId: 'p1', ...itemOver }],
            },
            receipt: { purchasedAtUtc: '2026-11-01T10:20:00Z', couponCode: null, finalAmountInNoor: 20, cartSummary: { originalTotalInNoor: 20 }, items: [] },
        });

        test('برای قلم پرداخت‌شدهٔ عادی نمایش داده می‌شود', async () => {
            fetchOrderTracking.mockResolvedValue(paidWith({ physicalDeliveryStatus: 'Preparing' }));
            render(<ByeMoneyOrderPanel order={ORDER} />);
            const flow = await screen.findByTestId('cancel-flow');
            expect(flow).toHaveAttribute('data-target-id', 'p1');
            expect(flow).toHaveAttribute('data-mode', 'admin');
        });

        test.each(['Shipped', 'Delivered'])('با وضعیت ارسال %s پنهان است', async (status) => {
            fetchOrderTracking.mockResolvedValue(paidWith({ physicalDeliveryStatus: status }));
            render(<ByeMoneyOrderPanel order={ORDER} />);
            await screen.findByText('کتاب');
            expect(screen.queryByTestId('cancel-flow')).not.toBeInTheDocument();
        });

        test('وقتی cancelledQuantity >= quantity پنهان است', async () => {
            fetchOrderTracking.mockResolvedValue(paidWith({ quantity: 2, cancelledQuantity: 2 }));
            render(<ByeMoneyOrderPanel order={ORDER} />);
            await screen.findByTestId('item-cancelled-badge');
            expect(screen.queryByTestId('cancel-flow')).not.toBeInTheDocument();
        });

        test('مبلغ برگشتی عادی و هدیه کنار نشان لغو دیده می‌شود', async () => {
            fetchOrderTracking.mockResolvedValue(paidWith({
                quantity: 2, cancelledQuantity: 2, refundedRegularInNoor: 14, refundedGiftInNoor: 6,
            }));
            render(<ByeMoneyOrderPanel order={ORDER} />);
            const refunded = await screen.findByTestId('item-refunded');
            expect(refunded).toHaveTextContent(Number(14).toLocaleString('fa-IR'));
            expect(refunded).toHaveTextContent('نور هدیه');
            expect(refunded).toHaveTextContent(Number(6).toLocaleString('fa-IR'));
        });

        test('بدون برگشتی یا بدون لغو، سطر برگشتی نیست و هدیهٔ صفر نمایش داده نمی‌شود', async () => {
            fetchOrderTracking.mockResolvedValue(paidWith({ quantity: 2, cancelledQuantity: 0, refundedRegularInNoor: 0 }));
            const { unmount } = render(<ByeMoneyOrderPanel order={ORDER} />);
            await screen.findByTestId('cancel-flow');
            expect(screen.queryByTestId('item-refunded')).not.toBeInTheDocument();
            unmount();

            fetchOrderTracking.mockResolvedValue(paidWith({ quantity: 2, cancelledQuantity: 1, refundedRegularInNoor: 5 }));
            render(<ByeMoneyOrderPanel order={ORDER} />);
            const refunded = await screen.findByTestId('item-refunded');
            expect(refunded).not.toHaveTextContent('هدیه');
        });

        test('در لغو جزئی maxQuantity برابر تعداد باقی‌مانده است', async () => {
            fetchOrderTracking.mockResolvedValue(paidWith({ quantity: 5, cancelledQuantity: 2 }));
            render(<ByeMoneyOrderPanel order={ORDER} />);
            const flow = await screen.findByTestId('cancel-flow');
            expect(flow).toHaveAttribute('data-max-quantity', '3');
        });
    });

    describe('کنترل ساخت مرسولهٔ سبد (CartShipmentControl)', () => {
        test('فقط وقتی سفارش Paid است و حداقل یک قلم فعال Preparing بدون مرسوله دارد نمایش داده می‌شود', async () => {
            fetchOrderTracking.mockResolvedValue(payload({
                order: {
                    ...payload().order,
                    financialStatus: 'Paid',
                    items: [
                        { title: 'کتاب', itemType: 'Product', quantity: 2, cancelledQuantity: 0, finalAmountInNoor: 20, purchaseId: 'p1', physicalDeliveryStatus: 'Preparing' },
                    ],
                },
                receipt: { purchasedAtUtc: '2026-11-01T10:20:00Z', couponCode: null, finalAmountInNoor: 20, cartSummary: { originalTotalInNoor: 20 }, items: [] },
            }));
            render(<ByeMoneyOrderPanel order={ORDER} />);
            expect(await screen.findByTestId('cart-shipment-section')).toBeInTheDocument();
            expect(screen.getByTestId('create-provider-shipment')).toHaveTextContent('ارسال با واسط پستی');
        });

        test('اگر مرسوله قبلاً ساخته شده باشد (دارای providerParcelId) مخفی است', async () => {
            fetchOrderTracking.mockResolvedValue(payload({
                order: {
                    ...payload().order,
                    financialStatus: 'Paid',
                    items: [
                        { title: 'کتاب', itemType: 'Product', quantity: 2, cancelledQuantity: 0, finalAmountInNoor: 20, purchaseId: 'p1', physicalDeliveryStatus: 'Preparing', providerParcelId: 'parcel-123' },
                    ],
                },
                receipt: { purchasedAtUtc: '2026-11-01T10:20:00Z', couponCode: null, finalAmountInNoor: 20, cartSummary: { originalTotalInNoor: 20 }, items: [] },
            }));
            render(<ByeMoneyOrderPanel order={ORDER} />);
            await screen.findByText('کتاب');
            expect(screen.queryByTestId('cart-shipment-section')).not.toBeInTheDocument();
        });

        test('اگر همه اقلام فیزیکی لغو شده باشند مخفی است', async () => {
            fetchOrderTracking.mockResolvedValue(payload({
                order: {
                    ...payload().order,
                    financialStatus: 'Paid',
                    items: [
                        { title: 'کتاب', itemType: 'Product', quantity: 2, cancelledQuantity: 2, finalAmountInNoor: 20, purchaseId: 'p1', physicalDeliveryStatus: 'Preparing' },
                    ],
                },
                receipt: { purchasedAtUtc: '2026-11-01T10:20:00Z', couponCode: null, finalAmountInNoor: 20, cartSummary: { originalTotalInNoor: 20 }, items: [] },
            }));
            render(<ByeMoneyOrderPanel order={ORDER} />);
            await screen.findByTestId('item-cancelled-badge');
            expect(screen.queryByTestId('cart-shipment-section')).not.toBeInTheDocument();
        });
    });

    test('خطای دریافت جزئیات فقط در همین پنل پیام می‌دهد', async () => {
        fetchOrderTracking.mockRejectedValue(new Error('ادمین به سفارش‌های بای‌مانی دسترسی ندارد'));
        render(<ByeMoneyOrderPanel order={ORDER} />);
        expect(await screen.findByRole('alert')).toHaveTextContent('دسترسی ندارد');
    });
});

describe('useOrderTracking — بازخوانی پس از برگشت', () => {
    function Probe() {
        const { state, reload } = useOrderTracking(ORDER);
        const [result, setResult] = useState('');
        const status = state.data?.order?.items?.[0]?.closedParcelRefundStatus || '';
        return (
            <>
                <span data-testid="loading">{state.loading ? 'yes' : 'no'}</span>
                <span data-testid="item-status">{status}</span>
                <span data-testid="reload-result">{result}</span>
                <button
                    type="button"
                    onClick={async () => {
                        const ok = await reload({ keepVisible: true });
                        setResult(ok ? 'ok' : 'fail');
                    }}
                >
                    quiet
                </button>
            </>
        );
    }

    const tracked = (status) => ({
        order: {
            orderId: ORDER.orderId,
            items: [{ purchaseId: 'p1', itemType: 'Product', closedParcelRefundStatus: status, title: 'کتاب' }],
        },
        warnings: [],
        timeline: [],
    });

    test('جزئیات قبلی می‌ماند و شکست بازخوانی داده را پاک نمی‌کند', async () => {
        fetchOrderTracking.mockResolvedValue(tracked('NotRefunded'));
        render(<Probe />);
        expect(await screen.findByTestId('item-status')).toHaveTextContent('NotRefunded');

        let resolveNext;
        const before = fetchOrderTracking.mock.calls.length;
        fetchOrderTracking.mockImplementation(() => new Promise((resolve) => { resolveNext = resolve; }));
        fireEvent.click(screen.getByText('quiet'));
        await waitFor(() => expect(fetchOrderTracking.mock.calls.length).toBeGreaterThan(before));
        expect(screen.getByTestId('loading')).toHaveTextContent('no');
        expect(screen.getByTestId('item-status')).toHaveTextContent('NotRefunded');

        resolveNext(tracked('Refunded'));
        await waitFor(() => expect(screen.getByTestId('item-status')).toHaveTextContent('Refunded'));
        await waitFor(() => expect(screen.getByTestId('reload-result')).toHaveTextContent('ok'));

        fetchOrderTracking.mockRejectedValue(new Error('down'));
        fireEvent.click(screen.getByText('quiet'));
        await waitFor(() => expect(screen.getByTestId('reload-result')).toHaveTextContent('fail'));
        expect(screen.getByTestId('loading')).toHaveTextContent('no');
        expect(screen.getByTestId('item-status')).toHaveTextContent('Refunded');
    });
});

describe('OrderItemsList — برچسب‌گذاری برگشتی و بازگشت وجه', () => {
    test('فیلدهای رسیدگی برگشتی با برچسب روشن و بخش بازگشت وجه جدا نمایش داده می‌شوند', () => {
        render(
            <OrderItemsList
                detail={{
                    orderId: ORDER.orderId,
                    items: [{
                        purchaseId: 'p-ret',
                        itemType: 'Product',
                        title: 'کتاب نمونه',
                        priceInNoor: 30,
                        finalAmountInNoor: 30,
                        carrierReturnedAtUtc: '2026-11-24T18:20:00Z',
                        carrierReturnResolution: 'ClosedWithoutSettlement',
                        carrierReturnResolutionNote: 'برگشت به انبار',
                        carrierReturnResolvedAtUtc: '2026-11-24T21:50:00Z',
                        carrierReturnResolvedByExternalUserId: 'admin-123',
                        carrierReturnResolvedByName: 'علی رضایی',
                        closedParcelRefundStatus: 'NotRefunded',
                    }],
                }}
                isPaid
            />
        );

        const resolved = screen.getByTestId('carrier-return-resolved');
        expect(resolved).toHaveTextContent('نتیجهٔ رسیدگی:');
        expect(resolved).toHaveTextContent('یادداشت ادمین:');
        expect(resolved).toHaveTextContent('برگشت به انبار');
        expect(resolved).toHaveTextContent('زمان رسیدگی:');
        expect(resolved).toHaveTextContent('رسیدگی‌کننده:');
        expect(resolved).toHaveTextContent('علی رضایی');
        expect(resolved).not.toHaveTextContent('admin-123');

        const refundBox = screen.getByTestId('closed-parcel-refund');
        expect(refundBox).toHaveTextContent('بازگشت وجه (نور) به خریدار');
        expect(screen.getByTestId('closed-parcel-refund-badge')).toHaveTextContent('برگشت ثبت نشده');
    });
});
