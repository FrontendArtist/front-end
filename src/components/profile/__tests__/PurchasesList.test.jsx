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
        useOrdersStore.getState = jest.fn(() => ({ fetchOrders: jest.fn() }));
        global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => ({ data: [] }) });
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

    it('shows the course title and a working link for a ByeMoney chapter purchase without slug', async () => {
        useOrdersStore.mockReturnValue({
            orders: [
                {
                    id: 'cart:11111111-1111-1111-1111-111111111111',
                    orderStatus: 'paid',
                    paymentStatus: 'paid',
                    items: [
                        {
                            type: 'chapter',
                            integrationId: 'chapter-uuid-78',
                            externalCourseId: 'chapter-uuid-78',
                            parentExternalId: 'course-doc-118',
                            courseDocumentId: 'course-doc-118',
                            price: 250000
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
            data: { user: { id: 77, courses: [] } },
            status: 'authenticated'
        });

        fetchProfileCartData.mockResolvedValue({ courses: [] });
        global.fetch.mockResolvedValue({
            ok: true,
            json: async () => ({
                data: [
                    {
                        id: 118,
                        documentId: 'course-doc-118',
                        slug: 'khakbeaflak',
                        title: 'خاک به افلاک',
                        chapters: [
                            { id: 78, integrationId: 'chapter-uuid-78', title: 'فصل اول' }
                        ]
                    }
                ]
            })
        });

        render(<PurchasesList />);

        await waitFor(() => {
            expect(screen.getByText('خاک به افلاک (فصل اول)')).toBeInTheDocument();
        });

        expect(screen.getByText('فصل آموزشی')).toBeInTheDocument();
        const viewLink = screen.getByRole('link', { name: 'مشاهده' });
        expect(viewLink).toHaveAttribute('href', '/courses/khakbeaflak');
    });

    it('links a ByeMoney purchase row that only carries courseTitle', async () => {
        useOrdersStore.mockReturnValue({
            orders: [
                {
                    id: 'purchase:22222222-2222-2222-2222-222222222222',
                    orderStatus: 'paid',
                    paymentStatus: 'paid',
                    items: [
                        {
                            type: 'course',
                            documentId: 'purchase:22222222-2222-2222-2222-222222222222',
                            title: 'خاک به افلاک',
                            courseTitle: 'خاک به افلاک',
                            price: 250000
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
            data: { user: { id: 78, courses: [] } },
            status: 'authenticated'
        });

        fetchProfileCartData.mockResolvedValue({ courses: [] });
        global.fetch.mockResolvedValue({
            ok: true,
            json: async () => ({
                data: [
                    { id: 118, documentId: 'course-doc-118', slug: 'khakbeaflak', title: 'خاک به افلاک', chapters: [] }
                ]
            })
        });

        render(<PurchasesList />);

        await waitFor(() => {
            expect(screen.getByRole('link', { name: 'مشاهده' })).toHaveAttribute('href', '/courses/khakbeaflak');
        });
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
