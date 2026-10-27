import { verifySepTransaction, reverseSepTransaction, getSepErrorMessage, SEP_TERMINAL_ID } from './sepPayment';
import { claimAttempt, updateAttempt, getTopUpConfirmation, isConfirmedTopUp,
  recordGatewayOutcome, deliverGatewayOutcome } from './gatewayTopUp';

const DEFINITIVE_UNPAID_STATES = {
  CanceledByUser: '1', Failed: '3', InvalidParameters: '5',
  MerchantIpAddressIsInvalid: '8', TokenNotFound: '10', TokenRequired: '11',
  TerminalNotFound: '12', MultisettlePolicyErrors: '21', SessionIsNull: '0'
};

function reviewBlockCode(topUp) {
  if (topUp?.hasManualRefund || topUp?.status === 'ManuallyRefunded')
    return 'REVIEW_MANUAL_REFUND_NOT_SUPPORTED';
  return topUp?.status === 'Unresolved' ? 'TOPUP_REQUIRES_REVIEW' : null;
}

async function recordAndDeliver(attempt, outcome) {
  const recorded = await recordGatewayOutcome(attempt, outcome);
  const delivery = await deliverGatewayOutcome(recorded).catch(() => ({ ok: false }));
  return { recorded, delivery };
}

async function reverseVerified(attempt, refNum, terminalNumber, reason, result) {
  const saved = await getTopUpConfirmation(attempt.resNum).catch(() => null);
  if (!saved) {
    await updateAttempt(attempt, { status: 'financial_review', refNum, lastError: 'BYEMONEY_STATUS_UNKNOWN' });
    return result({ status: 'failed', message: 'وضعیت شارژ برای بررسی مالی ثبت شد.' });
  }
  if (isConfirmedTopUp(saved)) {
    await updateAttempt(attempt, { status: 'financial_review', refNum, lastError: 'TOPUP_ALREADY_CONFIRMED' });
    return result({ status: 'failed', message: 'وضعیت پرداخت برای بررسی مالی ثبت شد.' });
  }
  const blockCode = reviewBlockCode(saved);
  if (blockCode) {
    await updateAttempt(attempt, { status: 'financial_review', refNum, lastError: blockCode });
    return result({ status: 'failed', message: 'نتیجه تازه بانک نیازمند رسیدگی مالی است.' });
  }

  const now = new Date().toISOString();
  const intent = await updateAttempt(attempt, {
    status: 'reverse_required', refNum, lastError: reason,
    reverseIntentAtUtc: now,
    reverseRetryUntilUtc: attempt.reverseRetryUntilUtc ||
      new Date(Date.parse(attempt.tokenIssuedAtUtc || attempt.verifiedAtUtc || now) + 50 * 60_000).toISOString(),
  });
  await recordGatewayOutcome(intent, {
    stage: 'reverse_intent', kind: 'Unknown', bankTransactionId: refNum,
    rawPayload: { reason },
  });
  const bank = await reverseSepTransaction({ refNum, terminalNumber });
  const success = bank.success === true && bank.resultCode === 0;
  const outcome = await recordAndDeliver(intent, {
    stage: 'reverse', kind: success ? 'ReverseSucceeded' : 'ReverseFailed',
    bankTransactionId: refNum, bankReferenceNumber: bank.rawData?.TransactionDetail?.RRN || null,
    bankResultCode: bank.resultCode == null ? null : String(bank.resultCode),
    originalAmountRial: bank.rawData?.TransactionDetail?.OrginalAmount ?? null,
    affectiveAmountRial: bank.rawData?.TransactionDetail?.AffectiveAmount ?? null,
    bankDateRaw: bank.rawData?.TransactionDetail?.StraceDate || null,
    rawPayload: bank.rawData || { resultCode: bank.resultCode, resultDescription: bank.resultDescription },
  }).catch(() => ({ delivery: { ok: false } }));
  const finalStatus = success && outcome.delivery?.ok ? 'reversed' : success ? 'pending_sync' : outcome.delivery?.ok ? 'financial_review' : 'pending_sync';
  await updateAttempt(intent, {
    status: finalStatus,
    lastError: success ? null : `REVERSE_${bank.resultCode ?? 'UNKNOWN'}`,
  });
  return result({
    status: 'failed',
    message: success
      ? (outcome.delivery?.ok ? 'مبلغ پرداختی به حساب شما برگشت داده شد.' : 'درخواست برگشت وجه در انتظار همگام‌سازی است.')
      : 'درخواست برگشت وجه برای رسیدگی مالی ثبت شد.'
  });
}

