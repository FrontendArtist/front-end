import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ManualOrderForm from '../ManualOrderForm';
import { createManualOrder, previewManualOrder, searchAdminUsers } from '@/lib/client/admin/ordersClient';

const mockPush = jest.fn();
jest.mock('next/navigation', () => ({ useRouter: () => ({ push: mockPush, refresh: jest.fn() }) }));
jest.mock('next/link', () => ({ __esModule: true, default: ({ children, href }) => <a href={href}>{children}</a> }));
jest.mock('@/lib/client/admin/ordersClient', () => ({ createManualOrder: jest.fn(), previewManualOrder: jest.fn(), searchAdminUsers: jest.fn() }));
jest.mock('@/lib/admin/adminByeMoneyClient', () => ({ getAdminBatchBalances: jest.fn().mockResolvedValue({ success: false }) }));
jest.mock('@/components/admin/Users/AdminAssistedTopUpModal/AdminAssistedTopUpModal', () => ({ __esModule: true, default: () => null }));
jest.mock('@/components/admin/Permissions/Can', () => ({ __esModule: true, default: ({ children }) => <>{children}</> }));

const courses = [{
    id: 1, documentId: 'course-doc', title: 'دوره', slug: 'c', price: 100,
    chapters: [{ id: 5, integrationId: 'chapter-int', title: 'فصل ۱', price: 40 }],
}];

async function fillForm() {
    searchAdminUsers.mockResolvedValue([{ id: 7, fullName: 'کاربر', phoneNumber: '0912', username: 'u', noorBalance: null }]);
    render(<ManualOrderForm initialCourses={courses} />);
    fireEvent.change(screen.getByPlaceholderText(/جستجو با نام/), { target: { value: 'کاربر' } });
    fireEvent.click(await screen.findByText('انتخاب'));
    fireEvent.click(screen.getByText(/1 سرفصل|۱ سرفصل/));
    fireEvent.click(screen.getByText('فصل ۱').closest('label').querySelector('input'));
}

describe('ManualOrderForm (D2)', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        previewManualOrder.mockResolvedValue({ originalTotalInNoor: 40, itemDiscountInNoor: 0, priceInNoor: 40 });
    });

    test('sends the chapter by its own id and keeps cartId stable across a retry after insufficient balance', async () => {
        const err = Object.assign(new Error('کسری'), { insufficientBalance: true, status: 409 });
        createManualOrder.mockRejectedValueOnce(err).mockResolvedValueOnce({ orderId: 'cart:abc' });
        await fillForm();

        // قیمت نهایی از quote ذینفع نشان داده می‌شود
        await waitFor(() => expect(previewManualOrder).toHaveBeenCalled());
        await waitFor(() => expect(screen.getByText('مبلغ نهایی:').nextSibling.textContent).toContain('۴۰ نور'));
        expect(previewManualOrder.mock.calls[0][0]).toEqual({ userId: '7', items: [{ externalId: 'chapter-int', type: 'course_chapter' }] });

        const submit = () => fireEvent.click(screen.getByText('ثبت نهایی و فعال‌سازی دوره'));
        submit();
        await waitFor(() => expect(createManualOrder).toHaveBeenCalledTimes(1));
        await screen.findByText('کسری موجودی نور کاربر');

        submit();
        await waitFor(() => expect(createManualOrder).toHaveBeenCalledTimes(2));

        const [first, second] = createManualOrder.mock.calls.map(([p]) => p);
        expect(first.items).toEqual([{ externalId: 'chapter-int', type: 'course_chapter' }]);
        expect(first).not.toHaveProperty('courses');
        expect(first).not.toHaveProperty('totalPrice');
        expect(second.cartId).toBe(first.cartId);
        await waitFor(() => expect(mockPush).toHaveBeenCalledWith('/admin/orders?order=cart%3Aabc'));
    });
});

describe('ManualOrderForm discount display (D2)', () => {
    test('shows base price, discount row and discounted final price from the quote', async () => {
        previewManualOrder.mockResolvedValue({ originalTotalInNoor: 100, itemDiscountInNoor: 30, priceInNoor: 70 });
        searchAdminUsers.mockResolvedValue([{ id: 7, fullName: 'کاربر', phoneNumber: '0912', username: 'u', noorBalance: null }]);
        render(<ManualOrderForm initialCourses={courses} />);
        fireEvent.change(screen.getByPlaceholderText(/جستجو با نام/), { target: { value: 'کاربر' } });
        fireEvent.click(await screen.findByText('انتخاب'));
        fireEvent.click(screen.getByText('دوره').closest('label').querySelector('input'));

        await waitFor(() => expect(screen.getByText('مبلغ نهایی:').nextSibling.textContent).toContain('۷۰ نور'));
        expect(screen.getByText('تخفیف:').nextSibling.textContent).toContain('۳۰ نور');
        expect(screen.getByText('قیمت پایهٔ اقلام:').nextSibling.textContent).toContain('۱۰۰ نور');
    });
});
