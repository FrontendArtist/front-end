import React from 'react';
import { render, screen } from '@testing-library/react';
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

  it('renders error message when error occurs and orders are empty', () => {
    useAccountOrders.mockReturnValue({
      orders: [],
      isLoading: false,
      error: 'خطای بارگذاری سفارشات',
      byemoneyWarning: false,
      fetchOrders: fetchOrdersMock,
    });

    render(<OrdersList />);
    expect(screen.getByText('خطای بارگذاری سفارشات')).toBeInTheDocument();
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

  it('renders byemoneyWarning notice if byemoney sync fails while displaying Strapi orders', () => {
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
    expect(screen.getByText(/امکان دریافت خریدهای جدید از بای‌مانی وجود ندارد/)).toBeInTheDocument();
    expect(screen.getByText(/101/)).toBeInTheDocument();
  });

  it('renders independent financial and delivery badges for ByeMoney orders', () => {
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

    // Second order: AwaitingPayment + NotStarted
    expect(screen.getByText('در انتظار پرداخت')).toBeInTheDocument();
    expect(screen.getByText('تحویل آغاز نشده')).toBeInTheDocument();

    // Noor currency units
    expect(screen.getAllByText('نور')).toHaveLength(2);

    // Check link targets
    const links = screen.getAllByRole('link');
    expect(links[0]).toHaveAttribute('href', '/profile/orders/cart:11111111-1111-1111-1111-111111111111');
    expect(links[1]).toHaveAttribute('href', '/profile/orders/topup:22222222-2222-2222-2222-222222222222');
  });
});
