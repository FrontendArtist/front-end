import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import OrdersList from '../OrdersList';
import { useAccountOrders } from '@/hooks/useAccountOrders';

jest.mock('@/hooks/useAccountOrders');
jest.mock('next/link', () => {
  return ({ children, href, className }) => (
    <a href={href} className={className}>
      {children}
    </a>
  );
});

describe('OrdersList Component', () => {
  const fetchOrdersMock = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders loading skeleton when isLoading is true', () => {
    useAccountOrders.mockReturnValue({
      orders: [],
      isLoading: true,
      error: null,
      byemoneyWarning: false,
      fetchOrders: fetchOrdersMock,
    });

    render(<OrdersList />);
    expect(screen.getByText('در حال دریافت تاریخچه سفارشات...')).toBeInTheDocument();
  });

  it('renders error message with retry button when error occurs', () => {
    useAccountOrders.mockReturnValue({
      orders: [],
      isLoading: false,
      error: 'خطای بارگذاری سفارشات',
      byemoneyWarning: false,
      fetchOrders: fetchOrdersMock,
    });

    render(<OrdersList />);
    expect(screen.getByRole('alert')).toHaveTextContent('خطای بارگذاری سفارشات');
    const retryBtn = screen.getByRole('button', { name: 'تلاش مجدد' });
    fireEvent.click(retryBtn);
    expect(fetchOrdersMock).toHaveBeenCalledWith(true);
  });

  it('renders empty state when orders array is empty', () => {
    useAccountOrders.mockReturnValue({
      orders: [],
      isLoading: false,
      error: null,
      byemoneyWarning: false,
      fetchOrders: fetchOrdersMock,
    });

    render(<OrdersList />);
    expect(screen.getByText('سفارشی ثبت نشده است')).toBeInTheDocument();
  });

  it('renders byemoneyWarning notice and Toman price with Persian ID for legacy Strapi orders', () => {
    useAccountOrders.mockReturnValue({
      orders: [
        {
          id: 101,
          documentId: 'strapi-order-101',
          source: 'strapi',
          createdAt: '2026-10-15T12:00:00Z',
          orderStatus: 'paid',
          paymentStatus: 'paid',
          totalPrice: 450000,
          items: [{ title: 'دوره استراپی' }],
        },
      ],
      isLoading: false,
      error: null,
      byemoneyWarning: true,
      fetchOrders: fetchOrdersMock,
    });

    render(<OrdersList />);
    expect(screen.getByText(/در دریافت بخشی از تاریخچه سفارش‌ها خطایی رخ داده است/)).toBeInTheDocument();
    expect(screen.getByText(/۱۰۱/)).toBeInTheDocument();
    expect(screen.getByText(`${Number(450000).toLocaleString('fa-IR')} تومان`)).toBeInTheDocument();
    expect(screen.queryByText('نور')).not.toBeInTheDocument();
    expect(screen.getByText('۱ قلم')).toBeInTheDocument();
  });

  it('renders Noor for Strapi orders with currency="noor" and رایگان for free Strapi orders', () => {
    useAccountOrders.mockReturnValue({
      orders: [
        {
          id: 102,
          documentId: 'strapi-order-noor',
          source: 'strapi',
          currency: 'noor',
          createdAt: '2026-10-16T12:00:00Z',
          orderStatus: 'paid',
          paymentStatus: 'paid',
          totalPrice: 120,
          items: [{ title: 'دوره نور' }],
        },
        {
          id: 103,
          documentId: 'strapi-order-free',
          source: 'strapi',
          paymentMethod: 'free',
          createdAt: '2026-10-17T12:00:00Z',
          orderStatus: 'paid',
          paymentStatus: 'paid',
          totalPrice: 0,
          items: [{ title: 'دوره رایگان' }],
        },
      ],
      isLoading: false,
      error: null,
      byemoneyWarning: false,
      fetchOrders: fetchOrdersMock,
    });

    render(<OrdersList />);
    expect(screen.getByText('نور')).toBeInTheDocument();
    expect(screen.getByText('رایگان')).toBeInTheDocument();
  });

  it('handles legacy Strapi canceled card-to-card (L5) and shipped/delivered statuses (L1)', () => {
    useAccountOrders.mockReturnValue({
      orders: [
        {
          id: 1739,
          documentId: 'testleg005c2c0canceled01',
          source: 'strapi',
          paymentMethod: 'card_to_card',
          orderStatus: 'canceled',
          paymentStatus: 'pending_payment',
          totalPrice: 100000,
          createdAt: '2026-10-18T10:00:00Z',
          items: [{ title: 'آیتم' }],
        },
        {
          id: 1735,
          documentId: 'testleg001online0shipped',
          source: 'strapi',
          paymentMethod: 'online',
          orderStatus: 'shipped',
          paymentStatus: 'paid',
          totalPrice: 200000,
          createdAt: '2026-10-19T10:00:00Z',
          items: [{ title: 'کتاب' }],
        },
        {
          id: 1741,
          documentId: 'testleg007c2c0delivered1',
          source: 'strapi',
          paymentMethod: 'card_to_card',
          orderStatus: 'delivered',
          paymentStatus: 'paid',
          totalPrice: 300000,
          createdAt: '2026-10-20T10:00:00Z',
          items: [{ title: 'جزوه' }],
        },
      ],
      isLoading: false,
      error: null,
      byemoneyWarning: false,
      fetchOrders: fetchOrdersMock,
    });

    render(<OrdersList />);
    // L5: canceled card-to-card must NOT say pending receipt or upload receipt
    expect(screen.getByText('لغو شده')).toBeInTheDocument();
    expect(screen.queryByText('منتظر فیش واریز')).not.toBeInTheDocument();
    expect(screen.queryByText('آپلود فیش پرداخت')).not.toBeInTheDocument();
    expect(screen.getAllByText('مشاهده جزئیات')).toHaveLength(3);

    // L1: shipped online order shows both payment success and shipped badge
    expect(screen.getByText('پرداخت آنلاین موفق ✓')).toBeInTheDocument();
    expect(screen.getByText('ارسال شده')).toBeInTheDocument();

    // delivered card-to-card shows paid + delivered
    expect(screen.getByText('تحویل داده شد')).toBeInTheDocument();
  });

  it('renders independent financial and delivery badges for ByeMoney orders without redundant unpaid delivery badge', () => {
    useAccountOrders.mockReturnValue({
      orders: [
        {
          id: 'cart:11111111-1111-1111-1111-111111111111',
          documentId: 'cart:11111111-1111-1111-1111-111111111111',
          source: 'byemoney',
          sourceType: 'Cart',
          financialStatus: 'Paid',
          deliveryStatus: 'Pending',
          totalPrice: 25,
          itemCount: 1,
          createdAt: '2026-10-20T10:00:00Z',
          items: [],
        },
        {
          id: 'topup:22222222-2222-2222-2222-222222222222',
          documentId: 'topup:22222222-2222-2222-2222-222222222222',
          source: 'byemoney',
          sourceType: 'TopUpCheckout',
          financialStatus: 'AwaitingPayment',
          deliveryStatus: 'NotStarted',
          totalPrice: 50,
          itemCount: 2,
          createdAt: '2026-10-20T09:00:00Z',
          items: [],
        },
      ],
      isLoading: false,
      error: null,
      byemoneyWarning: false,
      fetchOrders: fetchOrdersMock,
    });

    render(<OrdersList />);

    // First order: Paid + Pending
    expect(screen.getByText('پرداخت شده ✓')).toBeInTheDocument();
    expect(screen.getByText('در انتظار تحویل')).toBeInTheDocument();

    // Second order: AwaitingPayment only (NotStarted hidden when unpaid)
    expect(screen.getByText('در انتظار پرداخت')).toBeInTheDocument();
    expect(screen.queryByText('تحویل آغاز نشده')).not.toBeInTheDocument();

    // Noor currency units
    expect(screen.getAllByText('نور')).toHaveLength(2);

    // Check link targets
    const links = screen.getAllByRole('link');
    expect(links[0]).toHaveAttribute('href', '/profile/orders/cart:11111111-1111-1111-1111-111111111111');
    expect(links[1]).toHaveAttribute('href', '/profile/orders/topup:22222222-2222-2222-2222-222222222222');
  });

  it('renders clear badges for ByeMoney Preparing and Paid+Cancelled physical/mixed orders', () => {
    useAccountOrders.mockReturnValue({
      orders: [
        {
          id: 'cart:33333333-3333-3333-3333-333333333333',
          documentId: 'cart:33333333-3333-3333-3333-333333333333',
          source: 'byemoney',
          financialStatus: 'Preparing',
          deliveryStatus: 'NotStarted',
          totalPrice: 40,
          itemCount: 1,
          createdAt: '2026-10-20T12:00:00Z',
          items: [],
        },
        {
          id: 'cart:44444444-4444-4444-4444-444444444444',
          documentId: 'cart:44444444-4444-4444-4444-444444444444',
          source: 'byemoney',
          financialStatus: 'Paid',
          deliveryStatus: 'Cancelled',
          totalPrice: 360000,
          itemCount: 1,
          createdAt: '2026-10-20T11:00:00Z',
          items: [],
        },
        {
          id: 'cart:55555555-5555-5555-5555-555555555555',
          documentId: 'cart:55555555-5555-5555-5555-555555555555',
          source: 'byemoney',
          financialStatus: 'Paid',
          deliveryStatus: 'Cancelled',
          totalPrice: 500000,
          itemCount: 2,
          createdAt: '2026-10-20T10:30:00Z',
          items: [{ type: 'chapter', title: 'فصل ۱' }],
        },
      ],
      isLoading: false,
      error: null,
      byemoneyWarning: false,
      fetchOrders: fetchOrdersMock,
    });

    render(<OrdersList />);
    expect(screen.getByText('در حال ثبت سفارش')).toBeInTheDocument();
    expect(screen.queryByText('در حال آماده‌سازی')).not.toBeInTheDocument();
    expect(screen.getByText('سفارش لغو شد')).toBeInTheDocument();
    // Only the mixed order (cart:5555...) has "پرداخت شده ✓"
    expect(screen.getAllByText('پرداخت شده ✓')).toHaveLength(1);
    expect(screen.getByText('کالای فیزیکی لغو شد')).toBeInTheDocument();
  });
});
