import { useState } from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ProvinceCitySelects, { resolveOfficialPair } from '../ProvinceCitySelects';

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

function Harness({ initial = { province: '', city: '', cityLink: null }, onChange }) {
    const [value, setValue] = useState(initial);
    const handleChange = (next) => {
        setValue(next);
        if (onChange) onChange(next);
    };
    return (
        <ProvinceCitySelects
            province={value.province}
            city={value.city}
            cityLink={value.cityLink}
            onChange={handleChange}
        />
    );
}

describe('resolveOfficialPair', () => {
    test('زوج رسمی را نگه می‌دارد و زوج ناموجود را خالی می‌کند', () => {
        expect(resolveOfficialPair(LOCALITIES.data, 'اصفهان', 'کاشان')).toEqual({
            province: 'اصفهان',
            city: 'کاشان',
            cityLink: 'city-kashan',
        });
        expect(resolveOfficialPair(LOCALITIES.data, 'اصفهان', 'تهران')).toEqual({
            province: 'اصفهان',
            city: '',
            cityLink: null,
        });
        expect(resolveOfficialPair(LOCALITIES.data, 'یزد', 'یزد')).toEqual({
            province: '',
            city: '',
            cityLink: null,
        });
    });
});

describe('ProvinceCitySelects', () => {
    beforeEach(() => {
        global.fetch = jest.fn().mockResolvedValue({
            ok: true,
            json: async () => LOCALITIES,
        });
    });

    afterEach(() => {
        delete global.fetch;
    });

    test('فهرست را یک‌بار می‌گیرد و شهر را با استان فیلتر می‌کند', async () => {
        const handleChange = jest.fn();
        render(<Harness onChange={handleChange} />);

        await waitFor(() => {
            expect(screen.getByLabelText(/استان/).disabled).toBe(false);
        });
        expect(global.fetch).toHaveBeenCalledTimes(1);
        expect(global.fetch).toHaveBeenCalledWith('/api/localities');

        fireEvent.change(screen.getByLabelText(/استان/), { target: { value: 'اصفهان' } });

        const city = screen.getByLabelText(/شهر/);
        expect(city.value).toBe('');
        expect(city.disabled).toBe(false);
        expect([...city.options].map((option) => option.value)).toEqual(['', 'اصفهان', 'کاشان']);

        fireEvent.change(city, { target: { value: 'کاشان' } });
        expect(city.value).toBe('کاشان');
        expect(handleChange).toHaveBeenLastCalledWith({
            province: 'اصفهان',
            city: 'کاشان',
            cityLink: 'city-kashan',
        });

        // قید سخت: شناسه شهر، حتی documentId، در متن صفحه نیاید و فقط نام دیده شود
        expect(screen.queryByText('city-kashan')).toBeNull();
        expect(document.body.textContent).not.toContain('city-kashan');
        expect(document.body.textContent).not.toContain('city-isfahan');

        fireEvent.change(screen.getByLabelText(/استان/), { target: { value: 'تهران' } });
        expect(screen.getByLabelText(/شهر/).value).toBe('');
        expect([...screen.getByLabelText(/شهر/).options].map((option) => option.value)).toEqual(['', 'تهران', 'ری']);
        expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    test('استان یا شهر ذخیره‌شدهٔ خارج از فهرست خالی می‌ماند', async () => {
        render(<Harness initial={{ province: 'یزد', city: 'یزد' }} />);

        await waitFor(() => {
            expect(screen.getByLabelText(/استان/).disabled).toBe(false);
        });
        expect(screen.getByLabelText(/استان/).value).toBe('');
        expect(screen.getByLabelText(/شهر/).value).toBe('');
        expect(screen.getByLabelText(/شهر/).disabled).toBe(true);
    });
});
