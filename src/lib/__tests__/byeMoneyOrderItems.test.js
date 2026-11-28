import { mapByeMoneyLineItem } from '../byeMoneyOrderItems';

describe('mapByeMoneyLineItem — مبلغ برگشتی کالای فیزیکی', () => {
    const product = (extra = {}) => mapByeMoneyLineItem({
        externalCourseId: 'prod-1', itemType: 'Product', title: 'کتاب', quantity: 3, ...extra,
    });

    it('نور عادی و هدیهٔ برگشتی را جدا نگه می‌دارد', () => {
        const item = product({ cancelledQuantity: 2, refundedRegularInNoor: 14, refundedGiftInNoor: 6 });
        expect(item.refundedRegularInNoor).toBe(14);
        expect(item.refundedGiftInNoor).toBe(6);
    });

    it('بدون فیلد یا با مقدار نامعتبر، صفر می‌شود', () => {
        expect(product()).toMatchObject({ refundedRegularInNoor: 0, refundedGiftInNoor: 0 });
        expect(product({ refundedRegularInNoor: 'x', refundedGiftInNoor: null }))
            .toMatchObject({ refundedRegularInNoor: 0, refundedGiftInNoor: 0 });
    });

    it('trackingUrl را برای لینک رهگیری نگه می‌دارد', () => {
        const item = product({ trackingUrl: 'https://track.example/1', trackingProvider: 'PostEx' });
        expect(item.trackingUrl).toBe('https://track.example/1');
        expect(item.trackingProvider).toBe('PostEx');
    });

    it('وضعیت و مبلغ و زمان برگشت قلم بسته‌شده را نگه می‌دارد و علت ادمین را حذف می‌کند', () => {
        const item = product({
            closedParcelRefundStatus: 'Refunded',
            closedParcelRefundedAtUtc: '2026-11-26T10:00:00Z',
            closedParcelRefundAmountInNoor: 70,
            closedParcelRefundReason: 'علت ادمین',
        });
        expect(item.closedParcelRefundStatus).toBe('Refunded');
        expect(item.closedParcelRefundAmountInNoor).toBe(70);
        expect(item.closedParcelRefundedAtUtc).toBe('2026-11-26T10:00:00Z');
        expect(item.closedParcelRefundReason).toBeUndefined();
    });

    it('فیلدهای ادمین (شناسهٔ مرسوله و هشدار) را به نمای خریدار نمی‌برد', () => {
        const item = product({
            providerParcelId: 'parcel-9',
            carrierAlertCode: 11304,
            carrierAlertResolutionNote: 'یادداشت ادمین',
            carrierPaymentPendingSinceUtc: '2026-11-19T10:00:00Z',
        });
        expect(item.providerParcelId).toBeUndefined();
        expect(item.carrierAlertCode).toBeUndefined();
        expect(item.carrierAlertResolutionNote).toBeUndefined();
        expect(item.carrierPaymentPendingSinceUtc).toBeUndefined();
    });
});
