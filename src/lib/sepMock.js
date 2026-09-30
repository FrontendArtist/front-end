import { createHmac, randomUUID, timingSafeEqual } from 'node:crypto';

const MOCK_GATEWAY_URL = '/api/payment/mock';
const TOKEN_LIFETIME_MS = 60 * 60 * 1000;
const SCENARIOS = new Set(['success', 'cancel', 'verify_failed', 'amount_mismatch']);

export function isSepMockEnabled() {
    return process.env.NODE_ENV === 'development' && process.env.SEP_MOCK_ENABLED === 'true';
}

function isLocalServiceUrl(value) {
    try {
        const url = new URL(value);
        return url.protocol === 'http:' && ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
    } catch { return false; }
}

export function getSepMockEnvironmentError() {
    if (!isSepMockEnabled()) return null;
    const strapiUrl = process.env.NEXT_PUBLIC_STRAPI_URL || process.env.NEXT_PUBLIC_STRAPI_API_URL || 'http://localhost:1337';
    const byeMoneyUrl = process.env.NEXT_PUBLIC_BYEMONEY_API_URL || process.env.NEXT_PUBLIC_BYEMONEY_URL || 'http://localhost:5000';
    if (!isLocalServiceUrl(strapiUrl) || !isLocalServiceUrl(byeMoneyUrl)) {
        return 'در حالت شبیه‌ساز، آدرس استرپی و بای‌مانی باید محلی باشند.';
    }
    return null;
}

function secret() {
    const value = process.env.SEP_MOCK_SECRET || process.env.NEXTAUTH_SECRET;
    if (!value) throw new Error('برای شبیه‌ساز SEP، SEP_MOCK_SECRET یا NEXTAUTH_SECRET را تنظیم کنید.');
    return value;
}

function sign(value) {
    const body = Buffer.from(JSON.stringify(value)).toString('base64url');
    const signature = createHmac('sha256', secret()).update(body).digest('base64url');
    return `${body}.${signature}`;
}

function readSigned(value, kind) {
    if (typeof value !== 'string' || value.length > 4096) return null;
    const [body, signature, extra] = value.split('.');
    if (!body || !signature || extra) return null;
    const expected = createHmac('sha256', secret()).update(body).digest();
    let provided;
    try { provided = Buffer.from(signature, 'base64url'); } catch { return null; }
    if (provided.length !== expected.length || !timingSafeEqual(provided, expected)) return null;
    try {
        const data = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
        if (data.kind !== kind || !Number.isSafeInteger(data.issuedAt) ||
            data.issuedAt > Date.now() || Date.now() - data.issuedAt > TOKEN_LIFETIME_MS) return null;
        return data;
    } catch { return null; }
}

export function isLocalSepCallback(redirectUrl) {
    try {
        const url = new URL(redirectUrl);
        return url.protocol === 'http:' && ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname) &&
            url.pathname === '/api/payment/verify' && !url.search && !url.hash;
    } catch { return false; }
}

export function createMockToken({ amount, resNum, redirectUrl }) {
    const environmentError = getSepMockEnvironmentError();
    if (environmentError) return { success: false, errorCode: 'MOCK_ENVIRONMENT_NOT_LOCAL', errorDesc: environmentError };
    if (!isLocalSepCallback(redirectUrl)) {
        return { success: false, errorCode: 'MOCK_CALLBACK_NOT_LOCAL',
            errorDesc: 'در حالت شبیه‌ساز، آدرس callback باید /api/payment/verify روی لوکال باشد.' };
    }
    const token = sign({ kind: 'token', amount: Math.round(Number(amount)),
        resNum: String(resNum), redirectUrl, nonce: randomUUID(), issuedAt: Date.now() });
    return { success: true, token, gatewayUrl: MOCK_GATEWAY_URL };
}

export function readMockToken(token) {
    const data = readSigned(token, 'token');
    return data && isLocalSepCallback(data.redirectUrl) && Number.isSafeInteger(data.amount) &&
        data.amount > 0 && typeof data.resNum === 'string' && data.resNum.length > 0 ? data : null;
}

export function createMockCallback(token, scenario) {
    const data = readMockToken(token);
    if (!data || !SCENARIOS.has(scenario)) return null;
    const traceNo = String(parseInt(data.nonce.slice(0, 10).replaceAll('-', ''), 16)).padStart(12, '0').slice(-12);
    const paidAmount = scenario === 'amount_mismatch' ? data.amount + 1 : data.amount;
    const refNum = scenario === 'cancel' ? '' : `mock.${sign({ kind: 'ref', amount: paidAmount,
        scenario, nonce: data.nonce, issuedAt: data.issuedAt })}`;
    return {
        redirectUrl: data.redirectUrl,
        fields: {
            State: scenario === 'cancel' ? 'CanceledByUser' : 'OK',
            Status: scenario === 'cancel' ? '1' : '2',
            ResNum: data.resNum,
            RefNum: refNum,
            TraceNo: traceNo,
            TerminalId: process.env.SEP_TERMINAL_ID || '15785408',
            RRN: traceNo,
            SecurePan: '603799******1234',
        },
    };
}

export function readMockRef(refNum) {
    if (typeof refNum !== 'string' || !refNum.startsWith('mock.')) return null;
    const data = readSigned(refNum.slice(5), 'ref');
    return data && Number.isSafeInteger(data.amount) && data.amount > 0 &&
        typeof data.nonce === 'string' && SCENARIOS.has(data.scenario) ? data : null;
}

export function verifyMockTransaction(refNum) {
    const data = readMockRef(refNum);
    if (!data) return { success: false, resultCode: -2,
        resultDescription: 'رسید شبیه‌ساز معتبر نیست یا منقضی شده است.', rawData: {} };
    if (data.scenario === 'verify_failed') return { success: false, resultCode: -2,
        resultDescription: 'تراکنش در شبیه‌ساز SEP یافت نشد.', rawData: {} };
    const traceNo = String(parseInt(data.nonce.slice(0, 10).replaceAll('-', ''), 16)).padStart(12, '0').slice(-12);
    const transactionDetail = {
        RefNum: refNum, RRN: traceNo, StraceNo: traceNo,
        OrginalAmount: data.amount, AffectiveAmount: data.amount,
        MaskedPan: '603799******1234',
    };
    return { success: true, resultCode: 0, resultDescription: 'تراکنش شبیه‌سازی‌شده تأیید شد.',
        transactionDetail, rawData: { Success: true, ResultCode: 0, TransactionDetail: transactionDetail } };
}

export function reverseMockTransaction(refNum) {
    if (!readMockRef(refNum)) return { success: false, resultCode: -2,
        resultDescription: 'رسید شبیه‌ساز معتبر نیست.' };
    return { success: true, resultCode: 0, resultDescription: 'برگشت شبیه‌سازی‌شده انجام شد.' };
}
