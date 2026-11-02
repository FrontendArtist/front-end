import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import ByeMoneyOrderPanel from '../ByeMoneyOrderPanel';
import { fetchOrderTracking } from '@/lib/client/admin/ordersClient';

jest.mock('@/lib/client/admin/ordersClient', () => ({ fetchOrderTracking: jest.fn() }));
jest.mock('../PhysicalDeliveryControl', () => ({ purchaseId }) => <div data-testid="delivery-control">{purchaseId}</div>);
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
        expect(screen.queryByTestId('delivery-control')).not.toBeInTheDocument();
        expect(fetchOrderTracking).toHaveBeenCalledWith(ORDER.orderId, expect.any(Object));
        await waitFor(() => expect(onSummary).toHaveBeenCalledWith(expect.objectContaining({ label: 'لغو توسط کاربر' })));
    });

    test('آدرس تحویل فقط وقتی هست نمایش داده می‌شود', async () => {
        fetchOrderTracking.mockResolvedValue(payload({
            shippingAddress: { recipientName: 'علی رضایی', recipientPhone: '09120000000', province: 'قم', city: 'قم', fullAddress: 'خیابان ۱', postalCode: '12345' },
        }));
        const { unmount } = render(<ByeMoneyOrderPanel order={ORDER} />);
        const box = await screen.findByTestId('shipping-address');
        expect(box).toHaveTextContent('علی رضایی');
        expect(box).toHaveTextContent('قم، قم، خیابان ۱');
        expect(box).toHaveTextContent('کد پستی: 12345');
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
        const controls = screen.getAllByTestId('delivery-control');
        expect(controls).toHaveLength(1);
        expect(controls[0]).toHaveTextContent('p1');
    });

    test('خطای دریافت جزئیات فقط در همین پنل پیام می‌دهد', async () => {
        fetchOrderTracking.mockRejectedValue(new Error('ادمین به سفارش‌های بای‌مانی دسترسی ندارد'));
        render(<ByeMoneyOrderPanel order={ORDER} />);
        expect(await screen.findByRole('alert')).toHaveTextContent('دسترسی ندارد');
    });
});
