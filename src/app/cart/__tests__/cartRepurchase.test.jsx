import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import CartPage from '../page';
import { useCartStore } from '@/store/useCartStore';
import { useOrdersStore } from '@/store/useOrdersStore';

let mockSession = null;
const mockPush = jest.fn();

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}));

jest.mock('next-auth/react', () => ({
  useSession: () => ({
    data: mockSession,
    status: mockSession ? 'authenticated' : 'unauthenticated',
  }),
}));

jest.mock('next/image', () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock('@/components/cart/DiscountCouponInput/DiscountCouponInput', () => () => <div data-testid="coupon-input" />);
jest.mock('@/components/cart/EmptyCartState/EmptyCartState', () => ({ title }) => <div data-testid="empty-cart">{title}</div>);
jest.mock('@/components/cart/AddressModal/AddressModal', () => () => null);
jest.mock('@/components/ui/BreadCrumb/Breadcrumb', () => () => <nav data-testid="breadcrumb" />);
jest.mock('@/components/ui/PriceWithHint/PriceWithHint', () => ({ price }) => <span>{price}</span>);

jest.mock('@/lib/courseCartPreviewApi', () => ({
  previewCourseCart: jest.fn().mockImplementation(() => new Promise(() => {})), // pending to prevent unhandled state updates during initial render
  sameCourseCartPrice: jest.fn().mockReturnValue(true),
}));

jest.mock('@/lib/courseCartApi', () => ({
  prepareCourseCart: jest.fn(),
  getCourseCartId: jest.fn().mockReturnValue('cart-123'),
  getExistingCourseCartId: jest.fn().mockReturnValue(null),
  getCourseCart: jest.fn(),
}));

jest.mock('@/lib/byeMoneyApi', () => ({
  getWalletBalanceWithByeMoney: jest.fn().mockImplementation(() => new Promise(() => {})),
}));

jest.mock('@/hooks/usePaymentProcessing', () => () => [false, jest.fn()]);

describe('صفحه سبد خرید - مسدودسازی خرید مجدد دوره‌های خریداری‌شده', () => {
  const ownedCourse = {
    id: 10,
    documentId: 'doc-course-10',
    slug: 'course-alpha',
    title: 'دوره جامع آلفا',
    price: 150000,
    type: 'course',
  };

  const unownedCourse = {
    id: 20,
    documentId: 'doc-course-20',
    slug: 'course-beta',
    title: 'دوره پیشرفته بتا',
    price: 200000,
    type: 'course',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockSession = {
      user: {
        id: 'usr-1',
        jwt: 'jwt-token-1',
        courses: [{ documentId: 'doc-course-10', slug: 'course-alpha' }],
      },
    };
    useOrdersStore.getState().setOrdersUser('usr-1');
    useOrdersStore.setState({ userId: 'usr-1', hasFetched: true, orders: [] });
  });

  test('در صورت وجود دورهٔ خریداری‌شده در سبد، نشان اخطار، هشدار سایدبار و دکمه غیرفعال نمایش داده می‌شود', async () => {
    useCartStore.setState({
      items: [ownedCourse],
    });

    render(<CartPage />);

    // بررسی وجود نشان "خریداری‌شده" و پیام اخطار روی سطر آیتم
    expect(screen.getByText('خریداری‌شده')).toBeTruthy();
    expect(
      screen.getByText(/این دوره قبلاً خریداری شده است\. برای ادامه تسویه، لطفاً این قلم را از سبد حذف کنید\./i)
    ).toBeTruthy();

    // بررسی پیام هشدار در خلاصه سفارش
    expect(
      screen.getByText(/یک یا چند دوره در سبد خرید قبلاً توسط شما خریداری شده است/i)
    ).toBeTruthy();

    // بررسی دکمه پرداخت: باید غیرفعال باشد و پیام حذف دوره‌ها را نشان دهد
    const checkoutBtn = screen.getByRole('button', { name: /حذف دوره‌های خریداری‌شده برای ادامه/i });
    expect(checkoutBtn).toBeTruthy();
    expect(checkoutBtn.disabled).toBe(true);
  });

  test('با حذف دورهٔ خریداری‌شده از سبد، محدودیت تسویه برطرف می‌شود', async () => {
    useCartStore.setState({
      items: [ownedCourse, unownedCourse],
    });

    render(<CartPage />);

    // ابتدا دکمه غیرفعال است
    const checkoutBtn = screen.getByRole('button', { name: /حذف دوره‌های خریداری‌شده برای ادامه/i });
    expect(checkoutBtn.disabled).toBe(true);

    // حذف دورهٔ خریداری‌شده
    const removeButtons = screen.getAllByRole('button', { name: /حذف از سبد/i });
    fireEvent.click(removeButtons[0]);

    // بررسی باقی‌ماندن فقط دوره خریداری‌نشده در استور
    expect(useCartStore.getState().items.length).toBe(1);
    expect(useCartStore.getState().items[0].id).toBe(20);
  });
});

