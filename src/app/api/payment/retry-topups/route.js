import { NextResponse } from 'next/server';
import { createHash, timingSafeEqual } from 'node:crypto';
import { listRetryableAttempts, updateAttempt, getTopUpConfirmation, confirmGatewayTopUp } from '@/lib/gatewayTopUp';
import { reverseSepTransaction, SEP_TERMINAL_ID } from '@/lib/sepPayment';

function authorized(request) {
  const key = process.env.BYEMONEY_SERVICE_KEY;
  const supplied = request.headers.get('x-service-key');
  if (!key || Buffer.byteLength(key, 'utf8') < 32 || !supplied) return false;
  return timingSafeEqual(createHash('sha256').update(key).digest(), createHash('sha256').update(supplied).digest());
}

export async function POST(request) {
  if (!authorized(request)) return NextResponse.json({ code: 'SERVICE_UNAUTHORIZED' }, { status: 401 });
  try {
    const attempts = await listRetryableAttempts();
    let processed = 0;
    for (const attempt of attempts) {
      try {
        if (attempt.status === 'verifying') {
          if (Date.now() >= Date.parse(attempt.updatedAt) + 2 * 60_000) {
            await updateAttempt(attempt, { status: 'review', lastError: 'VERIFY_RESULT_NOT_PERSISTED' });
            processed += 1;
          }
          continue;
        }
        const issuedAt = Date.parse(attempt.tokenIssuedAtUtc);
        const isWindowExpired = Number.isFinite(issuedAt) && Date.now() >= issuedAt + 40 * 60_000;
        const reverseDue = !Number.isFinite(issuedAt) || isWindowExpired;
        if (attempt.status === 'reverse_required' || reverseDue) {
          const topUp = await getTopUpConfirmation(attempt.resNum);
          if (topUp.status === 2 && topUp.externalTransactionId === attempt.refNum) {
            await updateAttempt(attempt, { status: 'confirmed' });
          } else {
            const reversed = await reverseSepTransaction({ refNum: attempt.refNum, terminalNumber: SEP_TERMINAL_ID });
            await updateAttempt(attempt, {
              status: reversed.success && reversed.resultCode === 0 ? 'reversed' : 'review',
              lastError: isWindowExpired && (!reversed.success || reversed.resultCode !== 0)
                ? `REVERSE_WINDOW_EXPIRED_${reversed.resultCode}`
                : `REVERSE_${reversed.resultCode}`,
            });
          }
        } else {
          const confirmation = await confirmGatewayTopUp(attempt);
          if (confirmation.ok) {
            await updateAttempt(attempt, { status: 'confirmed', lastAttemptAtUtc: new Date().toISOString() });
          } else {
            const isReview = confirmation.data.code === 'TOPUP_REQUIRES_REVIEW' || isWindowExpired;
            await updateAttempt(attempt, {
              status: isReview ? 'review' :
                confirmation.data.code === 'TOPUP_AMOUNT_MISMATCH' ? 'reverse_required' : 'verified',
              lastError: isWindowExpired && !isReview
                ? 'CONFIRM_WINDOW_EXPIRED'
                : (confirmation.data.code || `BYEMONEY_${confirmation.status}`),
              lastAttemptAtUtc: new Date().toISOString(), retryCount: (attempt.retryCount || 0) + 1,
            });
          }
        }
        processed += 1;
      } catch (error) {
        console.error('[Gateway TopUp Retry Error]:', { resNum: attempt.resNum, error });
        const issuedAt = Date.parse(attempt.tokenIssuedAtUtc);
        if (Number.isFinite(issuedAt) && Date.now() >= issuedAt + 40 * 60_000) {
          try {
            await updateAttempt(attempt, { status: 'review', lastError: 'REVERSE_WINDOW_REQUIRES_MANUAL_REVIEW' });
          } catch (persistenceError) {
            console.error('[Gateway TopUp Review Persistence Error]:', { resNum: attempt.resNum, error: persistenceError });
          }
        }
      }
    }
    return NextResponse.json({ processed, pending: attempts.length - processed });
  } catch (error) {
    console.error('[Gateway TopUp Retry Fatal Error]:', error);
    return NextResponse.json({ error: error.message || 'INTERNAL_ERROR' }, { status: 500 });
  }
}

