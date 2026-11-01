import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import AdminSelect from '../AdminSelect';

const sampleOptions = [
    { value: 'all', label: 'همه نقش‌ها' },
    { value: 'user', label: 'کاربر عادی' },
    { value: 'admin', label: 'مدیر سیستم' },
];

describe('AdminSelect Component', () => {
    it('renders the selected option label correctly', () => {
        render(
            <AdminSelect
                value="user"
                onChange={jest.fn()}
                options={sampleOptions}
                ariaLabel="فیلتر نقش"
            />
        );

        expect(screen.getByText('کاربر عادی')).toBeInTheDocument();
        expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    });

    it('opens dropdown menu on trigger click and displays all options', () => {
        render(
            <AdminSelect
                value="all"
                onChange={jest.fn()}
                options={sampleOptions}
                ariaLabel="فیلتر نقش"
            />
        );

        const trigger = screen.getByRole('button', { name: 'فیلتر نقش' });
        expect(trigger).toHaveAttribute('aria-expanded', 'false');

        fireEvent.click(trigger);

        expect(trigger).toHaveAttribute('aria-expanded', 'true');
        expect(screen.getByRole('listbox')).toBeInTheDocument();

        const options = screen.getAllByRole('option');
        expect(options).toHaveLength(3);
        expect(options[0]).toHaveTextContent('همه نقش‌ها');
        expect(options[1]).toHaveTextContent('کاربر عادی');
        expect(options[2]).toHaveTextContent('مدیر سیستم');
    });

    it('calls onChange with selected value and closes menu when an option is clicked', () => {
        const handleChange = jest.fn();
        render(
            <AdminSelect
                value="all"
                onChange={handleChange}
                options={sampleOptions}
                ariaLabel="فیلتر نقش"
            />
        );

        fireEvent.click(screen.getByRole('button', { name: 'فیلتر نقش' }));
        fireEvent.click(screen.getByRole('option', { name: /مدیر سیستم/i }));

        expect(handleChange).toHaveBeenCalledWith('admin');
        expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    });

    it('closes menu when Escape key is pressed', () => {
        render(
            <AdminSelect
                value="all"
                onChange={jest.fn()}
                options={sampleOptions}
                ariaLabel="فیلتر نقش"
            />
        );

        const trigger = screen.getByRole('button', { name: 'فیلتر نقش' });
        fireEvent.click(trigger);
        expect(screen.getByRole('listbox')).toBeInTheDocument();

        fireEvent.keyDown(trigger, { key: 'Escape' });
        expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    });

    it('closes menu when clicking outside', () => {
        render(
            <div>
                <span data-testid="outside">بیرون</span>
                <AdminSelect
                    value="all"
                    onChange={jest.fn()}
                    options={sampleOptions}
                    ariaLabel="فیلتر نقش"
                />
            </div>
        );

        fireEvent.click(screen.getByRole('button', { name: 'فیلتر نقش' }));
        expect(screen.getByRole('listbox')).toBeInTheDocument();

        fireEvent.mouseDown(screen.getByTestId('outside'));
        expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    });
});

