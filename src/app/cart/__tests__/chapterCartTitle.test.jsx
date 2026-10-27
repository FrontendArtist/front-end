import { render, screen, act } from '@testing-library/react';
import CartPage from '../page';
import { useCartStore } from '@/store/useCartStore';
import { useSession } from 'next-auth/react';
import { useAccountOrderItems } from '@/hooks/useAccountOrders';
import { previewCourseCart } from '@/lib/courseCartPreviewApi';

jest.mock('next-auth/react', () => ({ useSession: jest.fn() }));
jest.mock('@/hooks/useAccountOrders', () => ({ useAccountOrderItems: jest.fn() }));
jest.mock('@/lib/courseCartPreviewApi', () => ({
    previewCourseCart: jest.fn(),
    sameCourseCartPrice: jest.fn(() => true)
}));
jest.mock('@/lib/courseCartApi', () => ({
    prepareCourseCart: jest.fn(),
    getCourseCartId: () => 'cart-1',
    getExistingCourseCartId: jest.fn(),
    getCourseCart: jest.fn()
}));
jest.mock('@/lib/byeMoneyApi', () => ({
    getWalletBalanceWithByeMoney: jest.fn().mockResolvedValue({ balanceInNoor: 100 })
}));
jest.mock('next/navigation', () => ({
    useRouter: () => ({ push: jest.fn(), replace: jest.fn() })
}));
jest.mock('@/hooks/usePaymentProcessing', () => () => [false, jest.fn()]);

describe('نمایش عنوان خرید فصلی در صفحه سبد خرید', () => {
    beforeEach(() => {
        localStorage.clear();
        useSession.mockReturnValue({
            data: { user: { id: 7, jwt: 'mock-jwt' } },
            status: 'authenticated'
        });
        useAccountOrderItems.mockReturnValue([]);
    });

    test('فصل آموزشی در سبد خرید با عنوان دوره و فصل به شکل «عنوان دوره (فصل مثلا 1)» نمایش داده می‌شود', async () => {
        useCartStore.setState({
            items: [
                {
                    id: 'chapter-uuid-1',
                    integrationId: 'chapter-uuid-1',
                    type: 'chapter',
                    title: 'دوره هفت آسمان (فصل 1)',
                    courseTitle: 'دوره هفت آسمان',
                    chapterTitle: 'فصل 1',
                    price: 50,
                    quantity: 1,
                    slug: 'haft-aseman-chapter-1'
                }
            ],
            appliedCoupon: null,
            userId: 7,
            hydratedUserId: 7
        });

        previewCourseCart.mockResolvedValue({
            status: 'Ready',
            originalTotalInNoor: 50,
            priceInNoor: 50,
            courses: [
                {
                    externalCourseId: 'chapter-uuid-1',
                    title: 'فصل 1',
                    basePriceInNoor: 50,
                    priceInNoor: 50,
                    type: 'course_chapter'
                }
            ]
        });

        await act(async () => {
            render(<CartPage />);
        });

        expect(screen.getByText('دوره هفت آسمان (فصل 1)')).toBeTruthy();
    });

    test('اگر quote عنوان فصل خام برگرداند، نام دوره از استور خوانده شده و ترکیب می‌شود', async () => {
        useCartStore.setState({
            items: [
                {
                    id: 'chapter-uuid-2',
                    integrationId: 'chapter-uuid-2',
                    type: 'chapter',
                    title: 'فصل 2',
                    courseTitle: 'طرح الهی',
                    chapterTitle: 'فصل 2',
                    price: 60,
                    quantity: 1,
                    slug: 'tarh-elahi-chapter-2'
                }
            ],
            appliedCoupon: null,
            userId: 7,
            hydratedUserId: 7
        });

        previewCourseCart.mockResolvedValue({
            status: 'Ready',
            originalTotalInNoor: 60,
            priceInNoor: 60,
            courses: [
                {
                    externalCourseId: 'chapter-uuid-2',
                    title: 'فصل 2',
                    basePriceInNoor: 60,
                    priceInNoor: 60,
                    type: 'course_chapter'
                }
            ]
        });

        await act(async () => {
            render(<CartPage />);
        });

        expect(screen.getByText('طرح الهی (فصل 2)')).toBeTruthy();
    });
});
