import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import AddToCartButton from '../AddToCartButton';
import { useCartStore } from '@/store/useCartStore';
import { useOrdersStore } from '@/store/useOrdersStore';

let mockSession = null;
jest.mock('next-auth/react', () => ({
  useSession: () => ({ data: mockSession, status: mockSession ? 'authenticated' : 'unauthenticated' }),
}));

describe('کامپوننت AddToCartButton - مسدودسازی خرید مجدد و نمایش وضعیت مالکیت', () => {
  const course = {
    id: 50,
    documentId: 'course-doc-50',
    slug: 'react-mastery',
    title: 'دوره جامع ری‌اکت',
    price: 250000,
    image: '/images/react.png',
  };

  beforeEach(() => {
    mockSession = null;
    useCartStore.setState({ items: [] });
    useOrdersStore.getState().setOrdersUser(null);
  });

  test('کاربر غیر مالک دکمه "افزودن به سبد خرید" را می‌بیند و کلیک روی آن دوره را به سبد اضافه می‌کند', () => {
    render(<AddToCartButton course={course} />);

    const button = screen.getByRole('button', { name: /افزودن دوره جامع ری‌اکت به سبد خرید/i });
    expect(button).toBeTruthy();
    expect(button.textContent).toContain('افزودن به سبد خرید');

    fireEvent.click(button);

    const items = useCartStore.getState().items;
    expect(items.length).toBe(1);
    expect(items[0].slug).toBe('react-mastery');
    expect(items[0].id).toBe(50);
  });

  test('اگر دوره در سبد باشد، دکمه "موجود در سبد خرید" به صورت غیرفعال نمایش داده می‌شود', () => {
    useCartStore.setState({
      items: [{ id: 50, slug: 'react-mastery', type: 'course', documentId: 'course-doc-50' }],
    });

    render(<AddToCartButton course={course} />);

    const button = screen.getByRole('button', { name: /دوره جامع ری‌اکت در سبد خرید موجود است/i });
    expect(button).toBeTruthy();
    expect(button.textContent).toContain('موجود در سبد خرید');
    expect(button.disabled).toBe(true);
  });

  test('اگر course.isPurchased مقدار true داشته باشد، دکمه "مشاهده دوره" نمایش داده شده و به صفحه دوره لینک دارد', () => {
    const purchasedCourse = { ...course, isPurchased: true };
    render(<AddToCartButton course={purchasedCourse} />);

    const link = screen.getByRole('link', { name: /مشاهده دوره دوره جامع ری‌اکت/i });
    expect(link).toBeTruthy();
    expect(link.textContent).toContain('مشاهده دوره');
    expect(link.getAttribute('href')).toBe('/courses/react-mastery');

    // کلیک روی مشاهده دوره نباید قلمی به سبد اضافه کند
    fireEvent.click(link);
    expect(useCartStore.getState().items.length).toBe(0);
  });

  test('اگر کاربر در سشن دارای این دوره باشد (session.user.courses)، دکمه "مشاهده دوره" نمایش داده می‌شود', () => {
    mockSession = {
      user: {
        id: 'usr-1',
        courses: [{ documentId: 'course-doc-50', slug: 'react-mastery' }],
      },
    };

    render(<AddToCartButton course={course} />);

    const link = screen.getByRole('link', { name: /مشاهده دوره دوره جامع ری‌اکت/i });
    expect(link).toBeTruthy();
    expect(link.textContent).toContain('مشاهده دوره');
    expect(link.getAttribute('href')).toBe('/courses/react-mastery');

    fireEvent.click(link);
    expect(useCartStore.getState().items.length).toBe(0);
  });

  test('اگر دوره در سفارش‌های پرداخت‌شده کاربر ثبت شده باشد، دکمه "مشاهده دوره" نمایش داده می‌شود', () => {
    mockSession = { user: { id: 'usr-2' } };
    useOrdersStore.getState().setOrdersUser('usr-2');
    useOrdersStore.setState({
      userId: 'usr-2',
      hasFetched: true,
      orders: [
        {
          id: 99,
          orderStatus: 'paid',
          paymentStatus: 'paid',
          items: [{ courseId: 50, slug: 'react-mastery', title: 'دوره جامع ری‌اکت' }],
        },
      ],
    });

    render(<AddToCartButton course={course} />);

    const link = screen.getByRole('link', { name: /مشاهده دوره دوره جامع ری‌اکت/i });
    expect(link).toBeTruthy();
    expect(link.textContent).toContain('مشاهده دوره');

    fireEvent.click(link);
    expect(useCartStore.getState().items.length).toBe(0);
  });

  test('اگر دوره دارای فروش فصلی باشد (isChaptered: true)، دکمه خرید کلی رندر نمی‌شود', () => {
    const chapteredCourse = { ...course, isChaptered: true };
    const { container } = render(<AddToCartButton course={chapteredCourse} />);
    expect(container.firstChild).toBeNull();
  });
});