export async function processGatewayTopUpCallback({ attempt, state, status, refNum, request,
  terminalId, callbackParams, result }) {
  if (attempt.status === 'confirmed')
    return result({ status: 'success', refNum: attempt.refNum, topUpId: attempt.topUpRequestId });
  if (attempt.status === 'reversed')
    return result({ status: 'failed', message: 'مبلغ پرداختی به حساب شما برگشت داده شد.' });
  if (request.method !== 'POST')
    return result({ status: 'failed', message: 'وضعیت پرداخت در حال بررسی است.' });

  const terminalNumber = String(terminalId || SEP_TERMINAL_ID);
  if (terminalNumber !== String(SEP_TERMINAL_ID)) {
    const outcome = await recordAndDeliver(attempt, {
      stage: 'callback', kind: 'Unknown', bankTransactionId: refNum || null,
      bankResultCode: status || state || null, rawPayload: callbackParams,
    }).catch(() => null);
    const delivered = outcome?.delivery?.ok === true;
    await updateAttempt(attempt, {
      status: delivered ? 'financial_review' : 'pending_sync',
      lastError: 'TERMINAL_MISMATCH'
    });
    return result({
      status: 'failed',
      message: 'اطلاعات ترمینال بانکی نامعتبر است.'
    });
  }

  const knownUnpaid = !refNum && DEFINITIVE_UNPAID_STATES[state] === status;
  const validPaidCallback = state === 'OK' && status === '2' && Boolean(refNum);
  if (!knownUnpaid && !refNum) {
    const outcome = await recordAndDeliver(attempt, {
      stage: 'callback', kind: 'Unknown', bankTransactionId: refNum || null,
      bankResultCode: status || state || null, rawPayload: callbackParams,
    }).catch(() => null);
    const delivered = outcome?.delivery?.ok === true;
    await updateAttempt(attempt, {
      status: delivered ? 'financial_review' : 'pending_sync',
      refNum: refNum || null,
      lastError: state || 'INVALID_CALLBACK'
    });
    return result({
      status: 'failed',
      message: 'وضعیت پرداخت برای بررسی مالی ثبت شد.'
    });
  }

  if (knownUnpaid) {
    if (attempt.status !== 'token_issued' || attempt.refNum || !await claimAttempt(attempt.resNum)) {
      await recordGatewayOutcome(attempt, {
        stage: 'callback', kind: 'Unknown', bankResultCode: status || state,
        rawPayload: callbackParams,
      });
      return result({ status: 'failed', message: 'وضعیت پرداخت در حال بررسی است.' });
    }
    const saved = await getTopUpConfirmation(attempt.resNum).catch(() => null);
    if (isConfirmedTopUp(saved)) {
      await updateAttempt(attempt, { status: 'confirmed', refNum: saved.externalTransactionId || attempt.refNum });
      return result({ status: 'success', refNum: saved.externalTransactionId,
        topUpId: attempt.topUpRequestId });
    }
    const recorded = await recordGatewayOutcome(attempt, {
      stage: 'callback', kind: 'Unpaid', bankResultCode: status || state,
      rawPayload: callbackParams,
    });
    const delivery = await deliverGatewayOutcome(recorded).catch(() => ({ ok: false }));
    await updateAttempt(attempt, {
      status: delivery.ok ? state === 'CanceledByUser' ? 'cancelled' : 'failed' : 'pending_sync',
      lastError: delivery.ok ? state : 'BYEMONEY_DELIVERY_PENDING',
    });
    return result({ status: state === 'CanceledByUser' ? 'cancel' : 'failed',
      message: delivery.ok ? getSepErrorMessage(state) : 'نتیجهٔ بانک در انتظار ثبت نهایی است.' });
  }

  if (attempt.refNum && attempt.refNum !== refNum) {
    const outcome = await recordAndDeliver(attempt, {
      stage: 'callback', kind: 'Unknown', bankTransactionId: refNum,
      bankResultCode: status || state || null, rawPayload: callbackParams,
    }).catch(() => null);
    const delivered = outcome?.delivery?.ok === true;
    await updateAttempt(attempt, {
      status: delivered ? 'financial_review' : 'pending_sync',
      lastError: 'REFNUM_CONFLICT'
    });
    return result({
      status: 'failed',
      message: 'شناسهٔ بانکی برای بررسی مالی ثبت شد.'
    });
  }
  if (attempt.status !== 'token_issued' || !await claimAttempt(attempt.resNum)) {
    await recordGatewayOutcome(attempt, {
      stage: 'callback', kind: 'Unknown', bankTransactionId: refNum,
      bankResultCode: status || state || null, rawPayload: callbackParams,
    });
    return result({ status: 'failed', message: 'پرداخت در حال بررسی است.' });
  }

  await recordGatewayOutcome(attempt, {
    stage: 'callback', kind: 'Unknown', bankTransactionId: refNum,
    bankResultCode: status, rawPayload: callbackParams,
  });
  const verifying = await updateAttempt(attempt, { status: 'verifying', refNum });

  const bank = await verifySepTransaction({ refNum, terminalNumber });
  const detail = bank.transactionDetail || {};
  const success = bank.success === true && bank.resultCode === 0;
  const validDetail = success && detail.RefNum === refNum && detail.RRN &&
    String(detail.TerminalNumber) === terminalNumber &&
    Number.isSafeInteger(Number(detail.OrginalAmount)) && Number.isSafeInteger(Number(detail.AffectiveAmount)) &&
    Number(detail.OrginalAmount) > 0 && Number(detail.AffectiveAmount) > 0;

  const verifiedAtUtc = new Date().toISOString();
  const recorded = await recordGatewayOutcome(verifying, {
    stage: 'verify', kind: validDetail && validPaidCallback ? 'Verified' : 'Unknown',
    bankTransactionId: refNum, bankReferenceNumber: detail.RRN || null,
    bankResultCode: bank.resultCode == null ? null : String(bank.resultCode),
    originalAmountRial: detail.OrginalAmount ?? null,
    affectiveAmountRial: detail.AffectiveAmount ?? null,
    bankDateRaw: detail.StraceDate || null,
    rawPayload: bank.rawData || { resultCode: bank.resultCode, resultDescription: bank.resultDescription },
  });

  if (!success) {
    if (bank.resultCode === 2) {
      const saved = await getTopUpConfirmation(attempt.resNum).catch(() => null);
      if (isConfirmedTopUp(saved) && saved.externalTransactionId === refNum) {
        await updateAttempt(verifying, { status: 'confirmed', refNum });
        return result({ status: 'success', refNum, topUpId: attempt.topUpRequestId });
      }
    }
    const isTransitory = bank.resultCode == null || bank.resultCode === -999;
    let delivery = { ok: false };
    if (!isTransitory) {
      delivery = await deliverGatewayOutcome(recorded).catch(() => ({ ok: false }));
    }
    const finalStatus = isTransitory ? 'verifying' : delivery.ok ? 'financial_review' : 'pending_sync';
    await updateAttempt(verifying, {
      status: finalStatus,
      refNum, rrn: detail.RRN || null,
      originalAmountRial: detail.OrginalAmount ?? null,
      affectiveAmountRial: detail.AffectiveAmount ?? null,
      bankTransactionDateRaw: detail.StraceDate || null,
      verifiedAtUtc: null,
      lastError: `VERIFY_${bank.resultCode ?? 'UNKNOWN'}`,
    });
    return result({
      status: 'failed',
      message: delivery.ok ? 'نتیجهٔ تأیید بانک برای بررسی مالی ثبت شد.' : 'نتیجهٔ تأیید بانک در انتظار همگام‌سازی است.'
    });
  }

  const verified = await updateAttempt(verifying, {
    status: validDetail && validPaidCallback ? 'verified' : 'reverse_required',
    refNum, rrn: detail.RRN || null,
    originalAmountRial: detail.OrginalAmount ?? null,
    affectiveAmountRial: detail.AffectiveAmount ?? null,
    bankTransactionDateRaw: detail.StraceDate || null,
    verifiedAtUtc: verifiedAtUtc,
    reverseRetryUntilUtc: new Date(Date.parse(attempt.tokenIssuedAtUtc || verifiedAtUtc) + 50 * 60_000).toISOString(),
    lastError: validDetail ? null : `VERIFY_${bank.resultCode ?? 'UNKNOWN'}`,
  });

  if (!validDetail || !validPaidCallback)
    return reverseVerified(verified, refNum, terminalNumber,
      validDetail ? 'CONFLICTING_CALLBACK_STATE' : 'INVALID_VERIFY_DETAIL', result);

  const expected = Number(attempt.amountRial);
  if (!Number.isSafeInteger(expected) || Number(detail.OrginalAmount) !== expected ||
      Number(detail.AffectiveAmount) !== expected) {
    const delivery = await deliverGatewayOutcome(recorded).catch(() => null);
    if (!delivery?.accepted) {
      await updateAttempt(verified, { status: 'pending_sync', lastError: 'BYEMONEY_DELIVERY_PENDING' });
      return result({ status: 'failed', message: 'نتیجهٔ بانک در انتظار ثبت مالی است.' });
    }
    return reverseVerified(verified, refNum, terminalNumber, 'TOPUP_AMOUNT_MISMATCH', result);
  }

  const confirmation = await getTopUpConfirmation(attempt.resNum).catch(() => null);
  const blockCode = reviewBlockCode(confirmation);
  if (blockCode) {
    await updateAttempt(verified, { status: 'financial_review', lastError: blockCode });
    return result({ status: 'failed', message: 'نتیجه تازه بانک نیازمند رسیدگی مالی است.' });
  }

  const delivery = await deliverGatewayOutcome(recorded).catch(() => ({ ok: false }));
  if (delivery.ok) {
    await updateAttempt(verified, { status: 'confirmed', lastAttemptAtUtc: new Date().toISOString() });
    return result({ status: 'success', refNum, topUpId: attempt.topUpRequestId });
  }
  if (delivery.data?.code === 'REVIEW_MANUAL_REFUND_NOT_SUPPORTED') {
    await updateAttempt(verified, { status: 'financial_review', lastError: 'REVIEW_MANUAL_REFUND_NOT_SUPPORTED' });
    return result({ status: 'failed', message: 'بازپرداخت دستی ثبت شده و نتیجه تازه بانک نیازمند رسیدگی است.' });
  }
  if (delivery.data?.code === 'TOPUP_AMOUNT_MISMATCH' ||
      delivery.data?.code === 'TOPUP_REQUIRES_REVIEW')
    return reverseVerified(verified, refNum, terminalNumber, 'TOPUP_AMOUNT_MISMATCH', result);
  await updateAttempt(verified, { status: 'pending_sync', lastError: delivery.data?.code || 'BYEMONEY_DELIVERY_PENDING' });
  return result({ status: 'failed', message: 'پرداخت بانکی ثبت شد و شارژ در انتظار همگام‌سازی است.' });
}
