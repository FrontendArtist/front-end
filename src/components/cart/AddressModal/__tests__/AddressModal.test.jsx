import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import AddressModal from '../AddressModal';

jest.mock('next-auth/react', () => ({
    useSession: () => ({ data: { user: { id: 7 } }, status: 'authenticated' }),
}));

describe('AddressModal Component', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        global.fetch = jest.fn();
    });

    afterEach(() => {
        delete global.fetch;
    });

    test('مدال در صورت بسته بودن چیزی رندر نمی‌کند', () => {
        render(
            <AddressModal
                isOpen={false}
                onClose={jest.fn()}
                onSuccess={jest.fn()}
            />
        );
        expect(screen.queryByText('ثبت آدرس تحویل سفارش')).toBeNull();
    });

    test('فیلدهای فرم و دکمه‌ها را به درستی نمایش می‌دهد', () => {
        render(
            <AddressModal
                isOpen={true}
                onClose={jest.fn()}
                onSuccess={jest.fn()}
            />
        );

        expect(screen.getByText('ثبت آدرس تحویل سفارش')).toBeTruthy();
        expect(screen.getByLabelText(/نام و نام خانوادگی گیرنده/)).toBeTruthy();
        expect(screen.getByLabelText(/شماره تماس گیرنده/)).toBeTruthy();
        expect(screen.getByLabelText(/استان/)).toBeTruthy();
        expect(screen.getByLabelText(/شهر/)).toBeTruthy();
        expect(screen.getByLabelText(/نشانی پستی کامل/)).toBeTruthy();
        expect(screen.getByLabelText(/کد پستی/)).toBeTruthy();
        expect(screen.getByRole('button', { name: 'ثبت آدرس و ادامه پرداخت' })).toBeTruthy();
        expect(screen.getByRole('button', { name: 'انصراف' })).toBeTruthy();
    });

    test('در صورت خالی بودن نام یا آدرس خطا نمایش می‌دهد و فچ ارسال نمی‌کند', async () => {
        render(
            <AddressModal
                isOpen={true}
                onClose={jest.fn()}
                onSuccess={jest.fn()}
            />
        );

        fireEvent.click(screen.getByRole('button', { name: 'ثبت آدرس و ادامه پرداخت' }));

        await waitFor(() => {
            expect(screen.getByRole('alert')).toBeTruthy();
        });
        expect(screen.getByText('لطفاً نام و نام خانوادگی تحویل‌گیرنده را وارد کنید.')).toBeTruthy();
        expect(global.fetch).not.toHaveBeenCalled();
    });

    test('ثبت موفق آدرس جدید با متد POST و فراخوانی onSuccess', async () => {
        const mockSuccess = jest.fn();
        const mockClose = jest.fn();

        global.fetch.mockResolvedValueOnce({
            ok: true,
            json: async () => ({
                data: {
                    id: 12,
                    documentId: 'addr-doc-12',
                },
            }),
        });

        render(
            <AddressModal
                isOpen={true}
                onClose={mockClose}
                onSuccess={mockSuccess}
            />
        );

        fireEvent.change(screen.getByLabelText(/نام و نام خانوادگی گیرنده/), {
            target: { value: 'محمد رضایی' },
        });
        fireEvent.change(screen.getByLabelText(/شماره تماس گیرنده/), {
            target: { value: '09121112233' },
        });
        fireEvent.change(screen.getByLabelText(/استان/), {
            target: { value: 'تهران' },
        });
        fireEvent.change(screen.getByLabelText(/شهر/), {
            target: { value: 'تهران' },
        });
        fireEvent.change(screen.getByLabelText(/نشانی پستی کامل/), {
            target: { value: 'خیابان آزادی، کوچه مریم، پلاک ۱۰' },
        });
        fireEvent.change(screen.getByLabelText(/کد پستی/), {
            target: { value: '1234567890' },
        });

        fireEvent.click(screen.getByRole('button', { name: 'ثبت آدرس و ادامه پرداخت' }));

        await waitFor(() => {
            expect(global.fetch).toHaveBeenCalledWith('/api/addresses', expect.objectContaining({
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
            }));
        });

        const sentBody = JSON.parse(global.fetch.mock.calls[0][1].body);
        expect(sentBody.data).toMatchObject({
            title: 'آدرس اصلی',
            recipientName: 'محمد رضایی',
            recipientPhone: '09121112233',
            province: 'تهران',
            city: 'تهران',
            fullAddress: 'خیابان آزادی، کوچه مریم، پلاک ۱۰',
            postalCode: '1234567890',
            user: 7,
        });

        expect(mockSuccess).toHaveBeenCalledWith(expect.objectContaining({
            recipientName: 'محمد رضایی',
            fullAddress: 'خیابان آزادی، کوچه مریم، پلاک ۱۰',
            documentId: 'addr-doc-12',
        }));
    });

    test('ویرایش آدرس موجود با متد PUT بر اساس documentId یا id', async () => {
        const mockSuccess = jest.fn();

        global.fetch.mockResolvedValueOnce({
            ok: true,
            json: async () => ({
                data: {
                    id: 5,
                    documentId: 'existing-doc-5',
                },
            }),
        });

        const existingAddress = {
            id: 5,
            documentId: 'existing-doc-5',
            recipientName: 'علی اکبری',
            recipientPhone: '09199998877',
            province: 'اصفهان',
            city: 'اصفهان',
            fullAddress: 'میدان نقش جهان، بازار بزرگ',
            postalCode: '8888888888',
        };

        render(
            <AddressModal
                isOpen={true}
                initialAddress={existingAddress}
                onClose={jest.fn()}
                onSuccess={mockSuccess}
            />
        );

        expect(screen.getByText('ویرایش آدرس تحویل سفارش')).toBeTruthy();
        expect(screen.getByDisplayValue('علی اکبری')).toBeTruthy();

        // تغییر آدرس
        fireEvent.change(screen.getByLabelText(/نشانی پستی کامل/), {
            target: { value: 'میدان امام علی، کوچه گلها' },
        });

        fireEvent.click(screen.getByRole('button', { name: 'ثبت آدرس و ادامه پرداخت' }));

        await waitFor(() => {
            expect(global.fetch).toHaveBeenCalledWith('/api/addresses/existing-doc-5', expect.objectContaining({
                method: 'PUT',
            }));
        });

        expect(mockSuccess).toHaveBeenCalledWith(expect.objectContaining({
            fullAddress: 'میدان امام علی، کوچه گلها',
            documentId: 'existing-doc-5',
        }));
    });
});

