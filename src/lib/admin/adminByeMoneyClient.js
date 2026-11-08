/**
 * @file src/lib/admin/adminByeMoneyClient.js
 * @description فراخوانی سمت مرورگر routeهای سروری ادمین بای‌مانی (BND-07)
 *
 * مرورگر توکن نمی‌فرستد؛ route سروری JWT را از نشست می‌خواند. شکل خروجی همان نتیجهٔ
 * نرمال‌شدهٔ `byeMoneyApi` است تا رفتار خطا و fallback کامپوننت‌ها تغییر نکند.
 */

async function callAdminRoute(url, init = {}) {
    try {
        const response = await fetch(url, { cache: 'no-store', ...init });
        const json = await response.json().catch(() => ({}));
        return { ...json, success: response.ok && json?.success !== false, status: response.status };
    } catch (err) {
        if (err?.name === 'AbortError') throw err;
        return { success: false, status: 0, error: 'خطا در ارتباط با سرور.' };
    }
}

export function sendAdminNoorGift({ externalUserIds, amountNoor, reason, idempotencyKey }) {
    return callAdminRoute('/api/admin/noor-gifts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Idempotency-Key': idempotencyKey },
        body: JSON.stringify({ externalUserIds, amountNoor, reason }),
    });
}

export function createAdminAssistedTopUp({
    beneficiaryExternalUserId, amountToman, amountRial, receipt, externalTransactionId, idempotencyKey,
}) {
    const formData = new FormData();
    formData.append('beneficiaryExternalUserId', String(beneficiaryExternalUserId ?? ''));
    formData.append('amountToman', String(amountToman ?? ''));
    formData.append('amountRial', String(amountRial ?? ''));
    if (receipt) formData.append('receipt', receipt);
    if (externalTransactionId) formData.append('externalTransactionId', externalTransactionId);
    return callAdminRoute('/api/admin/topups/assisted', {
        method: 'POST',
        headers: { 'Idempotency-Key': idempotencyKey },
        body: formData,
    });
}

export async function getAdminBatchBalances({ userIds }) {
    const result = await callAdminRoute('/api/admin/wallets/batch-balances', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userIds }),
    });
    return { balances: {}, ...result };
}

export function getAdminOrderReceipt({ orderId, signal }) {
    return callAdminRoute(`/api/admin/byemoney-orders/${encodeURIComponent(orderId)}/receipt`, { signal });
}

// ── خروج نور توسط ادمین (I11-W) ────────────────────────────────────────────

export function listAdminNoorWithdrawals({ status, userExternalId, limit } = {}) {
    const params = new URLSearchParams();
    if (status) params.set('status', status);
    if (userExternalId) params.set('userExternalId', userExternalId);
    if (limit) params.set('limit', String(limit));
    const query = params.toString();
    return callAdminRoute(`/api/admin/noor-withdrawals${query ? `?${query}` : ''}`);
}

/** fields: نام‌های API (operationId, userExternalId, kind, relatedTopUpId, amountRial, ...)؛ نور را سرور حساب می‌کند. */
export function createAdminNoorWithdrawal({ fields, receipt }) {
    const formData = new FormData();
    Object.entries(fields || {}).forEach(([name, value]) => {
        if (value !== undefined && value !== null && value !== '') formData.append(name, String(value));
    });
    if (receipt) formData.append('receipt', receipt);
    return callAdminRoute('/api/admin/noor-withdrawals', { method: 'POST', body: formData });
}

export function markAdminNoorWithdrawalPaid({ id, paymentReference, receipt }) {
    const formData = new FormData();
    formData.append('paymentReference', paymentReference ?? '');
    if (receipt) formData.append('receipt', receipt);
    return callAdminRoute(`/api/admin/noor-withdrawals/${encodeURIComponent(id)}/payment`, {
        method: 'POST',
        body: formData,
    });
}

export function reverseAdminNoorWithdrawal({ id, reason }) {
    return callAdminRoute(`/api/admin/noor-withdrawals/${encodeURIComponent(id)}/reverse`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason }),
    });
}

export function listAdminRefundableTopUps({ userExternalId }) {
    return callAdminRoute(`/api/admin/noor-withdrawals/refundable-topups?userExternalId=${encodeURIComponent(userExternalId ?? '')}`);
}

/** نرخ فعلی (ریال به ازای هر نور) برای معادل تخمینی فرم؛ خروجی { rialPerNoor }. */
export function getAdminNoorWithdrawalRate() {
    return callAdminRoute('/api/admin/noor-withdrawals/conversion-rate');
}

export const adminNoorWithdrawalReceiptUrl = (id) =>
    `/api/admin/noor-withdrawals/${encodeURIComponent(id)}/receipt`;
