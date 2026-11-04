/**
 * @file src/lib/admin/orderTracking.js
 * @description منطق خالص فهرست پیگیری سفارش‌های بای‌مانی در /admin/orders (TRACK-03)
 *
 * - نگاشت financialStatus واقعی بای‌مانی به برچسب و وضعیت‌های نمایشی جدول
 * - تعیین فیلترهای مالی هر تب (API فقط یک financialStatus می‌پذیرد)
 * - نتیجهٔ هر تلاش درگاه از رکورد استرپی و ساخت خط زمانی
 *
 * فقط‌مشاهده است. موفقیت شارژ (topUps[].status) با موفقیت خرید (financialStatus) یکی گرفته نمی‌شود (TRACK-04).
 */

export const FINANCIAL_STATUS_CONFIG = {
    Preparing: { label: 'در حال آماده‌سازی سبد', variant: 'info', paymentStatus: 'pending_payment', orderStatus: 'pending' },
    AwaitingPayment: { label: 'در انتظار پرداخت', variant: 'warning', paymentStatus: 'pending_payment', orderStatus: 'pending' },
    Processing: { label: 'در حال پردازش', variant: 'warning', paymentStatus: 'pending_payment', orderStatus: 'pending' },
    Paid: { label: 'پرداخت شده', variant: 'success', paymentStatus: 'paid', orderStatus: 'paid' },
    Failed: { label: 'ناموفق', variant: 'error', paymentStatus: 'failed', orderStatus: 'canceled' },
    Expired: { label: 'منقضی', variant: 'default', paymentStatus: 'expired', orderStatus: 'expired' },
    RequiresReview: { label: 'نیازمند بررسی', variant: 'warning', paymentStatus: 'review', orderStatus: 'review' },
};

const UNKNOWN_FINANCIAL = { label: 'نامشخص', variant: 'default', paymentStatus: 'unknown', orderStatus: 'unknown' };

export function getFinancialStatusConfig(status) {
    return FINANCIAL_STATUS_CONFIG[status] || UNKNOWN_FINANCIAL;
}

/**
 * فیلتر مالی هر تب. چون API فقط یک financialStatus می‌گیرد، تب «در انتظار» دو فراخوانی ترتیبی است:
 * Processing (شارژ تأیید شده و خرید در حال ثبت؛ گذرا و کم‌تعداد و نیازمند توجه) سپس AwaitingPayment.
 * Preparing (سبد بدون قیمت نهایی) عمداً فقط در «همه» می‌آید تا سبدهای رهاشده تب انتظار را پر نکنند.
 * تب آنلاین فقط به ردیف‌های استرپی مربوط است و بای‌مانی را نمی‌خواند.
 * `[undefined]` یعنی بدون فیلتر وضعیت.
 */
export const TAB_FINANCIAL_STATUSES = {
    all: [undefined],
    paid: ['Paid'],
    pending: ['Processing', 'AwaitingPayment'],
    canceled: ['Failed'],
    expired: ['Expired'],
    review: ['RequiresReview'],
    online: [],
};

export function financialStatusesForTab(tab) {
    const key = !tab ? 'all' : tab;
    return TAB_FINANCIAL_STATUSES[key] ?? [undefined];
}

/** تب‌هایی که برای ردیف‌های قدیمی استرپی معنا ندارند */
export const BYEMONEY_ONLY_TABS = ['expired', 'review'];

