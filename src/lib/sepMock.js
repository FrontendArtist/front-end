import { createHmac, randomUUID, timingSafeEqual } from 'node:crypto';

const MOCK_GATEWAY_URL = '/api/payment/mock';
const TOKEN_LIFETIME_MS = 60 * 60 * 1000;
const SCENARIOS = [
    'success',
    'cancel',
    'bank_failed',
    'session_expired',
    'verify_failed',
    'verify_expired',
    'amount_mismatch',
    'reverse_failed',
];

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
    if (!data || !SCENARIOS.includes(scenario)) return null;
    const traceNo = String(parseInt(data.nonce.slice(0, 10).replaceAll('-', ''), 16)).padStart(12, '0').slice(-12);
    const isMismatch = scenario === 'amount_mismatch' || scenario === 'reverse_failed';
    const paidAmount = isMismatch ? data.amount + 1 : data.amount;

    let state = 'OK';
    let status = '2';
    if (scenario === 'cancel') {
        state = 'CanceledByUser';
        status = '1';
    } else if (scenario === 'bank_failed') {
        state = 'Failed';
        status = '3';
    } else if (scenario === 'session_expired') {
        state = 'SessionIsNull';
        status = '0';
    }

    const isUnpaid = scenario === 'cancel' || scenario === 'bank_failed' || scenario === 'session_expired';
    const refNum = isUnpaid ? '' : createMockRef({ ...data, amount: paidAmount, scenario });
    return {
        redirectUrl: data.redirectUrl,
        fields: {
            State: state,
            Status: status,
            ResNum: data.resNum,
            RefNum: refNum,
            TraceNo: traceNo,
            TerminalId: process.env.SEP_TERMINAL_ID || '15785408',
            RRN: traceNo,
            SecurePan: '603799******1234',
        },
    };
}

function createMockRef({ amount, scenario, nonce, issuedAt }) {
    const payload = Buffer.alloc(29);
    payload.writeUInt8(SCENARIOS.indexOf(scenario), 0);
    payload.writeBigUInt64BE(BigInt(amount), 1);
    payload.writeUInt32BE(Math.floor(issuedAt / 1000), 9);
    Buffer.from(nonce.replaceAll('-', ''), 'hex').copy(payload, 13);
    const body = payload.toString('base64url');
    const signature = createHmac('sha256', secret()).update(payload).digest().subarray(0, 16).toString('base64url');
    return `mock.${body}.${signature}`;
}

export function readMockRef(refNum) {
    if (typeof refNum !== 'string' || !refNum.startsWith('mock.')) return null;
    const [body, signature, extra] = refNum.slice(5).split('.');
    if (!body || !signature || extra) return null;
    let payload;
    let provided;
    try {
        payload = Buffer.from(body, 'base64url');
        provided = Buffer.from(signature, 'base64url');
    } catch { return null; }
    if (payload.length !== 29 || provided.length !== 16) return null;
    const expected = createHmac('sha256', secret()).update(payload).digest().subarray(0, 16);
    if (!timingSafeEqual(provided, expected)) return null;
    const scenario = SCENARIOS[payload.readUInt8(0)];
    const amount = Number(payload.readBigUInt64BE(1));
    const issuedAt = payload.readUInt32BE(9) * 1000;
    if (!scenario || !Number.isSafeInteger(amount) || amount <= 0 ||
        issuedAt > Date.now() || Date.now() - issuedAt > TOKEN_LIFETIME_MS) return null;
    const hex = payload.subarray(13).toString('hex');
    const nonce = `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
    return { amount, scenario, nonce, issuedAt };
}

export function verifyMockTransaction(refNum) {
    const data = readMockRef(refNum);
    if (!data) return { success: false, resultCode: -2,
        resultDescription: 'رسید شبیه‌ساز معتبر نیست یا منقضی شده است.', rawData: {} };
    if (data.scenario === 'verify_failed') return { success: false, resultCode: -2,
        resultDescription: 'تراکنش در شبیه‌ساز SEP یافت نشد.', rawData: {} };
    if (data.scenario === 'verify_expired') return { success: false, resultCode: -6,
        resultDescription: 'بیش از ۳۰ دقیقه از زمان اجرای تراکنش گذشته و منقضی شده است.', rawData: {} };
    const traceNo = String(parseInt(data.nonce.slice(0, 10).replaceAll('-', ''), 16)).padStart(12, '0').slice(-12);
    const transactionDetail = {
        RefNum: refNum, RRN: traceNo, StraceNo: traceNo,
        OrginalAmount: data.amount, AffectiveAmount: data.amount,
        MaskedPan: '603799******1234',
        TerminalNumber: process.env.SEP_TERMINAL_ID || '15785408',
        StraceDate: new Date(data.issuedAt).toISOString(),
    };
    return { success: true, resultCode: 0, resultDescription: 'تراکنش شبیه‌سازی‌شده تأیید شد.',
        transactionDetail, rawData: { Success: true, ResultCode: 0, TransactionDetail: transactionDetail } };
}

export function reverseMockTransaction(refNum) {
    const data = readMockRef(refNum);
    if (!data) return { success: false, resultCode: -2,
        resultDescription: 'رسید شبیه‌ساز معتبر نیست.' };
    if (data.scenario === 'reverse_failed') {
        return {
            success: false,
            resultCode: -104,
            resultDescription: 'ترمینال ارسالی در وضعیت غیرفعال می‌باشد (خطا در برگشت وجه بانک).',
            rawData: { ResultCode: -104, ResultDescription: 'ترمینال ارسالی در وضعیت غیرفعال می‌باشد.' },
        };
    }
    const traceNo = String(parseInt(data.nonce.slice(0, 10).replaceAll('-', ''), 16)).padStart(12, '0').slice(-12);
    const transactionDetail = {
        RefNum: refNum, RRN: traceNo, StraceNo: traceNo,
        OrginalAmount: data.amount, AffectiveAmount: data.amount,
        TerminalNumber: process.env.SEP_TERMINAL_ID || '15785408',
        StraceDate: new Date(data.issuedAt).toISOString(),
    };
    return { success: true, resultCode: 0, resultDescription: 'برگشت شبیه‌سازی‌شده انجام شد.',
        rawData: { Success: true, ResultCode: 0, TransactionDetail: transactionDetail } };
}
