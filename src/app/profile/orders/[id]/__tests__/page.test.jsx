import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import OrderDetailPage from '../page';
import { mapByeMoneyLineItem } from '@/lib/byeMoneyOrderItems';
import { getMyCourseOrderReceipt } from '@/lib/byeMoneyApi';

jest.mock('next/navigation', () => ({
  useParams: () => ({ id: 'cart:11111111-1111-1111-1111-111111111111' }),
  useRouter: () => ({ push: jest.fn() }),
}));
jest.mock('next-auth/react', () => ({
  useSession: () => ({ data: { user: { jwt: 'user-jwt' } } }),
}));
jest.mock('next/link', () => ({ children, href }) => <a href={href}>{children}</a>);
jest.mock('@/components/profile/OrderReceiptUpload', () => () => null);
jest.mock('@/components/ui/PriceWithHint/PriceWithHint', () => ({ price }) => (
  <span data-testid="price">{String(price)}</span>
));
jest.mock('@/lib/byeMoneyApi', () => ({
  getCoursePurchaseReceipt: jest.fn(),
  getMyCourseOrderReceipt: jest.fn(),
}));

const baseOrder = {
  id: 'cart:11111111-1111-1111-1111-111111111111',
  documentId: 'cart:11111111-1111-1111-1111-111111111111',
  orderId: 'cart:11111111-1111-1111-1111-111111111111',
  source: 'byemoney',
  createdAt: '2026-11-01T10:00:00Z',
  financialStatus: 'Paid',
  deliveryStatus: 'Pending',
  totalPrice: 37,
};

const productItem = (physicalDeliveryStatus, extra = {}) => mapByeMoneyLineItem({
  externalCourseId: 'prod-1',
  itemType: 'Product',
  title: 'کتاب تفسیر',
  quantity: 3,
  priceInNoor: 9,
  finalAmountInNoor: 27,
  purchaseId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  deliveryStatus: 'Pending',
  physicalDeliveryStatus,
  ...extra,
});

function mockOrder(order) {
  global.fetch = jest.fn(async () => ({ ok: true, json: async () => ({ data: [order] }) }));
}

