import { pickShippingOrigin, quotedShippingAddress, quotedShippingOriginText, shippingOriginText } from '../shippingOrigin';

test('برچسب مبدأ بر شناسه مقدم است و شناسهٔ خالی حذف می‌شود', () => {
    expect(pickShippingOrigin({ id: 'ramsar', label: ' رامسر ', cityDocumentId: 'x' })).toEqual({
        id: 'ramsar',
        label: 'رامسر',
    });
    expect(shippingOriginText({ id: 'ramsar', label: ' ' })).toBe('ramsar');
    expect(pickShippingOrigin(null)).toBeNull();
});

test('پیش‌نمایش استرپی و پاسخ سبد بای‌مانی هر دو مبدأ و آدرس را می‌دهند', () => {
    expect(quotedShippingOriginText({ shippingOriginLabel: 'مشهد', shippingOriginId: 'mashhad' })).toBe('مشهد');
    expect(quotedShippingOriginText({ shippingOrigin: { id: 'ramsar', label: null } })).toBe('ramsar');
    expect(quotedShippingAddress(
        { addressSnapshot: { fullAddress: 'خیابان ثابت', cityDocumentId: 'city-1', province: 'مازندران', city: 'رامسر' } },
        { fullAddress: 'پروفایل' },
    ).fullAddress).toBe('خیابان ثابت');
    expect(quotedShippingAddress({}, { fullAddress: 'پروفایل' }).fullAddress).toBe('پروفایل');
    expect(quotedShippingAddress(
        { shippingAddress: { fullAddress: 'ثبت‌نشده', city: 'مشهد' } },
        { fullAddress: 'خیابان پروفایل' },
    ).fullAddress).toBe('خیابان پروفایل');
    expect(quotedShippingAddress(
        { addressSnapshot: { fullAddress: ' ثبت‌نشده ' } },
        { fullAddress: 'ثبت‌نشده' },
    )).toBeNull();
});
