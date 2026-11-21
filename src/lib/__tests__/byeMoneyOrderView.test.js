import {
  getAmountRows, getByeMoneyOrderView, getOrderNumber, getPaidAt, getPhysicalState, getPhysicalSteps,
  getPaymentRefCode, getTopUpStatusMeta,
} from '../byeMoneyOrderView';

const product = (status, extra = {}) => ({ type: 'product', quantity: 1, physicalDeliveryStatus: status, ...extra });
const course = { type: 'course' };

describe('getByeMoneyOrderView', () => {
  it('Paid با کالای در حال آماده‌سازی', () => {
    const v = getByeMoneyOrderView({ financialStatus: 'Paid', items: [course, product('Preparing')] });
    expect(v).toMatchObject({ title: 'پرداخت شد', tone: 'success', isPaid: true, physicalState: 'preparing', unpaid: false });
  });

  it('سفارش فقط‌کالای لغوشده «سفارش لغو شد» است', () => {
    const v = getByeMoneyOrderView({ financialStatus: 'Paid', items: [product('Preparing', { cancelledQuantity: 1 })] });
    expect(v.title).toBe('سفارش لغو شد');
  });

  it('سبد مختلط با کالای لغوشده پرداخت‌شده می‌ماند', () => {
    const v = getByeMoneyOrderView({ financialStatus: 'Paid', items: [course, product('Preparing', { cancelledQuantity: 1 })] });
    expect(v.title).toBe('پرداخت شد');
    expect(v.hint).toContain('لغو');
  });

  it('وضعیت ناشناخته خطا نمی‌دهد', () => {
    expect(getByeMoneyOrderView({ financialStatus: 'Weird', items: [] }).title).toBe('Weird');
    expect(getByeMoneyOrderView({}).title).toBe('وضعیت نامشخص');
  });
});

describe('ابزارهای کمکی', () => {
  it('getPhysicalState اقلام کاملاً لغوشده را کنار می‌گذارد (O17)', () => {
    const items = [
      product('Delivered'),
      product('Preparing', { cancelledQuantity: 1 }),
    ];
    expect(getPhysicalState(items, false)).toBe('delivered');
    expect(getPhysicalState([product('Preparing', { cancelledQuantity: 1 })], false)).toBe('cancelled');
  });

  it('getPhysicalSteps', () => {
    expect(getPhysicalSteps('shipped').map((s) => [s.done, s.current])).toEqual([[true, false], [true, false], [false, true], [false, false]]);
    expect(getPhysicalSteps('delivered').every((s) => s.done)).toBe(true);
    expect(getPhysicalSteps('cancelled')).toBeNull();
  });

  it('getAmountRows مبلغ نهایی را شامل نمی‌شود و ارسال رایگان را نشان می‌دهد', () => {
    const rows = getAmountRows({ items: [product('Preparing')], cartSummary: { originalTotalInNoor: 10, shippingAmountInNoor: 0 } });
    expect(rows.map((r) => r.key)).toEqual(['subtotal', 'shipping']);
    expect(rows[1].value).toBe('رایگان');
  });

  it('getAmountRows ردیف تکراری جمع اقلام برابر مبلغ کل را حذف می‌کند (O1/O2)', () => {
    expect(getAmountRows({
      totalPrice: 100,
      items: [course],
      cartSummary: { originalTotalInNoor: 100, itemDiscountInNoor: 0, couponDiscountInNoor: 0, shippingAmountInNoor: 0 },
    })).toEqual([]);
  });

  it('getOrderNumber، getPaymentRefCode و getPaidAt با اولویت currentTopUpRequestId یا آخرین شارژ تأییدشده', () => {
    expect(getOrderNumber({ orderId: 'cart:abcdef12-0000' }).short).toBe('ABCDEF12');
    expect(getPaymentRefCode({ topUps: [{ status: 'Confirmed', clientReferenceCode: 'TR-1' }] })).toBe('TR-1');
    expect(getPaymentRefCode({ topUps: [{ status: 'Pending', clientReferenceCode: 'TR-2' }] })).toBeNull();

    const multiTopUps = [
      { topUpRequestId: 'r1', status: 'Confirmed', clientReferenceCode: 'TR-OLD', confirmedAtUtc: '2026-11-01T11:00:00Z' },
      { topUpRequestId: 'r2', status: 'Confirmed', clientReferenceCode: 'TR-NEW', confirmedAtUtc: '2026-11-01T12:00:00Z' },
    ];
    expect(getPaymentRefCode({ topUps: multiTopUps })).toBe('TR-NEW');
    expect(getPaymentRefCode({ currentTopUpRequestId: 'r1', topUps: multiTopUps })).toBe('TR-OLD');
    expect(getPaidAt({ createdAt: '2026-11-01T10:00:00Z', topUps: multiTopUps })).toBeTruthy();
    expect(getPaidAt({ createdAt: '2026-11-01T10:00:00Z', currentTopUpRequestId: 'r1', topUps: multiTopUps }))
      .not.toBe(getPaidAt({ createdAt: '2026-11-01T10:00:00Z', topUps: multiTopUps }));
  });

  it('getPaidAt فقط وقتی با تاریخ ثبت فرق دارد', () => {
    const t = '2026-11-01T10:00:00Z';
    expect(getPaidAt({ createdAt: t, items: [{ purchasedAtUtc: t }] })).toBeNull();
    expect(getPaidAt({ createdAt: t, items: [{ purchasedAtUtc: '2026-11-01T12:00:00Z' }] })).toBeTruthy();
  });

  it('getTopUpStatusMeta همهٔ وضعیت‌های TopUpStatus و fallback را نگاشت می‌کند', () => {
    expect(getTopUpStatusMeta('Confirmed')).toEqual({ label: 'شارژ تأیید شد', tone: 'success' });
    expect(getTopUpStatusMeta('Rejected')).toEqual({ label: 'شارژ رد شد', tone: 'danger' });
    expect(getTopUpStatusMeta('Pending')).toEqual({ label: 'در انتظار تأیید', tone: 'warning' });
    expect(getTopUpStatusMeta('UnderReview')).toEqual({ label: 'در حال بررسی مالی', tone: 'warning' });
    expect(getTopUpStatusMeta('Unresolved')).toEqual({ label: 'نامشخص (نیازمند پیگیری)', tone: 'danger' });
    expect(getTopUpStatusMeta('ManuallyRefunded')).toEqual({ label: 'استرداد دستی انجام شد', tone: 'info' });
    expect(getTopUpStatusMeta('Other')).toEqual({ label: 'Other', tone: 'default' });
  });
});