describe('صفحهٔ جزئیات سفارش – کالای فیزیکی (I11-O)', () => {
  beforeEach(() => {
    getMyCourseOrderReceipt.mockReset();
  });

  it.each([
    ['Preparing', 'در حال آماده‌سازی'],
    ['Shipped', 'ارسال‌شده'],
    ['Delivered', 'تحویل‌شده'],
  ])('وضعیت فیزیکی %s را به صورت «%s» نشان می‌دهد', async (status, label) => {
    mockOrder({ ...baseOrder, items: [productItem(status)] });
    render(<OrderDetailPage />);
    expect(await screen.findByTestId('physical-delivery-status')).toHaveTextContent(label);
  });

  it('تعداد، قیمت واحد و مبلغ نهایی را بدون ضرب مضاعف نشان می‌دهد', async () => {
    mockOrder({ ...baseOrder, items: [productItem('Preparing')] });
    render(<OrderDetailPage />);
    await screen.findByText('کتاب تفسیر');
    expect(screen.getByText(/× 3/)).toBeInTheDocument();
    expect(screen.getByText(/قیمت واحد/)).toHaveTextContent((9).toLocaleString('fa-IR'));
    // مبلغ ردیف همان ۲۷ است نه ۸۱
    expect(screen.getAllByTestId('price').map((n) => n.textContent)).toContain('27');
    expect(screen.queryByText('81')).not.toBeInTheDocument();
  });

  it('هزینهٔ ارسال از cartSummary در ردیف جدا نمایش داده می‌شود', async () => {
    mockOrder({
      ...baseOrder,
      cartSummary: { originalTotalInNoor: 27, itemDiscountInNoor: 0, couponDiscountInNoor: 0, shippingAmountInNoor: 10, finalAmountInNoor: 37 },
      items: [productItem('Shipped')],
    });
    render(<OrderDetailPage />);
    const row = await screen.findByTestId('shipping-row');
    expect(row).toHaveTextContent('هزینهٔ ارسال');
    expect(row).toHaveTextContent((10).toLocaleString('fa-IR'));
  });

  it('کالا لینک دوره ندارد و «دوره آموزشی» نمایش داده نمی‌شود', async () => {
    mockOrder({ ...baseOrder, items: [productItem('Preparing')] });
    render(<OrderDetailPage />);
    await screen.findByText('کتاب تفسیر');
    expect(screen.queryByText('دوره آموزشی')).not.toBeInTheDocument();
    expect(screen.getByText('محصول')).toBeInTheDocument();
    expect(document.querySelector('a[href*="/courses"]')).toBeNull();
  });

  it('سفارش بدون کالا: ردیف ارسال و وضعیت فیزیکی ندارد و نمایش دوره تغییر نمی‌کند', async () => {
    const course = mapByeMoneyLineItem({ externalCourseId: 'c1', itemType: 'Course', title: 'دوره تفسیر', finalAmountInNoor: 15, purchaseId: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb' });
    mockOrder({
      ...baseOrder,
      totalPrice: 15,
      cartSummary: { originalTotalInNoor: 15, itemDiscountInNoor: 0, couponDiscountInNoor: 0, shippingAmountInNoor: 0, finalAmountInNoor: 15 },
      items: [course],
    });
    render(<OrderDetailPage />);
    await screen.findByText('دوره تفسیر');
    expect(screen.getByText('دوره آموزشی')).toBeInTheDocument();
    expect(screen.queryByTestId('shipping-row')).not.toBeInTheDocument();
    expect(screen.queryByTestId('physical-delivery-status')).not.toBeInTheDocument();
    expect(screen.getAllByTestId('price').map((n) => n.textContent)).toContain('15');
  });

  it('فیلدهای ناشناخته یا null خطا نمی‌دهند', async () => {
    mockOrder({
      ...baseOrder,
      cartSummary: null,
      items: [productItem(null, { quantity: null, priceInNoor: null, finalAmountInNoor: null, unknownFutureField: { a: 1 } })],
    });
    render(<OrderDetailPage />);
    expect(await screen.findByText('کتاب تفسیر')).toBeInTheDocument();
    expect(screen.queryByTestId('physical-delivery-status')).not.toBeInTheDocument();
  });

  it('رسید کل سفارش با endpoint جدید بارگذاری و نمایش داده می‌شود', async () => {
    mockOrder({ ...baseOrder, items: [productItem('Shipped')] });
    getMyCourseOrderReceipt.mockResolvedValue({
      success: true,
      data: {
        orderId: baseOrder.orderId,
        finalAmountInNoor: 37,
        purchasedAtUtc: '2026-11-01T10:00:00Z',
        cartSummary: { shippingAmountInNoor: 10 },
        items: [{ purchaseId: 'p1', title: 'کتاب تفسیر', quantity: 3, unitPriceInNoor: 9, finalAmountInNoor: 27, physicalDeliveryStatus: 'Shipped' }],
      },
    });
    render(<OrderDetailPage />);
    fireEvent.click(await screen.findByText('مشاهده رسید کل سفارش'));
    const receipt = await screen.findByTestId('order-receipt');
    expect(getMyCourseOrderReceipt).toHaveBeenCalledWith({ jwt: 'user-jwt', orderId: baseOrder.orderId });
    expect(receipt).toHaveTextContent('کتاب تفسیر');
    expect(receipt).toHaveTextContent('ارسال‌شده');
    expect(receipt).toHaveTextContent((37).toLocaleString('fa-IR'));
  });

  it('خطای ۴۰۴ رسید سفارش پیام «خرید پیدا نشد.» را نشان می‌دهد', async () => {
    mockOrder({ ...baseOrder, items: [productItem('Shipped')] });
    getMyCourseOrderReceipt.mockResolvedValue({ success: false, notFound: true, error: 'خرید پیدا نشد.' });
    render(<OrderDetailPage />);
    fireEvent.click(await screen.findByText('مشاهده رسید کل سفارش'));
    await waitFor(() => expect(screen.getByText('خرید پیدا نشد.')).toBeInTheDocument());
  });

  it.each([
    ['Preparing', true],
    ['Shipped', false],
    ['Delivered', false],
  ])('دکمهٔ لغو بخش فیزیکی برای وضعیت %s: %s', async (status, visible) => {
    mockOrder({ ...baseOrder, items: [productItem(status)] });
    render(<OrderDetailPage />);
    await screen.findByText('کتاب تفسیر');
    const btn = screen.queryByText('لغو بخش فیزیکی سفارش');
    if (visible) expect(btn).toBeInTheDocument();
    else expect(btn).not.toBeInTheDocument();
    // کاربر هیچ‌وقت لغو قلم/تعداد نمی‌بیند
    expect(screen.queryByRole('spinbutton')).not.toBeInTheDocument();
  });
});
