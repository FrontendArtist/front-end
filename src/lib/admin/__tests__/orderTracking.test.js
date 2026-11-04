import {
    ATTEMPT_RESULT,
    buildTimeline,
    canShowReceipt,
    classifyAttempt,
    financialStatusesForTab,
    getFinancialStatusConfig,
    mapByeMoneyOrderRow,
    sanitizeAttempt,
    summarizeAttempts,
} from '../orderTracking';

const NOW = new Date('2026-11-01T12:00:00Z');
const TOPUP = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';

describe('isPhysicalFullyCancelled', () => {
    const { isPhysicalFullyCancelled } = require('../orderTracking');
    const product = (quantity, cancelledQuantity) => ({ itemType: 'Product', quantity, cancelledQuantity });

    test('همهٔ کالاها کامل لغو شده‌اند', () => {
        expect(isPhysicalFullyCancelled([product(2, 2), product(1, 1), { itemType: 'Course' }])).toBe(true);
    });
    test('لغو جزئی یا بدون لغو false است', () => {
        expect(isPhysicalFullyCancelled([product(2, 1)])).toBe(false);
        expect(isPhysicalFullyCancelled([product(1, 1), product(1, 0)])).toBe(false);
    });
    test('سفارش بدون کالا false است', () => {
        expect(isPhysicalFullyCancelled([{ itemType: 'Course' }])).toBe(false);
        expect(isPhysicalFullyCancelled(undefined)).toBe(false);
    });
});

describe('نگاشت financialStatus واقعی', () => {
    const row = (financialStatus) => mapByeMoneyOrderRow({
        orderId: 'cart:11111111-1111-1111-1111-111111111111',
        sourceType: 'Cart',
        cartId: '11111111-1111-1111-1111-111111111111',
        createdAtUtc: '2026-11-01T10:00:00Z',
        updatedAtUtc: '2026-11-01T10:05:00Z',
        financialStatus,
        deliveryStatus: 'NotStarted',
        finalAmountInNoor: 50,
        itemCount: 2,
        topUpAttemptCount: 1,
        buyerExternalUserId: 'u1',
        buyerDisplayName: 'علی',
    });

    test.each([
        ['Paid', 'paid', 'paid'],
        ['AwaitingPayment', 'pending_payment', 'pending'],
        ['Processing', 'pending_payment', 'pending'],
        ['Preparing', 'pending_payment', 'pending'],
        ['Failed', 'failed', 'canceled'],
        ['Expired', 'expired', 'expired'],
        ['RequiresReview', 'review', 'review'],
    ])('%s → paymentStatus=%s و orderStatus=%s (دیگر همیشه paid نیست)', (fs, payment, order) => {
        const m = row(fs);
        expect(m.paymentStatus).toBe(payment);
        expect(m.orderStatus).toBe(order);
        expect(m.financialStatus).toBe(fs);
    });

    test('هر سفارش یک ردیف است و شناسه orderId است نه قلم', () => {
        const m = row('Paid');
        expect(m.id).toBe('cart:11111111-1111-1111-1111-111111111111');
        expect(m.isByeMoney).toBe(true);
        expect(m.itemCount).toBe(2);
        expect(m.totalPrice).toBe(50);
        expect(m.refundedAmountInNoor).toBeNull();
        expect(m.paymentMethod).toBe('noor');
    });

    test('وضعیت ناشناخته خطا نمی‌دهد', () => {
        expect(getFinancialStatusConfig('Weird').label).toBe('نامشخص');
    });
});

describe('تب‌ها و فیلتر مالی', () => {
    test('هر تب فیلتر مناسب را می‌فرستد', () => {
        expect(financialStatusesForTab('paid')).toEqual(['Paid']);
        expect(financialStatusesForTab('canceled')).toEqual(['Failed']);
        expect(financialStatusesForTab('expired')).toEqual(['Expired']);
        expect(financialStatusesForTab('review')).toEqual(['RequiresReview']);
    });

    test('تب در انتظار دو فراخوانی است: Processing و AwaitingPayment', () => {
        expect(financialStatusesForTab('pending')).toEqual(['Processing', 'AwaitingPayment']);
    });

    test('همه بدون فیلتر وضعیت؛ آنلاین بای‌مانی را نمی‌خواند', () => {
        expect(financialStatusesForTab('all')).toEqual([undefined]);
        expect(financialStatusesForTab(undefined)).toEqual([undefined]);
        expect(financialStatusesForTab('online')).toEqual([]);
    });
});

describe('دکمهٔ رسید', () => {
    test('فقط برای Paid فعال است', () => {
        expect(canShowReceipt({ financialStatus: 'Paid' })).toBe(true);
        for (const s of ['Preparing', 'AwaitingPayment', 'Processing', 'Failed', 'Expired', 'RequiresReview']) {
            expect(canShowReceipt({ financialStatus: s })).toBe(false);
        }
        expect(canShowReceipt(null)).toBe(false);
    });
});

