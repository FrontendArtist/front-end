/**
 * @file src/lib/byeMoneyNoorWithdrawals.js
 * @description فراخوانی سروری بای‌مانی برای خروج نور توسط ادمین (I11-W) و فهرست شارژهای قابل استرداد.
 * فقط از routeهای سروری Next صدا زده می‌شود؛ JWT ادمین از نشست سروری می‌آید (BND-07).
 * خطای کسب‌وکاری `{code,error}` بدون تغییر عبور می‌کند و پیام حدسی ساخته نمی‌شود.
 */

import { BYEMONEY_API_URL } from './byeMoneySync.js';

const NETWORK_ERROR = 'خطا در برقراری ارتباط با سامانه بای‌مانی.';
const WITHDRAWAL_BASE = `${BYEMONEY_API_URL}/api/admin/noor-withdrawals`;

/** فقط این فیلدهای شارژ به مرورگر می‌رسند؛ userId و بقیهٔ فیلدهای داخلی عمداً حذف می‌شوند. */
export function pickRefundableTopUp(raw) {
    return {
        id: raw?.id,
        clientReferenceCode: raw?.clientReferenceCode,
        amountNoor: Number(raw?.amountNoor ?? 0),
        amountRial: Number(raw?.amountRial ?? 0),
        rialPerNoor: Number(raw?.rialPerNoor ?? 0),
        confirmedAtUtc: raw?.confirmedAtUtc ?? null,
        hasActiveRefund: Boolean(raw?.hasActiveRefund),
    };
}

async function readError(response) {
    const json = await response.json().catch(() => ({}));
    let error = typeof json?.error === 'string' ? json.error : '';
    if (!error && typeof json?.message === 'string') error = json.message;
    if (!error && json?.errors && typeof json.errors === 'object') {
        error = Object.values(json.errors).flat().filter((v) => typeof v === 'string').join(' - ');
    }
    return {
        success: false,
        status: response.status,
        ...(typeof json?.code === 'string' ? { code: json.code } : {}),
        error,
    };
}

async function request(url, { jwt, method = 'GET', body, json, parse }) {
    if (!jwt) {
        return { success: false, unauthorized: true, status: 401, error: 'نشست کاربری نامعتبر است. لطفاً مجدداً وارد شوید.' };
    }
    const headers = { Authorization: `Bearer ${jwt}` };
    let payload = body;
    if (json !== undefined) {
        headers['Content-Type'] = 'application/json';
        payload = JSON.stringify(json);
    }
    try {
        const response = await fetch(url, { method, headers, body: payload, cache: 'no-store' });
        if (!response.ok) return await readError(response);
        return { success: true, data: await parse(response) };
    } catch (err) {
        console.error('[ByeMoney noor-withdrawals]:', err);
        return { success: false, error: NETWORK_ERROR };
    }
}

const parseJson = (response) => response.json();

const CREATE_FIELDS = [
    'operationId', 'userExternalId', 'kind', 'relatedTopUpId', 'amountRial',
    'beneficiaryName', 'beneficiaryCardNumber', 'beneficiaryIban', 'description', 'paymentReference',
];

/** @param {{ jwt: string, fields: Record<string,string|undefined>, receipt?: Blob|null }} params */
export function createNoorWithdrawalWithByeMoney({ jwt, fields = {}, receipt }) {
    const formData = new FormData();
    for (const name of CREATE_FIELDS) {
        const value = fields[name];
        if (typeof value === 'string' && value !== '') formData.append(name, value);
    }
    if (receipt) formData.append('receipt', receipt);
    return request(WITHDRAWAL_BASE, { jwt, method: 'POST', body: formData, parse: parseJson });
}

export function listNoorWithdrawalsWithByeMoney({ jwt, status, userExternalId, limit }) {
    const params = new URLSearchParams();
    if (status) params.set('status', status);
    if (userExternalId) params.set('userExternalId', userExternalId);
    if (limit) params.set('limit', String(limit));
    const query = params.toString();
    return request(`${WITHDRAWAL_BASE}${query ? `?${query}` : ''}`, { jwt, parse: parseJson });
}

export function markNoorWithdrawalPaidWithByeMoney({ jwt, id, paymentReference, receipt }) {
    const formData = new FormData();
    formData.append('paymentReference', String(paymentReference ?? ''));
    if (receipt) formData.append('receipt', receipt);
    return request(`${WITHDRAWAL_BASE}/${encodeURIComponent(id)}/payment`, {
        jwt, method: 'POST', body: formData, parse: parseJson,
    });
}

export function reverseNoorWithdrawalWithByeMoney({ jwt, id, reason }) {
    return request(`${WITHDRAWAL_BASE}/${encodeURIComponent(id)}/reverse`, {
        jwt, method: 'POST', json: { reason }, parse: parseJson,
    });
}

/** فیش به‌صورت { body (ArrayBuffer), contentType } برمی‌گردد. */
export function getNoorWithdrawalReceiptWithByeMoney({ jwt, id }) {
    return request(`${WITHDRAWAL_BASE}/${encodeURIComponent(id)}/receipt`, {
        jwt,
        parse: async (response) => ({
            body: await response.arrayBuffer(),
            contentType: response.headers.get('content-type') || 'application/octet-stream',
        }),
    });
}

/** شارژهای تأییدشدهٔ کاربر برای انتخاب در فرم استرداد پرداخت تکراری (حداکثر ۵۰، جدیدترین اول). */
export async function listRefundableTopUpsWithByeMoney({ jwt, userExternalId }) {
    const result = await request(
        `${WITHDRAWAL_BASE}/refundable-topups?userExternalId=${encodeURIComponent(userExternalId ?? '')}`,
        { jwt, parse: parseJson },
    );
    if (!result.success) return result;
    return { success: true, data: (Array.isArray(result.data) ? result.data : []).map(pickRefundableTopUp) };
}
