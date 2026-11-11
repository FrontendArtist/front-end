import { render, waitFor } from '@testing-library/react';
import CheckoutPage from './page';
import { useCartStore } from '@/store/useCartStore';

const mockReplace = jest.fn();
jest.mock('next/navigation', () => ({ useRouter: () => ({ replace: mockReplace, push: jest.fn() }) }));

describe('/checkout پس از بستن مسیر سفارش‌سازی قدیمی', () => {
    beforeEach(() => {
        mockReplace.mockClear();
        global.fetch = jest.fn();
    });

    it.each([
        ['کالا', [{ id: 8, type: 'product', title: 'کتاب', quantity: 1 }]],
        ['دوره', [{ id: 7, type: 'course', title: 'دوره', quantity: 1 }]],
        ['سبد مختلط', [{ id: 7, type: 'course', quantity: 1 }, { id: 8, type: 'product', quantity: 2 }]],
        ['سبد خالی', []],
    ])('سبد %s به /cart هدایت می‌شود و هیچ POST /api/orders نمی‌زند', async (_name, items) => {
        useCartStore.setState({ items });
        render(<CheckoutPage />);
        await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/cart'));
        expect(global.fetch).not.toHaveBeenCalled();
    });
});
