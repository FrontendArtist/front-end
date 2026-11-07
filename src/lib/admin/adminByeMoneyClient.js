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
