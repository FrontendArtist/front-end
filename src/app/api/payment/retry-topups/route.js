import { NextResponse } from 'next/server';
import { createHash, timingSafeEqual } from 'node:crypto';
import { listRetryableAttempts, updateAttempt, getTopUpConfirmation, confirmGatewayTopUp, isConfirmedTopUp } from '@/lib/gatewayTopUp';
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
            const topUp = await getTopUpConfirmation(attempt.resNum).catch(() => null);
            if (isConfirmedTopUp(topUp)) {
              await updateAttempt(attempt, { status: 'confirmed', refNum: topUp.externalTransactionId || attempt.refNum });
            } else {
              await updateAttempt(attempt, { status: 'review', lastError: 'VERIFY_RESULT_NOT_PERSISTED' });
            }
            processed += 1;
          }
          continue;
        }

        if (attempt.status === 'reverse_required') {
          const topUp = await getTopUpConfirmation(attempt.resNum).catch(() => null);
          if (isConfirmedTopUp(topUp) && topUp.externalTransactionId === attempt.refNum) {
            await updateAttempt(attempt, { status: 'confirmed' });
          } else {
            const reversed = await reverseSepTransaction({ refNum: attempt.refNum, terminalNumber: SEP_TERMINAL_ID });
            await updateAttempt(attempt, {
              status: reversed.success && reversed.resultCode === 0 ? 'reversed' : 'review',
              lastError: `REVERSE_${reversed.resultCode}`,
            });
          }
          processed += 1;
          continue;
        }

        // بررسی اینکه آیا تراکنش قبلاً در بای‌مانی تأیید شده اما پاسخش گم شده بود
        const topUp = await getTopUpConfirmation(attempt.resNum).catch(() => null);
        if (isConfirmedTopUp(topUp) && topUp.externalTransactionId === attempt.refNum) {
          await updateAttempt(attempt, { status: 'confirmed', lastAttemptAtUtc: new Date().toISOString() });
        } else {
          if ((attempt.retryCount || 0) >= 5) {
            await updateAttempt(attempt, { status: 'review', lastError: 'RETRY_LIMIT_EXCEEDED' });
            processed += 1;
            continue;
          }

          const confirmation = await confirmGatewayTopUp(attempt);
          if (confirmation.ok || confirmation.data.code === 'TOPUP_ALREADY_CONFIRMED') {
            await updateAttempt(attempt, { status: 'confirmed', lastAttemptAtUtc: new Date().toISOString() });
          } else if (confirmation.data.code === 'TOPUP_AMOUNT_MISMATCH') {
            await updateAttempt(attempt, { status: 'reverse_required', lastError: confirmation.data.code });
            const reversed = await reverseSepTransaction({ refNum: attempt.refNum, terminalNumber: SEP_TERMINAL_ID });
            await updateAttempt(attempt, {
              status: reversed.success && reversed.resultCode === 0 ? 'reversed' : 'review',
              lastError: `REVERSE_${reversed.resultCode}`,
            });
          } else {
            await updateAttempt(attempt, {
              status: confirmation.data.code === 'TOPUP_REQUIRES_REVIEW' ? 'review' : 'verified',
              lastError: confirmation.data.code || `BYEMONEY_${confirmation.status}`,
              lastAttemptAtUtc: new Date().toISOString(), retryCount: (attempt.retryCount || 0) + 1,
            });
          }
        }
        processed += 1;
      } catch (error) {
        console.error('[Gateway TopUp Retry Error]:', { resNum: attempt.resNum, error });
      }
    }
    return NextResponse.json({ processed, pending: attempts.length - processed });
  } catch (error) {
    console.error('[Gateway TopUp Retry Fatal Error]:', error);
    return NextResponse.json({ error: error.message || 'INTERNAL_ERROR' }, { status: 500 });
  }
}

