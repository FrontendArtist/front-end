import React from 'react';
import { render, screen, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import { PermissionsProvider } from '@/context/PermissionsContext';
import AdminSidebar from '../AdminSidebar';

let mockPath = '/admin/orders';
jest.mock('next/navigation', () => ({ usePathname: () => mockPath }));
jest.mock('next-auth/react', () => ({ signOut: jest.fn() }));
jest.mock('@/store/useCartStore', () => ({ useCartStore: { getState: () => ({ clearCart: jest.fn() }) } }));

const renderWith = (permissions) => render(
  <PermissionsProvider initialPermissions={permissions}>
    <AdminSidebar user={{ name: 'ادمین' }} />
  </PermissionsProvider>,
);

describe('AdminSidebar orders submenu', () => {
  test('settlements sits under orders only with Purchases.View; manual order has no menu item', () => {
    renderWith(['Purchases.View', 'Courses.Manage']);
    const sub = screen.getByRole('list', { name: 'زیرمنوی سفارش‌ها' });
    expect(within(sub).getByRole('link', { name: 'تسویه و آرشیو' })).toHaveAttribute('href', '/admin/orders/settlements');
    expect(screen.queryByRole('link', { name: 'ثبت دستی' })).not.toBeInTheDocument();
  });

  test('without Purchases.View the submenu is hidden', () => {
    renderWith([]);
    expect(screen.queryByRole('link', { name: 'تسویه و آرشیو' })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'سفارش‌ها' })).toBeInTheDocument();
  });

  test('only the active page is marked current', () => {
    mockPath = '/admin/orders/settlements';
    renderWith(['Purchases.View']);
    expect(screen.getByRole('link', { name: 'تسویه و آرشیو' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: 'سفارش‌ها' })).not.toHaveAttribute('aria-current');
    mockPath = '/admin/orders';
  });
});
