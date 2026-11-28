import {
    REFUND_GENERIC_MESSAGE,
    REFUND_UNKNOWN_MESSAGE,
    addListedRefund,
    interpretRefundResponse,
    refundErrorMessage,
} from '../closedParcelRefund';

const http = (status, body, { failJson = false } = {}) => ({
    ok: status >= 200 && status < 300,
    status,
    json: failJson ? async () => { throw new Error('bad'); } : async () => body,
});

describe('refundErrorMessage', () => {
    test('کدهای شناخته‌شده پیام اختصاصی دارند', () => {
        expect(refundErrorMessage('CLOSED_PARCEL_REFUND_MANUAL_REVIEW', 409))
            .toBe('سهم پرداخت این قلم ثبت نشده است؛ برگشت از این بخش ممکن نیست و باید دستی پیگیری شود.');
        expect(refundErrorMessage('CLOSED_PARCEL_REFUND_CONFLICT', 409))
            .toBe('ثبت برگشت با درخواست دیگری تداخل داشت. وضعیت قلم را ببینید و در صورت نیاز دوباره ثبت کنید.');
        expect(refundErrorMessage('CLOSED_PARCEL_REFUND_NOT_FOUND', 404)).toBe('این قلم پیدا نشد.');
    });

    test('کد ناشناخته و ۴۰۴ بدون کد پیام عمومی دارند', () => {
        expect(refundErrorMessage('OTHER', 409)).toBe(REFUND_GENERIC_MESSAGE);
        expect(refundErrorMessage(undefined, 404)).toBe(REFUND_GENERIC_MESSAGE);
        expect(refundErrorMessage('', 404)).toBe(REFUND_GENERIC_MESSAGE);
    });

    test('۴۰۰ بدون کد همان خطای علت است', () => {
        expect(refundErrorMessage(undefined, 400)).toBe('علت باید بین ۱ تا ۵۰۰ نویسه باشد.');
    });
});

describe('interpretRefundResponse', () => {
    test.each([408, 500, 502, 503])('وضعیت %i نتیجهٔ نامعلوم است', async (status) => {
        await expect(interpretRefundResponse(http(status, { success: false }))).resolves.toEqual({ kind: 'unknown' });
    });

    test('پاسخ ناخوانا نتیجهٔ نامعلوم است', async () => {
        await expect(interpretRefundResponse(http(200, null, { failJson: true }))).resolves.toEqual({ kind: 'unknown' });
        await expect(interpretRefundResponse(http(409, 'متن'))).resolves.toEqual({ kind: 'unknown' });
    });

    test('۴۰۹ حتی با کد ناشناخته تعارض است و پیام عمومی دارد', async () => {
        await expect(interpretRefundResponse(http(409, { success: false, code: 'OTHER' }))).resolves.toMatchObject({
            kind: 'conflict',
            message: REFUND_GENERIC_MESSAGE,
        });
    });

    test('موفقیت داده را برمی‌گرداند', async () => {
        const data = { totalRefundInNoor: 12 };
        await expect(interpretRefundResponse(http(200, { success: true, data }))).resolves.toEqual({ kind: 'success', data });
    });
});

describe('addListedRefund', () => {
    test('مبلغ برگشتی را تا سقف سفارش زیاد می‌کند', () => {
        expect(addListedRefund({ refundedAmountInNoor: 10, totalPrice: 100 }, 60).refundedAmountInNoor).toBe(70);
        expect(addListedRefund({ refundedAmountInNoor: 90, totalPrice: 100 }, 40).refundedAmountInNoor).toBe(100);
        expect(addListedRefund({ refundedAmountInNoor: null, totalPrice: 100 }, 15).refundedAmountInNoor).toBe(15);
    });
});

describe('پیام نتیجهٔ نامعلوم', () => {
    test('متن ثابت است', () => {
        expect(REFUND_UNKNOWN_MESSAGE).toBe('نتیجهٔ ثبت مشخص نیست. می‌توانید همین درخواست را دوباره بفرستید.');
    });
});
