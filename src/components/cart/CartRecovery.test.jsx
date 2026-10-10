import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import RecoverOrderCart from '@/components/profile/RecoverOrderCart';
import PendingOrdersNotice from './PendingOrdersNotice';
import { useCartStore } from '@/store/useCartStore';
import { fetchClientOrders } from '@/lib/client/ordersClientApi';
jest.mock('next-auth/react', () => ({ useSession: () => ({ status: 'authenticated' }) }));
jest.mock('@/lib/client/ordersClientApi', () => ({ fetchClientOrders: jest.fn() }));
beforeEach(() => { useCartStore.setState({ items: [] }); });

test('کاربر از سفارش به سبد خالی اقلام را برمی‌گرداند', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => ({ items: [{ id: 4, type: 'product', price: 200, quantity: 1, stock: 3 }], warnings: [] }) });
    render(<RecoverOrderCart orderId="one" />);
    fireEvent.click(screen.getByRole('button', { name: 'انتقال اقلام به سبد خرید' }));
    await screen.findByRole('link', { name: 'مشاهده سبد خرید و ادامه خرید' });
    expect(useCartStore.getState().items[0].price).toBe(200);
    expect(screen.getByRole('button').disabled).toBe(true);
});

test('سبد خالی فقط سفارش آنلاین معلق را پیشنهاد می‌دهد', async () => {
    fetchClientOrders.mockResolvedValue({ data: [
        { id: 1, documentId: 'one', orderStatus: 'pending', paymentStatus: 'pending_payment', paymentMethod: 'online' },
        { id: 2, documentId: 'two', orderStatus: 'paid', paymentStatus: 'paid', paymentMethod: 'online' },
        { id: 3, documentId: 'three', orderStatus: 'pending', paymentMethod: 'card_to_card' },
    ] });
    render(<PendingOrdersNotice />);
    await waitFor(() => expect(screen.getAllByRole('link')).toHaveLength(1));
    expect(screen.getByRole('link').getAttribute('href')).toBe('/profile/orders/one');
});
