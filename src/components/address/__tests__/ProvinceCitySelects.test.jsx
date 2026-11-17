import { useState } from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ProvinceCitySelects, { resolveOfficialPair } from '../ProvinceCitySelects';

const LOCALITIES = {
    data: [
        { name: 'تهران', cities: ['تهران', 'ری'] },
        { name: 'اصفهان', cities: ['اصفهان', 'کاشان'] },
    ],
};

function Harness({ initial = { province: '', city: '' } }) {
    const [value, setValue] = useState(initial);
    return (
        <ProvinceCitySelects
            province={value.province}
            city={value.city}
            onChange={setValue}
        />
    );
}

describe('resolveOfficialPair', () => {
    test('زوج رسمی را نگه می‌دارد و زوج ناموجود را خالی می‌کند', () => {
        expect(resolveOfficialPair(LOCALITIES.data, 'اصفهان', 'کاشان')).toEqual({
            province: 'اصفهان',
            city: 'کاشان',
        });
        expect(resolveOfficialPair(LOCALITIES.data, 'اصفهان', 'تهران')).toEqual({
            province: 'اصفهان',
            city: '',
        });
        expect(resolveOfficialPair(LOCALITIES.data, 'یزد', 'یزد')).toEqual({
            province: '',
            city: '',
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
        render(<Harness />);

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
