import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import ProfileSidebar from '../ProfileSidebar';
import { usePathname } from 'next/navigation';

jest.mock('next-auth/react', () => ({
    useSession: () => ({ data: { user: { name: 'علی' } } }),
    signOut: jest.fn(),
}));
jest.mock('next/navigation', () => ({
    usePathname: jest.fn(),
}));
jest.mock('next/link', () => ({ children, href, className }) => (
    <a href={href} className={className}>
        {children}
    </a>
));
jest.mock('../ProfileSidebar.module.scss', () => ({
    sidebar: 'sidebar',
    userSummary: 'userSummary',
    avatar: 'avatar',
    userInfo: 'userInfo',
    userName: 'userName',
    welcomeText: 'welcomeText',
    nav: 'nav',
    navLink: 'navLink',
    active: 'active',
    logoutButton: 'logoutButton',
}));

describe('ProfileSidebar', () => {
    it('در مسیر زیرمجموعه /profile/orders/[id] گزینه «سفارش‌های من» فعال می‌ماند و /profile فعال نمی‌شود', () => {
        usePathname.mockReturnValue('/profile/orders/cart:11111111-1111-1111-1111-111111111111');
        render(<ProfileSidebar />);

        const ordersLink = screen.getByText('سفارش‌های من').closest('a');
        const profileLink = screen.getByText('اطلاعات حساب').closest('a');
        expect(ordersLink).toHaveClass('active');
        expect(profileLink).not.toHaveClass('active');
    });

    it('در مسیر دقیق /profile فقط «اطلاعات حساب» فعال می‌شود', () => {
        usePathname.mockReturnValue('/profile');
        render(<ProfileSidebar />);

        const ordersLink = screen.getByText('سفارش‌های من').closest('a');
        const profileLink = screen.getByText('اطلاعات حساب').closest('a');
        expect(profileLink).toHaveClass('active');
        expect(ordersLink).not.toHaveClass('active');
    });
});