/** ردیف فهرست پیگیری ادمین → شکل ردیف جدول سفارش‌ها (هر سفارش یک ردیف) */
export function mapByeMoneyOrderRow(row) {
    const cfg = getFinancialStatusConfig(row.financialStatus);
    const orderId = row.orderId;
    return {
        id: orderId,
        documentId: orderId,
        orderId,
        cartId: row.cartId || null,
        sourceType: row.sourceType,
        orderNumber: String(orderId).split(':').pop().slice(0, 8).toUpperCase(),
        source: 'byemoney',
        orderSource: 'byemoney',
        isByeMoney: true,
        paymentMethod: 'noor',
        paymentStatus: cfg.paymentStatus,
        orderStatus: cfg.orderStatus,
        totalPrice: row.finalAmountInNoor,
        // مبلغ برگشت‌خورده از لغو کالا؛ تا زمانی که بک‌اند فیلد را نفرستد null می‌ماند (نه صفر)
        refundedAmountInNoor: row.refundedAmountInNoor ?? null,
        financialStatus: row.financialStatus,
        deliveryStatus: row.deliveryStatus,
        itemCount: row.itemCount ?? 0,
        topUpAttemptCount: row.topUpAttemptCount ?? 0,
        createdAt: row.createdAtUtc,
        updatedAt: row.updatedAtUtc,
        fullName: row.buyerDisplayName || 'کاربر بای‌مانی',
        buyerDisplayName: row.buyerDisplayName,
        buyerExternalUserId: row.buyerExternalUserId,
        phone: null,
        email: null,
        trackingNumber: null,
        cardHolderName: null,
        notes: null,
        user: {
            username: row.buyerDisplayName || row.buyerExternalUserId,
            documentId: row.buyerExternalUserId,
        },
        receiptImageUrl: null,
        settlement: null,
        settledAt: null,
    };
}

/**
 * آیا همهٔ اقلام فیزیکی سفارش کامل لغو شده‌اند؟ (سفارش بدون کالا false است)
 * ورودی: اقلام جزئیات سفارش با itemType، quantity و cancelledQuantity.
 */
export function isPhysicalFullyCancelled(items) {
    const products = (items || []).filter((i) => String(i?.itemType || '').toLowerCase() === 'product');
    if (products.length === 0) return false;
    return products.every((i) => {
        const qty = Number(i.quantity) > 0 ? Number(i.quantity) : 1;
        return (Number(i.cancelledQuantity) || 0) >= qty;
    });
}

/** رسید فقط برای سفارش Paid وجود دارد؛ برای بقیه ۴۰۴ است */
export function canShowReceipt(order) {
    return Boolean(order) && order.financialStatus === 'Paid';
}

// ── نتیجهٔ تلاش درگاه ───────────────────────────────────────────────────────

export const ATTEMPT_RESULT = {
    cancelled: { key: 'cancelled_by_user', label: 'لغو توسط کاربر', tone: 'error' },
    failed: { key: 'failed', label: 'ناموفق', tone: 'error' },
    confirmed: { key: 'confirmed', label: 'موفق', tone: 'success' },
    tokenFailed: { key: 'token_failed', label: 'ناموفق (خطای توکن درگاه)', tone: 'error' },
    abandoned: { key: 'abandoned_at_gateway', label: 'منقضی / رهاشده', tone: 'warning' },
    inGateway: { key: 'in_gateway', label: 'در انتظار پرداخت', tone: 'warning' },
    pendingSync: { key: 'pending_sync', label: 'پرداخت بانکی ثبت شد؛ تحویل به بای‌مانی در صف تلاش مجدد', tone: 'warning' },
    financialReview: { key: 'financial_review', label: 'نیازمند بررسی مالی دستی', tone: 'warning' },
    review: { key: 'under_review', label: 'در حال بررسی', tone: 'warning' },
    started: { key: 'started', label: 'ایجاد شده (هنوز به درگاه نرسیده)', tone: 'info' },
    verifying: { key: 'verifying', label: 'در حال تأیید بانکی', tone: 'warning' },
    reversed: { key: 'reversed', label: 'برگشت خورده', tone: 'default' },
    unknown: { key: 'unknown', label: 'نامشخص', tone: 'default' },
};

/**
 * نتیجهٔ یک تلاش بر اساس status رکورد gateway-payment-attempt استرپی.
 * token_issued فقط «در انتظار نتیجهٔ بانک» است و بک‌اند آن را منقضی نمی‌کند؛ فقط اگر tokenExpiresAtUtc
 * گذشته باشد «منقضی / رهاشده» نمایش داده می‌شود. retryCount همیشه ۰ است و هیچ منطقی روی آن ساخته نمی‌شود.
 */
