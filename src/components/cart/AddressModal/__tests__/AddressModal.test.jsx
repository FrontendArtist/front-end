import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import AddressModal from '../AddressModal';

jest.mock('next-auth/react', () => ({
    useSession: () => ({ data: { user: { id: 7 } }, status: 'authenticated' }),
}));

const LOCALITIES = {
    data: [
        { name: 'تهران', cities: ['تهران', 'ری'] },
        { name: 'اصفهان', cities: ['اصفهان', 'کاشان'] },
    ],
};

function mockFetch(addressResponse) {
    global.fetch = jest.fn(async (url) => {
        if (url === '/api/localities') {
            return { ok: true, json: async () => LOCALITIES };
        }
        return addressResponse;
    });
}

async function chooseLocality(province, city) {
    await waitFor(() => {
        expect(screen.getByLabelText(/استان/).disabled).toBe(false);
    });
    fireEvent.change(screen.getByLabelText(/استان/), { target: { value: province } });
    fireEvent.change(screen.getByLabelText(/شهر/), { target: { value: city } });
}

describe('AddressModal Component', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockFetch({
            ok: true,
            json: async () => ({ data: { id: 12, documentId: 'addr-doc-12' } }),
        });
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

    test('فیلدهای فرم و دکمه‌ها را به درستی نمایش می‌دهد', async () => {
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
        expect(screen.getByLabelText(/استان/).tagName).toBe('SELECT');
        expect(screen.getByLabelText(/شهر/).tagName).toBe('SELECT');
        expect(screen.getByLabelText(/نشانی پستی کامل/)).toBeTruthy();
        expect(screen.getByLabelText(/کد پستی/)).toBeTruthy();
        expect(screen.getByRole('button', { name: 'ثبت آدرس و ادامه پرداخت' })).toBeTruthy();
        expect(screen.getByRole('button', { name: 'انصراف' })).toBeTruthy();

        await waitFor(() => {
            expect([...screen.getByLabelText(/استان/).options].map((option) => option.value)).toContain('تهران');
        });
    });

    test('در صورت خالی بودن نام یا آدرس خطا نمایش می‌دهد و آدرس را ذخیره نمی‌کند', async () => {
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
        expect(global.fetch.mock.calls.some((call) => String(call[0]).startsWith('/api/addresses'))).toBe(false);
    });

    test('بدون انتخاب استان و شهر ذخیره نمی‌کند', async () => {
        render(
            <AddressModal
                isOpen={true}
                onClose={jest.fn()}
                onSuccess={jest.fn()}
            />
        );

        fireEvent.change(screen.getByLabelText(/نام و نام خانوادگی گیرنده/), {
            target: { value: 'محمد رضایی' },
        });
        fireEvent.change(screen.getByLabelText(/نشانی پستی کامل/), {
            target: { value: 'خیابان آزادی' },
        });
        await waitFor(() => {
            expect(screen.getByLabelText(/استان/).disabled).toBe(false);
        });

        fireEvent.click(screen.getByRole('button', { name: 'ثبت آدرس و ادامه پرداخت' }));

        expect(await screen.findByText('لطفاً استان و شهر را انتخاب کنید.')).toBeTruthy();
        expect(global.fetch.mock.calls.some((call) => String(call[0]).startsWith('/api/addresses'))).toBe(false);
    });

    test('ثبت موفق آدرس جدید با نام رسمی استان و شهر', async () => {
        const mockSuccess = jest.fn();
        const mockClose = jest.fn();

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
        await chooseLocality('تهران', 'تهران');
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

        const addressCall = global.fetch.mock.calls.find((call) => call[0] === '/api/addresses');
        const sentBody = JSON.parse(addressCall[1].body);
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
        expect(sentBody.data.provinceId).toBeUndefined();
        expect(sentBody.data.cityId).toBeUndefined();

        expect(mockSuccess).toHaveBeenCalledWith(expect.objectContaining({
            recipientName: 'محمد رضایی',
            province: 'تهران',
            city: 'تهران',
            fullAddress: 'خیابان آزادی، کوچه مریم، پلاک ۱۰',
            documentId: 'addr-doc-12',
        }));
    });

    test('ویرایش آدرس موجود با متد PUT بر اساس documentId یا id', async () => {
        const mockSuccess = jest.fn();
        mockFetch({
            ok: true,
            json: async () => ({ data: { id: 5, documentId: 'existing-doc-5' } }),
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
        await waitFor(() => {
            expect(screen.getByLabelText(/استان/).value).toBe('اصفهان');
            expect(screen.getByLabelText(/شهر/).value).toBe('اصفهان');
        });

        fireEvent.change(screen.getByLabelText(/نشانی پستی کامل/), {
            target: { value: 'میدان امام علی، کوچه گلها' },
        });

        fireEvent.click(screen.getByRole('button', { name: 'ثبت آدرس و ادامه پرداخت' }));

        await waitFor(() => {
            expect(global.fetch).toHaveBeenCalledWith('/api/addresses/existing-doc-5', expect.objectContaining({
                method: 'PUT',
            }));
        });

        const addressCall = global.fetch.mock.calls.find((call) => call[0] === '/api/addresses/existing-doc-5');
        expect(JSON.parse(addressCall[1].body).data).toMatchObject({
            province: 'اصفهان',
            city: 'اصفهان',
            fullAddress: 'میدان امام علی، کوچه گلها',
        });
        expect(mockSuccess).toHaveBeenCalledWith(expect.objectContaining({
            fullAddress: 'میدان امام علی، کوچه گلها',
            documentId: 'existing-doc-5',
        }));
    });

    test('استان ذخیره‌شدهٔ خارج از فهرست خالی می‌ماند و ذخیره مسدود است', async () => {
        render(
            <AddressModal
                isOpen={true}
                initialAddress={{
                    recipientName: 'علی اکبری',
                    fullAddress: 'بازار',
                    province: 'یزد',
                    city: 'یزد',
                }}
                onClose={jest.fn()}
                onSuccess={jest.fn()}
            />
        );

        await waitFor(() => {
            expect(screen.getByLabelText(/استان/).disabled).toBe(false);
        });
        expect(screen.getByLabelText(/استان/).value).toBe('');
        expect(screen.getByLabelText(/شهر/).value).toBe('');

        fireEvent.click(screen.getByRole('button', { name: 'ثبت آدرس و ادامه پرداخت' }));

        expect(await screen.findByText('لطفاً استان و شهر را انتخاب کنید.')).toBeTruthy();
        expect(global.fetch.mock.calls.some((call) => String(call[0]).startsWith('/api/addresses'))).toBe(false);
    });
});
