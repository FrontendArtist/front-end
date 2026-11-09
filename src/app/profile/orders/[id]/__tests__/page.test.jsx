import React from 'react';
import { render, screen, fireEvent, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import OrderDetailPage from '../page';
import { mapByeMoneyLineItem } from '@/lib/byeMoneyOrderItems';

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
  cartId: '11111111-1111-1111-1111-111111111111',
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

const courseItem = (extra = {}) => mapByeMoneyLineItem({
  externalCourseId: 'c1', itemType: 'Course', title: 'دوره تفسیر', finalAmountInNoor: 10,
  purchaseId: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', deliveryStatus: 'Delivered', ...extra,
});

function mockOrder(order) {
  global.fetch = jest.fn(async () => ({ ok: true, json: async () => ({ data: [order] }) }));
}

const fa = (n) => Number(n).toLocaleString('fa-IR');

describe('جزئیات سفارش بای‌مانی – وضعیت و مبلغ در هر حالت', () => {
  const cases = [
    ['Paid', 'پرداخت شد', 'paid-amount'],
    ['AwaitingPayment', 'در انتظار پرداخت', 'payable-amount'],
    ['Processing', 'پرداخت در حال تأیید است', 'payable-amount'],
    ['Failed', 'پرداخت انجام نشد', 'payable-amount'],
    ['Expired', 'سفارش منقضی شد', 'payable-amount'],
    ['RequiresReview', 'در حال بررسی مالی', 'payable-amount'],
  ];
  const carts = {
    'فقط دوره': () => [courseItem()],
    'فقط کالا': () => [productItem('Preparing')],
    مختلط: () => [courseItem(), productItem('Preparing')],
  };

  describe.each(cases)('%s', (financialStatus, title, amountId) => {
    it.each(Object.keys(carts))('سبد %s: نشان، مبلغ و عدم تکرار', async (cartName) => {
      mockOrder({ ...baseOrder, financialStatus, items: carts[cartName]() });
      render(<OrderDetailPage />);
      expect(await screen.findByTestId('order-status-badge')).toHaveTextContent(title);
      expect(screen.getAllByTestId(amountId)).toHaveLength(1);
      expect(screen.getByTestId(amountId)).toHaveTextContent(fa(37));
      // تاریخ ثبت و شمارهٔ سفارش فقط یک‌بار
      expect(screen.getAllByText('تاریخ ثبت')).toHaveLength(1);
      expect(screen.getAllByTestId('order-number')).toHaveLength(1);
      // مبلغ نهایی (۳۷) جایی جز خلاصه نمی‌آید
      expect(screen.getAllByText(new RegExp(`^${fa(37)} نور$`))).toHaveLength(1);
    });
  });

  it('پرداخت‌نشده: «پرداخت‌شده: ۰ نور» دیده می‌شود ولی در Paid نه', async () => {
    mockOrder({ ...baseOrder, financialStatus: 'AwaitingPayment', items: [courseItem()] });
    const { unmount } = render(<OrderDetailPage />);
    expect(await screen.findByTestId('unpaid-note')).toHaveTextContent(fa(0));
    unmount();
    mockOrder({ ...baseOrder, items: [courseItem()] });
    render(<OrderDetailPage />);
    await screen.findByTestId('paid-amount');
    expect(screen.queryByTestId('unpaid-note')).not.toBeInTheDocument();
  });

  it('مهلت پرداخت از expiresAtUtc در توضیح می‌آید', async () => {
    mockOrder({ ...baseOrder, financialStatus: 'AwaitingPayment', expiresAtUtc: '2026-11-02T10:00:00Z', items: [courseItem()] });
    render(<OrderDetailPage />);
    expect(await screen.findByTestId('order-hint')).toHaveTextContent('مهلت پرداخت');
  });
});

describe('جزئیات سفارش بای‌مانی – اقلام', () => {
  it('تعداد و قیمت واحد کالا بدون ضرب مضاعف؛ مبلغ قلم همان finalAmount است', async () => {
    mockOrder({ ...baseOrder, items: [productItem('Preparing')] });
    render(<OrderDetailPage />);
    await screen.findByText('کتاب تفسیر');
    const row = screen.getByText('کتاب تفسیر').closest('li');
    expect(row).toHaveTextContent(`${fa(3)} × ${fa(9)} نور`);
    expect(row).toHaveTextContent(`${fa(27)} نور`);
    expect(screen.queryByText('دوره آموزشی')).not.toBeInTheDocument();
  });

  it('وضعیت فعال‌سازی دوره فقط کنار خود قلم است', async () => {
    mockOrder({ ...baseOrder, items: [courseItem({ deliveryStatus: 'Pending' })] });
    render(<OrderDetailPage />);
    expect(await screen.findByTestId('course-delivery-status')).toHaveTextContent('در حال فعال‌سازی');
    expect(screen.getByText('مشاهدهٔ دوره‌ها در بخش «خریدهای من» ←')).toBeInTheDocument();
  });

  it('فیلدهای ناشناخته یا null خطا نمی‌دهند', async () => {
    mockOrder({ ...baseOrder, items: [productItem(null, { title: null })], cartSummary: null, topUps: null });
    render(<OrderDetailPage />);
    expect(await screen.findByTestId('order-status-badge')).toBeInTheDocument();
  });

  it('بدون کالا: کارت ارسال و ردیف هزینهٔ ارسال نیست', async () => {
    mockOrder({ ...baseOrder, cartSummary: { originalTotalInNoor: 10, shippingAmountInNoor: 0 }, items: [courseItem()] });
    render(<OrderDetailPage />);
    await screen.findByText('دوره تفسیر');
    expect(screen.queryByTestId('shipping-card')).not.toBeInTheDocument();
    expect(screen.queryByTestId('shipping-row')).not.toBeInTheDocument();
  });
});

describe('جزئیات سفارش بای‌مانی – ریز مبلغ', () => {
  it('جمع اقلام، تخفیف و ارسال بدون تکرار مبلغ نهایی', async () => {
    mockOrder({
      ...baseOrder, couponCode: 'OFF',
      cartSummary: { originalTotalInNoor: 40, itemDiscountInNoor: 1, couponDiscountInNoor: 2, shippingAmountInNoor: 0 },
      items: [productItem('Preparing')],
    });
    render(<OrderDetailPage />);
    const box = await screen.findByTestId('amount-breakdown');
    expect(within(box).getByTestId('subtotal-row')).toHaveTextContent(fa(40));
    expect(within(box).getByTestId('discount-row')).toHaveTextContent(`OFF`);
    expect(within(box).getByTestId('discount-row')).toHaveTextContent(fa(3));
    expect(within(box).getByTestId('shipping-row')).toHaveTextContent('رایگان');
    expect(box).not.toHaveTextContent(`${fa(37)} نور`);
  });
});

describe('جزئیات سفارش بای‌مانی – ارسال کالا و آدرس', () => {
  it.each([
    ['Preparing', 'آماده‌سازی'],
    ['Shipped', 'ارسال'],
    ['Delivered', 'تحویل'],
  ])('وضعیت یکسان %s: فقط نوار پیشرفت (بدون نشان تکراری روی قلم)', async (status, step) => {
    mockOrder({ ...baseOrder, items: [productItem(status)] });
    render(<OrderDetailPage />);
    const progress = await screen.findByTestId('physical-progress');
    expect(progress).toHaveTextContent(step);
    expect(screen.queryByTestId('physical-delivery-status')).not.toBeInTheDocument();
    if (status !== 'Delivered') expect(progress.querySelector('[aria-current="step"]')).toHaveTextContent(step);
  });

  it('وضعیت ناهمسان کالاها: نشان کنار هر قلم و نوار پیشرفت ندارد', async () => {
    mockOrder({
      ...baseOrder,
      items: [productItem('Shipped'), productItem('Preparing', { externalCourseId: 'prod-2', purchaseId: 'cccccccc-cccc-cccc-cccc-cccccccccccc', title: 'جزوه' })],
    });
    render(<OrderDetailPage />);
    await screen.findByText('جزوه');
    expect(screen.getAllByTestId('physical-delivery-status')).toHaveLength(2);
    expect(screen.queryByTestId('physical-progress')).not.toBeInTheDocument();
  });

  it('سبد مختلط: دکمهٔ لغو کالا هست و قلم دوره وضعیت فیزیکی ندارد', async () => {
    mockOrder({ ...baseOrder, items: [courseItem(), productItem('Preparing')] });
    render(<OrderDetailPage />);
    expect(await screen.findByText('لغو بخش فیزیکی سفارش')).toBeInTheDocument();
  });

  it('کالای ارسال‌شده: دکمهٔ لغو نیست', async () => {
    mockOrder({ ...baseOrder, items: [courseItem(), productItem('Shipped')] });
    render(<OrderDetailPage />);
    await screen.findByTestId('physical-progress');
    expect(screen.queryByText('لغو بخش فیزیکی سفارش')).not.toBeInTheDocument();
  });

  it('آدرس تحویل در کارت ارسال نمایش داده می‌شود و بدون آن بلوک نیست', async () => {
    mockOrder({ ...baseOrder, items: [productItem('Preparing')], shippingAddress: {
      recipientName: 'علی', recipientPhone: '09120000000', province: 'تهران', city: 'کرج', fullAddress: 'خیابان ۱', postalCode: '1234567890',
    } });
    const { unmount } = render(<OrderDetailPage />);
    const box = await screen.findByTestId('shipping-address');
    expect(box).toHaveTextContent('تهران - کرج - خیابان ۱');
    expect(box).toHaveTextContent('09120000000');
    expect(box).toHaveTextContent('1234567890');
    unmount();
    mockOrder({ ...baseOrder, items: [productItem('Preparing')] });
    render(<OrderDetailPage />);
    await screen.findByTestId('shipping-card');
    expect(screen.queryByTestId('shipping-address')).not.toBeInTheDocument();
  });

  it('سفارش پرداخت‌نشده: دکمهٔ لغو و نوار پیشرفت نیست', async () => {
    mockOrder({ ...baseOrder, financialStatus: 'AwaitingPayment', items: [productItem('Preparing')] });
    render(<OrderDetailPage />);
    await screen.findByTestId('shipping-card');
    expect(screen.queryByText('لغو بخش فیزیکی سفارش')).not.toBeInTheDocument();
    expect(screen.queryByTestId('physical-progress')).not.toBeInTheDocument();
  });
});

describe('جزئیات سفارش بای‌مانی – لغو', () => {
  const cancelPayload = { outcome: 'Refunded', items: [{ regularRefundInNoor: 27, giftRefundInNoor: 0 }], shippingRegularRefundInNoor: 10 };

  it('پس از لغو موفق: دکمه برداشته و پیام و مبلغ برگشتی دیده می‌شود', async () => {
    global.fetch = jest.fn(async (url, opts) => {
      if (String(url).includes('/api/physical-orders')) {
        return { ok: true, status: 200, json: async () => ({ data: opts?.method === 'POST' ? cancelPayload : { items: [], warnings: [] } }) };
      }
      return { ok: true, json: async () => ({ data: [{ ...baseOrder, items: [productItem('Preparing')] }] }) };
    });
    render(<OrderDetailPage />);
    fireEvent.click(await screen.findByText('لغو بخش فیزیکی سفارش'));
    fireEvent.change(await screen.findByPlaceholderText('علت لغو را وارد کنید...'), { target: { value: 'منصرف شدم' } });
    fireEvent.click(screen.getByText('تأیید و لغو'));
    expect(await screen.findByTestId('physical-cancelled-notice')).toBeInTheDocument();
    expect(screen.queryByText('لغو بخش فیزیکی سفارش')).not.toBeInTheDocument();
    expect(screen.getByTestId('physical-item-cancelled')).toHaveTextContent('لغو شد');
    expect(screen.queryByTestId('physical-progress')).not.toBeInTheDocument();
    expect(screen.getByTestId('cancelled-refunds')).toHaveTextContent(fa(37));
    expect(screen.getByTestId('order-status-badge')).toHaveTextContent('سفارش لغو شد');
  });

  it('مبلغ برگشتی عادی و هدیه کنار نشان «لغو شد» می‌آید', async () => {
    mockOrder({ ...baseOrder, items: [productItem('Preparing', {
      cancelledQuantity: 3, refundedRegularInNoor: 20, refundedGiftInNoor: 7,
    })] });
    render(<OrderDetailPage />);
    const refunded = await screen.findByTestId('physical-item-refunded');
    expect(refunded).toHaveTextContent(fa(20));
    expect(refunded).toHaveTextContent(fa(7));
    expect(refunded).toHaveTextContent('هدیه');
  });

  it('اگر بک‌اند تعداد لغوشده را برگرداند، دکمهٔ لغو از ابتدا دیده نمی‌شود', async () => {
    mockOrder({ ...baseOrder, items: [productItem('Preparing', { cancelledQuantity: 3 })] });
    render(<OrderDetailPage />);
    expect(await screen.findByTestId('physical-cancelled-notice')).toBeInTheDocument();
    expect(screen.queryByText('لغو بخش فیزیکی سفارش')).not.toBeInTheDocument();
  });

  it('سبد مختلط با کالای لغوشده: نشان «پرداخت شد» می‌ماند و توضیح لغو کالا دارد', async () => {
    mockOrder({ ...baseOrder, items: [courseItem(), productItem('Preparing', { cancelledQuantity: 3 })] });
    render(<OrderDetailPage />);
    expect(await screen.findByTestId('order-status-badge')).toHaveTextContent('پرداخت شد');
    expect(screen.getByTestId('order-hint')).toHaveTextContent('لغو');
  });

  it('لغو جزئی: تعداد لغوشده روی قلم نوشته می‌شود', async () => {
    mockOrder({ ...baseOrder, items: [productItem('Preparing', { cancelledQuantity: 1 })] });
    render(<OrderDetailPage />);
    await screen.findByText('کتاب تفسیر');
    expect(screen.getByText(`${fa(1)} از ${fa(3)} عدد لغو شد`)).toBeInTheDocument();
  });
});

describe('جزئیات سفارش بای‌مانی – تلاش‌های پرداخت و کد پیگیری', () => {
  const topUp = (status, code) => ({
    topUpRequestId: `req-${code}`, clientReferenceCode: code, amountNoor: 37, status, createdAtUtc: '2026-11-01T10:00:00Z',
  });

  it('Paid: بخش تلاش‌ها نیست و کد پیگیری پرداخت یک‌بار می‌آید', async () => {
    mockOrder({ ...baseOrder, topUps: [topUp('Confirmed', 'TR-AFWGGTZX')], items: [productItem('Preparing')] });
    render(<OrderDetailPage />);
    await screen.findByText('کتاب تفسیر');
    expect(screen.queryByTestId('top-ups-section')).not.toBeInTheDocument();
    expect(screen.getByTestId('payment-ref-code')).toHaveTextContent('TR-AFWGGTZX');
  });

  it('AwaitingPayment: تلاش‌های پرداخت در بخش جمع‌شونده است', async () => {
    mockOrder({ ...baseOrder, financialStatus: 'AwaitingPayment', topUps: [topUp('Pending', 'TR-PENDING123')], items: [productItem('Preparing')] });
    render(<OrderDetailPage />);
    const section = await screen.findByTestId('top-ups-section');
    expect(section.tagName).toBe('DETAILS');
    expect(section).toHaveTextContent('TR-PENDING123');
    expect(section).toHaveTextContent('در انتظار تأیید');
  });

  it('شناسهٔ خام UUID و جزئیات فنی چاپ نمی‌شوند؛ شمارهٔ کوتاه سفارش دیده می‌شود', async () => {
    mockOrder({ ...baseOrder, transactionId: 'tx-1', referenceRialPerNoorAtPurchaseTime: 50000, items: [productItem('Preparing')] });
    render(<OrderDetailPage />);
    expect(await screen.findByTestId('order-number')).toHaveTextContent('#11111111');
    expect(screen.queryByText('11111111-1111-1111-1111-111111111111')).not.toBeInTheDocument();
    expect(screen.queryByText('tx-1')).not.toBeInTheDocument();
    expect(screen.queryByText(/نرخ مرجع ریالی/)).not.toBeInTheDocument();
  });
});