export function classifyAttempt(attempt, now = new Date()) {
    const status = attempt?.status;
    switch (status) {
        case 'cancelled':
            return ATTEMPT_RESULT.cancelled;
        case 'failed':
            return attempt.lastError === 'TOKEN_FAILED' ? ATTEMPT_RESULT.tokenFailed : ATTEMPT_RESULT.failed;
        case 'confirmed':
            return ATTEMPT_RESULT.confirmed;
        case 'token_issued': {
            const exp = attempt.tokenExpiresAtUtc ? new Date(attempt.tokenExpiresAtUtc) : null;
            if (exp && !Number.isNaN(exp.getTime()) && exp.getTime() < new Date(now).getTime()) {
                return ATTEMPT_RESULT.abandoned;
            }
            return ATTEMPT_RESULT.inGateway;
        }
        case 'pending_sync':
            return ATTEMPT_RESULT.pendingSync;
        case 'financial_review':
            return ATTEMPT_RESULT.financialReview;
        case 'review':
        case 'reverse_required':
            return ATTEMPT_RESULT.review;
        case 'created':
            return ATTEMPT_RESULT.started;
        case 'verifying':
        case 'verified':
            return ATTEMPT_RESULT.verifying;
        case 'reversed':
            return ATTEMPT_RESULT.reversed;
        default:
            return ATTEMPT_RESULT.unknown;
    }
}

const TOPUP_STATUS_LABELS = {
    Pending: 'در انتظار',
    Confirmed: 'تأیید شده',
    Rejected: 'رد شده',
    ManuallyRefunded: 'بازگشت دستی',
    Unresolved: 'نامشخص (نیازمند بررسی)',
};

const GATEWAY_RESULT_LABELS = {
    Success: 'موفق',
    Failed: 'ناموفق',
    Unknown: 'نتیجهٔ مبهم',
    ReverseFailed: 'برگشت ناموفق',
    Reversed: 'برگشت خورده',
};

/**
 * نتیجهٔ تلاش وقتی استرپی در دسترس نیست: فقط وضعیت شارژ و نتیجهٔ درگاه خود بای‌مانی.
 * این «وضعیت شارژ» است، نه موفقیت خرید.
 */
export function describeTopUpWithoutStrapi(topUp) {
    const status = TOPUP_STATUS_LABELS[topUp?.status] || topUp?.status || 'نامشخص';
    const gateway = topUp?.gatewayResultKind
        ? GATEWAY_RESULT_LABELS[topUp.gatewayResultKind] || topUp.gatewayResultKind
        : null;
    return { key: 'byemoney_only', label: `شارژ: ${status}`, tone: 'default', gatewayLabel: gateway };
}

/** فقط فیلدهای لازم؛ refNum، rrn، securePan، hashedCardNumber و retryCount هرگز عبور نمی‌کنند */
const ATTEMPT_ALLOWED_FIELDS = [
    'topUpRequestId',
    'status',
    'createdAt',
    'updatedAt',
    'lastError',
    'tokenIssuedAtUtc',
    'tokenExpiresAtUtc',
    'verifiedAtUtc',
    'lastAttemptAtUtc',
];

export function sanitizeAttempt(raw) {
    const src = raw?.attributes || raw || {};
    const out = {};
    for (const f of ATTEMPT_ALLOWED_FIELDS) out[f] = src[f] ?? null;
    return out;
}

export function sanitizeTopUp(t) {
    return {
        topUpRequestId: t.topUpRequestId,
        status: t.status ?? null,
        amountNoor: t.amountNoor ?? null,
        createdAtUtc: t.createdAtUtc ?? null,
        confirmedAtUtc: t.confirmedAtUtc ?? null,
        gatewayResultKind: t.gatewayResultKind ?? null,
        reviewReasonCode: t.reviewReasonCode ?? null,
    };
}

const byTime = (field) => (a, b) => new Date(a[field] || 0).getTime() - new Date(b[field] || 0).getTime();

