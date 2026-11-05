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
});
