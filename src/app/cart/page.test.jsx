import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import CartPage from './page';
import { useCartStore } from '@/store/useCartStore';
import { getCourseCheckout } from '@/lib/courseCheckoutApi';
import { executeNoorCoursePurchase } from '@/lib/checkoutService';

jest.mock('next/navigation', () => ({ useRouter: () => ({ push: jest.fn() }) }));
jest.mock('next-auth/react', () => ({ useSession: () => ({ data: { user: { id: 7, jwt: 'jwt' } }, status: 'authenticated' }) }));
jest.mock('@/lib/courseCheckoutApi', () => ({ getCourseCheckout: jest.fn() }));
jest.mock('@/lib/checkoutService', () => ({ executeNoorCoursePurchase: jest.fn(), executeOnlinePayment: jest.fn() }));
jest.mock('@/components/cart/DiscountCouponInput/DiscountCouponInput', () => () => null);
jest.mock('@/components/ui/PriceWithHint/PriceWithHint', () => ({ price }) => <span>{price} نور</span>);
jest.mock('@/components/ui/BreadCrumb/Breadcrumb', () => () => null);

beforeEach(() => {
    jest.clearAllMocks();
    useCartStore.setState({ items: [{ id: 42, documentId: 'course-1', type: 'course', title: 'دوره', price: 150, quantity: 1, slug: 'course' }], appliedCoupon: null, hydratedUserId: 7 });
});

test.each([
    [150, 0, 'خرید با کیف پول نور'],
    [20, 130, 'پرداخت آنلاین و خرید'],
])('متن دکمه با موجودی سرور تغییر می‌کند: %s', async (balance, shortfall, label) => {
    getCourseCheckout.mockResolvedValue({ priceInNoor: 150, balanceInNoor: balance, shortfallInNoor: shortfall, amountRial: shortfall * 137, purchaseStatus: 'NotPurchased' });
    render(<CartPage />);
    const button = await screen.findByRole('button', { name: label });
    fireEvent.click(button);
    await waitFor(() => expect(executeNoorCoursePurchase).toHaveBeenCalledWith(expect.objectContaining({ jwt: 'jwt', payOnline: shortfall > 0 })));
    if (shortfall) expect(screen.getByText(/فقط کسری موجودی پرداخت می‌شود/)).toBeTruthy();
});
