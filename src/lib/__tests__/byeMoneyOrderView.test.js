import {
  getAmountRows, getByeMoneyOrderView, getOrderNumber, getPaidAt, getPhysicalSteps, getPaymentRefCode,
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

  it('getOrderNumber و getPaymentRefCode', () => {
    expect(getOrderNumber({ orderId: 'cart:abcdef12-0000' }).short).toBe('ABCDEF12');
    expect(getPaymentRefCode({ topUps: [{ status: 'Confirmed', clientReferenceCode: 'TR-1' }] })).toBe('TR-1');
    expect(getPaymentRefCode({ topUps: [{ status: 'Pending', clientReferenceCode: 'TR-2' }] })).toBeNull();
  });

  it('getPaidAt فقط وقتی با تاریخ ثبت فرق دارد', () => {
    const t = '2026-11-01T10:00:00Z';
    expect(getPaidAt({ createdAt: t, items: [{ purchasedAtUtc: t }] })).toBeNull();
    expect(getPaidAt({ createdAt: t, items: [{ purchasedAtUtc: '2026-11-01T12:00:00Z' }] })).toBeTruthy();
  });
});
