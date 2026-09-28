import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import PurchasesList from '../PurchasesList';
import { useSession } from 'next-auth/react';
import { useOrdersStore } from '@/store/useOrdersStore';
import { fetchProfileCartData } from '@/lib/client/profileClientApi';

jest.mock('next-auth/react');
jest.mock('@/store/useOrdersStore');
jest.mock('@/lib/client/profileClientApi');
jest.mock('next/link', () => {
    return ({ children, href, className, style }) => (
        <a href={href} className={className} style={style}>
            {children}
        </a>
    );
});

describe('PurchasesList Component', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('renders courses from user.courses (Noor purchase) when orders are empty', async () => {
        useOrdersStore.mockReturnValue({
            orders: [],
            isLoading: false,
            error: null,
            fetchOrders: jest.fn(),
            hasFetched: true,
        });

        useSession.mockReturnValue({
            data: {
                user: {
                    id: 35,
                    documentId: 'kxeokzal4md7xdbh0k5x3hdc',
                    courses: [
                        {
                            id: 126,
                            documentId: 'rjmfjwsdlye17u1ojlwrqxxv',
                            title: 'ازدواج کائناتی',
                            slug: 'ezdevaj',
                            price: 1300000,
                        }
                    ]
                }
            },
            status: 'authenticated'
        });

        fetchProfileCartData.mockResolvedValue({ courses: [] });

        render(<PurchasesList />);

        await waitFor(() => {
            expect(screen.getByText('ازدواج کائناتی')).toBeInTheDocument();
        });

        // Verify link points to the course page
        const viewLink = screen.getByRole('link', { name: 'مشاهده' });
        expect(viewLink).toHaveAttribute('href', '/courses/ezdevaj');
    });

    it('merges common courses from paid orders and user.courses without duplication', async () => {
        useOrdersStore.mockReturnValue({
            orders: [
                {
                    id: 211,
                    orderStatus: 'paid',
                    paymentStatus: 'paid',
                    items: [
                        {
                            __component: 'order.course-order-item',
                            id: 101,
                            courseId: 124,
                            slug: 'nejatmali',
                            title: 'نجات از مشکلات مالی',
                            price: 100000,
                        }
                    ]
                }
            ],
            isLoading: false,
            error: null,
            fetchOrders: jest.fn(),
            hasFetched: true,
        });

        useSession.mockReturnValue({
            data: {
                user: {
                    id: 24,
                    courses: [
                        {
                            id: 124,
                            slug: 'nejatmali',
                            title: 'نجات از مشکلات مالی',
                            price: 100000,
                        }
                    ]
                }
            },
            status: 'authenticated'
        });

        fetchProfileCartData.mockResolvedValue({ courses: [] });

        render(<PurchasesList />);

        await waitFor(() => {
            const courseTitles = screen.getAllByText('نجات از مشکلات مالی');
            // Exactly one course item title
            expect(courseTitles).toHaveLength(1);
        });

        expect(screen.getByText('دوره‌های آموزشی (1)')).toBeInTheDocument();
    });

    it('shows empty state when no courses and no products exist', async () => {
        useOrdersStore.mockReturnValue({
            orders: [],
            isLoading: false,
            error: null,
            fetchOrders: jest.fn(),
            hasFetched: true,
        });

        useSession.mockReturnValue({
            data: {
                user: {
                    id: 99,
                    courses: []
                }
            },
            status: 'authenticated'
        });

        fetchProfileCartData.mockResolvedValue({ courses: [] });

        render(<PurchasesList />);

        await waitFor(() => {
            expect(screen.getByText('شما تاکنون محصول یا دوره‌ای خریداری نکرده‌اید.')).toBeInTheDocument();
        });
    });
});
