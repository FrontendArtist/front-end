import { SHIPMENT_REFRESH_MESSAGES, shipmentRefreshMessage } from '../shipmentRefresh';

describe('shipmentRefreshMessage', () => {
    it.each([
        ['Shipped', true],
        ['AwaitingTrackingCode', false],
        ['PaymentPending', false],
        ['ParcelNotFound', false],
    ])('outcome %s پیام جدا دارد', (outcome, ok) => {
        expect(shipmentRefreshMessage({ outcome })).toEqual({
            ok,
            text: SHIPMENT_REFRESH_MESSAGES[outcome],
        });
    });

    it('نتیجهٔ ناشناخته پیام خوانده‌نشدن می‌دهد', () => {
        expect(shipmentRefreshMessage({ outcome: 'ReadFailed' }).text).toBe('وضعیت مرسوله خوانده نشد.');
    });
});
