import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ProfileForm from '../ProfileForm';

jest.mock('next-auth/react', () => ({
    useSession: () => ({
        data: { user: { id: 3, phoneNumber: '09120000000' } },
        status: 'authenticated',
        update: jest.fn(),
    }),
}));

const LOCALITIES = {
    data: [
        { name: 'تهران', cities: ['تهران', 'ری'] },
        { name: 'اصفهان', cities: ['اصفهان', 'کاشان'] },
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
        fireEvent.click(screen.getByRole('button', { name: 'ذخیره' }));

        await waitFor(() => {
            expect(screen.getByText('اطلاعات با موفقیت ذخیره شد')).toBeTruthy();
        });

        const addressCall = global.fetch.mock.calls.find((call) => call[0] === '/api/addresses/addr-1');
        expect(addressCall[1].method).toBe('PUT');
        expect(JSON.parse(addressCall[1].body).data).toMatchObject({
            province: 'اصفهان',
            city: 'کاشان',
        });
        expect(JSON.parse(addressCall[1].body).data.provinceId).toBeUndefined();
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
});