describe('نتیجهٔ تلاش درگاه', () => {
    test.each([
        [{ status: 'cancelled' }, 'لغو توسط کاربر'],
        [{ status: 'failed' }, 'ناموفق'],
        [{ status: 'confirmed' }, 'موفق'],
        [{ status: 'failed', lastError: 'TOKEN_FAILED' }, 'ناموفق (خطای توکن درگاه)'],
        [{ status: 'pending_sync' }, 'پرداخت بانکی ثبت شد؛ تحویل به بای‌مانی در صف تلاش مجدد'],
        [{ status: 'financial_review', lastError: 'x' }, 'نیازمند بررسی مالی دستی'],
    ])('%j → %s', (attempt, label) => {
        expect(classifyAttempt(attempt, NOW).label).toBe(label);
    });

    test('token_issued با انقضای گذشته یعنی منقضی / رهاشده', () => {
        const r = classifyAttempt({ status: 'token_issued', tokenExpiresAtUtc: '2026-11-01T11:00:00Z' }, NOW);
        expect(r).toBe(ATTEMPT_RESULT.abandoned);
        expect(r.label).toBe('منقضی / رهاشده');
    });

    test('token_issued هنوز معتبر یعنی در انتظار پرداخت', () => {
        const r = classifyAttempt({ status: 'token_issued', tokenExpiresAtUtc: '2026-11-01T13:00:00Z' }, NOW);
        expect(r).toBe(ATTEMPT_RESULT.inGateway);
        expect(r.label).toBe('در انتظار پرداخت');
    });
});

describe('sanitizeAttempt', () => {
    test('فیلدهای حساس هرگز عبور نمی‌کنند', () => {
        const out = sanitizeAttempt({
            topUpRequestId: TOPUP,
            status: 'cancelled',
            refNum: 'REF',
            rrn: 'RRN',
            securePan: '6037****',
            hashedCardNumber: 'abc',
            retryCount: 0,
            resNum: 'res',
        });
        expect(Object.keys(out)).not.toEqual(expect.arrayContaining(['refNum']));
        expect(JSON.stringify(out)).not.toMatch(/REF|RRN|6037|abc|retryCount|"resNum"/);
        expect(out.status).toBe('cancelled');
    });
});

describe('buildTimeline', () => {
    const order = {
        sourceType: 'Cart',
        createdAtUtc: '2026-11-01T10:00:00Z',
        updatedAtUtc: '2026-11-01T10:30:00Z',
        financialStatus: 'Failed',
        deliveryStatus: 'NotStarted',
        itemCount: 1,
    };
    const topUps = [{ topUpRequestId: TOPUP, status: 'Rejected', amountNoor: 50, createdAtUtc: '2026-11-01T10:10:00Z', gatewayResultKind: 'Failed' }];

    test('ساخت سبد ← تلاش با نتیجه ← نتیجهٔ نهایی', () => {
        const tl = buildTimeline({
            order,
            topUps,
            attempts: [{ topUpRequestId: TOPUP.toUpperCase(), status: 'cancelled', createdAt: '2026-11-01T10:10:01Z' }],
            now: NOW,
        });
        expect(tl.map((e) => e.kind)).toEqual(['cart', 'attempt', 'final']);
        expect(tl[1].result.label).toBe('لغو توسط کاربر');
        expect(tl[1].source).toBe('strapi');
        expect(tl[2].result.label).toBe('ناموفق');
        expect(summarizeAttempts(tl).label).toBe('لغو توسط کاربر');
    });

    test('بدون استرپی فقط وضعیت و نتیجهٔ درگاه بای‌مانی (وضعیت شارژ، نه خرید)', () => {
        const tl = buildTimeline({ order, topUps, attempts: null, now: NOW });
        const attempt = tl[1];
        expect(attempt.source).toBe('byemoney');
        expect(attempt.result.label).toBe('شارژ: رد شده');
        expect(attempt.details).toEqual(expect.arrayContaining([{ label: 'نتیجهٔ درگاه (بای‌مانی)', value: 'ناموفق' }]));
        expect(summarizeAttempts(tl)).toBeNull();
    });

    test('financial_review علت (lastError) را نشان می‌دهد و بدون رکورد، «بدون تلاش» جداست', () => {
        const tl = buildTimeline({
            order,
            topUps,
            attempts: [{ topUpRequestId: TOPUP, status: 'financial_review', lastError: 'AMOUNT_MISMATCH', createdAt: '2026-11-01T10:10:01Z' }],
            now: NOW,
        });
        expect(tl[1].details).toEqual(expect.arrayContaining([{ label: 'علت بررسی (lastError)', value: 'AMOUNT_MISMATCH' }]));
        const none = buildTimeline({ order, topUps, attempts: [], now: NOW });
        expect(none[1].details).toEqual(expect.arrayContaining([{ label: 'رکورد درگاه', value: 'در استرپی رکوردی یافت نشد' }]));
        const unavailable = buildTimeline({ order, topUps, attempts: null, now: NOW });
        expect(JSON.stringify(unavailable[1].details)).not.toContain('رکوردی یافت نشد');
    });

    test('شارژ Confirmed با سفارش Failed هم‌سان نمایش داده نمی‌شود (TRACK-04)', () => {
        const tl = buildTimeline({
            order,
            topUps: [{ ...topUps[0], status: 'Confirmed', gatewayResultKind: 'Success' }],
            attempts: null,
            now: NOW,
        });
        expect(tl[1].result.label).toBe('شارژ: تأیید شده');
        expect(tl[2].result.label).toBe('ناموفق');
    });
});
