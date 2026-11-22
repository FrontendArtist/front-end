import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import ShipmentRefreshControl from '../ShipmentRefreshControl';
import { SHIPMENT_REFRESH_MESSAGES } from '@/lib/admin/shipmentRefresh';

const PID = '22222222-2222-2222-2222-222222222222';

beforeEach(() => {
    global.fetch = jest.fn();
});

describe('ShipmentRefreshControl', () => {
    it.each([
        'Shipped',
        'AwaitingTrackingCode',
        'PaymentPending',
        'ParcelNotFound',
    ])('نتیجهٔ %s را با پیام خودش نشان می‌دهد', async (outcome) => {
        global.fetch.mockResolvedValueOnce({
            ok: true,
            status: 200,
            json: async () => ({ outcome, purchaseId: PID }),
        });
        render(<ShipmentRefreshControl purchaseId={PID} />);

        fireEvent.click(screen.getByTestId('refresh-carrier-shipment'));

        expect(await screen.findByTestId('shipment-refresh-message')).toHaveTextContent(
            SHIPMENT_REFRESH_MESSAGES[outcome],
        );
        expect(global.fetch).toHaveBeenCalledWith(
            `/api/admin/physical-purchases/${PID}/shipments/refresh`,
            expect.objectContaining({ method: 'POST' }),
        );
    });
});
