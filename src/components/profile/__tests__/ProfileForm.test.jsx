import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ProfileForm from '../ProfileForm';
import { SHORT_FULL_ADDRESS_MESSAGE } from '@/lib/fullAddress';

jest.mock('next-auth/react', () => ({
    useSession: () => ({
        data: { user: { id: 3, phoneNumber: '09120000000' } },
        status: 'authenticated',
        update: jest.fn(),
    }),
}));

const LOCALITIES = {
    data: [
        {
            name: 'تهران',
            cities: [
                { documentId: 'city-tehran', name: 'تهران' },
                { documentId: 'city-rey', name: 'ری' },
            ],
        },
        {
            name: 'اصفهان',
            cities: [
                { documentId: 'city-isfahan', name: 'اصفهان' },
                { documentId: 'city-kashan', name: 'کاشان' },
            ],
        },
    ],
};

function profileBody(address) {
    return {
        firstName: 'علی',
        lastName: 'رضایی',
        phoneNumber: '09120000000',
        address,
    };
}

describe('ProfileForm locality selects', () => {
    beforeEach(() => {
        global.fetch = jest.fn(async (url, options = {}) => {
            if (url === '/api/localities') {
                return { ok: true, json: async () => LOCALITIES };
            }
            if (url === '/api/profile' && options.method !== 'PUT') {
                return {
                    ok: true,
                    json: async () => profileBody({
                        documentId: 'addr-1',
                        fullAddress: 'خیابان آزادی',
                        province: 'تهران',
                        city: 'تهران',
                        postalCode: '1234567890',
                        recipientName: 'علی رضایی',
                        recipientPhone: '09120000000',
                    }),
                };
            }
            return { ok: true, json: async () => ({ data: { documentId: 'addr-1' } }) };
        });
    });

    afterEach(() => {
        delete global.fetch;
    });

    test('استان و شهر ذخیره‌شده را در فهرست نشان می‌دهد و همان رشته‌ها را می‌فرستد', async () => {
        render(<ProfileForm />);

        await waitFor(() => {
            expect(screen.getByLabelText(/استان/).value).toBe('تهران');
            expect(screen.getByLabelText(/شهر/).value).toBe('تهران');
        });
        expect(screen.getByLabelText(/استان/).tagName).toBe('SELECT');
        expect(screen.getByLabelText(/شهر/).tagName).toBe('SELECT');

        fireEvent.click(screen.getByRole('button', { name: 'ویرایش' }));
        fireEvent.change(screen.getByLabelText(/استان/), { target: { value: 'اصفهان' } });
        expect(screen.getByLabelText(/شهر/).value).toBe('');

        fireEvent.change(screen.getByLabelText(/شهر/), { target: { value: 'کاشان' } });
        expect(screen.getByLabelText(/شهر/).value).toBe('کاشان');

        // قید سخت: شناسه شهر، حتی documentId، در متن صفحه نیاید و فقط نام دیده شود
        expect(screen.queryByText('city-kashan')).toBeNull();
        expect(document.body.textContent).not.toContain('city-kashan');
        expect(document.body.textContent).not.toContain('city-isfahan');

        fireEvent.click(screen.getByRole('button', { name: 'ذخیره' }));

        await waitFor(() => {
            expect(screen.getByText('اطلاعات با موفقیت ذخیره شد')).toBeTruthy();
        });

        const addressCall = global.fetch.mock.calls.find((call) => call[0] === '/api/addresses/addr-1');
        expect(addressCall[1].method).toBe('PUT');
        expect(JSON.parse(addressCall[1].body).data).toMatchObject({
            province: 'اصفهان',
            city: 'کاشان',
            cityLink: 'city-kashan',
        });
        expect(JSON.parse(addressCall[1].body).data.provinceId).toBeUndefined();
        expect(JSON.parse(addressCall[1].body).data.externalId).toBeUndefined();
    });

    test('آدرس قدیمی وصل‌نشده خطای استرپی می‌دهد تا خریدار شهر را دوباره انتخاب کند', async () => {
        let updateAttempts = 0;
        global.fetch = jest.fn(async (url, options = {}) => {
            if (url === '/api/localities') {
                return { ok: true, json: async () => LOCALITIES };
            }
            if (url === '/api/profile' && options.method !== 'PUT') {
                return {
                    ok: true,
                    json: async () => profileBody({
                        documentId: 'addr-1',
                        cityLink: null, // بدون لینک شهر
                        fullAddress: 'خیابان قدیم',
                        province: 'تهران',
                        city: 'تهران',
                        postalCode: '1111111111',
                        recipientName: 'رضا',
                        recipientPhone: '09120000000',
                    }),
                };
            }
            if (url === '/api/addresses/addr-1') {
                updateAttempts += 1;
                if (updateAttempts === 1) {
                    return {
                        ok: false,
                        status: 400,
                        json: async () => ({ message: 'شهر باید از فهرست شهرها انتخاب شود.' }),
                    };
                }
                return { ok: true, json: async () => ({ data: { documentId: 'addr-1', cityLink: 'city-rey' } }) };
            }
            return { ok: true, json: async () => ({}) };
        });

        render(<ProfileForm />);

        await waitFor(() => {
            expect(screen.getByLabelText(/استان/).value).toBe('تهران');
        });

        fireEvent.click(screen.getByRole('button', { name: 'ویرایش' }));

        // تلاش برای ذخیره بدون انتخاب مجدد شهر -> دریافت خطای استرپی
        fireEvent.click(screen.getByRole('button', { name: 'ذخیره' }));

        expect(await screen.findByText('شهر باید از فهرست شهرها انتخاب شود.')).toBeTruthy();

        // اکنون خریدار شهر را دوباره انتخاب می‌کند
        fireEvent.change(screen.getByLabelText(/شهر/), { target: { value: 'ری' } });
        expect(screen.getByLabelText(/شهر/).value).toBe('ری');
        expect(screen.queryByText('city-rey')).toBeNull();

        // ذخیره موفق با ارسال شناسه شهر خودمان
        fireEvent.click(screen.getByRole('button', { name: 'ذخیره' }));

        await waitFor(() => {
            expect(screen.getByText('اطلاعات با موفقیت ذخیره شد')).toBeTruthy();
        });

        const addressCalls = global.fetch.mock.calls.filter((c) => c[0] === '/api/addresses/addr-1');
        const lastAddressCall = addressCalls[addressCalls.length - 1];
        expect(JSON.parse(lastAddressCall[1].body).data).toMatchObject({
            province: 'تهران',
            city: 'ری',
            cityLink: 'city-rey',
        });
    });

    test('شهر خارج از فهرست مانع ذخیره می‌شود', async () => {
        global.fetch.mockImplementation(async (url, options = {}) => {
            if (url === '/api/localities') {
                return { ok: true, json: async () => LOCALITIES };
            }
            if (url === '/api/profile' && options.method !== 'PUT') {
                return {
                    ok: true,
                    json: async () => profileBody({
                        documentId: 'addr-1',
                        fullAddress: 'خیابان آزادی',
                        province: 'تهران',
                        city: 'شهر قدیمی',
                    }),
                };
            }
            return { ok: true, json: async () => ({}) };
        });

        render(<ProfileForm />);

        await waitFor(() => {
            expect(screen.getByLabelText(/استان/).value).toBe('تهران');
            expect(screen.getByLabelText(/شهر/).value).toBe('');
        });

        fireEvent.click(screen.getByRole('button', { name: 'ویرایش' }));
        fireEvent.click(screen.getByRole('button', { name: 'ذخیره' }));

        expect(await screen.findByText('لطفاً استان و شهر را انتخاب کنید.')).toBeTruthy();
        expect(global.fetch.mock.calls.some((call) => String(call[0]).includes('/api/addresses'))).toBe(false);
    });

    test('نشانی کوتاه‌تر از ده نویسه ذخیره نمی‌شود', async () => {
        render(<ProfileForm />);

        await waitFor(() => {
            expect(screen.getByLabelText(/آدرس کامل/).value).toBe('خیابان آزادی');
        });

        fireEvent.click(screen.getByRole('button', { name: 'ویرایش' }));
        fireEvent.change(screen.getByLabelText(/آدرس کامل/), { target: { value: 'مشهد' } });
        fireEvent.click(screen.getByRole('button', { name: 'ذخیره' }));

        expect(await screen.findByText(SHORT_FULL_ADDRESS_MESSAGE)).toBeTruthy();
        expect(global.fetch.mock.calls.some((call) => String(call[0]).includes('/api/addresses'))).toBe(false);
    });
});
