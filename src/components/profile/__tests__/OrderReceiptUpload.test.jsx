import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import OrderReceiptUpload from '../OrderReceiptUpload';

describe('OrderReceiptUpload', () => {
    const originalFetch = global.fetch;

    beforeEach(() => {
        global.fetch = jest.fn();
    });

    afterAll(() => {
        global.fetch = originalFetch;
    });

    it('اطلاعات بانکی را از proxy داخلی /api/bank-settings می‌خواند و مستقیم به Strapi وصل نمی‌شود', async () => {
        global.fetch.mockResolvedValue({
            ok: true,
            json: async () => ({
                data: {
                    bankName: 'بانک ملت',
                    cardNumber: '6104-3377-1111-2222',
                    accountHolder: 'طرح الهی',
                },
            }),
        });

        render(<OrderReceiptUpload orderId="ord-123" />);

        await waitFor(() => {
            expect(screen.getByText('6104-3377-1111-2222')).toBeInTheDocument();
        });
        expect(screen.getByText('بانک ملت')).toBeInTheDocument();
        expect(global.fetch).toHaveBeenCalledTimes(1);
        expect(global.fetch).toHaveBeenCalledWith('/api/bank-settings', { cache: 'no-store' });
    });
});