/**
 * خط زمانی: ساخت سبد ← هر تلاش درگاه با نتیجه ← نتیجهٔ نهایی.
 * @param {{ order: object, topUps: object[], attempts: object[]|null, now?: Date }} input
 *   attempts=null یعنی استرپی در دسترس نبود.
 */
export function buildTimeline({ order, topUps = [], attempts = null, now = new Date() }) {
    const events = [];
    const sourceLabel = order.sourceType === 'Cart' ? 'ساخت سبد خرید'
        : order.sourceType === 'TopUpCheckout' ? 'ثبت شارژ خرید'
            : 'ثبت خرید';
    events.push({
        kind: 'cart',
        at: order.createdAtUtc || null,
        title: sourceLabel,
        result: null,
        details: [
            ...(order.itemCount != null ? [{ label: 'تعداد اقلام', value: String(order.itemCount) }] : []),
        ],
    });

    const attemptsByTopUp = new Map();
    if (attempts) {
        for (const a of [...attempts].sort(byTime('createdAt'))) {
            const key = String(a.topUpRequestId || '').toLowerCase();
            attemptsByTopUp.set(key, [...(attemptsByTopUp.get(key) || []), a]);
        }
    }

    [...topUps].sort(byTime('createdAtUtc')).forEach((topUp, i) => {
        const records = attemptsByTopUp.get(String(topUp.topUpRequestId || '').toLowerCase()) || [];
        const latest = records[records.length - 1] || null;
        const details = [];
        if (topUp.amountNoor != null) details.push({ label: 'مبلغ شارژ', value: `${topUp.amountNoor} نور` });
        let result;
        let source;
        if (latest) {
            result = classifyAttempt(latest, now);
            source = 'strapi';
            if (latest.tokenIssuedAtUtc) details.push({ label: 'صدور توکن درگاه', value: latest.tokenIssuedAtUtc, isTime: true });
            if (latest.verifiedAtUtc) details.push({ label: 'تأیید بانکی', value: latest.verifiedAtUtc, isTime: true });
            if (records.length > 1) details.push({ label: 'تعداد رکورد درگاه', value: String(records.length) });
            if (latest.status === 'financial_review' && latest.lastError) {
                details.push({ label: 'علت بررسی (lastError)', value: latest.lastError });
            }
        } else {
            const d = describeTopUpWithoutStrapi(topUp);
            result = { key: d.key, label: d.label, tone: d.tone };
            source = 'byemoney';
            if (d.gatewayLabel) details.push({ label: 'نتیجهٔ درگاه (بای‌مانی)', value: d.gatewayLabel });
            // استرپی پاسخ داده ولی رکوردی برای این شارژ نیست: «بدون تلاش» جدا از «استرپی در دسترس نیست» است
            if (attempts) details.push({ label: 'رکورد درگاه', value: 'در استرپی رکوردی یافت نشد' });
        }
        if (topUp.reviewReasonCode) details.push({ label: 'علت بررسی', value: topUp.reviewReasonCode });
        events.push({
            kind: 'attempt',
            at: topUp.createdAtUtc || null,
            title: `تلاش درگاه ${i + 1}`,
            result,
            source,
            topUpRequestId: topUp.topUpRequestId,
            details,
        });
    });

    const fin = getFinancialStatusConfig(order.financialStatus);
    events.push({
        kind: 'final',
        at: order.updatedAtUtc || null,
        title: 'نتیجهٔ نهایی سفارش',
        result: { key: String(order.financialStatus || 'unknown').toLowerCase(), label: fin.label, tone: fin.variant },
        details: order.deliveryStatus ? [{ label: 'وضعیت تحویل', value: order.deliveryStatus }] : [],
    });

    return events;
}

/** خلاصهٔ برچسب برای ردیف جدول: اگر همهٔ تلاش‌ها لغو بوده یا آخرین تلاش لغو شده «لغو توسط کاربر» */
export function summarizeAttempts(timeline) {
    const attempts = timeline.filter((e) => e.kind === 'attempt' && e.source === 'strapi');
    if (attempts.length === 0) return null;
    const last = attempts[attempts.length - 1];
    return { key: last.result.key, label: last.result.label, tone: last.result.tone };
}
