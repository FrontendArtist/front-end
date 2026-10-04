import { BYEMONEY_API_URL } from '@/lib/byeMoneySync';
import { STRAPI_API_URL } from '@/lib/api';
import { createHash } from 'node:crypto';

const attemptsUrl = `${STRAPI_API_URL}/api/gateway-payment-attempts`;
const PAYMENT_METHOD_GATEWAY = 1;

function strapiHeaders() {
  const token = process.env.STRAPI_API_TOKEN;
  if (!token) throw new Error('توکن سرویس استرپی تنظیم نشده است.');
  return { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };
}

function byeMoneyHeaders(jwt) {
  const key = process.env.BYEMONEY_SERVICE_KEY;
  if (!key || Buffer.byteLength(key, 'utf8') < 32) throw new Error('کلید سرویس بای‌مانی تنظیم نشده است.');
  return { 'Content-Type': 'application/json', 'X-Service-Key': key, ...(jwt ? { Authorization: `Bearer ${jwt}` } : {}) };
}

export async function createGatewayTopUp(amountNoor, jwt) {
  const response = await fetch(`${BYEMONEY_API_URL}/api/topup/requests`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${jwt}` },
    body: JSON.stringify({ amount: amountNoor, paymentMethod: PAYMENT_METHOD_GATEWAY, pendingItems: [] }),
    cache: 'no-store',
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data?.errors?.[0] || 'ثبت درخواست شارژ انجام نشد.');
  if (!Number.isSafeInteger(data.amountRial) || data.amountRial <= 0 || !data.clientReferenceId || !data.topUpRequestId)
    throw new Error('مبلغ ریالی یا شناسهٔ شارژ در پاسخ بای‌مانی معتبر نیست.');
  return data;
}

export async function createAttempt(topUp) {
  const response = await fetch(attemptsUrl, {
    method: 'POST', headers: strapiHeaders(), cache: 'no-store',
    body: JSON.stringify({ data: {
      resNum: topUp.clientReferenceId,
      topUpRequestId: topUp.topUpRequestId,
      gateway: 'SEP',
      amountRial: topUp.amountRial,
      status: 'created',
    } }),
  });
  if (!response.ok) throw new Error('ثبت پایدار تلاش پرداخت انجام نشد.');
  return (await response.json()).data;
}

export async function findAttempt(resNum) {
  const query = new URLSearchParams({ 'filters[resNum][$eq]': resNum, 'pagination[pageSize]': '1' });
  const response = await fetch(`${attemptsUrl}?${query}`, { headers: strapiHeaders(), cache: 'no-store' });
  if (!response.ok) throw new Error('بازیابی تلاش پرداخت انجام نشد.');
  return (await response.json()).data?.[0] || null;
}

export async function claimAttempt(resNum) {
  const response = await fetch(`${attemptsUrl}/claim`, {
    method: 'POST', headers: strapiHeaders(), cache: 'no-store',
    body: JSON.stringify({ resNum }),
  });
  if (!response.ok) throw new Error('قفل تلاش پرداخت دریافت نشد.');
  return (await response.json()).claimed === true;
}

export async function updateAttempt(attempt, data) {
  const recordId = attempt.documentId || attempt.id;
  if (!recordId) throw new Error('شناسه تلاش پرداخت نامعتبر است.');
  const response = await fetch(`${attemptsUrl}/${encodeURIComponent(recordId)}`, {
    method: 'PUT', headers: strapiHeaders(), cache: 'no-store', body: JSON.stringify({ data }),
  });
  if (!response.ok) throw new Error('ذخیرهٔ وضعیت پرداخت انجام نشد.');
  return (await response.json()).data;
}

export async function recordGatewayOutcome(attempt, outcome) {
  const eventId = createHash('sha256').update(JSON.stringify({
    resNum: attempt.resNum, stage: outcome.stage, kind: outcome.kind,
    bankTransactionId: outcome.bankTransactionId || null,
    bankResultCode: outcome.bankResultCode == null ? null : String(outcome.bankResultCode),
    rawPayload: outcome.rawPayload || {},
  })).digest('hex');
  const response = await fetch(`${attemptsUrl}/outcomes`, {
    method: 'POST', headers: strapiHeaders(), cache: 'no-store',
    body: JSON.stringify({ ...outcome, resNum: attempt.resNum, eventId }),
  });
  if (!response.ok) throw new Error(`ثبت نتیجهٔ بانک در Strapi انجام نشد (${response.status}).`);
  return await response.json();
}

export async function deliverGatewayOutcome(recorded) {
  const response = await fetch(`${BYEMONEY_API_URL}/api/integrations/topups/gateway-results`, {
    method: 'POST', headers: byeMoneyHeaders(), cache: 'no-store',
    body: JSON.stringify(recorded.result),
  });
  const data = await response.json().catch(() => ({}));
  const accepted = response.ok || response.status === 422 && data.code === 'TOPUP_AMOUNT_MISMATCH' ||
    response.status === 409 && data.code === 'TOPUP_REQUIRES_REVIEW';
  if (accepted) {
    const delivery = await fetch(`${attemptsUrl}/outcomes/delivered`, {
      method: 'POST', headers: strapiHeaders(), cache: 'no-store',
      body: JSON.stringify({ eventId: recorded.eventId }),
    });
    if (!delivery.ok) throw new Error('نتیجه در بای‌مانی ثبت شد اما تأیید تحویل در Strapi ثبت نشد.');
  }
  return { ok: response.ok, status: response.status, data, accepted };
}

export async function getTopUpConfirmation(resNum) {
  const response = await fetch(`${BYEMONEY_API_URL}/api/integrations/topups/by-reference/${encodeURIComponent(resNum)}/confirmation`, {
    headers: byeMoneyHeaders(), cache: 'no-store',
  });
  if (!response.ok) throw new Error('استعلام وضعیت شارژ از بای‌مانی انجام نشد.');
  return await response.json();
}

export function isConfirmedTopUp(topUpOrStatus) {
  const status = typeof topUpOrStatus === 'object' ? topUpOrStatus?.status : topUpOrStatus;
  return String(status || '').trim().toLowerCase() === 'confirmed';
}
